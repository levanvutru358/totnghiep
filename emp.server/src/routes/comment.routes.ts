import { Router } from 'express';
import { commentController } from '../controllers/comment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { genericImagesUpload } from '../middleware/upload.middleware';

const commentRouter = Router();

commentRouter.post('/', authenticate, commentController.create);
commentRouter.post('/upload', authenticate, genericImagesUpload, commentController.upload);
commentRouter.post('/reply', authenticate, commentController.reply);
commentRouter.post('/mention', authenticate, commentController.mention);
commentRouter.delete('/:commentId/images/:imageId', authenticate, commentController.deleteImage);
commentRouter.get('/:commentId/replies', commentController.listReplies);
commentRouter.get('/:commentId', commentController.detail);
commentRouter.put('/:commentId', authenticate, commentController.update);
commentRouter.delete('/:commentId', authenticate, commentController.remove);
commentRouter.post('/:commentId/like', authenticate, commentController.like);
commentRouter.delete('/:commentId/like', authenticate, commentController.unlike);

export default commentRouter;
