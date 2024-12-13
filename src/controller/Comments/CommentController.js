const puppeteer = require("puppeteer-extra");
const db = require("../../models/db");

const limitComment = 6;
const starArr = [1, 2, 3, 4, 5];

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

const convertToCSV = (row) => {
  const customerComment = `"${(row.customerComment || "").replace(
    /"/g,
    '""'
  )}"`;
  const shopComment = `"${(row.shopComment || "").replace(/"/g, '""')}"`;
  return `${customerComment},${shopComment}`;
};

const extractIds = (url) => {
  const match = url?.match(/i\.(\d+)\.(\d+)/);
  if (match) {
    return {
      shopId: match[1], // Phần đầu tiên sau "i."
      itemId: match[2], // Phần thứ hai sau "i."
    };
  }
  return null; // Trả về null nếu không tìm thấy
};

const urlProduct =
  "https://shopee.vn/Qu%E1%BA%A7n-%C3%A1o-th%E1%BB%83-thao-nam-n%E1%BB%AF-form-r%E1%BB%99ng-H%C3%A0n-Qu%E1%BB%91c-B%E1%BB%99-%C4%91%E1%BB%93-thu-%C4%91%C3%B4ng-nam-n%E1%BB%AF-unisex-02-i.295296178.18935223793?sp_atk=5edb3f3c-438f-4b76-a3d4-634e6f7908bf&xptdk=5edb3f3c-438f-4b76-a3d4-634e6f7908bf";

const getCommentsProduct = async (req, res) => {
  const urlProduct = req?.body?.urlPost;
  const paramsQuery = extractIds(urlProduct);

  const itemId = paramsQuery?.itemId;
  const shopId = paramsQuery?.shopId;
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

    // xử lý và gộp dữ liệu
    const allComments = await dataPerStar.flatMap((dataReceive, index) => {
      if (dataReceive?.data?.item_rating_summary?.rating_count[0] === 0) {
        return []; // không có đánh giá ở mức sao này
      }

      return dataReceive.data?.ratings
        .map((rating) => {
          if (!!rating?.comment) {
            return {
              shouldBuy: starArr[index] >= 4 ? 1 : 0,
              customerComment: processText(rating?.comment),
              shopComment: processText(
                rating.ItemRatingReply ? rating.ItemRatingReply.comment : ""
              ),
            };
          }
          return null;
        })
        .filter(Boolean); // lọc bỏ các giá trị null
    });

    const formattedData = allComments.map((item) => [
      !!(item?.customerComment === null)
        ? "Khách hàng không có bình luận"
        : item?.customerComment,
      !!(item?.shopComment === null)
        ? "Shop không có phản hồi"
        : item?.shopComment,

      item?.shouldBuy === 0 && item?.shopComment !== null ? 1 : item?.shouldBuy,
    ]);

    // res.json(formattedData);
    // CREATE UNIQUE INDEX idx_customer_shop_comment ON comments_data (customer_comment, shop_comment); => đã tạo UNIQUE Index cho cặp cột customer_comment và shop_comment
    const sql = `
  INSERT IGNORE INTO comments_data (customer_comment, shop_comment, is_buy)
  VALUES ?
`;

    db.query(sql, [formattedData], (err, result) => {
      if (err) {
        console.error("Error inserting data:", err);
        return;
      }
      // console.log("Insert done, affected rows:", result.affectedRows);
      res.json({ success: true, affectedRows: result.affectedRows });
      // res.json(allComments);
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

module.exports = {
  getCommentsProduct,
};
