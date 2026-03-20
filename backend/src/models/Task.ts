import mongoose, { Schema, Document } from 'mongoose';

export interface ISubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'done';
  dueDate?: Date;
  estimatedHours?: number;
  assignedTo?: mongoose.Types.ObjectId;
  leadId?: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId;
  tags: string[];
  subtasks: ISubtask[];
  notes: {
    id: string;
    content: string;
    userId: mongoose.Types.ObjectId;
    createdAt: Date;
  }[];
  activities: {
    type: string;
    description: string;
    userId?: mongoose.Types.ObjectId;
    createdAt: Date;
  }[];
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    priority: { 
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: { 
      type: String,
      enum: ['todo', 'in_progress', 'done'],
      default: 'todo',
    },
    dueDate: { type: Date },
    estimatedHours: { type: Number, min: 0 },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead' },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
    tags: [{ type: String }],
    subtasks: [{
      id: { type: String, required: true },
      title: { type: String, required: true },
      completed: { type: Boolean, default: false },
    }],
    notes: [{
      id: { type: String, required: true },
      content: { type: String, required: true },
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      createdAt: { type: Date, default: Date.now },
    }],
    activities: [{
      type: { type: String, required: true },
      description: { type: String, required: true },
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: Date.now },
    }],
    completedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
TaskSchema.index({ organizationId: 1, status: 1 });
TaskSchema.index({ organizationId: 1, priority: 1 });
TaskSchema.index({ organizationId: 1, assignedTo: 1 });
TaskSchema.index({ organizationId: 1, dueDate: 1 });
TaskSchema.index({ organizationId: 1, leadId: 1 });
TaskSchema.index({ organizationId: 1, clientId: 1 });

// Text index for search
TaskSchema.index({ title: 'text', description: 'text' });

// Middleware to set completedAt
TaskSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'done' && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

export const Task = mongoose.model<ITask>('Task', TaskSchema);
