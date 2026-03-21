import 'dotenv/config';
import app from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { logger } from './utils/logger';

const PORT = env.PORT;

async function startServer() {
  try {
    // Validate critical env vars on startup
    if (env.isProd) {
      logger.info(`🔒 Modo produção - validando configuração...`);
      
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        throw new Error('[FATAL] JWT_SECRET deve ter pelo menos 32 caracteres em produção');
      }
      if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
        throw new Error('[FATAL] JWT_REFRESH_SECRET deve ter pelo menos 32 caracteres em produção');
      }
      if (!process.env.MONGODB_URI) {
        throw new Error('[FATAL] MONGODB_URI é obrigatório em produção');
      }
      if (!process.env.FRONTEND_URL) {
        throw new Error('[FATAL] FRONTEND_URL é obrigatório em produção');
      }
    }

    // Connect to MongoDB
    await connectDatabase();
    logger.info('MongoDB conectado');

    // Connect to Redis (optional)
    try {
      await connectRedis();
      logger.info('Redis conectado');
    } catch (error) {
      logger.warn('Redis não disponível, usando memória');
    }

    // Start server
    app.listen(Number(PORT), '0.0.0.0', () => {
      logger.info(`Servidor rodando na porta ${PORT}`);
      logger.info(`Ambiente: ${env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();
