import { Router } from 'express';
import { publicController } from '../controllers/public.controller';
import { shopSettingsController } from '../controllers/shop-settings.controller';

const publicRouter = Router();

publicRouter.get('/revision', publicController.getContentRevision);
publicRouter.get('/shop-settings', shopSettingsController.getPublic);

export default publicRouter;
