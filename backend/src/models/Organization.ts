import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganization extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  domain?: string;
  plan: 'starter' | 'business' | 'enterprise';
  status: 'active' | 'suspended' | 'cancelled';
  settings: {
    timezone: string;
    language: string;
    dateFormat: string;
    currency: string;
  };
  branding: {
    logo?: string;
    primaryColor: string;
    darkMode: boolean;
  };
  limits: {
    maxUsers: number;
    maxLeads: number;
    maxStorage: number;
  };
  integrations: Array<{
    id?: string;
    name: string;
    status: 'connected' | 'disconnected';
    connectedAt?: Date;
    icon?: string;
    category?: string;
    description?: string;
    credentials?: {
      [key: string]: string | undefined;
    };
    metrics?: {
      requestsMonth?: number;
      successfulChecks?: number;
      failedChecks?: number;
      avgLatencyMs?: number;
      lastCheckedAt?: Date;
    };
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    domain: { type: String, sparse: true },
    plan: { 
      type: String, 
      enum: ['starter', 'business', 'enterprise'], 
      default: 'starter' 
    },
    status: { 
      type: String, 
      enum: ['active', 'suspended', 'cancelled'], 
      default: 'active' 
    },
    settings: {
      timezone: { type: String, default: 'America/Sao_Paulo' },
      language: { type: String, default: 'pt-BR' },
      dateFormat: { type: String, default: 'DD/MM/YYYY' },
      currency: { type: String, default: 'BRL' },
    },
    branding: {
      logo: { type: String },
      primaryColor: { type: String, default: '#6366f1' },
      darkMode: { type: Boolean, default: false },
    },
    limits: {
      maxUsers: { type: Number, default: 5 },
      maxLeads: { type: Number, default: 1000 },
      maxStorage: { type: Number, default: 1073741824 }, // 1GB in bytes
    },
    integrations: [
      {
        _id: false,
        id: String,
        name: String,
        status: {
          type: String,
          enum: ['connected', 'disconnected'],
          default: 'disconnected',
        },
        connectedAt: Date,
        icon: String,
        category: String,
        description: String,
        credentials: {
          type: Map,
          of: String,
          default: {},
        },
        metrics: {
          requestsMonth: { type: Number, default: 0 },
          successfulChecks: { type: Number, default: 0 },
          failedChecks: { type: Number, default: 0 },
          avgLatencyMs: Number,
          lastCheckedAt: Date,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
OrganizationSchema.index({ slug: 1 });
OrganizationSchema.index({ status: 1 });

export const Organization = mongoose.model<IOrganization>('Organization', OrganizationSchema);
