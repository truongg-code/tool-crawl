const express = require("express");

const {
  addCollection,
  getCollectionsByUserId,
  getUserCollectionsWithItems,
  addItemToMultipleCollections,
  deleteCollections,
  deleteSelectedItemsAndCollections,
  getCollectionsByUserIdWithBudget,
} = require("../controller/Collections/CollectionController");

const router = express.Router();

const collectionApiRoutes = (app) => {
  router.post("/add-collection", addCollection);
  router.post("/add-item-to-collections", addItemToMultipleCollections);
  router.get("/get-collections", getCollectionsByUserId);
  router.get("/get-collections-with-items", getUserCollectionsWithItems);
  router.delete("/delete-collections", deleteCollections);
  router.delete("/delete-selected", deleteSelectedItemsAndCollections);
  router.get(
    "/get-collections-with-items-by-budget",
    getCollectionsByUserIdWithBudget
  );

  return app.use("/api/collections", router);
};

module.exports = collectionApiRoutes;
