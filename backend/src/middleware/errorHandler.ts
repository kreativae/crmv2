import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  statusCode: number;
  code?: string;
  isOperational: boolean;

  constructor(message: string, statusCode = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default values
  let statusCode = 500;
  let message = 'Erro interno do servidor';
  let code: string | undefined;
  let details: unknown;

  // Handle AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
  }

  // Handle Mongoose errors
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'ID inválido';
    code = 'INVALID_ID';
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Erro de validação';
    code = 'VALIDATION_ERROR';
    // @ts-expect-error - Mongoose validation error
    details = Object.values(err.errors || {}).map((e: { message: string }) => e.message);
  }

  // Handle duplicate key error
  // @ts-expect-error - MongoDB error code
  if (err.code === 11000) {
    statusCode = 409;
    message = 'Registro duplicado';
    code = 'DUPLICATE_KEY';
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token inválido';
    code = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expirado';
    code = 'TOKEN_EXPIRED';
  }

  // Log error
  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.path}`, err);
  } else {
    logger.warn(`[${req.method}] ${req.path}: ${message}`);
  }

  // Send response
  const responseBody: Record<string, unknown> = {
    error: message,
    code,
  };

  if (details) {
    responseBody.details = details;
  }

  if (env.isDev) {
    responseBody.stack = err.stack;
    responseBody.originalError = err.message;
  }

  res.status(statusCode).json(responseBody);
};

// Not found handler
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    error: 'Rota não encontrada',
    code: 'NOT_FOUND',
    path: req.path,
  });
};

// Async wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
