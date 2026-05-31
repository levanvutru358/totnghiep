import { Router } from 'express';
import { addressController } from '../controllers/address.controller';
import { userController } from '../controllers/user.controller';
import { reviewController } from '../controllers/review.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.patch('/me', authenticate, userController.updateMe);
router.put('/me', authenticate, userController.updateMe);
router.get('/me/reviews', authenticate, reviewController.listMine);
router.get('/me/addresses', authenticate, addressController.list);
router.post('/me/addresses', authenticate, addressController.create);
router.patch('/me/addresses/:addressId', authenticate, addressController.update);
router.put('/me/addresses/:addressId', authenticate, addressController.update);
router.delete('/me/addresses/:addressId', authenticate, addressController.remove);

export default router;
