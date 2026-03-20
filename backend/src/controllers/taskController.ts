import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Task } from '../models/Task.js';

const taskController = {
  getTasks: asyncHandler(async (req: Request, res: Response) => {
    const tasks = await Task.find({ organizationId: req.organizationId }).sort({
      dueDate: 1,
    });
    res.json({ tasks });
  }),

  getTask: asyncHandler(async (req: Request, res: Response) => {
    const task = await Task.findById(req.params.id);
    res.json({ task });
  }),

  createTask: asyncHandler(async (req: Request, res: Response) => {
    const task = await Task.create({
      ...req.body,
      organizationId: req.organizationId,
      createdBy: req.user!._id,
    });
    res.status(201).json({ task });
  }),

  updateTask: asyncHandler(async (req: Request, res: Response) => {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ task });
  }),

  deleteTask: asyncHandler(async (req: Request, res: Response) => {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tarefa deletada' });
  }),

  completeTask: asyncHandler(async (req: Request, res: Response) => {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { completed: true, completedAt: new Date() },
      { new: true }
    );
    res.json({ task });
  }),
};

export default taskController;
