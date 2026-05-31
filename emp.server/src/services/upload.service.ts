import fs from 'fs';
import path from 'path';
import cloudinary from '../configs/cloudinary.config';
import { uploadRepository } from '../repositories/upload.repository';

const uploadsDir = path.join(process.cwd(), 'uploads');

const ensureUploadsDir = () => {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
};

const hasCloudinary = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

export const uploadService = {
  async saveFiles(userId: number | null, files: Express.Multer.File[]) {
    if (!files.length) throw new Error('NO_FILES_UPLOADED');
    ensureUploadsDir();

    const saved = [];
    for (const file of files) {
      let url: string;
      let publicId: string | null = null;

      if (hasCloudinary()) {
        const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'emp-reviews', resource_type: 'image' },
            (err, res) => (err || !res ? reject(err ?? new Error('CLOUDINARY_UPLOAD_FAILED')) : resolve(res)),
          );
          stream.end(file.buffer);
        });
        url = result.secure_url;
        publicId = result.public_id;
      } else {
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname) || '.jpg'}`;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, file.buffer);
        const base = process.env.PUBLIC_UPLOAD_BASE_URL ?? `http://localhost:${process.env.PORT || 8000}/uploads`;
        url = `${base}/${filename}`;
      }

      const row = await uploadRepository.create({
        userId,
        url,
        publicId,
        mimeType: file.mimetype,
        fileSize: file.size,
      });
      saved.push(row);
    }
    return saved;
  },

  async deleteById(uploadId: number, userId?: number) {
    const file = await uploadRepository.getById(uploadId);
    if (!file) throw new Error('UPLOAD_NOT_FOUND');
    if (userId && file.user_id && Number(file.user_id) !== userId) throw new Error('FORBIDDEN_UPLOAD');

    if (file.public_id && hasCloudinary()) {
      await cloudinary.uploader.destroy(file.public_id);
    } else if (file.url.includes('/uploads/')) {
      const name = path.basename(file.url);
      const filepath = path.join(uploadsDir, name);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    }

    await uploadRepository.remove(uploadId);
  },
};
