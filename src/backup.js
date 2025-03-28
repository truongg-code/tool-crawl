const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8081;
const limitComment = 50;

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
  const match = url.match(/i\.(\d+)\.(\d+)/);
  if (match) {
    return {
      shopId: match[1], // Phần đầu tiên sau "i."
      itemId: match[2], // Phần thứ hai sau "i."
    };
  }
  return null; // Trả về null nếu không tìm thấy
};

const urlProduct =
  "https://shopee.vn/V%C3%B2ng-tay-Cuff-MAYEBE-LAVEND-th%C3%A9p-titan-thi%E1%BA%BFt-k%E1%BA%BF-%C4%91%C6%A1n-gi%E1%BA%A3n-thanh-l%E1%BB%8Bch-th%E1%BB%9Di-trang-d%C3%A0nh-cho-nam-v%C3%A0-n%E1%BB%AF-i.130184653.19367776308?sp_atk=231ed952-1c37-4312-898b-ca78397a31fa&xptdk=231ed952-1c37-4312-898b-ca78397a31fa";

const paramsQuery = extractIds(urlProduct);

const itemId = paramsQuery?.itemId;
const shopId = paramsQuery?.shopId;

const urlCrawl = `https://shopee.vn/api/v2/item/get_ratings?exclude_filter=1&filter=0&filter_size=0&flag=1&fold_filter=0&itemid=${itemId}&limit=${limitComment}&offset=0&relevant_reviews=false&request_source=2&shopid=${shopId}&tag_filter=&type=1&variation_filters=`;

app.get("/shopee-ratings", async (req, res) => {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(urlCrawl);

    //thẻ <pre>
    await page.waitForSelector("pre");
    const preContent = await page.$eval("pre", (el) => el.textContent);

    await browser.close();

    // res.json({ success: true, data: JSON.parse(preContent) });
    const dataReceive = JSON.parse(preContent);

    // res.json(dataReceive);

    if (dataReceive?.data?.item_rating_summary?.rating_count[0] === 0)
      return res.json({ message: "No bad comment at 1 star" });

    const comments = dataReceive.data?.ratings.map((rating) => {
      if (!!rating?.comment)
        return {
          customerComment: processText(rating?.comment),
          shopComment: processText(
            rating.ItemRatingReply ? rating.ItemRatingReply.comment : ""
          ),
        };
      else return;
    });

    res.json(comments);

    //download file json
    // const filePath = path.join(__dirname, "comments.json");

    // // Writing the comments data to comments.json
    // fs.writeFileSync(filePath, JSON.stringify(comments, null, 2));

    // // Set the appropriate headers to prompt download
    // res.setHeader("Content-Disposition", "attachment; filename=comments.json");
    // res.setHeader("Content-Type", "application/json");
    // res.sendFile(filePath, (err) => {
    //   if (err) {
    //     res.status(500).send("Error downloading the file");
    //   } else {
    //     // delete the file after sending it to the user
    //     fs.unlinkSync(filePath);
    //   }
    // });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch data",
      error: error.message,
    });
  }
});

//ghi vào file csv
// (async () => {
//   try {
//     const browser = await puppeteer.launch({ headless: true });
//     const page = await browser.newPage();

//     await page.goto(urlCrawl);

//     // Lấy nội dung của thẻ <pre>
//     await page.waitForSelector("pre");
//     const preContent = await page.$eval("pre", (el) => el.textContent);

//     await browser.close();

//     // Parse dữ liệu JSON
//     const dataReceive = JSON.parse(preContent);

//     const comments = dataReceive.data?.ratings.map((rating) => {
//       return {
//         customerComment: processText(rating?.comment),
//         shopComment: processText(
//           rating.ItemRatingReply ? rating.ItemRatingReply.comment : null
//         ),
//       };
//     });

//     // Tạo nội dung CSV
//     const newCSVRows = comments.map(convertToCSV).join("\n");

//     const filePath = path.join(__dirname, "data.csv");

//     if (fs.existsSync(filePath)) {
//       // Nếu file đã tồn tại, thêm UTF-8 BOM nếu chưa có
//       const bom = "\uFEFF";
//       let fileContent = fs.readFileSync(filePath, "utf8");
//       if (!fileContent.startsWith(bom)) {
//         fileContent = bom + fileContent;
//         fs.writeFileSync(filePath, fileContent, "utf8");
//       }
//       // Append dữ liệu vào cuối file
//       fs.appendFileSync(filePath, `\n${newCSVRows}`, "utf8");
//       console.log("Dữ liệu đã được thêm vào file CSV.");
//     } else {
//       // Nếu file chưa tồn tại, thêm BOM vào đầu file
//       const header = "customerComment,shopComment\n";
//       fs.writeFileSync(filePath, `\uFEFF${header}${newCSVRows}`, "utf8");
//       console.log("File CSV mới đã được tạo.");
//     }
//   } catch (error) {
//     console.error("Error fetching data:", error);
//   }
// })();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// type: 0 => all
// "item_rating_summary": {
//   "rating_total": 239,
//   "rating_count": [
//       3,
//       0,
//       3,
//       15,
//       218
//   ],
//   "rcount_with_context": 98,
//   "rcount_with_image": 41,
//   "rcount_with_media": 43,
//   "rcount_local_review": 239,
//   "rcount_repeat_purchase": 0,
//   "rcount_overall_fit_small": 0,
//   "rcount_overall_fit_fit": 39,
//   "rcount_overall_fit_large": 6,
//   "rcount_oversea_review": 0,
//   "rcount_folded": 0,
//   "show_size_fitting": true,
//   "fit_small_percentage": 0,
//   "fit_fit_percentage": 87,
//   "fit_large_percentage": 13
// },

// https://www.lazada.vn/products/ke-nhua-co-banh-xe-3-5-tang-xe-day-spa-de-do-da-nang-ke-tien-loi-i2809880673-s14056111117.html?pvid=7fe8e4be-6f7c-4caa-9063-7bb280ecb948&search=jfy&scm=1007.45039.397834.0&priceCompare=skuId%3A14056111117%3Bsource%3Atpp-recommend-plugin-32104%3Bsn%3A7fe8e4be-6f7c-4caa-9063-7bb280ecb948%3BoriginPrice%3A32000%3BdisplayPrice%3A32000%3BsinglePromotionId%3A-1%3BsingleToolCode%3AmockedSalePrice%3BvoucherPricePlugin%3A0%3Btimestamp%3A1742292199191&spm=a2o4n.homepage.just4u.d_2809880673
