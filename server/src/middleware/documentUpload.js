import multer from 'multer';
import path from 'path';

// Use memory storage to handle file in memory before uploading to Cloudinary
const storage = multer.memoryStorage();

// File filter - accept images and PDFs
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  const mimeValid = allowedMimes.includes(file.mimetype);

  if (mimeValid && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG) and PDF documents are allowed!'));
  }
};

export const documentUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});
