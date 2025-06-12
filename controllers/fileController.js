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

// Configure Cloudinary with error handling
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Test Cloudinary connection
const testCloudinary = async () => {
  try {
    const result = await cloudinary.api.ping();
    console.log('Cloudinary connection successful:', result);
  } catch (error) {
    console.error('Cloudinary connection failed:', error);
  }
};

// Call test on startup
testCloudinary();

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

// Enhanced file filter with better error messages
const fileFilter = (req, file, cb) => {
  console.log('File filter - Processing file:', file.originalname, 'Mimetype:', file.mimetype);
  
  const allowedMimetypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'application/zip', 'application/x-rar-compressed'
  ];
  
  const allowedExtensions = /\.(jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar)$/i;
  
  const extname = allowedExtensions.test(file.originalname);
  const mimetype = allowedMimetypes.includes(file.mimetype);

  if (mimetype && extname) {
    console.log('File accepted:', file.originalname);
    return cb(null, true);
  } else {
    console.log('File rejected:', file.originalname, 'Mimetype:', file.mimetype);
    cb(new Error(`File type not allowed. Allowed types: images, PDF, DOC, DOCX, TXT, ZIP, RAR`));
  }
};

// Configure multer with error handling
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files
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

// Enhanced upload handler with better error handling
exports.uploadFile = async (req, res) => {
  console.log('Upload attempt started');
  console.log('Request files:', req.files);
  console.log('Request body:', req.body);
  console.log('User:', req.user ? req.user.id : 'No user');

  // Check authentication
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: "User not authenticated" 
    });
  }

  // Check if files were provided
  if (!req.files || req.files.length === 0) {
    console.log('No files provided in request');
    return res.status(400).json({ 
      success: false, 
      error: "No files provided" 
    });
  }

  try {
    const folderId = req.body.folderId ? parseInt(req.body.folderId) : null;
    console.log('Folder ID:', folderId);

    // Verify folder belongs to user if provided
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          userId: req.user.id,
        },
      });
      if (!folder) {
        console.log('Folder access denied for user:', req.user.id, 'folder:', folderId);
        return res.status(403).json({ 
          success: false, 
          error: "Access denied to folder" 
        });
      }
    }

    // Save files info to database
    const savedFiles = [];
    
    for (const file of req.files) {
      console.log('Processing file:', file.originalname);
      console.log('File details:', {
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
      });

      try {
        // Fixed: Only include fields that exist in your Prisma schema
        const savedFile = await prisma.file.create({
          data: {
            originalName: file.originalname,
            filename: file.filename, // This contains the Cloudinary public_id
            mimetype: file.mimetype,
            size: file.size,
            path: file.path, // This contains the Cloudinary URL
            userId: req.user.id,
            folderId: folderId,
          },
        });
        console.log('File saved to database:', savedFile.id);
        savedFiles.push(savedFile);
      } catch (dbError) {
        console.error('Database error for file:', file.originalname, dbError);
        throw dbError;
      }
    }

    console.log('All files processed successfully');
    res.json({
      success: true,
      message: `${savedFiles.length} file(s) uploaded successfully`,
      files: savedFiles.map(file => ({
        id: file.id,
        originalName: file.originalName,
        size: file.size,
        mimetype: file.mimetype,
        path: file.path // Using path instead of url since that's what your schema has
      })),
      redirectUrl: folderId ? `/folder/${folderId}` : "/dashboard"
    });

  } catch (error) {
    console.error("Detailed upload error:", error);
    
    // Clean up Cloudinary files if database save failed
    if (req.files) {
      console.log('Cleaning up Cloudinary files due to error');
      for (const file of req.files) {
        try {
          await cloudinary.uploader.destroy(file.filename);
          console.log('Cleaned up Cloudinary file:', file.filename);
        } catch (deleteError) {
          console.error("Error deleting from Cloudinary:", deleteError);
        }
      }
    }
    
    res.status(500).json({ 
      success: false, 
      error: "Failed to upload files: " + error.message 
    });
  }
};

// Middleware wrapper to handle multer errors
exports.uploadMiddleware = (req, res, next) => {
  upload.array("files", 10)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 10MB.'
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          error: 'Too many files. Maximum is 10 files.'
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Upload error: ' + err.message
      });
    } else if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
    next();
  });
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

    // Create download URL from Cloudinary using filename (which contains the public_id)
    const downloadUrl = cloudinary.url(file.filename, {
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

    // Delete from Cloudinary using filename (which contains the public_id)
    try {
      await cloudinary.uploader.destroy(file.filename);
      console.log('File deleted from Cloudinary:', file.filename);
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

exports.requireAuth = requireAuth;