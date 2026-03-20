import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { Automation } from '../models/Automation';

const router = Router();
router.use(authenticate);
router.use(tenantMiddleware);

// Get all automations
router.get('/', async (req, res, next) => {
  try {
    const { active, search } = req.query;
    
    const query: any = { organizationId: req.organizationId };
    
    if (active !== undefined) query.active = active === 'true';
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const automations = await Automation.find(query).sort({ createdAt: -1 });

    res.json(automations);
  } catch (error) {
    next(error);
  }
});

// Get automation stats
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await Automation.aggregate([
      { $match: { organizationId: req.organizationId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$active', 1, 0] } },
          totalExecutions: { $sum: '$executionCount' },
          successfulExecutions: { $sum: '$successCount' },
        },
      },
    ]);
    
    const result = stats[0] || { total: 0, active: 0, totalExecutions: 0, successfulExecutions: 0 };
    result.successRate = result.totalExecutions > 0 
      ? Math.round((result.successfulExecutions / result.totalExecutions) * 100) 
      : 0;
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get automation by ID
router.get('/:id', async (req, res, next) => {
  try {
    const automation = await Automation.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!automation) {
      return res.status(404).json({ error: 'Automação não encontrada' });
    }
    
    res.json(automation);
  } catch (error) {
    next(error);
  }
});

// Create automation
router.post('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const automation = new Automation({
      ...req.body,
      organizationId: req.organizationId,
      createdBy: req.user._id,
    });
    
    await automation.save();
    
    res.status(201).json(automation);
  } catch (error) {
    next(error);
  }
});

// Update automation
router.put('/:id', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const automation = await Automation.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    
    if (!automation) {
      return res.status(404).json({ error: 'Automação não encontrada' });
    }
    
    res.json(automation);
  } catch (error) {
    next(error);
  }
});

// Delete automation
router.delete('/:id', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const automation = await Automation.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!automation) {
      return res.status(404).json({ error: 'Automação não encontrada' });
    }
    
    res.json({ message: 'Automação excluída com sucesso' });
  } catch (error) {
    next(error);
  }
});

// Toggle automation active status
router.put('/:id/toggle', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const automation = await Automation.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!automation) {
      return res.status(404).json({ error: 'Automação não encontrada' });
    }
    
    automation.active = !automation.active;
    automation.updatedAt = new Date();
    await automation.save();
    
    res.json(automation);
  } catch (error) {
    next(error);
  }
});

// Test automation
router.post('/:id/test', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const automation = await Automation.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!automation) {
      return res.status(404).json({ error: 'Automação não encontrada' });
    }
    
    // Simulate execution
    const execution = {
      timestamp: new Date(),
      status: 'success',
      triggeredBy: 'test',
      actionsExecuted: automation.actions.length,
      duration: Math.floor(Math.random() * 1000) + 100,
    };
    
    automation.executionLog.unshift(execution);
    automation.lastRun = new Date();
    automation.executionCount += 1;
    automation.successCount += 1;
    await automation.save();
    
    res.json({ 
      message: 'Teste executado com sucesso',
      execution,
    });
  } catch (error) {
    next(error);
  }
});

// Get execution logs
router.get('/:id/logs', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const automation = await Automation.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!automation) {
      return res.status(404).json({ error: 'Automação não encontrada' });
    }
    
    const total = automation.executionLog.length;
    const start = (Number(page) - 1) * Number(limit);
    const logs = automation.executionLog.slice(start, start + Number(limit));
    
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

// Duplicate automation
router.post('/:id/duplicate', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const original = await Automation.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!original) {
      return res.status(404).json({ error: 'Automação não encontrada' });
    }
    
    const duplicate = new Automation({
      ...original.toObject(),
      _id: undefined,
      name: `${original.name} (cópia)`,
      active: false,
      executionCount: 0,
      successCount: 0,
      failCount: 0,
      executionLog: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    await duplicate.save();
    
    res.status(201).json(duplicate);
  } catch (error) {
    next(error);
  }
});

export default router;
