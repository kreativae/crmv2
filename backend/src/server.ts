import 'dotenv/config';
import app from './app';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();
    logger.info('✅ MongoDB conectado');

    // Connect to Redis (optional)
    try {
      await connectRedis();
      logger.info('✅ Redis conectado');
    } catch (error) {
      logger.warn('⚠️ Redis não disponível, usando memória');
    }

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Servidor rodando na porta ${PORT}`);
      logger.info(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();
