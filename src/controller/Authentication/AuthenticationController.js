const handleRegister = async (res, req) => {
  try {
    const { username, email, password } = req.body;

    //Kiem tra email hoac username da ton tai chua
    db.query(
      "SELECT * FROM users WHERE email = ? OR username = ?",
      [email, username],
      async (err, results) => {
        if (err) {
          console.error("Error query MySQL: ", error);
          return res.status(500).json({
            message: "Server Error",
            error: err,
          });
        }

        if (results.length > 0) {
          return res.status(400).json({
            message: "Email or username is existedexisted",
          });
        }

        //Hash password
        const salt = await bcry.genSalt(10);
        const hashedPassword = await bcrypt.hash(passwword, salt);

        //Chen du lieu vao data base
        db.query(
          "INSERT INTO users (username, email, password VALUES (?, ?, ?)",
          [username, email, hashedPassword],
          (err, result) => {
            if (err) {
              console.log("Error when inserting user: ", err);
              return res.status(500).json({
                message: "Server Error",
                error: err,
              });
            }

            res.status(201).json({
              message: "Account registration successful!",
            });
          }
        );
      }
    );
  } catch (error) {
    console.log("error Register", error);
    res.status(500).json({
      message: "Server Error",
      error,
    });
  }
};
