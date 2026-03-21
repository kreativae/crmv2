import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimit';

// Import routes
import authRoutes from './routes/auth';
import leadRoutes from './routes/leads';
import clientRoutes from './routes/clients';
import pipelineRoutes from './routes/pipelines';
import taskRoutes from './routes/tasks';
import calendarRoutes from './routes/calendar';
import conversationRoutes from './routes/conversations';
import automationRoutes from './routes/automations';
import financeRoutes from './routes/finance';
import analyticsRoutes from './routes/analytics';
import settingsRoutes from './routes/settings';
import webhookRoutes from './routes/webhooks';

const app = express();

// Security
app.use(helmet());

// CORS — allow configured FRONTEND_URL plus localhost origins in development
const allowedOrigins = Array.from(new Set([env.FRONTEND_URL, ...env.FRONTEND_URLS]));
if (env.isDev) {
  allowedOrigins.push('http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000');
}
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Trust proxy (needed for rate limiting behind reverse proxies like Heroku, Railway, etc.)
if (env.isProd) {
  app.set('trust proxy', 1);
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Compression
app.use(compression());

// Logging
if (env.isProd) {
  app.use(morgan('combined'));
} else if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting
app.use(apiRateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/pipelines', pipelineRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/automations', automationRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/webhooks', webhookRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

export default app;
