require("dotenv").config();
const express = require("express");
const puppeteer = require("puppeteer-extra");
const fs = require("fs");
const path = require("path");
const initApiRoutes = require("./routes/api");
const cors = require("cors");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const connection = require("./models/db");
const context = require("./config/createContext");
const { getNgrokUrl } = require("./utils/generalFunctions");
const bodyParser = require("body-parser");
const authRoutes = require("./routes/authRoutes");

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 8081;
const fileId = process.env.FILEID;
const apiKey = process.env.APIKEY;
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

const urlGetUrlColab = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;

const initializeContext = async () => {
  try {
    const urlColab = await getNgrokUrl(urlGetUrlColab);
    if (!!urlColab) context?.setUrlColab(urlColab);
    console.log("urlColab: ", context.getUrlColab());
  } catch (error) {
    console.log("error initializeContext: ", error);
  }
};

initializeContext().then(() => {
  initApiRoutes(app);

  app.use("/api/auth", authRoutes);

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
