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

const starArr = [1, 2, 3, 4, 5];
const pageArr = [1, 2];

const fetchDataForStarTiki = async (productId = 0, star = 0, shopId = 0) => {
  const urlScratch = `https://tiki.vn/api/v2/reviews?limit=20&include=comments,contribute_info,attribute_vote_summary&sort=stars%7C${star}&page=1&spid=${shopId}&product_id=${productId}&seller_id=1`;
  const urlTest =
    "https://tiki.vn/api/v2/reviews?limit=20&include=comments,contribute_info,attribute_vote_summary&sort=stars%7C5&page=1&spid=57044927&product_id=57044926&seller_id=1";

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(urlScratch);

  await page.waitForSelector("pre");
  const preContent = await page.$eval("pre", (el) => el.textContent);

  await browser.close();
  return JSON.parse(preContent);
};

const extractNumbersFromUrlTiki = (url) => {
  // Sử dụng regex để tìm các số từ URL
  const regex = /p(\d+)\.html|spid=(\d+)/g;
  let match;
  let numbers = [];

  while ((match = regex.exec(url)) !== null) {
    // Lấy số từ cả hai nhóm trong regex
    if (match[1]) numbers.push(match[1]);
    if (match[2]) numbers.push(match[2]);
  }

  return numbers;
};

const getCommentsTikiProduct = async (req, res) => {
  // const urlProduct =
  //   "https://tiki.vn/giay-luoi-da-nam-cong-so-bui-leather-g107-da-bo-nappa-cao-cap-bao-hanh-12-thang-p134773001.html?itm_campaign=CTP_YPD_TKA_PLA_UNK_ALL_UNK_UNK_UNK_UNK_X.82586_Y.737545_Z.2864607_CN.G107&itm_medium=CPC&itm_source=tiki-ads&spid=134773003";
  const urlProduct = req?.body?.urlPost;

  const paramsQuery = extractNumbersFromUrlTiki(urlProduct);
  const productId = paramsQuery?.[0];
  const shopId = paramsQuery?.[1];
  console.log("productId: ", productId);
  console.log("shopId: ", shopId);

  const dataPerStarTiki = await Promise.all(
    starArr.map((star) => fetchDataForStarTiki(productId, star, shopId))
  );

  //xử lý và gộp dữ liệu
  const allComments = await dataPerStarTiki.flatMap((dataReceive, index) => {
    if (dataReceive?.stars?.[index + 1]?.count === 0) return [];
    return dataReceive?.data
      ?.map((review) => {
        if (review?.content) {
          return {
            customer_comment: review?.content,
            shop_comment: review?.comments?.[0]?.content || "",
            image_comment: !!review?.images?.[0] ? 1 : 0,
            video_comment: !!review?.images?.[0] ? 1 : 0,
            star_rating: starArr[index],
          };
        }
      })
      .filter(Boolean);
  });
  // console.log("allComments?.length: ", allComments?.length);

  // return res.json(allComments);

  if (allComments?.length === 0) {
    return res.json({
      result: {
        over_view:
          "Số lượng bình luận không đủ để phân tích một cách trực quan về sản phẩm",
        point: null,
      },
    });
  }

  const fieldsCSV = [
    "customer_comment",
    "shop_comment",
    "image_comment",
    "video_comment",
    "star_rating",
  ];
  const json2csvParser = new Parser({ fieldsCSV });
  const csv = json2csvParser.parse(allComments);

  const stream = Readable.from(csv);

  const formData = new FormData();
  formData.append("file", stream, {
    filename: "comment.csv",
    contentType: "text/csv",
  });

  const urlColabPost = `${context?.getUrlColab()}/process-csv`;

  try {
    const response = await axios.post(urlColabPost, formData, {
      headers: formData.getHeaders(),
    });
    console.log("response from collab: ", response);
    // if (response?.data?.point === null) {
    //   return res.json({
    //     result: response?.data

    //   });
    // }
    res.json({
      message: "CSV File is sent to Google Colab",
      result: response?.data,
    });
  } catch (error) {
    return res.json({
      message: "Error when sending to Google Colab",
      error: error.message,
    });
  }
};

module.exports = {
  getCommentsTikiProduct,
};
