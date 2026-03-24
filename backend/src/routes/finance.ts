import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { Transaction } from '../models/Transaction';

const router = Router();
router.use(authenticate);
router.use(tenantMiddleware);

// Get all transactions
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, type, status, category, startDate, endDate, search } = req.query;
    
    const query: any = { organizationId: req.organizationId };
    
    if (type) query.type = type;
    if (status) query.status = status;
    if (category) query.category = category;
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }
    
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { client: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      data: transactions,
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

// Get stats
router.get('/stats', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchQuery: any = { organizationId: req.organizationId };
    
    if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) matchQuery.date.$gte = new Date(startDate as string);
      if (endDate) matchQuery.date.$lte = new Date(endDate as string);
    }
    
    const stats = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$type', 'revenue'] }, { $eq: ['$status', 'paid'] }] },
                '$value', 0
              ]
            }
          },
          totalExpenses: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$type', 'expense'] }, { $eq: ['$status', 'paid'] }] },
                '$value', 0
              ]
            }
          },
          totalPending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$value', 0] }
          },
          totalOverdue: {
            $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, '$value', 0] }
          },
          count: { $sum: 1 },
        },
      },
    ]);
    
    const result = stats[0] || { 
      totalRevenue: 0, 
      totalExpenses: 0, 
      totalPending: 0, 
      totalOverdue: 0,
      count: 0 
    };
    
    result.netRevenue = result.totalRevenue - result.totalExpenses;
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get transaction by ID
router.get('/:id', async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }
    
    res.json(transaction);
  } catch (error) {
    next(error);
  }
});

// Create transaction
router.post('/', async (req, res, next) => {
  try {
    // Validate required fields
    if (!req.body.description || !req.body.type || !req.body.category || req.body.value === undefined || !req.body.date) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    // Validate value
    const value = parseFloat(req.body.value);
    if (isNaN(value) || value < 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    // Validate date
    const date = new Date(req.body.date);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Data inválida' });
    }
    
    // Map frontend fields to backend fields
    const transactionData: any = {
      description: req.body.description,
      type: req.body.type,
      category: req.body.category,
      value: value,
      status: req.body.status,
      date: date,
      organizationId: req.organizationId,
      createdBy: req.user!._id,
    };

    // Handle optional fields
    if (req.body.dueDate) {
      transactionData.dueDate = new Date(req.body.dueDate);
    }

    if (req.body.notes) {
      transactionData.notes = req.body.notes;
    }

    // Handle optional references - only if they have valid values
    if (req.body.client && typeof req.body.client === 'string' && req.body.client.trim() && req.body.client !== 'undefined') {
      transactionData.clientId = req.body.client;
    }
    
    if (req.body.salesperson && typeof req.body.salesperson === 'string' && req.body.salesperson.trim() && req.body.salesperson !== 'undefined') {
      transactionData.sellerId = req.body.salesperson;
    }

    if (req.body.pipeline && typeof req.body.pipeline === 'string' && req.body.pipeline.trim() && req.body.pipeline !== 'undefined') {
      transactionData.pipelineId = req.body.pipeline;
    }

    const transaction = new Transaction(transactionData);
    await transaction.save();
    
    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
});

// Update transaction
router.put('/:id', async (req, res, next) => {
  try {
    // Map frontend fields to backend fields
    const updateData: any = {
      description: req.body.description,
      type: req.body.type,
      category: req.body.category,
      value: parseFloat(req.body.value),
      status: req.body.status,
      date: new Date(req.body.date),
      notes: req.body.notes,
      updatedAt: new Date(),
    };

    // Handle optional date
    if (req.body.dueDate) {
      updateData.dueDate = new Date(req.body.dueDate);
    } else {
      updateData.dueDate = null;
    }

    // Handle optional references - convert valid ObjectIds
    if (req.body.client !== undefined) {
      if (req.body.client && req.body.client.trim()) {
        try {
          updateData.clientId = req.body.client;
        } catch (e) {
          updateData.clientId = null;
        }
      } else {
        updateData.clientId = null;
      }
    }
    
    if (req.body.salesperson !== undefined) {
      if (req.body.salesperson && req.body.salesperson.trim()) {
        try {
          updateData.sellerId = req.body.salesperson;
        } catch (e) {
          updateData.sellerId = null;
        }
      } else {
        updateData.sellerId = null;
      }
    }

    if (req.body.pipeline !== undefined) {
      if (req.body.pipeline && req.body.pipeline.trim()) {
        try {
          updateData.pipelineId = req.body.pipeline;
        } catch (e) {
          updateData.pipelineId = null;
        }
      } else {
        updateData.pipelineId = null;
      }
    }

    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      updateData,
      { new: true }
    );
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }
    
    res.json(transaction);
  } catch (error) {
    next(error);
  }
});

// Delete transaction
router.delete('/:id', async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }
    
    res.json({ message: 'Transação excluída com sucesso' });
  } catch (error) {
    next(error);
  }
});

// Bulk update status
router.put('/bulk/status', async (req, res, next) => {
  try {
    const { ids, status } = req.body;
    
    await Transaction.updateMany(
      { _id: { $in: ids }, organizationId: req.organizationId },
      { status, updatedAt: new Date() }
    );
    
    res.json({ message: `${ids.length} transações atualizadas` });
  } catch (error) {
    next(error);
  }
});

// Bulk delete
router.delete('/bulk', async (req, res, next) => {
  try {
    const { ids } = req.body;
    
    await Transaction.deleteMany({
      _id: { $in: ids },
      organizationId: req.organizationId,
    });
    
    res.json({ message: `${ids.length} transações excluídas` });
  } catch (error) {
    next(error);
  }
});

// Get goals
router.get('/goals/list', async (req, res, next) => {
  try {
    // For now, return empty goals - in production, this would be a separate Goals model
    res.json([]);
  } catch (error) {
    next(error);
  }
});

// Update goal
router.put('/goals/:id', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    // In production, update Goals model
    res.json({ message: 'Meta atualizada com sucesso', ...req.body });
  } catch (error) {
    next(error);
  }
});

// Export transactions
router.get('/export/csv', async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ organizationId: req.organizationId })
      .sort({ date: -1 });
    
    const csv = [
      'Data,Descrição,Tipo,Categoria,Valor,Status,Cliente',
      ...transactions.map(t => 
        `${t.date.toISOString().split('T')[0]},${t.description},${t.type},${t.category},${t.value},${t.status},${(t as any).clientId || ''}`
      )
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transacoes.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

export default router;
