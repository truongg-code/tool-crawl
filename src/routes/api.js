const express = require("express");
const {
  getCommentsProduct,
  submitDataForEvaluation,
} = require("../controller/Comments/CommentShopeeController");
const {
  getCommentsTikiProduct,
} = require("../controller/Comments/TestTikiController");

const {
  getCommentsSendoProduct,
} = require("../controller/Comments/CommentSendoController");

const router = express.Router();

const initApiRoutes = (app) => {
  router.post("/shopee-ratings", getCommentsProduct);
  router.post("/sent-data", submitDataForEvaluation);

  router.post("/tiki-ratings", getCommentsTikiProduct);

  router.get("/sendo-ratings", getCommentsSendoProduct);

  return app.use("/api", router);
};

module.exports = initApiRoutes;
