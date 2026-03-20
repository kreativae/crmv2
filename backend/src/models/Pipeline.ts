import mongoose, { Schema, Document } from 'mongoose';

export interface IPipelineStage {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface IPipeline extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  stages: IPipelineStage[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PipelineSchema = new Schema<IPipeline>(
  {
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    stages: [{
      id: { type: String, required: true },
      name: { type: String, required: true },
      color: { type: String, default: '#6366f1' },
      order: { type: Number, required: true },
    }],
    isDefault: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index
PipelineSchema.index({ organizationId: 1, isDefault: 1 });

// Middleware to ensure only one default pipeline
PipelineSchema.pre('save', async function (next) {
  if (this.isDefault) {
    await mongoose.model('Pipeline').updateMany(
      { organizationId: this.organizationId, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

export const Pipeline = mongoose.model<IPipeline>('Pipeline', PipelineSchema);
