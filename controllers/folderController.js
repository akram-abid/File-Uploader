const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Middleware to ensure authentication
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/log-in');
};

// Show all folders and files
exports.showDashboard = async (req, res) => {
  try {
    const folders = await prisma.folder.findMany({
      where: { userId: req.user.id },
      include: {
        files: true,
        _count: {
          select: { files: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const rootFiles = await prisma.file.findMany({
      where: { 
        userId: req.user.id,
        folderId: null // Files not in any folder
      },
      orderBy: { createdAt: 'desc' }
    });

    res.render('dashboard', {
      title: 'My Files',
      user: req.user,
      folders,
      files: rootFiles
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).render('error', { error: 'Failed to load dashboard' });
  }
};

// Show create folder form
exports.showCreateFolder = (req, res) => {
  res.render('create-folder', {
    title: 'Create Folder',
    user: req.user
  });
};

// Create new folder
exports.createFolder = async (req, res) => {
  try {
    await prisma.folder.create({
      data: {
        name: req.body.name.trim(),
        userId: req.user.id
      }
    });
    res.redirect('/dashboard');
  } catch (error) {
    if (error.code === 'P2002') {
      res.render('create-folder', {
        title: 'Create Folder',
        user: req.user,
        error: 'Folder name already exists'
      });
    } else {
      console.error('Error creating folder:', error);
      res.status(500).render('error', { error: 'Failed to create folder' });
    }
  }
};

// Show folder contents
exports.showFolder = async (req, res) => {
  try {
    const folder = await prisma.folder.findFirst({
      where: {
        id: parseInt(req.params.id),
        userId: req.user.id
      },
      include: {
        files: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!folder) {
      return res.status(404).render('error', { error: 'Folder not found' });
    }

    res.render('folder', {
      title: folder.name,
      user: req.user,
      folder,
      files: folder.files
    });
  } catch (error) {
    console.error('Error loading folder:', error);
    res.status(500).render('error', { error: 'Failed to load folder' });
  }
};

// Show edit folder form
exports.showEditFolder = async (req, res) => {
  try {
    const folder = await prisma.folder.findFirst({
      where: {
        id: parseInt(req.params.id),
        userId: req.user.id
      }
    });

    if (!folder) {
      return res.status(404).render('error', { error: 'Folder not found' });
    }

    res.render('edit-folder', {
      title: 'Edit Folder',
      user: req.user,
      folder
    });
  } catch (error) {
    console.error('Error loading folder for edit:', error);
    res.status(500).render('error', { error: 'Failed to load folder' });
  }
};

// Update folder
exports.updateFolder = async (req, res) => {
  try {
    await prisma.folder.update({
      where: {
        id: parseInt(req.params.id)
      },
      data: {
        name: req.body.name.trim()
      }
    });
    res.redirect('/dashboard');
  } catch (error) {
    if (error.code === 'P2002') {
      const folder = await prisma.folder.findUnique({
        where: { id: parseInt(req.params.id) }
      });
      res.render('edit-folder', {
        title: 'Edit Folder',
        user: req.user,
        folder,
        error: 'Folder name already exists'
      });
    } else {
      console.error('Error updating folder:', error);
      res.status(500).render('error', { error: 'Failed to update folder' });
    }
  }
};

// Delete folder
exports.deleteFolder = async (req, res) => {
  try {
    await prisma.folder.delete({
      where: {
        id: parseInt(req.params.id)
      }
    });
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).render('error', { error: 'Failed to delete folder' });
  }
};

exports.requireAuth = requireAuth;