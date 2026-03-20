import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { Task } from '../models/Task';
import { AuditLog } from '../models/AuditLog';

const router = Router();
router.use(authenticate);
router.use(tenantMiddleware);

// Get all tasks
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, priority, assignedTo, leadId, clientId, search } = req.query;
    
    const query: any = { organizationId: req.organizationId };
    
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (leadId) query.lead = leadId;
    if (clientId) query.clientId = clientId;
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email avatar')
      .sort({ dueDate: 1, priority: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      data: tasks,
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

// Get task stats
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await Task.aggregate([
      { $match: { organizationId: req.organizationId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          todo: { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                { $and: [
                  { $lt: ['$dueDate', new Date()] },
                  { $ne: ['$status', 'done'] }
                ]},
                1, 0
              ]
            }
          },
        },
      },
    ]);
    
    res.json(stats[0] || { total: 0, todo: 0, inProgress: 0, done: 0, overdue: 0 });
  } catch (error) {
    next(error);
  }
});

// Get task by ID
router.get('/:id', async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    }).populate('assignedTo', 'name email avatar');
    
    if (!task) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    
    res.json(task);
  } catch (error) {
    next(error);
  }
});

// Create task
router.post('/', async (req, res, next) => {
  try {
    const task = new Task({
      ...req.body,
      organizationId: req.organizationId,
      createdBy: req.user._id,
    });
    
    await task.save();
    await task.populate('assignedTo', 'name email avatar');
    
    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'task.create',
      resource: 'task',
      resourceId: task._id,
      details: { title: task.title },
      ip: req.ip,
    });
    
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

// Update task
router.put('/:id', async (req, res, next) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    ).populate('assignedTo', 'name email avatar');
    
    if (!task) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    
    res.json(task);
  } catch (error) {
    next(error);
  }
});

// Delete task
router.delete('/:id', async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    
    res.json({ message: 'Tarefa excluída com sucesso' });
  } catch (error) {
    next(error);
  }
});

// Bulk update status
router.put('/bulk/status', async (req, res, next) => {
  try {
    const { ids, status } = req.body;
    
    await Task.updateMany(
      { _id: { $in: ids }, organizationId: req.organizationId },
      { status, updatedAt: new Date() }
    );
    
    res.json({ message: `${ids.length} tarefas atualizadas` });
  } catch (error) {
    next(error);
  }
});

// Bulk delete
router.delete('/bulk', async (req, res, next) => {
  try {
    const { ids } = req.body;
    
    await Task.deleteMany({
      _id: { $in: ids },
      organizationId: req.organizationId,
    });
    
    res.json({ message: `${ids.length} tarefas excluídas` });
  } catch (error) {
    next(error);
  }
});

// Add subtask
router.post('/:id/subtasks', async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    
    task.subtasks.push(req.body);
    await task.save();
    
    res.json(task);
  } catch (error) {
    next(error);
  }
});

// Toggle subtask
router.put('/:id/subtasks/:subtaskId/toggle', async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    
    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) {
      return res.status(404).json({ error: 'Subtarefa não encontrada' });
    }
    
    subtask.completed = !subtask.completed;
    await task.save();
    
    res.json(task);
  } catch (error) {
    next(error);
  }
});

// Add note
router.post('/:id/notes', async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    
    task.notes.push({
      ...req.body,
      author: req.user.name,
      createdAt: new Date(),
    });
    await task.save();
    
    res.json(task);
  } catch (error) {
    next(error);
  }
});

export default router;
