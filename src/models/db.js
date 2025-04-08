const mysql = require("mysql2");
const dbConfig = require("../config/db.config.js");

//create connection with database
const connection = mysql.createConnection({
  host: dbConfig.HOST,
  user: dbConfig.USER,
  password: dbConfig.PASSWORD,
  database: dbConfig.DB,
});
// const connection = mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   port: process.env.DB_PORT,
// });

//open the MySQL connection
connection.connect((error) => {
  if (error) throw error;
  console.log("Successfully connected to the database");
});

module.exports = connection;
