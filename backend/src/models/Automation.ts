import mongoose, { Schema, Document } from 'mongoose';

export interface IAutomationTrigger {
  type: 'new_lead' | 'stage_change' | 'field_update' | 'message_received' | 
        'tag_added' | 'score_change' | 'deal_created' | 'task_completed' | 
        'schedule' | 'webhook';
  config?: Record<string, unknown>;
}

export interface IAutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string | number | boolean;
}

export interface IAutomationAction {
  type: 'send_whatsapp' | 'send_email' | 'send_message' | 'create_task' |
        'update_field' | 'move_stage' | 'add_tag' | 'remove_tag' |
        'assign_user' | 'webhook' | 'delay' | 'notification';
  config?: Record<string, unknown>;
}

export interface IAutomation extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  trigger: IAutomationTrigger;
  conditions: IAutomationCondition[];
  actions: IAutomationAction[];
  isActive: boolean;
  executionCount: number;
  successCount: number;
  failCount: number;
  lastExecutedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAutomationLog extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  automationId: mongoose.Types.ObjectId;
  status: 'running' | 'success' | 'failed';
  triggeredBy: string;
  actionsExecuted: number;
  duration: number; // milliseconds
  error?: string;
  details?: Record<string, unknown>;
  createdAt: Date;
}

const AutomationSchema = new Schema<IAutomation>(
  {
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    trigger: {
      type: { 
        type: String,
        enum: ['new_lead', 'stage_change', 'field_update', 'message_received',
               'tag_added', 'score_change', 'deal_created', 'task_completed',
               'schedule', 'webhook'],
        required: true,
      },
      config: { type: Schema.Types.Mixed },
    },
    conditions: [{
      field: { type: String, required: true },
      operator: { 
        type: String,
        enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than'],
        required: true,
      },
      value: { type: Schema.Types.Mixed, required: true },
    }],
    actions: [{
      type: { 
        type: String,
        enum: ['send_whatsapp', 'send_email', 'send_message', 'create_task',
               'update_field', 'move_stage', 'add_tag', 'remove_tag',
               'assign_user', 'webhook', 'delay', 'notification'],
        required: true,
      },
      config: { type: Schema.Types.Mixed },
    }],
    isActive: { type: Boolean, default: true },
    executionCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failCount: { type: Number, default: 0 },
    lastExecutedAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const AutomationLogSchema = new Schema<IAutomationLog>(
  {
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true,
    },
    automationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Automation', 
      required: true,
    },
    status: { 
      type: String,
      enum: ['running', 'success', 'failed'],
      required: true,
    },
    triggeredBy: { type: String, required: true },
    actionsExecuted: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    error: String,
    details: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

// Indexes
AutomationSchema.index({ organizationId: 1, isActive: 1 });
AutomationSchema.index({ organizationId: 1, 'trigger.type': 1 });

AutomationLogSchema.index({ organizationId: 1, automationId: 1, createdAt: -1 });
AutomationLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL

export const Automation = mongoose.model<IAutomation>('Automation', AutomationSchema);
export const AutomationLog = mongoose.model<IAutomationLog>('AutomationLog', AutomationLogSchema);
