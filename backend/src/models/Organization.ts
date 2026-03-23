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
  roles?: Record<string, string[]>;
  notificationSettings?: {
    newLead: { email: boolean; push: boolean; inApp: boolean };
    newMessage: { email: boolean; push: boolean; inApp: boolean };
    dealClosed: { email: boolean; push: boolean; inApp: boolean };
    taskOverdue: { email: boolean; push: boolean; inApp: boolean };
    slaExceeded: { email: boolean; push: boolean; inApp: boolean };
  };
  webhooks?: Array<{
    id: string;
    url: string;
    events: string[];
    active: boolean;
    secret: string;
    createdAt: Date;
    lastTriggered?: Date;
    failCount: number;
  }>;
  apiKeys?: Array<{
    id: string;
    name: string;
    key: string;
    createdAt: Date;
    lastUsed?: Date | null;
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
    roles: {
      type: Map,
      of: [String],
      default: {},
    },
    notificationSettings: {
      newLead: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
      },
      newMessage: {
        email: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
      },
      dealClosed: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
      },
      taskOverdue: {
        email: { type: Boolean, default: false },
        push: { type: Boolean, default: false },
        inApp: { type: Boolean, default: true },
      },
      slaExceeded: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
      },
    },
    webhooks: [
      {
        _id: false,
        id: { type: String, required: true },
        url: { type: String, required: true },
        events: { type: [String], default: [] },
        active: { type: Boolean, default: true },
        secret: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
        lastTriggered: Date,
        failCount: { type: Number, default: 0 },
      },
    ],
    apiKeys: [
      {
        _id: false,
        id: { type: String, required: true },
        name: { type: String, required: true },
        key: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        lastUsed: { type: Date, default: null },
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
