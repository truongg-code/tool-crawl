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

const syncCartFromTiki = async (req, res) => {
  const { user_id, collections } = req.body;

  if (!user_id || !Array.isArray(collections)) {
    return res.status(400).json({ isOk: false, message: "Invalid input data" });
  }

  try {
    for (const collection of collections) {
      // 1. Check and insert collection if not exists
      const collectionCheckQuery =
        "SELECT COUNT(*) AS count FROM collections WHERE id = ?";
      const [collectionExists] = await db.query(collectionCheckQuery, [
        collection.id,
      ]);

      if (collectionExists.count === 0) {
        const insertCollectionQuery =
          "INSERT INTO collections (id, user_id, name) VALUES (?, ?, ?)";
        await db.query(insertCollectionQuery, [
          collection.id,
          user_id,
          collection.name,
        ]);
      }

      // 2. Insert or update each item
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
        } = item;

        const shop_id = "tiki"; // fixed for Tiki

        // 2.1 Check and insert product if not exists
        const [productResult] = await db.query(
          "SELECT id FROM products WHERE id = ? AND shop_id = ?",
          [product_id, shop_id]
        );

        if (!productResult) {
          const insertProductQuery =
            "INSERT INTO products (id, name, description, price, point, url, image, shop_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
          await db.query(insertProductQuery, [
            product_id,
            name,
            description,
            price,
            point,
            url,
            image,
            shop_id,
          ]);
        }

        // 2.2 Check if item exists in this collection
        const [itemResult] = await db.query(
          "SELECT id FROM items WHERE collection_id = ? AND product_id = ? AND shop_id = ?",
          [collection.id, product_id, shop_id]
        );

        if (itemResult) {
          // Update quantity to new value
          await db.query(
            "UPDATE items SET quantity = ? WHERE collection_id = ? AND product_id = ? AND shop_id = ?",
            [quantity, collection.id, product_id, shop_id]
          );
        } else {
          // Insert new item
          await db.query(
            "INSERT INTO items (collection_id, product_id, quantity, shop_id) VALUES (?, ?, ?, ?)",
            [collection.id, product_id, quantity, shop_id]
          );
        }
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
