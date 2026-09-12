import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';

import { authRouter } from './modules/auth/auth.router';
import { categoriesRouter } from './modules/categories/categories.router';
import { productsRouter } from './modules/products/products.router';
import { stockRouter } from './modules/stock/stock.router';
import { customersRouter } from './modules/customers/customers.router';
import { invoicesRouter } from './modules/invoices/invoices.router';
import { reportsRouter } from './modules/reports/reports.router';

const app = express();

app.use(helmet());
const allowedOrigins = [
  env.frontendUrl,
  'https://nrbsagrovision.in',
  'http://nrbsagrovision.in',
  'https://www.nrbsagrovision.in',
].filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());

// Rate limit auth routes
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/stock', stockRouter);
app.use('/api/customers', customersRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/reports', reportsRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port} [${env.nodeEnv}]`);
});
