const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');

// Dashboard - show all folders and root files
router.get('/dashboard', folderController.requireAuth, folderController.showDashboard);

// Folder CRUD routes
router.get('/folder/create', folderController.requireAuth, folderController.showCreateFolder);
router.post('/folder/create', folderController.requireAuth, folderController.createFolder);
router.get('/folder/:id', folderController.requireAuth, folderController.showFolder);
router.get('/folder/:id/edit', folderController.requireAuth, folderController.showEditFolder);
router.post('/folder/:id/edit', folderController.requireAuth, folderController.updateFolder);
router.post('/folder/:id/delete', folderController.requireAuth, folderController.deleteFolder);

module.exports = router;