const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../models/db");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Kiểm tra email hoặc username đã tồn tại chưa
    db.query(
      "SELECT * FROM users WHERE email = ? OR username = ?",
      [email, username],
      async (err, results) => {
        if (err) {
          console.error("Lỗi truy vấn MySQL:", err);
          return res.status(500).json({ message: "Lỗi server", error: err });
        }

        if (results.length > 0) {
          return res.status(400).json({
            message: "Email hoặc username đã tồn tại",
          });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Chèn dữ liệu vào database
        db.query(
          "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
          [username, email, hashedPassword],
          (err, result) => {
            if (err) {
              console.error("Lỗi khi thêm user:", err);
              return res
                .status(500)
                .json({ message: "Lỗi server", error: err });
            }

            res.status(201).json({
              message: "Đăng ký tài khoản thành công!",
            });
          }
        );
      }
    );
  } catch (error) {
    console.log("error Register", error);
    res.status(500).json({
      message: "Lỗi server",
      error,
    });
  }
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Kiem tr email co ton tai khongkhong
  const checkUserQuery = "SELECT * FROM users WHERE email = ?";
  db.query(checkUserQuery, [email], (err, results) => {
    if (err) {
      console.log("Lỗi khi tìm kiếm người dùng:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
    if (results.length === 0) {
      return res
        .status(400)
        .json({ message: "Email hoặc mật khẩu không đúng", isOk: false });
    }

    const user = results[0];

    // Kiem tra mat khau
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.log("Lỗi khi kiểm tra mật khẩu:", err);
        return res.status(500).json({ message: "Lỗi server" });
      }
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "Email hoặc mật khẩu không đúng", isOk: false });
      }

      // Tao JWT Token
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      res.json({
        isOk: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });
    });
  });
});

module.exports = router;
