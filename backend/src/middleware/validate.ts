import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

export const validate = (schema: ZodSchema, target: ValidationTarget = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req[target];
      const result = schema.parse(data);
      
      // Replace with parsed/transformed data
      req[target] = result;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        res.status(400).json({
          error: 'Dados inválidos',
          details: errors,
        });
        return;
      }
      
      res.status(400).json({ error: 'Erro de validação' });
    }
  };
};

// Validate multiple targets
export const validateMultiple = (schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const errors: { field: string; message: string }[] = [];
      
      if (schemas.body) {
        try {
          req.body = schemas.body.parse(req.body);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...error.errors.map((err) => ({
              field: `body.${err.path.join('.')}`,
              message: err.message,
            })));
          }
        }
      }
      
      if (schemas.query) {
        try {
          req.query = schemas.query.parse(req.query) as typeof req.query;
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...error.errors.map((err) => ({
              field: `query.${err.path.join('.')}`,
              message: err.message,
            })));
          }
        }
      }
      
      if (schemas.params) {
        try {
          req.params = schemas.params.parse(req.params);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...error.errors.map((err) => ({
              field: `params.${err.path.join('.')}`,
              message: err.message,
            })));
          }
        }
      }
      
      if (errors.length > 0) {
        res.status(400).json({
          error: 'Dados inválidos',
          details: errors,
        });
        return;
      }
      
      next();
    } catch (error) {
      res.status(400).json({ error: 'Erro de validação' });
    }
  };
};
