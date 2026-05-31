import { Router } from 'express';
import { uploadController } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth.middleware';
import { genericImagesUpload } from '../middleware/upload.middleware';

const uploadRouter = Router();

uploadRouter.post('/', authenticate, genericImagesUpload, uploadController.upload);
uploadRouter.delete('/:id', authenticate, uploadController.remove);

export default uploadRouter;
