const puppeteer = require("puppeteer-extra");
const db = require("../../models/db");
const axios = require("axios");

const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

const starArr = [0];
const pageArr = [1, 2];

const fetchDataForStarLazada = async (itemId, star = 0) => {
  const urlScratch = `https://my.lazada.vn/pdp/review/getReviewList?itemId=${itemId}&pageSize=50&filter=${star}&sort=0&pageNo=0`;

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(urlScratch);

  await page.waitForSelector("pre");
  const preContent = await page.$eval("pre", (el) => el.textContent);

  await browser.close();
  return JSON.parse(preContent);
};

const extractItemIdLazada = (url) => {
  const match = url.match(/d_(\d+)$/);
  return match ? match[1] : null;
};

const getCommentsLazProduct = async (req, res) => {
  const urlProduct =
    "https://www.lazada.vn/products/ke-nhua-co-banh-xe-3-5-tang-xe-day-spa-de-do-da-nang-ke-tien-loi-i2809880673-s14056111117.html?pvid=7fe8e4be-6f7c-4caa-9063-7bb280ecb948&search=jfy&scm=1007.45039.397834.0&priceCompare=skuId%3A14056111117%3Bsource%3Atpp-recommend-plugin-32104%3Bsn%3A7fe8e4be-6f7c-4caa-9063-7bb280ecb948%3BoriginPrice%3A32000%3BdisplayPrice%3A32000%3BsinglePromotionId%3A-1%3BsingleToolCode%3AmockedSalePrice%3BvoucherPricePlugin%3A0%3Btimestamp%3A1742292199191&spm=a2o4n.homepage.just4u.d_2809880673";

  const itemId = extractItemIdLazada(urlProduct);
  console.log("itemId: ", itemId);

  const dataPerStar = await Promise.all(
    starArr.map((star) => fetchDataForStarLazada(itemId, star))
  );

  return res.json(dataPerStar);
};

module.exports = {
  getCommentsLazProduct,
};
