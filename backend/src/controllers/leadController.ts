import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Lead } from '../models/Lead.js';
import { paginate } from '../utils/helpers.js';

export const leadController = {
  // GET /api/leads
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc', search, status, pipelineId, assignedTo, tags } = req.query;

    const query: Record<string, unknown> = { organizationId: req.organizationId };

    if (search) {
      query.$text = { $search: search as string };
    }

    if (status) {
      query.status = status;
    }

    if (pipelineId) {
      query.pipelineId = pipelineId;
    }

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (tags) {
      const tagArray = (tags as string).split(',');
      query.tags = { $in: tagArray };
    }

    const sortObj: Record<string, 1 | -1> = {};
    sortObj[sort as string] = order === 'asc' ? 1 : -1;

    const skip = (Number(page) - 1) * Number(limit);

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(Number(limit))
        .populate('assignedTo', 'name email avatar')
        .populate('pipelineId', 'name'),
      Lead.countDocuments(query),
    ]);

    res.json(paginate(leads, total, { page: Number(page), limit: Number(limit) }));
  }),

  // GET /api/leads/:id
  getById: asyncHandler(async (req: Request, res: Response) => {
    const lead = await Lead.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    })
      .populate('assignedTo', 'name email avatar')
      .populate('pipelineId', 'name stages');

    if (!lead) {
      res.status(404).json({ error: 'Lead não encontrado' });
      return;
    }

    res.json({ lead });
  }),

  // POST /api/leads
  create: asyncHandler(async (req: Request, res: Response) => {
    const lead = await Lead.create({
      ...req.body,
      organizationId: req.organizationId,
      activities: [{
        type: 'created',
        description: 'Lead criado',
        userId: req.user!._id,
        createdAt: new Date(),
      }],
    });

    const populated = await lead.populate('assignedTo', 'name email avatar');

    res.status(201).json({ lead: populated });
  }),

  // PUT /api/leads/:id
  update: asyncHandler(async (req: Request, res: Response) => {
    const lead = await Lead.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });

    if (!lead) {
      res.status(404).json({ error: 'Lead não encontrado' });
      return;
    }

    // Track changes for activity
    const changes: string[] = [];
    if (req.body.status && req.body.status !== lead.status) {
      changes.push(`Status alterado para ${req.body.status}`);
    }
    if (req.body.stageId && req.body.stageId !== lead.stageId) {
      changes.push('Etapa do pipeline alterada');
    }
    if (req.body.assignedTo && req.body.assignedTo !== lead.assignedTo?.toString()) {
      changes.push('Responsável alterado');
    }

    // Add activity if there were changes
    if (changes.length > 0) {
      lead.activities.push({
        type: 'updated',
        description: changes.join(', '),
        userId: req.user!._id,
        createdAt: new Date(),
      });
    }

    Object.assign(lead, req.body);
    await lead.save();

    const populated = await lead.populate('assignedTo', 'name email avatar');

    res.json({ lead: populated });
  }),

  // DELETE /api/leads/:id
  delete: asyncHandler(async (req: Request, res: Response) => {
    const lead = await Lead.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.organizationId,
    });

    if (!lead) {
      res.status(404).json({ error: 'Lead não encontrado' });
      return;
    }

    res.json({ message: 'Lead excluído com sucesso' });
  }),

  // POST /api/leads/bulk
  bulkAction: asyncHandler(async (req: Request, res: Response) => {
    const { ids, action, data } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'IDs são obrigatórios' });
      return;
    }

    let result;

    switch (action) {
      case 'delete':
        result = await Lead.deleteMany({
          _id: { $in: ids },
          organizationId: req.organizationId,
        });
        res.json({ message: `${result.deletedCount} leads excluídos` });
        break;

      case 'update':
        result = await Lead.updateMany(
          { _id: { $in: ids }, organizationId: req.organizationId },
          { $set: data }
        );
        res.json({ message: `${result.modifiedCount} leads atualizados` });
        break;

      case 'addTags':
        result = await Lead.updateMany(
          { _id: { $in: ids }, organizationId: req.organizationId },
          { $addToSet: { tags: { $each: data.tags } } }
        );
        res.json({ message: `Tags adicionadas a ${result.modifiedCount} leads` });
        break;

      default:
        res.status(400).json({ error: 'Ação inválida' });
    }
  }),

  // GET /api/leads/stats
  getStats: asyncHandler(async (req: Request, res: Response) => {
    const stats = await Lead.aggregate([
      { $match: { organizationId: req.user!.organizationId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalValue: { $sum: '$value' },
          avgScore: { $avg: '$score' },
          won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
        },
      },
    ]);

    const byStatus = await Lead.aggregate([
      { $match: { organizationId: req.user!.organizationId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const bySource = await Lead.aggregate([
      { $match: { organizationId: req.user!.organizationId } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
    ]);

    res.json({
      stats: stats[0] || { total: 0, totalValue: 0, avgScore: 0, won: 0, lost: 0 },
      byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      bySource: bySource.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
    });
  }),

  // PUT /api/leads/:id/score
  updateScore: asyncHandler(async (req: Request, res: Response) => {
    const { score } = req.body;

    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { 
        score,
        $push: {
          activities: {
            type: 'score_updated',
            description: `Score atualizado para ${score}`,
            userId: req.user!._id,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!lead) {
      res.status(404).json({ error: 'Lead não encontrado' });
      return;
    }

    res.json({ lead });
  }),

  // POST /api/leads/:id/convert
  convertToClient: asyncHandler(async (req: Request, res: Response) => {
    const lead = await Lead.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });

    if (!lead) {
      res.status(404).json({ error: 'Lead não encontrado' });
      return;
    }

    // Import Client model
    const { Client } = await import('../models/Client.js');

    // Create client from lead
    const client = await Client.create({
      organizationId: req.organizationId,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      tags: lead.tags,
      notes: lead.notes,
      leadId: lead._id,
      status: 'active',
    });

    // Update lead status
    lead.status = 'won';
    lead.wonDate = new Date();
    lead.activities.push({
      type: 'converted',
      description: 'Lead convertido em cliente',
      userId: req.user!._id,
      createdAt: new Date(),
    });
    await lead.save();

    res.status(201).json({
      message: 'Lead convertido em cliente com sucesso',
      client,
      lead,
    });
  }),
};
