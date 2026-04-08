import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const { uploadImage: uploadImageToCloudinary } = require('../services/cloudinaryService');

const router = express.Router();

// Ensure uploads directory exists for backward compatibility
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
const categoriesUploadDir = path.join(uploadsDir, 'categories');

// Create upload directories if they don't exist
const ensureUploadDirectories = () => {
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('Created uploads directory:', uploadsDir);
    }
    
    if (!fs.existsSync(categoriesUploadDir)) {
      fs.mkdirSync(categoriesUploadDir, { recursive: true });
      console.log('Created categories upload directory:', categoriesUploadDir);
    }
  } catch (error) {
    console.error('Error creating upload directories:', error);
  }
};

// Initialize directories on module load
ensureUploadDirectories();

// Configure multer for image uploads (memory storage for Cloudinary)
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only image files
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];
  
  const mimeType = file.mimetype.toLowerCase();
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(mimeType) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// POST /api/upload/image - Upload category image
router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const folder = String(req.query?.folder ?? 'categories').trim() || 'categories';
    const uploadResult = await uploadImageToCloudinary({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      folder: `uploads/${folder}`,
    });

    return res.json({
      success: true,
      url: uploadResult.url,
      key: uploadResult.publicId,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image', details: error?.message || error });
  }
});

// Error handling middleware for multer
router.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: error.message });
  }
  
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({ error: error.message });
  }
  
  next(error);
});

export default router;
