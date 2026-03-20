import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Organization } from '../models/Organization.js';

const settingsController = {
  getSettings: asyncHandler(async (req: Request, res: Response) => {
    const org = await Organization.findById(req.organizationId);
    res.json({ settings: org?.settings || {} });
  }),

  updateSettings: asyncHandler(async (req: Request, res: Response) => {
    const org = await Organization.findByIdAndUpdate(
      req.organizationId,
      { settings: req.body },
      { new: true }
    );
    res.json({ settings: org?.settings });
  }),
};

export default settingsController;
