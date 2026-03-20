import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User, IUser } from '../models/User.js';
import { Organization, IOrganization } from '../models/Organization.js';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      organization?: IOrganization;
      organizationId?: string;
    }
  }
}

interface JwtPayload {
  userId: string;
  organizationId: string;
  role: string;
}

// Verify JWT token
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token de acesso não fornecido' });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
        return;
      }
      res.status(401).json({ error: 'Token inválido' });
      return;
    }
    
    const user = await User.findById(decoded.userId);
    
    if (!user || user.status !== 'active') {
      res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
      return;
    }
    
    const organization = await Organization.findById(decoded.organizationId);
    
    if (!organization || organization.status !== 'active') {
      res.status(401).json({ error: 'Organização não encontrada ou inativa' });
      return;
    }
    
    req.user = user;
    req.organization = organization;
    req.organizationId = organization._id.toString();
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Erro interno de autenticação' });
  }
};

// Check user role
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Permissão negada' });
      return;
    }
    
    next();
  };
};

// Check specific permission
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    
    // Owner and admin have all permissions
    if (['owner', 'admin'].includes(req.user.role)) {
      next();
      return;
    }
    
    if (!req.user.permissions.includes(permission)) {
      res.status(403).json({ error: 'Permissão negada' });
      return;
    }
    
    next();
  };
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      const user = await User.findById(decoded.userId);
      
      if (user && user.status === 'active') {
        req.user = user;
        req.organizationId = decoded.organizationId;
      }
    } catch {
      // Token invalid or expired, continue without user
    }
    
    next();
  } catch (error) {
    next();
  }
};
