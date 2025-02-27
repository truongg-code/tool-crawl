const express = require("express");
const {
  getCommentsProduct,
  submitDataForEvaluation,
} = require("../controller/Comments/CommentController");
const router = express.Router();

const initApiRoutes = (app) => {
  router.post("/shopee-ratings", getCommentsProduct);
  router.post("/sent-data", submitDataForEvaluation);

  return app.use("/api", router);
};

module.exports = initApiRoutes;
