const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Create a CloudinaryStorage instance with better handling for document types
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    console.log('Processing file:', file.originalname, 'MIME type:', file.mimetype);
    
    if (file.mimetype.startsWith('image/')) {
      return {
        folder: 'images',
        resource_type: 'image',
        access_mode: 'public', // Make files publicly accessible
        public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`
      };
    } else if (file.mimetype === 'application/pdf') {
      return {
        folder: 'documents',
        resource_type: 'raw',
        access_mode: 'public', // Make files publicly accessible
        format: 'pdf',
        public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, '_').replace(/\.pdf$/i, '')}`
      };
    } else {
      return {
        folder: 'documents',
        resource_type: 'raw',
        access_mode: 'public', // Make files publicly accessible
        public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`
      };
    }
  }
});

// File filter with improved mime type detection
const fileFilter = (req, file, cb) => {
  console.log('Filtering file in middleware:', file.originalname, 'MIME type:', file.mimetype);
  
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', 
    'application/vnd.ms-powerpoint', 
    'image/jpeg',
    'image/png',
    'image/gif'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.error('Rejected file in middleware:', file.originalname, 'MIME type:', file.mimetype);
    cb(new Error(`Unsupported file type: ${file.mimetype}. Only PDF, DOCX, DOC, PPTX, PPT, JPG, PNG, and GIF are allowed.`), false);
  }
};

// Set up multer with Cloudinary storage and file filter
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB file size limit
  }
});

// Add error handling middleware for multer errors
const handleMulterErrors = (err, req, res, next) => {
  if (err) {
    console.error('Upload error in middleware:', err);
    return res.status(400).json({
      error: `File upload error: ${err.message}`
    });
  }
  next();
};

module.exports = { upload, handleMulterErrors };