const express = require("express");

const {
  addCollection,
  getCollectionsByUserId,
  getUserCollectionsWithItems,
  addItemToCollection,
} = require("../controller/Collections/CollectionController");

const router = express.Router();

const collectionApiRoutes = (app) => {
  router.post("/add-collection", addCollection);
  router.post("/add-item-to-collection", addItemToCollection);
  router.get("/get-collections", getCollectionsByUserId);
  router.get("/get-collections-with-items", getUserCollectionsWithItems);

  return app.use("/api/collections", router);
};

module.exports = collectionApiRoutes;
