const express = require("express");
const router = express.Router();
const {
  syncTikiUser,
  syncCartFromTiki,
} = require("../controller/TikiAccount/TikiUserController");

const syncTikiRoutes = (app) => {
  router.post("/sync/tiki-user", syncTikiUser);
  router.post("/sync/tiki-cart", syncCartFromTiki);

  return app.use("/api", router);
};

module.exports = syncTikiRoutes;
