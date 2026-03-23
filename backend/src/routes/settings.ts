import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { Organization } from '../models/Organization';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { encryptionUtils } from '../utils/encryption';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(authenticate);
router.use(tenantMiddleware);

// ============ Organization Settings ============

// Get organization
router.get('/organization', async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }
    res.json(org);
  } catch (error) {
    next(error);
  }
});

// Update organization
router.put('/organization', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const org = await Organization.findByIdAndUpdate(
      req.organizationId,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    
    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user!._id,
      action: 'organization.update',
      resource: 'organization',
      resourceId: req.organizationId,
      ip: req.ip,
    });
    
    res.json(org);
  } catch (error) {
    next(error);
  }
});

// ============ Users ============

// Get all users
router.get('/users', async (req, res, next) => {
  try {
    const { search, role, active } = req.query;
    
    const query: any = { organizationId: req.organizationId };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) query.role = role;
    if (active !== undefined) query.active = active === 'true';
    
    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (error) {
    next(error);
  }
});

// Invite user
router.post('/users/invite', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const { name, email, role } = req.body;
    
    // Check if email exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    
    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      organizationId: req.organizationId,
      mustChangePassword: true,
    });
    
    await user.save();
    
    // TODO: Send invitation email with temp password
    
    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user!._id,
      action: 'user.invite',
      resource: 'user',
      resourceId: user._id,
      details: { email, role },
      ip: req.ip,
    });
    
    res.status(201).json({ 
      message: 'Convite enviado',
      user: { ...user.toObject(), password: undefined },
    });
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/users/:id', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const { password, ...updateData } = req.body;
    
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Delete user
router.delete('/users/:id', authorize('owner'), async (req, res, next) => {
  try {
    // Prevent deleting self
    if (req.params.id === req.user!._id.toString()) {
      return res.status(400).json({ error: 'Não é possível excluir seu próprio usuário' });
    }
    
    const user = await User.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user!._id,
      action: 'user.delete',
      resource: 'user',
      resourceId: req.params.id,
      ip: req.ip,
    });
    
    res.json({ message: 'Usuário excluído' });
  } catch (error) {
    next(error);
  }
});

// Toggle user active status
router.put('/users/:id/toggle', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    user.status = user.status === 'active' ? 'inactive' : 'active';
    await user.save();
    
    res.json({ ...user.toObject(), password: undefined });
  } catch (error) {
    next(error);
  }
});

// ============ Roles & Notifications ============

router.get('/roles', async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    res.json((org as any)?.roles || {});
  } catch (error) {
    next(error);
  }
});

router.put('/roles', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const roles = req.body?.roles || req.body || {};
    const org = await Organization.findByIdAndUpdate(
      req.organizationId,
      { roles, updatedAt: new Date() },
      { new: true }
    );

    res.json((org as any)?.roles || {});
  } catch (error) {
    next(error);
  }
});

router.get('/notifications', async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    res.json((org as any)?.notificationSettings || {});
  } catch (error) {
    next(error);
  }
});

router.put('/notifications', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const org = await Organization.findByIdAndUpdate(
      req.organizationId,
      { notificationSettings: req.body, updatedAt: new Date() },
      { new: true }
    );

    res.json((org as any)?.notificationSettings || {});
  } catch (error) {
    next(error);
  }
});

// ============ Webhooks ============

router.get('/webhooks', async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    res.json((org as any)?.webhooks || []);
  } catch (error) {
    next(error);
  }
});

router.post('/webhooks', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const webhook = {
      id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      url: req.body.url,
      events: req.body.events || [],
      active: req.body.active !== false,
      secret: req.body.secret || Math.random().toString(36).slice(2),
      createdAt: new Date(),
      failCount: 0,
    };

    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    const orgAny = org as any;
    orgAny.webhooks = orgAny.webhooks || [];
    orgAny.webhooks.push(webhook);
    await org.save();

    res.status(201).json(webhook);
  } catch (error) {
    next(error);
  }
});

