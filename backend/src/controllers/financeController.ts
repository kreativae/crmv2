import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Transaction } from '../models/Transaction.js';

export const financeController = {
  // GET /api/finance
  getTransactions: asyncHandler(async (req: Request, res: Response) => {
    const transactions = await Transaction.find({
      organizationId: req.organizationId,
    })
      .sort({ date: -1 })
      .limit(50);

    res.json({ transactions });
  }),

  // POST /api/finance
  createTransaction: asyncHandler(async (req: Request, res: Response) => {
    const transaction = await Transaction.create({
      ...req.body,
      organizationId: req.organizationId,
    });

    res.status(201).json({ transaction });
  }),

  // GET /api/finance/summary
  getSummary: asyncHandler(async (req: Request, res: Response) => {
    const summary = await Transaction.aggregate([
      { $match: { organizationId: req.organizationId } },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
          totalExpense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
        },
      },
    ]);

    res.json({ summary: summary[0] || { totalIncome: 0, totalExpense: 0 } });
  }),
};
