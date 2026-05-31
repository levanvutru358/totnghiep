import multer from 'multer';

const storage = multer.memoryStorage();

export const reviewImagesUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('INVALID_FILE_TYPE'));
      return;
    }
    cb(null, true);
  },
}).array('images', 5);

export const genericImagesUpload = reviewImagesUpload;

const productImageFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    cb(new Error('INVALID_FILE_TYPE'));
    return;
  }
  cb(null, true);
};

/** Tối đa 10 ảnh; field `images` (mới) hoặc `image` (tương thích cũ). */
export const productImageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: productImageFileFilter,
}).fields([
  { name: 'images', maxCount: 10 },
  { name: 'image', maxCount: 1 },
]);
