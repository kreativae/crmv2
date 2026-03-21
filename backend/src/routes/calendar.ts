import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { CalendarEvent } from '../models/CalendarEvent';

const router = Router();
router.use(authenticate);
router.use(tenantMiddleware);

// Get all events
router.get('/', async (req, res, next) => {
  try {
    const { start, end, category, assignedTo } = req.query;
    
    const query: any = { organizationId: req.organizationId };
    
    if (start && end) {
      query.startDate = { $gte: new Date(start as string), $lte: new Date(end as string) };
    }
    
    if (category) query.category = category;
    if (assignedTo) query.assignedTo = assignedTo;

    const events = await CalendarEvent.find(query)
      .populate('assignedTo', 'name email avatar')
      .sort({ startDate: 1 });

    res.json(events);
  } catch (error) {
    next(error);
  }
});

// Get upcoming events
router.get('/upcoming', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    
    const events = await CalendarEvent.find({
      organizationId: req.organizationId,
      startDate: { $gte: new Date() },
    })
      .populate('assignedTo', 'name email avatar')
      .sort({ startDate: 1 })
      .limit(Number(limit));

    res.json(events);
  } catch (error) {
    next(error);
  }
});

// Get event stats
router.get('/stats', async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const [todayCount, weekCount, total] = await Promise.all([
      CalendarEvent.countDocuments({
        organizationId: req.organizationId,
        startDate: { $gte: today, $lt: tomorrow },
      }),
      CalendarEvent.countDocuments({
        organizationId: req.organizationId,
        startDate: { $gte: today, $lt: nextWeek },
      }),
      CalendarEvent.countDocuments({ organizationId: req.organizationId }),
    ]);
    
    res.json({ today: todayCount, thisWeek: weekCount, total });
  } catch (error) {
    next(error);
  }
});

// Get event by ID
router.get('/:id', async (req, res, next) => {
  try {
    const event = await CalendarEvent.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    }).populate('assignedTo', 'name email avatar');
    
    if (!event) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }
    
    res.json(event);
  } catch (error) {
    next(error);
  }
});

// Create event
router.post('/', async (req, res, next) => {
  try {
    const event = new CalendarEvent({
      ...req.body,
      organizationId: req.organizationId,
      createdBy: req.user!._id,
    });
    
    await event.save();
    await event.populate('assignedTo', 'name email avatar');
    
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

// Update event
router.put('/:id', async (req, res, next) => {
  try {
    const event = await CalendarEvent.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    ).populate('assignedTo', 'name email avatar');
    
    if (!event) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }
    
    res.json(event);
  } catch (error) {
    next(error);
  }
});

// Delete event
router.delete('/:id', async (req, res, next) => {
  try {
    const event = await CalendarEvent.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!event) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }
    
    res.json({ message: 'Evento excluído com sucesso' });
  } catch (error) {
    next(error);
  }
});

// Duplicate event
router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const original = await CalendarEvent.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!original) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }
    
    const duplicate = new CalendarEvent({
      ...original.toObject(),
      _id: undefined,
      title: `${original.title} (cópia)`,
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
