import mongoose, { Schema, Document } from 'mongoose';

export interface IClient extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  industry?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country: string;
  annualSpend: number;
  tags: string[];
  notes: string;
  status: 'active' | 'inactive';
  leadId?: mongoose.Types.ObjectId; // If converted from lead
  customFields: Record<string, unknown>;
  interactions: {
    type: string;
    description: string;
    userId?: mongoose.Types.ObjectId;
    createdAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
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
    industry: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, default: 'Brasil' },
    annualSpend: { type: Number, default: 0, min: 0 },
    tags: [{ type: String }],
    notes: { type: String, default: '' },
    status: { 
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead' },
    customFields: { type: Schema.Types.Mixed, default: {} },
    interactions: [{
      type: { type: String, required: true },
      description: { type: String, required: true },
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: Date.now },
    }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
ClientSchema.index({ organizationId: 1, status: 1 });
ClientSchema.index({ organizationId: 1, industry: 1 });
ClientSchema.index({ organizationId: 1, tags: 1 });
ClientSchema.index({ organizationId: 1, createdAt: -1 });
ClientSchema.index({ organizationId: 1, annualSpend: -1 });

// Text index for search
ClientSchema.index({ 
  name: 'text', 
  email: 'text', 
  company: 'text', 
  phone: 'text' 
});

export const Client = mongoose.model<IClient>('Client', ClientSchema);
