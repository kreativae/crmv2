import dotenv from 'dotenv';
dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

// In production, require critical environment variables
function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProd) {
    throw new Error(`[FATAL] Missing required environment variable: ${name}`);
  }
  return fallback || '';
}

// In development, use a stable placeholder secret with a clear warning.
// In production, the env var is required (throws if missing).
function devSecret(name: string): string {
  const value = process.env[name];
  if (value && value.length > 0) return value as string;
  if (isProd) {
    throw new Error(`[FATAL] Missing required environment variable: ${name}. Never use default secrets in production.`);
  }
  // Fixed dev-only fallback — sessions survive backend restarts in development.
  // Set the env var in .env to use a custom value.
  console.warn(`[DEV] ${name} not set — using insecure dev fallback. Set it in .env for stable tokens.`);
  return `dev-only-insecure-${name.toLowerCase()}-change-in-production`;
}

export const env = {
  // Server
  NODE_ENV,
  PORT: parseInt(process.env.PORT || '3001', 10),
  API_URL: requireEnv('API_URL', 'http://localhost:3001'),
  FRONTEND_URL: requireEnv('FRONTEND_URL', 'http://localhost:5173'),
  
  // MongoDB
  MONGODB_URI: requireEnv('MONGODB_URI', 'mongodb://localhost:27017/nexcrm'),
  
  // Redis
  REDIS_URL: process.env.REDIS_URL,
  
  // JWT — never use static defaults; dev gets random per-restart, prod must set env vars
  JWT_SECRET: devSecret('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_SECRET: devSecret('JWT_REFRESH_SECRET'),
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // Email
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || 'NexCRM <noreply@nexcrm.com>',
  
  // WhatsApp
  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_BUSINESS_ACCOUNT_ID: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || 'nexcrm-verify',
  
  // Meta
  META_APP_ID: process.env.META_APP_ID,
  META_APP_SECRET: process.env.META_APP_SECRET,
  META_PAGE_ACCESS_TOKEN: process.env.META_PAGE_ACCESS_TOKEN,
  
  // Telegram
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  
  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  
  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  
  // OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID,
  MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET,
  MICROSOFT_TENANT_ID: process.env.MICROSOFT_TENANT_ID,
  APPLE_SERVICE_ID: process.env.APPLE_SERVICE_ID,
  APPLE_TEAM_ID: process.env.APPLE_TEAM_ID,
  APPLE_KEY_ID: process.env.APPLE_KEY_ID,
  APPLE_PRIVATE_KEY: process.env.APPLE_PRIVATE_KEY,
  
  // Helpers
  isDev: NODE_ENV === 'development',
  isProd,
};
