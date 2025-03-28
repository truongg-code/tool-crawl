// https://ratingapi.sendo.vn/product/107831054/rating?page=1&limit=200&sort=review_score&v=2&star=5
// https://www.sendo.vn/ao-chong-nang-nam-chat-lieu-vai-kim-cuong-thoang-mat-kieu-dang-tre-trung-phong-cach-tien-loi-25966890.html?source_block_id=feed&source_page_id=home&source_info=desktop2_60_1742786040648_4cea1453-a13b-4176-937d-96bb7207f378_-1_ishyperhome0_0_7_9_-1

const puppeteer = require("puppeteer-extra");
const db = require("../../models/db");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { Parser } = require("json2csv");
const { Readable } = require("stream");
const FormData = require("form-data");
const context = require("../../config/createContext");

puppeteer.use(StealthPlugin());

const extractProductIdSendo = (url) => {
  const match = url.match(/-(\d+)\.html/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
};

const starArr = [1, 2, 3, 4, 5];
const pageArr = [1, 2];

const fetchDataForStarSendo = async (productId = 0, star = 0) => {
  const urlScratch = `https://ratingapi.sendo.vn/product/${productId}/rating?page=1&limit=200&sort=review_score&v=2&star=${star}`;

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(urlScratch);

  await page.waitForSelector("pre");
  const preContent = await page.$eval("pre", (el) => el.textContent);

  await browser.close();
  return JSON.parse(preContent);
};

const getCommentsSendoProduct = async (req, res) => {
  const urlProduct =
    "https://www.sendo.vn/ao-chong-nang-nam-chat-lieu-vai-kim-cuong-thoang-mat-kieu-dang-tre-trung-phong-cach-tien-loi-25966890.html?source_block_id=feed&source_page_id=home&source_info=desktop2_60_1742786040648_4cea1453-a13b-4176-937d-96bb7207f378_-1_ishyperhome0_0_7_9_-1";

  const productId = extractProductIdSendo(urlProduct);
  console.log("productId :", productId);

  const dataPerStarSendo = await Promise.all(
    starArr.map((star) => fetchDataForStarSendo(productId, star))
  );

  return res.json(dataPerStarSendo);

  // //xử lý và gộp dữ liệu
  // const allComments = await dataPerStarSendo.flatMap((dataReceive, index) => {
  //   const countKey = `count_star_${index + 1}`;
  //   if (dataReceive?.meta_data?.countKey === 0) return [{}];
  //   return dataReceive?.data
  //     ?.map((review) => {
  //       if (review?.content) {
  //         return {
  //           customer_comment: review?.content,
  //           shop_comment: review?.comments?.[0]?.content,
  //           image_comment: !!review?.images?.[0] ? 1 : 0,
  //           video_comment: !!review?.images?.[0] ? 1 : 0,
  //           star_rating: starArr[index],
  //         };
  //       }
  //     })
  //     .filter(Boolean);
  // });

  // if (allComments?.length === 1 && Object.keys(allComments?.[0]).length === 0) {
  //   return res.json({
  //     result:
  //       "Số lượng bình luận không đủ để phân tích một cách trực quan về sản phẩm",
  //   });
  // }

  // const fieldsCSV = [
  //   "customer_comment",
  //   "shop_comment",
  //   "image_comment",
  //   "video_comment",
  //   "star_rating",
  // ];
  // const json2csvParser = new Parser({ fieldsCSV });
  // const csv = json2csvParser.parse(allComments);

  // const stream = Readable.from(csv);

  // const formData = new FormData();
  // formData.append("file", stream, {
  //   filename: "comment.csv",
  //   contentType: "text/csv",
  // });

  // const urlColabPost = `${context?.getUrlColab()}/process-csv`;

  // try {
  //   const response = await axios.post(urlColabPost, formData, {
  //     headers: formData.getHeaders(),
  //   });
  //   res.json({
  //     message: "CSV File is sent to Google Colab",
  //     result: response?.data,
  //   });
  // } catch (error) {
  //   return res.json({
  //     message: "Error when sending to Google Colab",
  //     error: error.message,
  //   });
  // }
};

module.exports = {
  getCommentsSendoProduct,
};
