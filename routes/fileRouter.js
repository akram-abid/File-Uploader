const express = require("express");
const router = express.Router();
const fileController = require("../controllers/fileController");

router.get(
  "/upload",
  fileController.requireAuth,
  fileController.showUploadForm
);

router.post(
  "/upload",
  fileController.requireAuth,
  fileController.uploadMiddleware,
  fileController.uploadFile
);

module.exports = router;
