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
  integrations: {
    whatsapp?: {
      connected: boolean;
      phoneNumberId?: string;
      businessAccountId?: string;
      accessToken?: string;
    };
    instagram?: {
      connected: boolean;
      accessToken?: string;
      pageId?: string;
    };
    // Add more integrations as needed
  };
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
    integrations: {
      whatsapp: {
        connected: { type: Boolean, default: false },
        phoneNumberId: String,
        businessAccountId: String,
        accessToken: String,
      },
      instagram: {
        connected: { type: Boolean, default: false },
        accessToken: String,
        pageId: String,
      },
    },
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
