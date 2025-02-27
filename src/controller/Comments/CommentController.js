const puppeteer = require("puppeteer-extra");
const db = require("../../models/db");
const axios = require("axios");
const { Parser } = require("json2csv");
const fs = require("fs");
const { Readable } = require("stream");
const FormData = require("form-data");
const context = require("../../config/createContext");

const {
  insertProductIdAndShopId,
  deleteProductIdAndShopId,
} = require("../ShopProducts/ShopProductController");

const limitComment = 30;
// const starArr = [1, 2, 3, 4, 5];
const starArr = [5];

const processText = (text) => {
  if (!text) return null;

  // chia chuỗi bằng dấu \n
  const parts = text.split("\n");

  // nếu có đủ ít nhất 4 phần, bỏ hết các phần trước dấu \n thứ 4, nếu không, trả về văn bản ban đầu
  let processedText = parts.length >= 4 ? parts.slice(3).join(" ") : text;

  // xóa tất cả dấu xuống dòng và dấu cộng
  processedText = processedText.replace(/\n/g, "").replace(/\+/g, "");

  return processedText;
};

const extractIds = (url) => {
  const match = url?.match(/i\.(\d+)\.(\d+)/);
  if (match) {
    return {
      shopId: match[1], // phần đầu tiên sau "i."
      itemId: match[2], // phần thứ hai sau "i."
    };
  }
  return null; // trả về null nếu không tìm thấy
};

const urlProduct =
  "https://shopee.vn/Qu%E1%BA%A7n-%C3%A1o-th%E1%BB%83-thao-nam-n%E1%BB%AF-form-r%E1%BB%99ng-H%C3%A0n-Qu%E1%BB%91c-B%E1%BB%99-%C4%91%E1%BB%93-thu-%C4%91%C3%B4ng-nam-n%E1%BB%AF-unisex-02-i.295296178.18935223793?sp_atk=5edb3f3c-438f-4b76-a3d4-634e6f7908bf&xptdk=5edb3f3c-438f-4b76-a3d4-634e6f7908bf";

const getCommentsProduct = async (req, res) => {
  const urlProduct = req?.body?.urlPost;
  const paramsQuery = extractIds(urlProduct);

  const itemId = paramsQuery?.itemId;
  const shopId = paramsQuery?.shopId;
  if (!itemId && !shopId) return;
  console.log("itemId: ", itemId);
  console.log("shopId: ", shopId);

  const urlCrawl = `https://shopee.vn/api/v2/item/get_ratings?exclude_filter=1&filter=0&filter_size=0&flag=1&fold_filter=0&itemid=${itemId}&limit=${limitComment}&offset=0&relevant_reviews=false&request_source=2&shopid=${shopId}&tag_filter=&type=0&variation_filters=`;
  try {
    const resTest = await insertProductIdAndShopId(shopId, itemId);
    console.log("resTest: ", resTest);

    if (resTest === 0) {
      res.json({
        message: "Dữ liệu về bình luận của sản phẩm đã tồn tại",
      });
      return;
    }

    const fetchDataForStar = async (star) => {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      const url = `https://shopee.vn/api/v2/item/get_ratings?exclude_filter=1&filter=0&filter_size=0&flag=1&fold_filter=0&itemid=${itemId}&limit=${limitComment}&offset=0&relevant_reviews=false&request_source=2&shopid=${shopId}&tag_filter=&type=${star}&variation_filters=`;

      await page.goto(url);

      // đợi thẻ <pre> xuất hiện
      await page.waitForSelector("pre");
      const preContent = await page.$eval("pre", (el) => el.textContent);

      await browser.close();

      return JSON.parse(preContent);
    };

    const dataPerStar = await Promise.all(
      starArr.map((star) => fetchDataForStar(star))
    );

    // xử lý và gộp dữ liệu
    const allComments = await dataPerStar.flatMap((dataReceive, index) => {
      if (dataReceive?.data?.item_rating_summary?.rating_count[index] === 0) {
        return [{}]; // không có đánh giá ở mức sao này
      }

      return dataReceive.data?.ratings
        .map((rating) => {
          if (!!rating?.comment) {
            return {
              customerComment: processText(rating?.comment),
              shopComment: processText(
                rating.ItemRatingReply ? rating.ItemRatingReply.comment : ""
              ),
              imageComment: !!rating?.images ? 1 : 0,
              videoComment: !!rating?.images ? 1 : 0,
              starRating: starArr[index],
            };
          }
          return null;
        })
        .filter(Boolean); // lọc bỏ các giá trị null
    });

    console.log("dataPerStar: ", dataPerStar);

    const formattedData = allComments.map((item) => {
      if (item?.customerComment !== null) {
        return [
          item?.customerComment,
          !!(item?.shopComment === null)
            ? "Shop không có phản hồi"
            : item?.shopComment,
          item?.imageComment,
          item?.videoComment,
          item?.starRating,
        ];
      } else return;
    });

    // res.json(formattedData);
    // CREATE UNIQUE INDEX idx_customer_shop_comment ON comments_data (customer_comment, shop_comment); => đã tạo UNIQUE Index cho cặp cột customer_comment và shop_comment

    const sql = `
      INSERT IGNORE INTO comments_data (customer_comment, shop_comment, image_comment, video_comment, star_rating)
      VALUES ?
    `;

    // Loại bỏ các mảng rỗng
    const cleanedData = formattedData.filter(
      (row) => !row.every((field) => !field || field === "")
    );

    if (!!cleanedData?.length > 0) {
      db.query(sql, [cleanedData], async (err, result) => {
        if (err) {
          console.error("Error inserting data:", err.message);
          await deleteProductIdAndShopId(shopId, itemId);
          return res.json({ success: false, message: "SQL Error", error: err });
        }

        res.json({
          success: true,
          affectedRows: result?.affectedRows,
        });
      });
    } else
      res.json({
        message: "Sản phẩm không có bình luận đánh giá",
      });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch data",
      error: error.message,
    });
  }
};

