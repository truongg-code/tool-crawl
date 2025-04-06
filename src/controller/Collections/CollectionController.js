const db = require("../../models/db");

// Kiểm tra xem bộ sưu tập đã tồn tại chưa
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

// Thêm bộ sưu tập mới
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

// Lấy tất cả bộ sưu tập của người dùng theo user_id
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

// Lấy tất cả bộ sưu tập của người dùng theo user_id + join item + product
const getUserCollectionsWithItems = (req, res) => {
  const user_id = req.query.user_id;

  if (!user_id) {
    return res
      .status(400)
      .json({ message: "Missing user_id in query.", isOk: false });
  }

  // Lấy tất cả collection của user + join item + product
  const query = `
    SELECT DISTINCT
    c.id AS collection_id, c.name AS collection_name,
    i.id AS item_id, i.quantity, i.shop_id AS shop_id,
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
          item_id: row.item_id,
          quantity: row.quantity,
          product: {
            id: row.product_id,
            name: row.product_name,
            description: row.description,
            price: row.price,
            point: row.point,
            url: row.url,
            shop_id: row.shop_id,
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
  const { id, name, description, price, point, url, shopId } = product;

  try {
    // Kiểm tra xem sản phẩm đã tồn tại trong bảng `products` chưa
    const productQuery = "SELECT id FROM products WHERE id = ? AND shop_id = ?";
    db.query(productQuery, [id, shopId], (err, result) => {
      if (err) {
        console.error("Error checking product existence:", err);
        return res
          .status(500)
          .json({ message: "Error checking product existence" });
      }

      // Nếu sản phẩm chưa có, thêm sản phẩm vào bảng `products`
      if (result.length === 0) {
        const insertProductQuery =
          "INSERT INTO products (id, name, description, price, point, url, shop_id) VALUES (?, ?, ?, ?, ?, ?, ?)";
        db.query(
          insertProductQuery,
          [id, name, description, price, point, url, shopId],
          (err) => {
            if (err) {
              console.error("Error inserting product:", err);
              return res
                .status(500)
                .json({ isOk: false, message: "Error inserting product" });
            }
            // Sau khi thêm sản phẩm, tiếp tục thêm item vào mỗi collection
            addItemToMultipleCollectionsHelper(
              collections,
              id,
              quantity,
              shopId,
              res
            );
          }
        );
      } else {
        // Nếu sản phẩm đã tồn tại, tiếp tục thêm item vào các collection
        addItemToMultipleCollectionsHelper(
          collections,
          id,
          quantity,
          shopId,
          res
        );
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
  shop_id,
  res
) => {
  collections.forEach((collection_id) => {
    // Kiểm tra xem item đã có trong collection chưa
    const checkItemQuery =
      "SELECT * FROM items WHERE collection_id = ? AND product_id = ? AND shop_id = ?";
    db.query(
      checkItemQuery,
      [collection_id, product_id, shop_id],
      (err, result) => {
        if (err) {
          console.error("Error checking item existence:", err);
          return res
            .status(500)
            .json({ isOk: false, message: "Error checking item existence" });
        }

        // Nếu item đã tồn tại, tăng quantity
        if (result.length > 0) {
          const updateQuantityQuery =
            "UPDATE items SET quantity = quantity + ? WHERE collection_id = ? AND product_id = ? AND shop_id = ?";
          db.query(
            updateQuantityQuery,
            [quantity, collection_id, product_id, shop_id],
            (err) => {
              if (err) {
                console.error("Error updating item quantity:", err);
                return res.status(500).json({
                  isOk: false,
                  message: "Error updating item quantity",
                });
              }
            }
          );
        } else {
          // Nếu item chưa có, thêm item mới vào bảng `items`
          const insertItemQuery =
            "INSERT INTO items (collection_id, product_id, quantity, shop_id) VALUES (?, ?, ?, ?)";
          db.query(
            insertItemQuery,
            [collection_id, product_id, quantity, shop_id],
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
      }
    );
  });

  return res.status(200).json({
    message: "Items added/updated in all collections successfully",
    isOk: true,
  });
};

// delete collections
const deleteCollections = (req, res) => {
  const { collection_ids } = req.body;
  if (!Array.isArray(collection_ids) || collection_ids.length === 0) {
    return res.status(400).json({
      message: "Invalid collection_ids provided",
      isOk: false,
    });
  }

  const placeholders = collection_ids.map(() => "?").join(", ");
  const query = `DELETE FROM collections WHERE id IN (${placeholders})`;
  db.query(query, collection_ids, (err, result) => {
    if (err) {
      console.error("Error deleting collections:", err);
      return res
        .status(500)
        .json({ message: "Error deleting collections", isOk: false });
    }

    return res.status(200).json({
      message: "Collections deleted successfully",
      affectedRows: result.affectedRows,
      isOk: true,
    });
  });
};

// delete items and collections checked
const deleteSelectedItemsAndCollections = (req, res) => {
  const { collectionIds = [], itemIds = [] } = req.body;

  if (!Array.isArray(collectionIds) || !Array.isArray(itemIds)) {
    return res.status(400).json({
      message: "Invalid data format. Must be arrays.",
      isOk: false,
    });
  }

  // Nếu không có gì để xóa
  if (collectionIds.length === 0 && itemIds.length === 0) {
    return res.status(400).json({
      message: "No collection or item IDs provided.",
      isOk: false,
    });
  }

  // Xóa collections
  if (collectionIds.length > 0) {
    const placeholders = collectionIds.map(() => "?").join(", ");
    const query = `DELETE FROM collections WHERE id IN (${placeholders})`;

    db.query(query, collectionIds, (err) => {
      if (err) {
        console.error("Error deleting collections:", err);
        return res.status(500).json({
          message: "Error deleting collections",
          isOk: false,
        });
      }
    });
  }

  // Xóa items
  if (itemIds.length > 0) {
    const placeholders = itemIds.map(() => "?").join(", ");
    const query = `DELETE FROM items WHERE id IN (${placeholders})`;

    db.query(query, itemIds, (err) => {
      if (err) {
        console.error("Error deleting items:", err);
        return res.status(500).json({
          message: "Error deleting items",
          isOk: false,
        });
      }
    });
  }

  // Trả về kết quả chung sau khi xử lý
  return res.status(200).json({
    message: "Selected collections and items deleted successfully",
    isOk: true,
  });
};

// budget
const getCollectionsByUserIdWithBudget = (req, res) => {
  const { user_id, budget } = req.query;
  if (!user_id || !budget) {
    return res.status(400).json({ message: "Missing parameters", isOk: false });
  }

  const query = `
    SELECT DISTINCT
      c.id AS collection_id, c.name AS collection_name,
      i.id AS item_id, i.quantity, i.shop_id AS shop_id,
      p.id AS product_id, p.name AS product_name, p.description, p.price, p.point, p.url
    FROM collections c
    LEFT JOIN items i ON i.collection_id = c.id
    LEFT JOIN products p ON i.product_id = p.id
    WHERE c.user_id = ?
      AND (p.price * i.quantity <= ?) 
    ORDER BY c.id;
  `;

  db.query(query, [user_id, budget], (err, results) => {
    if (err) {
      console.error("Error filtering collections by budget:", err);
      return res.status(500).json({ message: "Server error", isOk: false });
    }

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
          item_id: row.item_id,
          quantity: row.quantity,
          product: {
            id: row.product_id,
            name: row.product_name,
            description: row.description,
            price: row.price,
            point: row.point,
            url: row.url,
            shop_id: row.shop_id,
          },
        });
      }
    });

    const collections = Object.values(collectionsMap);
    res.status(200).json({
      data: collections,
      message: "Collections filtered by budget",
      isOk: true,
    });
  });
};

module.exports = {
  addCollection,
  getCollectionsByUserId,
  getUserCollectionsWithItems,
  addItemToMultipleCollections,
  deleteCollections,
  deleteSelectedItemsAndCollections,
  getCollectionsByUserIdWithBudget,
};
