import { Request, Response } from 'express';
import { uploadService } from '../services/upload.service';
import { sendError, sendSuccess } from '../utils/api-response';

export const uploadController = {
  async upload(req: Request, res: Response) {
    try {
      const userId = req.user?.id ?? null;
      const files = (req.files as Express.Multer.File[]) ?? [];
      const saved = await uploadService.saveFiles(userId, files);
      return sendSuccess(res, 201, 'Uploaded', {
        files: saved.map((f: any) => ({ id: Number(f.id), url: f.url })),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UPLOAD_FAILED';
      if (message === 'NO_FILES_UPLOADED') return sendError(res, 400, 'No files uploaded', message);
      return sendError(res, 500, 'Upload failed', message);
    }
  },

  async remove(req: Request, res: Response) {
    try {
      await uploadService.deleteById(Number(req.params.id), req.user?.id);
      return sendSuccess(res, 200, 'File deleted', null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'DELETE_FAILED';
      if (message === 'UPLOAD_NOT_FOUND') return sendError(res, 404, 'Not found', message);
      if (message === 'FORBIDDEN_UPLOAD') return sendError(res, 403, 'Forbidden', message);
      return sendError(res, 500, 'Delete failed');
    }
  },
};
