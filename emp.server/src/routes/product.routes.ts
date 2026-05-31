import { Router } from 'express';
import { authenticate, requirePermissions } from '../middleware/auth.middleware';
import { productImageUpload } from '../middleware/upload.middleware';
import { productController } from '../controllers/product.controller';
import { reviewController } from '../controllers/review.controller';
import { commentController } from '../controllers/comment.controller';

const productRouter = Router();

productRouter.get('/', productController.list);
productRouter.get('/:productId/reviews/statistics', reviewController.statistics);
productRouter.get('/:productId/reviews', reviewController.listByProduct);
productRouter.get('/:productId/comments', commentController.listByProduct);
productRouter.get('/:idOrSlug', productController.detail);
productRouter.post('/', authenticate, requirePermissions('products.create'), productImageUpload, productController.create);
productRouter.put('/:idOrSlug', authenticate, requirePermissions('products.update'), productImageUpload, productController.update);
productRouter.delete('/:idOrSlug', authenticate, requirePermissions('products.delete'), productController.remove);
productRouter.get('/:idOrSlug/related', productController.related);
productRouter.post('/:idOrSlug/related', authenticate, requirePermissions('products.update'), productController.addRelated);
productRouter.delete('/:idOrSlug/related', authenticate, requirePermissions('products.update'), productController.removeRelated);

export default productRouter;