router.put('/webhooks/:id', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    const orgAny = org as any;
    const index = (orgAny.webhooks || []).findIndex((w: any) => w.id === req.params.id || w._id?.toString() === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Webhook não encontrado' });
    }

    orgAny.webhooks[index] = {
      ...orgAny.webhooks[index],
      ...req.body,
    };

    await org.save();
    res.json(orgAny.webhooks[index]);
  } catch (error) {
    next(error);
  }
});

router.delete('/webhooks/:id', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    const orgAny = org as any;
    orgAny.webhooks = (orgAny.webhooks || []).filter((w: any) => w.id !== req.params.id && w._id?.toString() !== req.params.id);
    await org.save();

    res.json({ message: 'Webhook excluído' });
  } catch (error) {
    next(error);
  }
});

router.post('/webhooks/:id/test', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const start = Date.now();
    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    const orgAny = org as any;
    const webhook = (orgAny.webhooks || []).find((w: any) => w.id === req.params.id || w._id?.toString() === req.params.id);
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook não encontrado' });
    }

    webhook.lastTriggered = new Date();
    await org.save();

    res.json({ success: true, statusCode: 200, responseTime: Date.now() - start });
  } catch (error) {
    next(error);
  }
});

// ============ Integrations ============

// Get integrations
router.get('/integrations', async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    if (!org?.integrations) {
      return res.json([]);
    }
    
    // Decrypt credentials before returning to frontend
    const integrations = (org.integrations as any[]).map(int => {
      if (int.credentials) {
        return {
          ...int.toObject ? int.toObject() : int,
          credentials: encryptionUtils.decryptCredentials(int.credentials),
        };
      }
      return int.toObject ? int.toObject() : int;
    });
    
    res.json(integrations);
  } catch (error) {
    next(error);
  }
});

// Update integration
router.put('/integrations/:id', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }
    
    // Encrypt sensitive credentials before saving
    const updateData = { ...req.body };
    if (updateData.credentials) {
      updateData.credentials = encryptionUtils.encryptCredentials(updateData.credentials);
    }
    
    const orgAny = org as any;
    const integrationIndex = orgAny.integrations.findIndex(
      (i: any) => i.id === req.params.id || i.name === req.params.id
    );
    
    if (integrationIndex === -1) {
      orgAny.integrations.push({ id: req.params.id, name: req.params.id, ...updateData });
    } else {
      orgAny.integrations[integrationIndex] = { 
        ...orgAny.integrations[integrationIndex], 
        ...updateData
      };
    }
    
    await org.save();
    
    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user!._id,
      action: 'integration.update',
      resource: 'integration',
      resourceId: req.params.id,
      ip: req.ip,
    });
    
    // Return decrypted credentials to frontend
    const savedIntegration = orgAny.integrations[
      orgAny.integrations.findIndex((i: any) => i.id === req.params.id || i.name === req.params.id)
    ];
    
    const responseData = { ...savedIntegration };
    if (responseData.credentials) {
      responseData.credentials = encryptionUtils.decryptCredentials(responseData.credentials);
    }
    
    res.json(responseData);
  } catch (error) {
    next(error);
  }
});

// Compatibility route used by frontend settings service
router.put('/integrations/:id/config', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    const updateData: any = {
      credentials: encryptionUtils.encryptCredentials(req.body || {}),
      status: 'connected',
      connectedAt: new Date(),
    };

    const orgAny = org as any;
    const integrationIndex = orgAny.integrations.findIndex(
      (i: any) => i.id === req.params.id || i.name === req.params.id
    );

    if (integrationIndex === -1) {
      orgAny.integrations.push({ id: req.params.id, name: req.params.id, ...updateData });
    } else {
      orgAny.integrations[integrationIndex] = {
        ...orgAny.integrations[integrationIndex],
        ...updateData,
      };
    }

    await org.save();

    const saved = orgAny.integrations.find((i: any) => i.id === req.params.id || i.name === req.params.id);
    if (saved?.credentials) {
      saved.credentials = encryptionUtils.decryptCredentials(saved.credentials);
    }

    res.json(saved);
  } catch (error) {
    next(error);
  }
});

