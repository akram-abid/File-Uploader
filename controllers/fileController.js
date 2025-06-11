const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads directory exists
const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Save files to uploads folder
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp + original name
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const fileFilter = (req, file, cb) => {
  // Accept images, documents, etc.
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
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
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/log-in");
};

// Controller functions
exports.showUploadForm = (req, res) => {
  res.render("upload", {
    title: "Upload File",
    user: req.user,
  });
};

exports.uploadFile = (req, res) => {
  if (!req.file) {
    return res.render("upload", {
      title: "Upload File",
      user: req.user,
      error: "Please select a file to upload",
    });
  }

  console.log("File uploaded:", {
    originalName: req.file.originalname,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
    path: req.file.path,
    uploadedBy: req.user.username,
  });

  res.render("upload", {
    title: "Upload File",
    user: req.user,
    success: `File "${req.file.originalname}" uploaded successfully!`,
    fileInfo: {
      name: req.file.originalname,
      size: (req.file.size / 1024).toFixed(2) + " KB",
      type: req.file.mimetype,
    },
  });
};

// Export multer upload middleware
exports.uploadMiddleware = upload.single("file");
exports.requireAuth = requireAuth;
