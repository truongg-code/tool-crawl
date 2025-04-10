const db = require("../models/db");
const nodemailer = require("nodemailer");
const axios = require("axios");

const getNewPriceFromMarketplace = async (productUrl) => {
  return Math.floor(Math.random() * 1000000 + 10000); // Test giả lập
  try {
    const res = await axios.get(productUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
      },
    });
    return res.data.price;
  } catch (error) {
    console.error("Lỗi lấy giá sản phẩm:", error);
    return null;
  }
};

const sendEmailNotify = async (email, productName, oldPrice, newPrice, url) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: `Giảm giá: ${productName}`,
    html: `
      <h3>Sản phẩm bạn theo dõi đã giảm giá!</h3>
      <p><strong>${productName}</strong></p>
      <p>Giá cũ: ₫${oldPrice.toLocaleString()}</p>
      <p style="color: red;">Giá mới: ₫${newPrice.toLocaleString()}</p>
      <p><a href="${url}">Xem sản phẩm</a></p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

const BATCH_SIZE = 10;

const checkPrices = async () => {
  let offset = 0;

  const runBatch = () => {
    return new Promise((resolve, reject) => {
      const query =
        "SELECT id, name, price, url FROM products LIMIT ? OFFSET ?";
      db.query(query, [BATCH_SIZE, offset], async (err, products) => {
        if (err) {
          console.error("Lỗi truy vấn DB:", err);
          return reject(err);
        }

        if (!products || products.length === 0) {
          console.log("Đã xử lý xong tất cả sản phẩm.");
          return resolve(false); // kết thúc
        }

        for (const product of products) {
          try {
            const newPrice = await getNewPriceFromMarketplace(product.url);
            if (newPrice && newPrice < product.price) {
              console.log(
                `🟡 Giá giảm: ${
                  product.name
                } từ ₫${product.price.toLocaleString()} → ₫${newPrice.toLocaleString()}`
              );
              db.query("UPDATE products SET price = ? WHERE id = ?", [
                newPrice,
                product.id,
              ]);

              const userQuery = `
                SELECT DISTINCT u.email
                FROM users u
                JOIN collections c ON c.user_id = u.id
                JOIN items i ON i.collection_id = c.id
                WHERE i.product_id = ?
              `;
              db.query(userQuery, [product.id], async (err, users) => {
                if (err) return console.error("Lỗi lấy user:", err);
                for (const user of users) {
                  await sendEmailNotify(
                    user.email,
                    product.name,
                    product.price,
                    newPrice,
                    product.url
                  );
                }
              });
            }
          } catch (error) {
            console.error("Lỗi xử lý sản phẩm:", product.name, error);
          }
        }

        offset += BATCH_SIZE;
        resolve(true); // còn batch
      });
    });
  };

  // Lặp batch cho đến khi hết
  let hasNext = true;
  while (hasNext) {
    hasNext = await runBatch();
  }
};

module.exports = { checkPrices, getNewPriceFromMarketplace };