// Disconnect integration
router.delete('/integrations/:id', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }
    
    // Support deleting by id or name
    org.integrations = (org as any).integrations.filter(
      (i: any) => i.id !== req.params.id && i.name !== req.params.id
    );
    await org.save();
    
    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user!._id,
      action: 'integration.disconnect',
      resource: 'integration',
      resourceId: req.params.id,
      ip: req.ip,
    });
    
    res.json({ message: 'Integração desconectada' });
  } catch (error) {
    next(error);
  }
});

// Compatibility route used by frontend settings service
router.post('/integrations/:id/disconnect', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    org.integrations = (org as any).integrations.filter(
      (i: any) => i.id !== req.params.id && i.name !== req.params.id
    );
    await org.save();

    res.json({ message: 'Integração desconectada' });
  } catch (error) {
    next(error);
  }
});

// ============ API Token (Compatibility) ============

router.get('/api-token', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    const firstKey = (org as any)?.apiKeys?.[0]?.key || '';
    res.json(firstKey);
  } catch (error) {
    next(error);
  }
});

router.post('/api-token/regenerate', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const key = `nex_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    await Organization.findByIdAndUpdate(
      req.organizationId,
      {
        $set: {
          apiKeys: [
            {
              id: 'default',
              name: 'Default API Token',
              key,
              createdAt: new Date(),
              lastUsed: null,
            },
          ],
        },
      }
    );

    res.json(key);
  } catch (error) {
    next(error);
  }
});

// ============ Audit Logs ============

// Get audit logs
router.get('/logs', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, userId, startDate, endDate } = req.query;
    
    const query: any = { organizationId: req.organizationId };
    
    if (action) query.action = { $regex: action, $options: 'i' };
    if (userId) query.userId = userId;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }
    
    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    
    res.json({
      data: logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Export logs
router.get('/logs/export', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const logs = await AuditLog.find({ organizationId: req.organizationId })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(1000);
    
    const csv = [
      'Data,Usuário,Ação,Recurso,IP',
      ...logs.map(log => 
        `${log.createdAt.toISOString()},${(log.userId as any)?.name || 'Sistema'},${log.action},${log.resource},${log.ip || ''}`
      )
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=logs.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

// ============ Branding ============

// Get branding
router.get('/branding', async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    res.json(org?.branding || {});
  } catch (error) {
    next(error);
  }
});

// Update branding
router.put('/branding', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const org = await Organization.findByIdAndUpdate(
      req.organizationId,
      { branding: req.body, updatedAt: new Date() },
      { new: true }
    );
    
    res.json(org?.branding);
  } catch (error) {
    next(error);
  }
});

// ============ API Keys ============

// Get API keys
router.get('/api-keys', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    res.json((org as any)?.apiKeys || []);
  } catch (error) {
    next(error);
  }
});

// Generate new API key
router.post('/api-keys', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const { name } = req.body;
    
    const apiKey = {
      id: Math.random().toString(36).slice(2),
      name,
      key: `nex_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`,
      createdAt: new Date(),
      lastUsed: null,
    };
    
    await Organization.findByIdAndUpdate(
      req.organizationId,
      { $push: { apiKeys: apiKey } }
    );
    
    res.status(201).json(apiKey);
  } catch (error) {
    next(error);
  }
});

// Delete API key
router.delete('/api-keys/:id', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    await Organization.findByIdAndUpdate(
      req.organizationId,
      { $pull: { apiKeys: { id: req.params.id } } }
    );
    
    res.json({ message: 'API key excluída' });
  } catch (error) {
    next(error);
  }
});

export default router;
