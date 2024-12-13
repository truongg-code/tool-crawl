const express = require("express");
const {
  getCommentsProduct,
} = require("../controller/Comments/CommentController");
const router = express.Router();

const initApiRoutes = (app) => {
  router.post("/shopee-ratings", getCommentsProduct);

  return app.use("/api", router);
};

module.exports = initApiRoutes;
