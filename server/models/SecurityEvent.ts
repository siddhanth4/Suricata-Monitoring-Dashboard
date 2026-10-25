import mongoose, { Document, Schema } from 'mongoose';
import { NormalizedSecurityEvent, SecurityAction } from '../types/index.ts';

export interface ISecurityEventDocument extends Document, Omit<NormalizedSecurityEvent, 'id'> {
  _id: mongoose.Types.ObjectId;
}

const SecurityEventSchema = new Schema<ISecurityEventDocument>(
  {
    timestamp: { type: String, required: true },
    eventTime: { type: Date, required: true, index: true },
    eventType: { type: String, required: true, index: true },
    sourceIP: { type: String, default: null, index: true },
    sourcePort: { type: Number, default: null },
    destinationIP: { type: String, default: null, index: true },
    destinationPort: { type: Number, default: null },
    protocol: { type: String, default: 'UNKNOWN', index: true },
    appProtocol: { type: String, default: null },
    signature: { type: String, default: null },
    signatureId: { type: Number, default: null, index: true },
    category: { type: String, default: 'Unclassified' },
    severity: { type: Number, default: null, index: true },
    action: {
      type: String,
      enum: ['ALERT', 'DROP', 'REJECT', 'PASS', 'UNKNOWN'],
      default: 'UNKNOWN',
      index: true,
    },
    actionEvidence: { type: String, default: '' },
    flowId: { type: Schema.Types.Mixed, default: null },
    interface: { type: String, default: null },
    rawEvent: { type: Schema.Types.Mixed, default: {} },
    ingestionSource: {
      type: String,
      enum: ['suricata-tail', 'demo-generator', 'api-ingest'],
      default: 'suricata-tail',
    },
    dedupKey: { type: String, required: true, unique: true, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for rapid analytics & filtering
SecurityEventSchema.index({ eventType: 1, eventTime: -1 });
SecurityEventSchema.index({ severity: 1, eventTime: -1 });
SecurityEventSchema.index({ action: 1, eventTime: -1 });
SecurityEventSchema.index({ sourceIP: 1, eventTime: -1 });

export const SecurityEventModel = mongoose.model<ISecurityEventDocument>('SecurityEvent', SecurityEventSchema);
