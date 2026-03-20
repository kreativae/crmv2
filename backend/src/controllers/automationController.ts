import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Automation } from '../models/Automation.js';

const automationController = {
  getAutomations: asyncHandler(async (req: Request, res: Response) => {
    const automations = await Automation.find({ organizationId: req.organizationId });
    res.json({ automations });
  }),

  createAutomation: asyncHandler(async (req: Request, res: Response) => {
    const automation = await Automation.create({
      ...req.body,
      organizationId: req.organizationId,
    });
    res.status(201).json({ automation });
  }),

  updateAutomation: asyncHandler(async (req: Request, res: Response) => {
    const automation = await Automation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json({ automation });
  }),

  deleteAutomation: asyncHandler(async (req: Request, res: Response) => {
    await Automation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Automação deletada' });
  }),

  triggerAutomation: asyncHandler(async (req: Request, res: Response) => {
    res.json({ message: 'Automação acionada com sucesso' });
  }),
};

export default automationController;
