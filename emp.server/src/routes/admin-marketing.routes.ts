import { Router } from 'express';
import { UserRole } from '../constants/roles';
import { marketingController } from '../controllers/marketing.controller';
import { authenticate, requirePermissions, requireRoles } from '../middleware/auth.middleware';

const adminMarketingRouter = Router();

adminMarketingRouter.use(authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN));

adminMarketingRouter.get('/banners', requirePermissions('marketing.view'), marketingController.listBanners);
adminMarketingRouter.post('/banners', requirePermissions('marketing.create'), marketingController.createBanner);
adminMarketingRouter.patch(
  '/banners/:bannerId',
  requirePermissions('marketing.update'),
  marketingController.updateBanner,
);
adminMarketingRouter.delete(
  '/banners/:bannerId',
  requirePermissions('marketing.delete'),
  marketingController.removeBanner,
);

adminMarketingRouter.get(
  '/home-sections',
  requirePermissions('marketing.view'),
  marketingController.listHomeSections,
);
adminMarketingRouter.patch(
  '/home-sections/:sectionCode',
  requirePermissions('marketing.update'),
  marketingController.updateHomeSection,
);

adminMarketingRouter.get(
  '/sections/:sectionCode/products',
  requirePermissions('marketing.view'),
  marketingController.listSectionProducts,
);
adminMarketingRouter.post(
  '/sections/:sectionCode/products',
  requirePermissions('marketing.create'),
  marketingController.createSectionProduct,
);
adminMarketingRouter.patch(
  '/section-products/:itemId',
  requirePermissions('marketing.update'),
  marketingController.updateSectionProduct,
);
adminMarketingRouter.delete(
  '/section-products/:itemId',
  requirePermissions('marketing.delete'),
  marketingController.removeSectionProduct,
);

adminMarketingRouter.get(
  '/flash-sale',
  requirePermissions('marketing.view'),
  marketingController.listFlashSale,
);
adminMarketingRouter.post(
  '/flash-sale',
  requirePermissions('marketing.create'),
  marketingController.createFlashSale,
);
adminMarketingRouter.patch(
  '/flash-sale/:itemId',
  requirePermissions('marketing.update'),
  marketingController.updateFlashSale,
);
adminMarketingRouter.delete(
  '/flash-sale/:itemId',
  requirePermissions('marketing.delete'),
  marketingController.removeFlashSale,
);

export default adminMarketingRouter;
