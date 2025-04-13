const db = require("../models/db");
const nodemailer = require("nodemailer");
const axios = require("axios");

const getNewPriceFromMarketplace = async (productUrl) => {
  return Math.floor(Math.random() * 1000000 + 10000); // Test giả lập
  // try {
  //   const res = await axios.get(productUrl, {
  //     headers: {
  //       "User-Agent":
  //         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
  //     },
  //   });
  //   console.log("res.data: ", res.data?.price);
  //   return res.data.price;
  // } catch (error) {
  //   console.error("Lỗi lấy giá sản phẩm:", error);
  //   return null;
  // }
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

const checkPrices = async () => {
  const productQuery = "SELECT id, name, price, url FROM products";
  db.query(productQuery, async (err, products) => {
    if (err) return console.error("DB error:", err);
    for (const product of products) {
      try {
        const newPrice = await getNewPriceFromMarketplace(product.url);
        if (newPrice < product.price) {
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
          FROM users_tiki u
          JOIN collections c ON c.user_id = u.id
          JOIN items i ON i.collection_id = c.id
          WHERE i.product_id = ? AND u.email IS NOT NULL
          `;

          db.query(userQuery, [product.id], async (err, users) => {
            if (err) return console.error("Lỗi lấy danh sách user:", err);
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
  });
};

module.exports = { checkPrices, getNewPriceFromMarketplace };
