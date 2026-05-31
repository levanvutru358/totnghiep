import { Router } from 'express';
import { marketingController } from '../controllers/marketing.controller';

const marketingRouter = Router();

marketingRouter.get('/home', marketingController.getPublicHome);

export default marketingRouter;
