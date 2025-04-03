const db = require("../../models/db");

const checkCollectionExists = (user_id, name, callback) => {
  const query =
    "SELECT COUNT(*) AS count FROM collections WHERE user_id = ? AND name = ?";
  db.query(query, [user_id, name], (err, result) => {
    if (err) {
      console.error("Error checking collection existence:", err);
      return callback(err, null);
    }
    callback(null, result[0].count > 0);
  });
};

const addCollection = (req, res) => {
  const { user_id, name, id } = req.body;

  if (!user_id || !name) {
    return res.status(400).json({ message: "User ID and name are required" });
  }

  checkCollectionExists(user_id, name, (err, exists) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error checking collection existence", isOk: false });
    }

    if (exists) {
      return res.status(400).json({
        message: "Collection with this name already exists for the user",
        isOk: false,
      });
    }

    const query =
      "INSERT INTO collections (id, user_id, name) VALUES (?, ?, ?)";

    db.query(query, [id, user_id, name], (err, result) => {
      if (err) {
        console.error("Error adding collection:", err);
        return res.status(500).json({
          message: "Error adding collection to database",
          isOk: false,
        });
      }

      return res.status(201).json({
        message: "Bộ sưu tập đã được thêm thành công",
        isOk: true,
      });
    });
  });
};

const getCollectionsByUserId = (req, res) => {
  const user_id = req.query.user_id;

  if (!user_id) {
    return res
      .status(400)
      .json({ message: "User ID is required", isOk: false });
  }

  const query =
    "SELECT id, name, created_at FROM collections WHERE user_id = ?";

  db.query(query, [user_id], (err, result) => {
    if (err) {
      console.error("Error fetching collections:", err);
      return res
        .status(500)
        .json({ message: "Error fetching collections", isOk: false });
    }

    return res.status(200).json({
      message: "Collections fetched successfully",
      collections: result,
      isOk: true,
    });
  });
};

const getUserCollectionsWithItems = (req, res) => {
  const user_id = req.query.user_id;

  if (!user_id) {
    return res
      .status(400)
      .json({ message: "Missing user_id in query.", isOk: false });
  }

  // Lấy tất cả collection của user + join item + product
  const query = `
    SELECT
      c.id AS collection_id, c.name AS collection_name,
      i.id AS item_id, i.quantity,
      p.id AS product_id, p.name AS product_name, p.description, p.price, p.point, p.url
    FROM collections c
    LEFT JOIN items i ON i.collection_id = c.id
    LEFT JOIN products p ON i.product_id = p.id
    WHERE c.user_id = ?
    ORDER BY c.id;
  `;

  db.query(query, [user_id], (err, results) => {
    if (err) {
      console.error("Error fetching collections with items:", err);
      return res.status(500).json({ message: "Server error." });
    }

    // Xử lý kết quả thành dạng lồng nhau
    const collectionsMap = {};

    results.forEach((row) => {
      const collectionId = row.collection_id;

      if (!collectionsMap[collectionId]) {
        collectionsMap[collectionId] = {
          id: collectionId,
          name: row.collection_name,
          items: [],
        };
      }

      if (row.item_id) {
        collectionsMap[collectionId].items.push({
          id: row.item_id,
          quantity: row.quantity,
          product: {
            id: row.product_id,
            name: row.product_name,
            description: row.description,
            price: row.price,
            point: row.point,
            url: row.url,
          },
        });
      }
    });

    // Chuyển map thành mảng
    const collections = Object.values(collectionsMap);
    res.status(200).json({
      data: collections,
      message: "Collections with items fetched successfully.",
      isOk: true,
    });
  });
};

// Hàm thêm item vào nhiều collectionss
const addItemToMultipleCollections = async (req, res) => {
  const { product, collections, quantity } = req.body; // Lấy product, collections và quantity từ request body
  const { id, name, description, price, point, url } = product;

  try {
    // Kiểm tra xem sản phẩm đã tồn tại trong bảng `products` chưa
    const productQuery = "SELECT id FROM products WHERE id = ?";
    db.query(productQuery, [id], (err, result) => {
      if (err) {
        console.error("Error checking product existence:", err);
        return res
          .status(500)
          .json({ message: "Error checking product existence" });
      }

      // Nếu sản phẩm chưa có, thêm sản phẩm vào bảng `products`
      if (result.length === 0) {
        const insertProductQuery =
          "INSERT INTO products (id, name, description, price, point, url) VALUES (?, ?, ?, ?, ?, ?)";
        db.query(
          insertProductQuery,
          [id, name, description, price, point, url],
          (err) => {
            if (err) {
              console.error("Error inserting product:", err);
              return res
                .status(500)
                .json({ isOk: false, message: "Error inserting product" });
            }
            // Sau khi thêm sản phẩm, tiếp tục thêm item vào mỗi collection
            addItemToMultipleCollectionsHelper(collections, id, quantity, res);
          }
        );
      } else {
        // Nếu sản phẩm đã tồn tại, tiếp tục thêm item vào các collection
        addItemToMultipleCollectionsHelper(collections, id, quantity, res);
      }
    });
  } catch (error) {
    console.error("Error in addItemToCollection:", error);
    return res
      .status(500)
      .json({ isOk: false, message: "Internal server error" });
  }
};

// Helper function để thêm item vào các collection hoặc cập nhật quantity nếu đã có
const addItemToMultipleCollectionsHelper = (
  collections,
  product_id,
  quantity,
  res
) => {
  collections.forEach((collection_id) => {
    // Kiểm tra xem item đã có trong collection chưa
    const checkItemQuery =
      "SELECT * FROM items WHERE collection_id = ? AND product_id = ?";
    db.query(checkItemQuery, [collection_id, product_id], (err, result) => {
      if (err) {
        console.error("Error checking item existence:", err);
        return res
          .status(500)
          .json({ isOk: false, message: "Error checking item existence" });
      }

      // Nếu item đã tồn tại, tăng quantity
      if (result.length > 0) {
        const updateQuantityQuery =
          "UPDATE items SET quantity = quantity + ? WHERE collection_id = ? AND product_id = ?";
        db.query(
          updateQuantityQuery,
          [quantity, collection_id, product_id],
          (err) => {
            if (err) {
              console.error("Error updating item quantity:", err);
              return res
                .status(500)
                .json({ isOk: false, message: "Error updating item quantity" });
            }
          }
        );
      } else {
        // Nếu item chưa có, thêm item mới vào bảng `items`
        const insertItemQuery =
          "INSERT INTO items (collection_id, product_id, quantity) VALUES (?, ?, ?)";
        db.query(
          insertItemQuery,
          [collection_id, product_id, quantity],
          (err) => {
            if (err) {
              console.error("Error inserting item:", err);
              return res
                .status(500)
                .json({ isOk: false, message: "Error inserting item" });
            }
          }
        );
      }
    });
  });

  return res.status(200).json({
    message: "Items added/updated in all collections successfully",
    isOk: true,
  });
};

module.exports = {
  addCollection,
  getCollectionsByUserId,
  getUserCollectionsWithItems,
  addItemToMultipleCollections,
};
