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
  const receive_email = email ? 1 : 0;

  const query = hasCreatedDate
    ? `
        INSERT INTO users_tiki (id, email, name, phone, created_date, receive_email)
        VALUES (?, ?, ?, ?, FROM_UNIXTIME(?), ?)
        ON DUPLICATE KEY UPDATE
          email = CASE WHEN VALUES(email) IS NOT NULL THEN VALUES(email) ELSE email END,
          name = VALUES(name),
          phone = VALUES(phone),
          created_date = VALUES(created_date),
          receive_email = VALUES(receive_email)
      `
    : `
        INSERT INTO users_tiki (id, email, name, phone, receive_email)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          email = CASE WHEN VALUES(email) IS NOT NULL THEN VALUES(email) ELSE email END,
          name = VALUES(name),
          phone = VALUES(phone),
          receive_email = VALUES(receive_email)
      `;

  const values = hasCreatedDate
    ? [id, email, name, phone_number, created_date, receive_email]
    : [id, email, name, phone_number, receive_email];

  db.query(query, values, (err) => {
    if (err) {
      console.error("Lỗi khi đồng bộ tài khoản Tiki:", err);
      return res.status(500).json({
        isOk: false,
        message: "Lỗi server khi đồng bộ tài khoản",
      });
    }

    // Lấy lại trạng thái receive_email để trả về client
    db.query(
      "SELECT receive_email FROM users_tiki WHERE id = ?",
      [id],
      (err2, results) => {
        if (err2) {
          console.error("Lỗi khi lấy receive_email:", err2);
          return res.status(500).json({
            isOk: false,
            message: "Đồng bộ thành công nhưng lỗi khi lấy receive_email",
          });
        }

        return res.status(200).json({
          isOk: true,
          message: "Đồng bộ tài khoản Tiki thành công",
          receive_email: results[0]?.receive_email ?? null,
        });
      }
    );
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

      // Thêm hoặc cập nhật items trước
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

        const resultProduct = await db.query(
          "SELECT id FROM products WHERE id = ? AND shop_id = ?",
          [product_id, shop_id]
        );

        if (!resultProduct || resultProduct.length === 0) {
          await db.query(
            "INSERT INTO products (id, name, description, price, point, url, image, shop_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [product_id, name, description, price, point, url, image, shop_id]
          );
        } else {
          await db.query(
            "UPDATE products SET name = ?, description = ?, price = ?, point = ?, url =?, image = ? WHERE id = ? AND shop_id = ?",
            [name, description, price, point, url, image, product_id, shop_id]
          );
        }

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

      // Lấy danh sách items hiện tại từ DB
      const existingItems = await db.query(
        "SELECT product_id, shop_id FROM items WHERE collection_id = ?",
        [collection.id]
      );
      const existingMap = new Map(
        existingItems.map((item) => [
          `${item.product_id}_${item.shop_id}`,
          true,
        ])
      );
      const newMap = new Map(
        collection.items.map((item) => [`${item.id}_${item.shop_id}`, true])
      );

      const toDeletePairs = [];
      existingMap.forEach((_, key) => {
        if (!newMap.has(key)) toDeletePairs.push(key);
      });

      for (const key of toDeletePairs) {
        const [product_id, shop_id] = key.split("_");
        await db.query(
          "DELETE FROM items WHERE collection_id = ? AND product_id = ? AND shop_id = ?",
          [collection.id, product_id, shop_id]
        );
      }

      // Nếu collection không còn item nào thì xoá
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

const updateReceiveEmail = async (req, res) => {
  const { id, receive_email } = req.body;

  if (!id)
    return res
      .status(400)
      .json({ isOk: false, message: "Thiếu ID người dùng" });

  try {
    await db.query("UPDATE users_tiki SET receive_email = ? WHERE id = ?", [
      receive_email ? 1 : 0,
      id,
    ]);

    return res.json({ isOk: true, message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật receive_email:", error);
    return res.status(500).json({ isOk: false, message: "Lỗi server" });
  }
};

module.exports = { syncTikiUser, syncCartFromTiki, updateReceiveEmail };
