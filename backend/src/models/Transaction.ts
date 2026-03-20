import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  description: string;
  type: 'revenue' | 'expense' | 'commission' | 'refund';
  category: string;
  value: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  date: Date;
  dueDate?: Date;
  paidAt?: Date;
  clientId?: mongoose.Types.ObjectId;
  leadId?: mongoose.Types.ObjectId;
  sellerId?: mongoose.Types.ObjectId;
  pipelineId?: mongoose.Types.ObjectId;
  invoiceNumber?: string;
  notes?: string;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true,
      index: true,
    },
    description: { type: String, required: true, trim: true },
    type: { 
      type: String,
      enum: ['revenue', 'expense', 'commission', 'refund'],
      required: true,
    },
    category: { type: String, required: true },
    value: { type: Number, required: true, min: 0 },
    status: { 
      type: String,
      enum: ['pending', 'paid', 'overdue', 'cancelled'],
      default: 'pending',
    },
    date: { type: Date, required: true },
    dueDate: Date,
    paidAt: Date,
    clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead' },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User' },
    pipelineId: { type: Schema.Types.ObjectId, ref: 'Pipeline' },
    invoiceNumber: String,
    notes: String,
    attachments: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
TransactionSchema.index({ organizationId: 1, type: 1 });
TransactionSchema.index({ organizationId: 1, status: 1 });
TransactionSchema.index({ organizationId: 1, date: -1 });
TransactionSchema.index({ organizationId: 1, dueDate: 1 });
TransactionSchema.index({ organizationId: 1, sellerId: 1 });
TransactionSchema.index({ organizationId: 1, clientId: 1 });

// Text index for search
TransactionSchema.index({ description: 'text', invoiceNumber: 'text' });

// Update status to overdue if past due date
TransactionSchema.pre('find', function () {
  const now = new Date();
  this.model.updateMany(
    { status: 'pending', dueDate: { $lt: now } },
    { $set: { status: 'overdue' } }
  );
});

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
