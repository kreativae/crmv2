import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';

const webhookController = {
  registerWebhook: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json({ message: 'Webhook registrado com sucesso' });
  }),

  getWebhooks: asyncHandler(async (req: Request, res: Response) => {
    res.json({ webhooks: [] });
  }),

  deleteWebhook: asyncHandler(async (req: Request, res: Response) => {
    res.json({ message: 'Webhook deletado' });
  }),

  testWebhook: asyncHandler(async (req: Request, res: Response) => {
    res.json({ message: 'Webhook testado com sucesso' });
  }),
};

export default webhookController;
