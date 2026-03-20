import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Client } from '../models/Client.js';

const clientController = {
  getClients: asyncHandler(async (req: Request, res: Response) => {
    const clients = await Client.find({ organizationId: req.organizationId })
      .sort({ createdAt: -1 });
    res.json({ clients });
  }),

  getClient: asyncHandler(async (req: Request, res: Response) => {
    const client = await Client.findById(req.params.id);
    if (!client) {
      res.status(404).json({ error: 'Cliente não encontrado' });
      return;
    }
    res.json({ client });
  }),

  createClient: asyncHandler(async (req: Request, res: Response) => {
    const client = await Client.create({
      ...req.body,
      organizationId: req.organizationId,
    });
    res.status(201).json({ client });
  }),

  updateClient: asyncHandler(async (req: Request, res: Response) => {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!client) {
      res.status(404).json({ error: 'Cliente não encontrado' });
      return;
    }
    res.json({ client });
  }),

  deleteClient: asyncHandler(async (req: Request, res: Response) => {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      res.status(404).json({ error: 'Cliente não encontrado' });
      return;
    }
    res.json({ message: 'Cliente deletado com sucesso' });
  }),
};

export default clientController;
