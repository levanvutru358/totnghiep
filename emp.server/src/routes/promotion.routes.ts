import { Router } from 'express';
import { promotionController } from '../controllers/promotion.controller';
import { authenticate } from '../middleware/auth.middleware';

const promotionRouter = Router();

promotionRouter.get('/available', promotionController.listAvailable);
promotionRouter.get('/available/me', authenticate, promotionController.listAvailableForMe);
promotionRouter.use(authenticate);
promotionRouter.post('/validate', promotionController.validate);

export default promotionRouter;
