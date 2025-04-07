const express = require("express");

const {
  addCollection,
  getCollectionsByUserId,
  getUserCollectionsWithItems,
  addItemToMultipleCollections,
  deleteCollections,
  deleteSelectedItemsAndCollections,
} = require("../controller/Collections/CollectionController");
const {
  getCollectionsByUserIdWithBudget,
  getCollectionsByIdsWithOptionalBudget,
  getUserCollectionsWithOptionalBudgetAndFilter,
} = require("../controller/Collections/CollectionBudgetController");

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
  router.post(
    "/get-user-collections-with-optional-budget-and-filter",
    getUserCollectionsWithOptionalBudgetAndFilter
  );

  return app.use("/api/collections", router);
};

module.exports = collectionApiRoutes;
