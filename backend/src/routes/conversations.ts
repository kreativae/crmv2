import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { Conversation } from '../models/Conversation';

const router = Router();
router.use(authenticate);
router.use(tenantMiddleware);

// Get all conversations
router.get('/', async (req, res, next) => {
  try {
    const { status, channel, assignedTo, search, page = 1, limit = 50 } = req.query;
    
    const query: any = { organizationId: req.organizationId };
    
    if (status) query.status = status;
    if (channel) query.channel = channel;
    if (assignedTo) query.assignedTo = assignedTo;
    
    if (search) {
      query.$or = [
        { contactName: { $regex: search, $options: 'i' } },
        { contactEmail: { $regex: search, $options: 'i' } },
        { lastMessage: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Conversation.countDocuments(query);
    const conversations = await Conversation.find(query)
      .populate('assignedTo', 'name email avatar')
      .sort({ updatedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      data: conversations,
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

// Get conversation stats
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await Conversation.aggregate([
      { $match: { organizationId: req.organizationId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          unread: { $sum: '$unreadCount' },
        },
      },
    ]);
    
    // Stats by channel
    const byChannel = await Conversation.aggregate([
      { $match: { organizationId: req.organizationId } },
      { $group: { _id: '$channel', count: { $sum: 1 } } },
    ]);
    
    res.json({
      ...(stats[0] || { total: 0, open: 0, pending: 0, resolved: 0, unread: 0 }),
      byChannel: byChannel.reduce((acc, c) => ({ ...acc, [c._id]: c.count }), {}),
    });
  } catch (error) {
    next(error);
  }
});

// Get conversation by ID
router.get('/:id', async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    }).populate('assignedTo', 'name email avatar');
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }
    
    res.json(conversation);
  } catch (error) {
    next(error);
  }
});

// Create conversation
router.post('/', async (req, res, next) => {
  try {
    const conversation = new Conversation({
      ...req.body,
      organizationId: req.organizationId,
      assignedTo: req.user._id,
    });
    
    await conversation.save();
    
    res.status(201).json(conversation);
  } catch (error) {
    next(error);
  }
});

// Send message
router.post('/:id/messages', async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }
    
    const message = {
      sender: 'agent',
      senderName: req.user.name,
      content: req.body.content,
      type: req.body.type || 'text',
      attachments: req.body.attachments || [],
      timestamp: new Date(),
      read: false,
    };
    
    conversation.messages.push(message);
    conversation.lastMessage = req.body.content;
    conversation.updatedAt = new Date();
    
    await conversation.save();
    
    // TODO: Send via channel API (WhatsApp, Instagram, etc.)
    
    res.json(conversation);
  } catch (error) {
    next(error);
  }
});

// Get messages
router.get('/:id/messages', async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }
    
    const total = conversation.messages.length;
    const start = Math.max(0, total - Number(page) * Number(limit));
    const end = total - (Number(page) - 1) * Number(limit);
    const messages = conversation.messages.slice(start, end);
    
    res.json({
      data: messages,
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

// Assign conversation
router.put('/:id/assign', async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { assignedTo: userId, updatedAt: new Date() },
      { new: true }
    ).populate('assignedTo', 'name email avatar');
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }
    
    res.json(conversation);
  } catch (error) {
    next(error);
  }
});

// Transfer conversation
router.put('/:id/transfer', async (req, res, next) => {
  try {
    const { toUserId, note } = req.body;
    
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }
    
    // Add system message about transfer
    conversation.messages.push({
      sender: 'system',
      content: `Conversa transferida${note ? `: ${note}` : ''}`,
      type: 'system',
      timestamp: new Date(),
    });
    
    conversation.assignedTo = toUserId;
    conversation.updatedAt = new Date();
    
    await conversation.save();
    await conversation.populate('assignedTo', 'name email avatar');
    
    res.json(conversation);
  } catch (error) {
    next(error);
  }
});

// Close conversation
router.put('/:id/close', async (req, res, next) => {
  try {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { status: 'resolved', resolvedAt: new Date(), updatedAt: new Date() },
      { new: true }
    );
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }
    
    res.json(conversation);
  } catch (error) {
    next(error);
  }
});

// Reopen conversation
router.put('/:id/reopen', async (req, res, next) => {
  try {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { status: 'open', resolvedAt: null, updatedAt: new Date() },
      { new: true }
    );
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }
    
    res.json(conversation);
  } catch (error) {
    next(error);
  }
});

// Mark as read
router.put('/:id/read', async (req, res, next) => {
  try {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { unreadCount: 0, updatedAt: new Date() },
      { new: true }
    );
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }
    
    res.json(conversation);
  } catch (error) {
    next(error);
  }
});

// Update contact tags
router.put('/:id/tags', async (req, res, next) => {
  try {
    const { tags } = req.body;
    
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { contactTags: tags, updatedAt: new Date() },
      { new: true }
    );
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }
    
    res.json(conversation);
  } catch (error) {
    next(error);
  }
});

export default router;
