const express = require("express");
const puppeteer = require("puppeteer-extra");
const fs = require("fs");
const path = require("path");
const initApiRoutes = require("./routes/api");
const cors = require("cors");

const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const connection = require("./models/db");

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 8081;

app.use(express.json());
app.use(cors());

initApiRoutes(app);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
