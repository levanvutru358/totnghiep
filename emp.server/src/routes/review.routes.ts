import { Router } from 'express';
import { reviewController } from '../controllers/review.controller';
import { authenticate } from '../middleware/auth.middleware';
import { reviewImagesUpload } from '../middleware/upload.middleware';

const reviewRouter = Router();

reviewRouter.post('/', authenticate, reviewController.create);
reviewRouter.post('/upload', authenticate, reviewImagesUpload, reviewController.upload);
reviewRouter.delete('/:reviewId/images/:imageId', authenticate, reviewController.deleteImage);
reviewRouter.post('/:reviewId/like', authenticate, reviewController.like);
reviewRouter.delete('/:reviewId/like', authenticate, reviewController.unlike);
reviewRouter.get('/:reviewId', reviewController.detail);
reviewRouter.put('/:reviewId', authenticate, reviewController.update);
reviewRouter.delete('/:reviewId', authenticate, reviewController.remove);

export default reviewRouter;
