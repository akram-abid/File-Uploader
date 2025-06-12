const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

// File upload routes
router.get('/upload', fileController.requireAuth, fileController.showUploadForm);
router.post('/upload', 
  fileController.requireAuth,
  fileController.uploadMiddleware,
  fileController.uploadFile
);

// File detail and download routes
router.get('/file/:id', fileController.requireAuth, fileController.showFileDetails);
router.get('/file/:id/download', fileController.requireAuth, fileController.downloadFile);
router.post('/file/:id/delete', fileController.requireAuth, fileController.deleteFile);

module.exports = router;