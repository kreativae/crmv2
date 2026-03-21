import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { Client } from '../models/Client';
import { AuditLog } from '../models/AuditLog';

const router = Router();
router.use(authenticate);
router.use(tenantMiddleware);

// Get all clients
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status, sort = 'createdAt', order = 'desc' } = req.query;
    
    const query: any = { organizationId: req.organizationId };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (status) query.status = status;

    const total = await Client.countDocuments(query);
    const clients = await Client.find(query)
      .sort({ [sort as string]: order === 'desc' ? -1 : 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      data: clients,
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

// Get client by ID
router.get('/:id', async (req, res, next) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    res.json(client);
  } catch (error) {
    next(error);
  }
});

// Create client
router.post('/', async (req, res, next) => {
  try {
    const client = new Client({
      ...req.body,
      organizationId: req.organizationId,
    });
    
    await client.save();
    
    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user!._id,
      action: 'client.create',
      resource: 'client',
      resourceId: client._id,
      details: { name: client.name },
      ip: req.ip,
    });
    
    res.status(201).json(client);
  } catch (error) {
    next(error);
  }
});

// Update client
router.put('/:id', async (req, res, next) => {
  try {
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user!._id,
      action: 'client.update',
      resource: 'client',
      resourceId: client._id,
      details: { name: client.name },
      ip: req.ip,
    });
    
    res.json(client);
  } catch (error) {
    next(error);
  }
});

// Delete client
router.delete('/:id', async (req, res, next) => {
  try {
    const client = await Client.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user!._id,
      action: 'client.delete',
      resource: 'client',
      resourceId: client._id,
      details: { name: client.name },
      ip: req.ip,
    });
    
    res.json({ message: 'Cliente excluído com sucesso' });
  } catch (error) {
    next(error);
  }
});

// Bulk delete
router.delete('/bulk', async (req, res, next) => {
  try {
    const { ids } = req.body;
    
    await Client.deleteMany({
      _id: { $in: ids },
      organizationId: req.organizationId,
    });
    
    res.json({ message: `${ids.length} clientes excluídos` });
  } catch (error) {
    next(error);
  }
});

// Get stats
router.get('/stats/summary', async (req, res, next) => {
  try {
    const stats = await Client.aggregate([
      { $match: { organizationId: req.organizationId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          totalValue: { $sum: '$annualSpend' },
        },
      },
    ]);
    
    res.json(stats[0] || { total: 0, active: 0, totalValue: 0 });
  } catch (error) {
    next(error);
  }
});

export default router;