const submitDataForEvaluation = async (req, res) => {
  const urlProduct = req?.body?.urlPost;
  const paramsQuery = extractIds(urlProduct);

  const itemId = paramsQuery?.itemId;
  const shopId = paramsQuery?.shopId;
  if (!itemId && !shopId) return;
  console.log("itemId: ", itemId);
  console.log("shopId: ", shopId);

  const urlCrawl = `https://shopee.vn/api/v2/item/get_ratings?exclude_filter=1&filter=0&filter_size=0&flag=1&fold_filter=0&itemid=${itemId}&limit=${limitComment}&offset=0&relevant_reviews=false&request_source=2&shopid=${shopId}&tag_filter=&type=0&variation_filters=`;
  try {
    const fetchDataForStar = async (star) => {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      const url = `https://shopee.vn/api/v2/item/get_ratings?exclude_filter=1&filter=0&filter_size=0&flag=1&fold_filter=0&itemid=${itemId}&limit=${limitComment}&offset=0&relevant_reviews=false&request_source=2&shopid=${shopId}&tag_filter=&type=${star}&variation_filters=`;

      await page.goto(url);

      // đợi thẻ <pre> xuất hiện
      await page.waitForSelector("pre");
      const preContent = await page.$eval("pre", (el) => el.textContent);

      await browser.close();

      return JSON.parse(preContent);
    };

    const dataPerStar = await Promise.all(
      starArr.map((star) => fetchDataForStar(star))
    );

    // xử lý và gộp dữ liệu
    const allComments = await dataPerStar.flatMap((dataReceive, index) => {
      if (dataReceive?.data?.item_rating_summary?.rating_count[index] === 0) {
        return [{}]; // không có đánh giá ở mức sao này
      }

      return dataReceive.data?.ratings
        .map((rating) => {
          if (!!rating?.comment) {
            return {
              customer_comment: processText(rating?.comment),
              shop_comment: processText(
                rating.ItemRatingReply ? rating.ItemRatingReply.comment : ""
              ),
              image_comment: !!rating?.images ? 1 : 0,
              video_comment: !!rating?.images ? 1 : 0,
              star_rating: starArr[index],
            };
          }
          return null;
        })
        .filter(Boolean); // lọc bỏ các giá trị null
    });

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
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch data",
      error: error.message,
    });
  }
};

module.exports = {
  getCommentsProduct,
  submitDataForEvaluation,
};

// const item_rating_summary = dataPerStar[0]?.data?.item_rating_summary;

// console.log("item_rating_summary: ", item_rating_summary);
// item_rating_summary:  {
//   rating_total: 815,
//   rating_count: [ 7, 15, 30, 70, 693 ],
//   rcount_with_context: 389,
//   rcount_with_image: 129,
//   rcount_with_media: 158,
//   rcount_local_review: 815,
//   rcount_repeat_purchase: 0,
//   rcount_overall_fit_small: 1,
//   rcount_overall_fit_fit: 0,
//   rcount_overall_fit_large: 0,
//   rcount_oversea_review: 0,
//   rcount_folded: 0
// }
