const db = require("../../models/db");

// Đồng bộ tài khoản người dùng Tiki khi mở extension
const syncTikiUser = (req, res) => {
  const { id, email, name, phone_number, created_date } = req.body;

  if (!id) {
    return res.status(400).json({
      isOk: false,
      message: "Thiếu id Tiki",
    });
  }

  const hasCreatedDate = !!created_date;

  const query = hasCreatedDate
    ? `
        INSERT INTO users_tiki (id, email, name, phone, created_date)
        VALUES (?, ?, ?, ?, FROM_UNIXTIME(?))
        ON DUPLICATE KEY UPDATE
          email = CASE WHEN VALUES(email) IS NOT NULL THEN VALUES(email) ELSE email END,
          name = VALUES(name),
          phone = VALUES(phone),
          created_date = VALUES(created_date)
      `
    : `
        INSERT INTO users_tiki (id, email, name, phone)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          email = CASE WHEN VALUES(email) IS NOT NULL THEN VALUES(email) ELSE email END,
          name = VALUES(name),
          phone = VALUES(phone)
      `;

  const values = hasCreatedDate
    ? [id, email, name, phone_number, created_date]
    : [id, email, name, phone_number];

  db.query(query, values, (err) => {
    if (err) {
      console.error("Lỗi khi đồng bộ tài khoản Tiki:", err);
      return res.status(500).json({
        isOk: false,
        message: "Lỗi server khi đồng bộ tài khoản",
      });
    }

    return res.status(200).json({
      isOk: true,
      message: "Đồng bộ tài khoản Tiki thành công",
    });
  });
};

// Hàm đồng bộ giỏ hàng từ Tiki
const syncCartFromTiki = async (req, res) => {
  const { user_id, collections } = req.body;

  if (!user_id || !Array.isArray(collections)) {
    return res.status(400).json({ isOk: false, message: "Invalid input data" });
  }

  try {
    for (const collection of collections) {
      // 1. Check và thêm collection nếu chưa có
      const resultCollectionExists = await db.query(
        "SELECT COUNT(*) AS count FROM collections WHERE id = ?",
        [collection.id]
      );
      if (resultCollectionExists[0].count === 0) {
        await db.query(
          "INSERT INTO collections (id, user_id, name) VALUES (?, ?, ?)",
          [collection.id, user_id, collection.name]
        );
      }

      // 2. Insert hoặc update từng item trước
      for (const item of collection.items) {
        const {
          id: product_id,
          name,
          description,
          price,
          point,
          url,
          image,
          quantity,
          shop_id,
        } = item;

        // 2.1 Kiểm tra product
        const resultProduct = await db.query(
          "SELECT id FROM products WHERE id = ? AND shop_id = ?",
          [product_id, shop_id]
        );

        if (!resultProduct || resultProduct.length === 0) {
          await db.query(
            "INSERT INTO products (id, name, description, price, point, url, image, shop_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [product_id, name, description, price, point, url, image, shop_id]
          );
        }

        // 2.2 Kiểm tra item trong collection
        const resultItem = await db.query(
          "SELECT id FROM items WHERE collection_id = ? AND product_id = ? AND shop_id = ?",
          [collection.id, product_id, shop_id]
        );

        if (resultItem && resultItem.length > 0) {
          await db.query(
            "UPDATE items SET quantity = ? WHERE collection_id = ? AND product_id = ? AND shop_id = ?",
            [quantity, collection.id, product_id, shop_id]
          );
        } else {
          await db.query(
            "INSERT INTO items (collection_id, product_id, quantity, shop_id) VALUES (?, ?, ?, ?)",
            [collection.id, product_id, quantity, shop_id]
          );
        }
      }

      // 3. Xoá item nào không còn trong danh sách mới
      const existingItems = await db.query(
        "SELECT product_id FROM items WHERE collection_id = ?",
        [collection.id]
      );
      const existingIds = existingItems.map((row) => row.product_id);
      const newIds = collection.items.map((item) => item.id);
      const toDelete = existingIds.filter((id) => !newIds.includes(id));
      if (toDelete.length > 0) {
        await db.query(
          `DELETE FROM items WHERE collection_id = ? AND product_id IN (${toDelete
            .map(() => "?")
            .join(",")})`,
          [collection.id, ...toDelete]
        );
      }

      // 4. Nếu không còn item nào thì xóa luôn collection
      const checkRemaining = await db.query(
        "SELECT COUNT(*) AS count FROM items WHERE collection_id = ?",
        [collection.id]
      );
      if (checkRemaining[0].count === 0) {
        await db.query("DELETE FROM collections WHERE id = ?", [collection.id]);
      }
    }

    return res.status(200).json({ isOk: true, message: "Đồng bộ thành công" });
  } catch (error) {
    console.error("Lỗi đồng bộ giỏ hàng từ Tiki:", error);
    return res
      .status(500)
      .json({ isOk: false, message: "Internal server error" });
  }
};

module.exports = { syncTikiUser, syncCartFromTiki };
