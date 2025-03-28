const db = require("../../models/db");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { Parser } = require("json2csv");
const { Readable } = require("stream");
const FormData = require("form-data");
const context = require("../../config/createContext");

const starArr = [1, 2, 3, 4, 5];
const pageArr = [1, 2, 3]; // lấy 5 trang mỗi sao
const batchSize = 5; // số lượng request đồng thời
const delayBetweenBatches = 500; // ms

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const fetchDataForStarTiki = async (
  productId = 0,
  star = 0,
  shopId = 0,
  page = 1
) => {
  const url = `https://tiki.vn/api/v2/reviews?limit=20&include=comments,contribute_info,attribute_vote_summary&sort=stars%7C${star}&page=${page}&spid=${shopId}&product_id=${productId}&seller_id=0`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
    });

    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const data = await response.json();
    return data.data || [];
  } catch (err) {
    console.error(`Error star ${star}, page ${page}:`, err.message);
    return [];
  }
};

const batchRun = async (tasks = [], batchSize = 5, delayMs = 500) => {
  const results = [];

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    console.log(
      `Running batch ${i / batchSize + 1} of ${Math.ceil(
        tasks.length / batchSize
      )}`
    );
    const batchResults = await Promise.all(batch.map((task) => task()));
    results.push(...batchResults.flat());

    if (i + batchSize < tasks.length) {
      await delay(delayMs);
    }
  }

  return results;
};

const extractNumbersFromUrlTiki = (url) => {
  const regex = /p(\d+)\.html|spid=(\d+)/g;
  let match;
  let numbers = [];

  while ((match = regex.exec(url)) !== null) {
    if (match[1]) numbers.push(match[1]);
    if (match[2]) numbers.push(match[2]);
  }

  return numbers;
};

const getCommentsTikiProduct = async (req, res) => {
  const urlProduct = req?.body?.urlPost;
  const paramsQuery = extractNumbersFromUrlTiki(urlProduct);
  const productId = paramsQuery?.[0];
  const shopId = paramsQuery?.[1];
  console.log("productId: ", productId);
  console.log("shopId: ", shopId);
  if (!shopId)
    return res.json({
      result: {
        over_view:
          "Số lượng bình luận không đủ để phân tích một cách trực quan về sản phẩm",
        point: null,
      },
    });

  const allTasks = [];

  starArr.forEach((star) => {
    pageArr.forEach((page) => {
      allTasks.push(() => fetchDataForStarTiki(productId, star, shopId, page));
    });
  });

  const allReviewData = await batchRun(
    allTasks,
    batchSize,
    delayBetweenBatches
  );

  const allComments = allReviewData
    .flat()
    .map((review) => {
      if (review?.content) {
        return {
          customer_comment: review?.content,
          shop_comment: review?.comments?.[0]?.content || "",
          image_comment: review?.images?.length > 0 ? 1 : 0,
          video_comment: review?.images?.length > 0 ? 1 : 0,
          star_rating: review?.rating,
        };
      }
    })
    .filter(Boolean);
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

  const fields = [
    "customer_comment",
    "shop_comment",
    "image_comment",
    "video_comment",
    "star_rating",
  ];
  const json2csvParser = new Parser({ fields });
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
    console.log("response from collab: ", response.data);

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
