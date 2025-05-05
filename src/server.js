require("dotenv").config();
const express = require("express");
const puppeteer = require("puppeteer-extra");

const initApiRoutes = require("./routes/api");
const cors = require("cors");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

const context = require("./config/createContext");
const { getNgrokUrl } = require("./utils/generalFunctions");
const bodyParser = require("body-parser");
const collectionApiRoutes = require("./routes/collectionRoutes");

const cron = require("node-cron");
const {
  checkPrices,
  getNewPriceFromMarketplace,
} = require("./services/priceMonitor");
const syncTikiRoutes = require("./routes/authSyncTikiRoutes");

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
  collectionApiRoutes(app);
  syncTikiRoutes(app);

  // getNewPriceFromMarketplace(
  //   "https://tiki.vn/api/v2/products/7982628?platform=web&spid=7982629&version=3"
  // );

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

// kiểm tra giá và gửi mail nếu sản phẩm được giảm giá
cron.schedule("0 0 */12 * * *", () => {
  // cron.schedule("* * * * *", () => {
  console.log("Kiểm tra giá sản phẩm...");
  checkPrices();
});
