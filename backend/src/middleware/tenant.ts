import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      organizationId?: mongoose.Types.ObjectId;
    }
  }
}

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Get organization ID from authenticated user
  if (req.user?.organizationId) {
    req.organizationId = req.user.organizationId;
    next();
  } else {
    res.status(403).json({ error: 'Organização não identificada' });
  }
};

// Helper to ensure all queries include organizationId
export const withTenant = (query: any, organizationId: mongoose.Types.ObjectId) => {
  return { ...query, organizationId };
};
