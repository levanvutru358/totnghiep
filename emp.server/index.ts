import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { pool } from './src/configs/database.config';
import { loadEnv } from './src/configs/env.config';
import { runMigrations } from './src/db/migrate';
import productRouter from './src/routes/product.routes';
import categoryRouter from './src/routes/category.route';
import brandRouter from './src/routes/brand.routes';
import sizeRouter from './src/routes/size.routes';
import colorRouter from './src/routes/color.routes';
import variantRouter from './src/routes/variant.routes';
import inventoryRouter from './src/routes/inventory.routes';
import dashboardRouter from './src/routes/dashboard.routes';
import authRouter from './src/routes/auth.routes';
import userRouter from './src/routes/user.routes';
import cartRouter from './src/routes/cart.routes';
import adminCartRouter from './src/routes/admin-cart.routes';
import orderRouter from './src/routes/order.routes';
import paymentRouter from './src/routes/payment.routes';
import adminOrderRouter from './src/routes/admin-order.routes';
import reviewRouter from './src/routes/review.routes';
import adminReviewRouter from './src/routes/admin-review.routes';
import commentRouter from './src/routes/comment.routes';
import adminCommentRouter from './src/routes/admin-comment.routes';
import adminCustomerRouter from './src/routes/admin-customer.routes';
import notificationRouter from './src/routes/notification.routes';
import uploadRouter from './src/routes/upload.routes';
import promotionRouter from './src/routes/promotion.routes';
import adminPromotionRouter from './src/routes/admin-promotion.routes';
import marketingRouter from './src/routes/marketing.routes';
import adminMarketingRouter from './src/routes/admin-marketing.routes';
import publicRouter from './src/routes/public.routes';
import adminSettingsRouter from './src/routes/admin-settings.routes';
import { bumpPublicContentOnAdminWrite } from './src/middleware/bump-public-content.middleware';
import { swaggerSpec } from './src/docs/swagger';

loadEnv();

const app = express();
const corsOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

// Middleware
app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));
app.use(bumpPublicContentOnAdminWrite);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Test route
app.get('/', (_req, res) => {
  res.json({ message: 'Server is running 🚀' });
});

app.use('/api/products', productRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/brands', brandRouter);
app.use('/api/sizes', sizeRouter);
app.use('/api/colors', colorRouter);
app.use('/api/variants', variantRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/cart', cartRouter);
app.use('/api/admin/carts', adminCartRouter);
app.use('/api/orders', orderRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/admin/orders', adminOrderRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/admin/reviews', adminReviewRouter);
app.use('/api/comments', commentRouter);
app.use('/api/admin/comments', adminCommentRouter);
app.use('/api/admin/customers', adminCustomerRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/promotions', promotionRouter);
app.use('/api/admin/promotions', adminPromotionRouter);
app.use('/api/marketing', marketingRouter);
app.use('/api/admin/marketing', adminMarketingRouter);
app.use('/api/public', publicRouter);
app.use('/api/admin/settings', adminSettingsRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/dashboard', dashboardRouter);
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  }),
);

// Test DB connection
const connectDB = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL connected');
    connection.release();
  } catch (error) {
    console.error('❌ MySQL connection failed:', error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 8000;

const startServer = async () => {
  await connectDB();
  await runMigrations();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

startServer();

export default app;
