import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Conversation } from '../models/Conversation.js';

const conversationController = {
  getConversations: asyncHandler(async (req: Request, res: Response) => {
    const conversations = await Conversation.find({
      organizationId: req.organizationId,
    }).sort({ updatedAt: -1 });
    res.json({ conversations });
  }),

  getConversation: asyncHandler(async (req: Request, res: Response) => {
    const conversation = await Conversation.findById(req.params.id);
    res.json({ conversation });
  }),

  createConversation: asyncHandler(async (req: Request, res: Response) => {
    const conversation = await Conversation.create({
      ...req.body,
      organizationId: req.organizationId,
    });
    res.status(201).json({ conversation });
  }),

  addMessage: asyncHandler(async (req: Request, res: Response) => {
    const { message } = req.body;
    const conversation = await Conversation.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          messages: {
            text: message,
            sender: req.user!._id,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    );
    res.json({ conversation });
  }),
};

export default conversationController;
