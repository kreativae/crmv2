import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { Lead } from '../models/Lead';
import { Client } from '../models/Client';
import { Transaction } from '../models/Transaction';
import { Conversation } from '../models/Conversation';
import { Task } from '../models/Task';

const router = Router();
router.use(authenticate);
router.use(tenantMiddleware);

// Get dashboard stats
router.get('/dashboard', async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case '7d': startDate.setDate(now.getDate() - 7); break;
      case '30d': startDate.setDate(now.getDate() - 30); break;
      case '90d': startDate.setDate(now.getDate() - 90); break;
      case '12m': startDate.setFullYear(now.getFullYear() - 1); break;
    }
    
    const [leads, clients, revenue, conversations, tasks] = await Promise.all([
      Lead.aggregate([
        { $match: { organizationId: req.organizationId, createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
            lost: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
            totalValue: { $sum: '$value' },
            avgScore: { $avg: '$score' },
          }
        }
      ]),
      Client.countDocuments({ organizationId: req.organizationId }),
      Transaction.aggregate([
        { 
          $match: { 
            organizationId: req.organizationId, 
            type: 'revenue', 
            status: 'paid',
            date: { $gte: startDate }
          } 
        },
        { $group: { _id: null, total: { $sum: '$value' } } }
      ]),
      Conversation.aggregate([
        { $match: { organizationId: req.organizationId, createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
          }
        }
      ]),
      Task.aggregate([
        { $match: { organizationId: req.organizationId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
            overdue: {
              $sum: {
                $cond: [
                  { $and: [{ $lt: ['$dueDate', now] }, { $ne: ['$status', 'done'] }] },
                  1, 0
                ]
              }
            },
          }
        }
      ]),
    ]);
    
    const leadStats = leads[0] || { total: 0, won: 0, lost: 0, totalValue: 0, avgScore: 0 };
    const revenueTotal = revenue[0]?.total || 0;
    const convStats = conversations[0] || { total: 0, open: 0 };
    const taskStats = tasks[0] || { total: 0, completed: 0, overdue: 0 };
    
    res.json({
      leads: {
        total: leadStats.total,
        won: leadStats.won,
        lost: leadStats.lost,
        conversionRate: leadStats.total > 0 ? Math.round((leadStats.won / leadStats.total) * 100) : 0,
        avgScore: Math.round(leadStats.avgScore || 0),
        pipelineValue: leadStats.totalValue,
      },
      clients: { total: clients },
      revenue: { total: revenueTotal },
      conversations: convStats,
      tasks: taskStats,
      period,
    });
  } catch (error) {
    next(error);
  }
});

// Get funnel data
router.get('/funnel', async (req, res, next) => {
  try {
    const stages = await Lead.aggregate([
      { $match: { organizationId: req.organizationId } },
      {
        $group: {
          _id: '$stageId',
          count: { $sum: 1 },
          value: { $sum: '$value' },
        }
      }
    ]);
    
    res.json(stages);
  } catch (error) {
    next(error);
  }
});

// Get seller performance
router.get('/sellers', async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;
    
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case '7d': startDate.setDate(now.getDate() - 7); break;
      case '30d': startDate.setDate(now.getDate() - 30); break;
      case '90d': startDate.setDate(now.getDate() - 90); break;
    }
    
    const sellers = await Lead.aggregate([
      { 
        $match: { 
          organizationId: req.organizationId,
          createdAt: { $gte: startDate }
        } 
      },
      {
        $group: {
          _id: '$assignedTo',
          leads: { $sum: 1 },
          won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
          revenue: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, '$value', 0] } },
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: '$user.name',
          avatar: '$user.avatar',
          leads: 1,
          won: 1,
          revenue: 1,
          conversionRate: {
            $cond: [
              { $gt: ['$leads', 0] },
              { $multiply: [{ $divide: ['$won', '$leads'] }, 100] },
              0
            ]
          },
        }
      },
      { $sort: { revenue: -1 } }
    ]);
    
    res.json(sellers);
  } catch (error) {
    next(error);
  }
});

// Get channel performance
router.get('/channels', async (req, res, next) => {
  try {
    const channels = await Lead.aggregate([
      { $match: { organizationId: req.organizationId } },
      {
        $group: {
          _id: '$source',
          leads: { $sum: 1 },
          won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
          revenue: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, '$value', 0] } },
        }
      },
      {
        $project: {
          source: '$_id',
          leads: 1,
          won: 1,
          revenue: 1,
          conversionRate: {
            $cond: [
              { $gt: ['$leads', 0] },
              { $multiply: [{ $divide: ['$won', '$leads'] }, 100] },
              0
            ]
          },
        }
      },
      { $sort: { leads: -1 } }
    ]);
    
    res.json(channels);
  } catch (error) {
    next(error);
  }
});

// Get cohort analysis
router.get('/cohort', async (req, res, next) => {
  try {
    // Simplified cohort - in production this would be more complex
    const cohorts = [];
    const now = new Date();
    
    for (let i = 0; i < 6; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const initialCount = await Client.countDocuments({
        organizationId: req.organizationId,
        createdAt: { $gte: monthStart, $lte: monthEnd }
      });
      
      const activeCount = await Client.countDocuments({
        organizationId: req.organizationId,
        createdAt: { $gte: monthStart, $lte: monthEnd },
        status: 'active'
      });
      
      cohorts.push({
        month: monthStart.toISOString().slice(0, 7),
        initial: initialCount,
        active: activeCount,
        retention: initialCount > 0 ? Math.round((activeCount / initialCount) * 100) : 0,
      });
    }
    
    res.json(cohorts);
  } catch (error) {
    next(error);
  }
});

// Get revenue trends
router.get('/revenue-trends', async (req, res, next) => {
  try {
    const { period = '12m' } = req.query;
    
    const now = new Date();
    let months = 12;
    switch (period) {
      case '3m': months = 3; break;
      case '6m': months = 6; break;
      case '12m': months = 12; break;
    }
    
    const trends = [];
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const result = await Transaction.aggregate([
        {
          $match: {
            organizationId: req.organizationId,
            date: { $gte: monthStart, $lte: monthEnd }
          }
        },
        {
          $group: {
            _id: null,
            revenue: {
              $sum: { $cond: [{ $eq: ['$type', 'revenue'] }, '$value', 0] }
            },
            expenses: {
              $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$value', 0] }
            },
          }
        }
      ]);
      
      trends.push({
        month: monthStart.toLocaleDateString('pt-BR', { month: 'short' }),
        revenue: result[0]?.revenue || 0,
        expenses: result[0]?.expenses || 0,
      });
    }
    
    res.json(trends);
  } catch (error) {
    next(error);
  }
});

// Export report
router.get('/export/:type', async (req, res, next) => {
  try {
    const { type } = req.params;
    
    // Generate report based on type
    const data = {
      generatedAt: new Date().toISOString(),
      organization: req.organizationId,
      type,
      // Add relevant data based on report type
    };
    
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
