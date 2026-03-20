import mongoose, { Schema, Document } from 'mongoose';

export interface ILead extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source: string;
  pipelineId?: mongoose.Types.ObjectId;
  stageId?: string;
  score: number;
  value: number;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  tags: string[];
  assignedTo?: mongoose.Types.ObjectId;
  notes: string;
  customFields: Record<string, unknown>;
  activities: {
    type: string;
    description: string;
    userId?: mongoose.Types.ObjectId;
    createdAt: Date;
  }[];
  lostReason?: string;
  wonDate?: Date;
  lostDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    company: { type: String, trim: true },
    source: { type: String, default: 'website' },
    pipelineId: { type: Schema.Types.ObjectId, ref: 'Pipeline' },
    stageId: { type: String },
    score: { type: Number, default: 0, min: 0, max: 100 },
    value: { type: Number, default: 0, min: 0 },
    status: { 
      type: String,
      enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
      default: 'new',
    },
    tags: [{ type: String }],
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, default: '' },
    customFields: { type: Schema.Types.Mixed, default: {} },
    activities: [{
      type: { type: String, required: true },
      description: { type: String, required: true },
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: Date.now },
    }],
    lostReason: { type: String },
    wonDate: { type: Date },
    lostDate: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
LeadSchema.index({ organizationId: 1, status: 1 });
LeadSchema.index({ organizationId: 1, pipelineId: 1, stageId: 1 });
LeadSchema.index({ organizationId: 1, assignedTo: 1 });
LeadSchema.index({ organizationId: 1, score: -1 });
LeadSchema.index({ organizationId: 1, createdAt: -1 });
LeadSchema.index({ organizationId: 1, tags: 1 });
LeadSchema.index({ organizationId: 1, email: 1 });

// Text index for search
LeadSchema.index({ 
  name: 'text', 
  email: 'text', 
  company: 'text', 
  phone: 'text' 
});

export const Lead = mongoose.model<ILead>('Lead', LeadSchema);
