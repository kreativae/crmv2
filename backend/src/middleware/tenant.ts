import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
    }
  }
}

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Get organization ID from authenticated user
  if (req.user?.organizationId) {
    req.organizationId = req.user.organizationId.toString();
    next();
  } else {
    res.status(403).json({ error: 'Organização não identificada' });
  }
};

// Helper to ensure all queries include organizationId
export const withTenant = (query: any, organizationId: string) => {
  return { ...query, organizationId };
};
