const db = require("../../models/db");

const insertProductIdAndShopId = async (shopId, productId) => {
  const sql =
    "INSERT IGNORE INTO item_shop_id (`shop_id`, `product_id`) VALUES ?";
  const values = [[shopId, productId]];

  return new Promise((resolve, reject) => {
    db.query(sql, [values], (err, result) => {
      if (err) {
        console.error("Error inserting data:", err);
        return reject(err);
      }

      resolve(result?.affectedRows);
    });
  });
};

const deleteProductIdAndShopId = async (shopId, productId) => {
  const sql = "DELETE FROM item_shop_id WHERE shop_id = ? AND product_id = ?";
  const values = [shopId, productId];

  return new Promise((resolve, reject) => {
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Error delete data:", err);
        return reject(err);
      }

      resolve(result?.affectedRows);
    });
  });
};

module.exports = {
  insertProductIdAndShopId,
  deleteProductIdAndShopId,
};
