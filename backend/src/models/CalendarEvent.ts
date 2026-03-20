import mongoose, { Schema, Document } from 'mongoose';

export interface ICalendarEvent extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  category: 'meeting' | 'call' | 'task' | 'deadline' | 'personal' | 'followup';
  startDate: Date;
  endDate?: Date;
  allDay: boolean;
  location?: string;
  color?: string;
  assignedTo?: mongoose.Types.ObjectId;
  leadId?: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId;
  reminder?: number; // minutes before
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  isCompleted: boolean;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CalendarEventSchema = new Schema<ICalendarEvent>(
  {
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { 
      type: String,
      enum: ['meeting', 'call', 'task', 'deadline', 'personal', 'followup'],
      default: 'meeting',
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    allDay: { type: Boolean, default: false },
    location: { type: String, trim: true },
    color: { type: String, default: '#6366f1' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead' },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
    reminder: { type: Number },
    recurrence: { 
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly'],
      default: 'none',
    },
    isCompleted: { type: Boolean, default: false },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
CalendarEventSchema.index({ organizationId: 1, startDate: 1 });
CalendarEventSchema.index({ organizationId: 1, assignedTo: 1 });
CalendarEventSchema.index({ organizationId: 1, category: 1 });
CalendarEventSchema.index({ organizationId: 1, leadId: 1 });
CalendarEventSchema.index({ organizationId: 1, clientId: 1 });

// Text index for search
CalendarEventSchema.index({ title: 'text', description: 'text' });

export const CalendarEvent = mongoose.model<ICalendarEvent>('CalendarEvent', CalendarEventSchema);
