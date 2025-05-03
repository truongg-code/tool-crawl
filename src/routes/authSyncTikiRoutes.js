const express = require("express");
const router = express.Router();
const {
  syncTikiUser,
  syncCartFromTiki,
  updateReceiveEmail,
} = require("../controller/TikiAccount/TikiUserController");

const syncTikiRoutes = (app) => {
  router.post("/sync/tiki-user", syncTikiUser);
  router.post("/sync/tiki-cart", syncCartFromTiki);
  router.post("/sync/update-receive-email", updateReceiveEmail);

  return app.use("/api", router);
};

module.exports = syncTikiRoutes;
