// First, install the required packages:
// npm install cloudinary multer-storage-cloudinary

const multer = require("multer");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const prisma = new PrismaClient();

const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/log-in");
};

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'file-uploader',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt', 'zip', 'rar'],
    resource_type: 'auto',
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      return `${file.fieldname}-${uniqueSuffix}`;
    },
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only images and documents are allowed!"));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter,
});

// Show upload form
exports.showUploadForm = async (req, res) => {
  try {
    const folders = await prisma.folder.findMany({
      where: { userId: req.user.id },
      orderBy: { name: "asc" },
    });

    const folderId = req.query.folder ? parseInt(req.query.folder) : null;
    let currentFolder = null;

    if (folderId) {
      currentFolder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          userId: req.user.id,
        },
      });
    }

    res.render("upload", {
      title: "Upload File",
      user: req.user,
      folders,
      currentFolder,
    });
  } catch (error) {
    console.error("Error loading upload form:", error);
    res.status(500).render("error", { error: "Failed to load upload form" });
  }
};

// Upload files
exports.uploadFile = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: "No files provided" 
    });
  }

  try {
    const folderId = req.body.folderId ? parseInt(req.body.folderId) : null;

    // Verify folder belongs to user if provided
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          userId: req.user.id,
        },
      });
      if (!folder) {
        return res.status(403).json({ 
          success: false, 
          error: "Access denied" 
        });
      }
    }

    // Save files info to database
    const savedFiles = [];
    
    for (const file of req.files) {
      const savedFile = await prisma.file.create({
        data: {
          originalName: file.originalname,
          filename: file.filename, // Cloudinary public_id
          mimetype: file.mimetype,
          size: file.size,
          url: file.path, // Cloudinary URL
          cloudinaryId: file.filename, // For deletion
          userId: req.user.id,
          folderId: folderId,
        },
      });
      savedFiles.push(savedFile);
    }

    res.json({
      success: true,
      message: `${savedFiles.length} file(s) uploaded successfully`,
      files: savedFiles.map(file => ({
        id: file.id,
        originalName: file.originalName,
        size: file.size,
        mimetype: file.mimetype,
        url: file.url
      })),
      redirectUrl: folderId ? `/folder/${folderId}` : "/dashboard"
    });

  } catch (error) {
    console.error("Error uploading files:", error);
    
    // Clean up Cloudinary files if database save failed
    if (req.files) {
      req.files.forEach(async (file) => {
        try {
          await cloudinary.uploader.destroy(file.filename);
        } catch (deleteError) {
          console.error("Error deleting from Cloudinary:", deleteError);
        }
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: "Failed to upload files" 
    });
  }
};

// Show file details
exports.showFileDetails = async (req, res) => {
  try {
    const file = await prisma.file.findFirst({
      where: {
        id: parseInt(req.params.id),
        userId: req.user.id,
      },
      include: {
        folder: true,
      },
    });

    if (!file) {
      return res.status(404).render("error", { error: "File not found" });
    }

    res.render("file-details", {
      title: file.originalName,
      user: req.user,
      file,
    });
  } catch (error) {
    console.error("Error loading file details:", error);
    res.status(500).render("error", { error: "Failed to load file details" });
  }
};

// Download file
exports.downloadFile = async (req, res) => {
  try {
    const file = await prisma.file.findFirst({
      where: {
        id: parseInt(req.params.id),
        userId: req.user.id,
      },
    });

    if (!file) {
      return res.status(404).render("error", { error: "File not found" });
    }

    // Create download URL from Cloudinary
    const downloadUrl = cloudinary.url(file.cloudinaryId, {
      flags: "attachment:" + file.originalName
    });
    
    res.redirect(downloadUrl);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).render("error", { error: "Failed to download file" });
  }
};

// Delete file
exports.deleteFile = async (req, res) => {
  try {
    const file = await prisma.file.findFirst({
      where: {
        id: parseInt(req.params.id),
        userId: req.user.id,
      },
    });

    if (!file) {
      return res.status(404).render("error", { error: "File not found" });
    }

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(file.cloudinaryId);
    } catch (cloudinaryError) {
      console.error("Error deleting from Cloudinary:", cloudinaryError);
    }

    // Delete from database
    await prisma.file.delete({
      where: { id: parseInt(req.params.id) },
    });

    if (file.folderId) {
      res.redirect(`/folder/${file.folderId}`);
    } else {
      res.redirect("/dashboard");
    }
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).render("error", { error: "Failed to delete file" });
  }
};

exports.uploadMiddleware = upload.array("files", 10);
exports.requireAuth = requireAuth;