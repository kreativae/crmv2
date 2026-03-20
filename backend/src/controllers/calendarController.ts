import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { CalendarEvent } from '../models/CalendarEvent.js';

const calendarController = {
  getEvents: asyncHandler(async (req: Request, res: Response) => {
    const events = await CalendarEvent.find({ organizationId: req.organizationId });
    res.json({ events });
  }),

  createEvent: asyncHandler(async (req: Request, res: Response) => {
    const event = await CalendarEvent.create({
      ...req.body,
      organizationId: req.organizationId,
    });
    res.status(201).json({ event });
  }),

  updateEvent: asyncHandler(async (req: Request, res: Response) => {
    const event = await CalendarEvent.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ event });
  }),

  deleteEvent: asyncHandler(async (req: Request, res: Response) => {
    await CalendarEvent.findByIdAndDelete(req.params.id);
    res.json({ message: 'Evento deletado' });
  }),
};

export default calendarController;
