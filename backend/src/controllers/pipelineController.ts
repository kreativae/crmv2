import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Pipeline } from '../models/Pipeline.js';

const pipelineController = {
  getPipelines: asyncHandler(async (req: Request, res: Response) => {
    const pipelines = await Pipeline.find({ organizationId: req.organizationId });
    res.json({ pipelines });
  }),

  getPipeline: asyncHandler(async (req: Request, res: Response) => {
    const pipeline = await Pipeline.findById(req.params.id);
    res.json({ pipeline });
  }),

  createPipeline: asyncHandler(async (req: Request, res: Response) => {
    const pipeline = await Pipeline.create({
      ...req.body,
      organizationId: req.organizationId,
    });
    res.status(201).json({ pipeline });
  }),

  updatePipeline: asyncHandler(async (req: Request, res: Response) => {
    const pipeline = await Pipeline.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json({ pipeline });
  }),

  deletePipeline: asyncHandler(async (req: Request, res: Response) => {
    await Pipeline.findByIdAndDelete(req.params.id);
    res.json({ message: 'Pipeline deletado' });
  }),
};

export default pipelineController;
