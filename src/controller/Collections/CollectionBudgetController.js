const db = require("../../models/db");

// combine
const getUserCollectionsWithOptionalBudgetAndFilter = (req, res) => {
  const { user_id, budget, collection_ids = [] } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: "Missing user_id", isOk: false });
  }

  // Gán điều kiện WHERE động
  let query = `
      SELECT DISTINCT
        c.id AS collection_id, c.name AS collection_name,
        i.id AS item_id, i.quantity, i.shop_id AS shop_id,
        p.id AS product_id, p.name AS product_name, p.description, p.price, p.point, p.url, p.image
      FROM collections c
      LEFT JOIN items i ON i.collection_id = c.id
      LEFT JOIN products p ON i.product_id = p.id
      WHERE c.user_id = ?
    `;

  const queryParams = [user_id];

  // Nếu có danh sách collection_ids → thêm điều kiện lọc theo ID
  if (Array.isArray(collection_ids) && collection_ids.length > 0) {
    const placeholders = collection_ids.map(() => "?").join(", ");
    query += ` AND c.id IN (${placeholders})`;
    queryParams.push(...collection_ids);
  }

  // Nếu có ngân sách → thêm điều kiện lọc item theo ngân sách
  if (budget !== undefined && !isNaN(budget) && budget !== null) {
    query += ` AND (p.price * i.quantity <= ? OR p.price IS NULL)`;
    queryParams.push(budget);
  }

  query += ` ORDER BY c.id`;

  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching collections:", err);
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
            image: row.image,
            url: row.url,
            shop_id: row.shop_id,
          },
        });
      }
    });

    const collections = Object.values(collectionsMap);
    return res.status(200).json({
      data: collections,
      message: "Collections fetched successfully",
      isOk: true,
    });
  });
};

module.exports = {
  getUserCollectionsWithOptionalBudgetAndFilter,
};
