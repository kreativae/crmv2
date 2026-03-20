import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage {
  _id: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  sender: 'agent' | 'client' | 'system';
  senderId?: mongoose.Types.ObjectId;
  content: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'note';
  attachments?: {
    url: string;
    type: string;
    name: string;
    size?: number;
  }[];
  replyTo?: mongoose.Types.ObjectId;
  reactions?: {
    emoji: string;
    userId: mongoose.Types.ObjectId;
  }[];
  readAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
}

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAvatar?: string;
  channel: 'whatsapp' | 'instagram' | 'facebook' | 'telegram' | 'email' | 'webchat';
  channelId?: string; // External channel identifier
  status: 'open' | 'pending' | 'resolved';
  assignedTo?: mongoose.Types.ObjectId;
  tags: string[];
  unreadCount: number;
  lastMessage?: string;
  lastMessageAt?: Date;
  slaExceeded: boolean;
  slaDeadline?: Date;
  leadId?: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Conversation', 
      required: true,
      index: true,
    },
    sender: { 
      type: String, 
      enum: ['agent', 'client', 'system'],
      required: true,
    },
    senderId: { type: Schema.Types.ObjectId, ref: 'User' },
    content: { type: String, required: true },
    type: { 
      type: String,
      enum: ['text', 'image', 'audio', 'video', 'document', 'note'],
      default: 'text',
    },
    attachments: [{
      url: { type: String, required: true },
      type: { type: String, required: true },
      name: { type: String, required: true },
      size: Number,
    }],
    replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
    reactions: [{
      emoji: { type: String, required: true },
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    }],
    readAt: Date,
    deliveredAt: Date,
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({ conversationId: 1, createdAt: -1 });

const ConversationSchema = new Schema<IConversation>(
  {
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true,
      index: true,
    },
    contactName: { type: String, required: true, trim: true },
    contactEmail: { type: String, lowercase: true, trim: true },
    contactPhone: { type: String, trim: true },
    contactAvatar: String,
    channel: { 
      type: String,
      enum: ['whatsapp', 'instagram', 'facebook', 'telegram', 'email', 'webchat'],
      required: true,
    },
    channelId: String,
    status: { 
      type: String,
      enum: ['open', 'pending', 'resolved'],
      default: 'open',
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    tags: [{ type: String }],
    unreadCount: { type: Number, default: 0 },
    lastMessage: String,
    lastMessageAt: Date,
    slaExceeded: { type: Boolean, default: false },
    slaDeadline: Date,
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead' },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
ConversationSchema.index({ organizationId: 1, status: 1 });
ConversationSchema.index({ organizationId: 1, channel: 1 });
ConversationSchema.index({ organizationId: 1, assignedTo: 1 });
ConversationSchema.index({ organizationId: 1, lastMessageAt: -1 });
ConversationSchema.index({ organizationId: 1, channelId: 1 });

// Text index for search
ConversationSchema.index({ contactName: 'text', contactEmail: 'text', contactPhone: 'text' });

// Virtual for messages
ConversationSchema.virtual('messages', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'conversationId',
});

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
