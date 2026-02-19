import mongoose, { Schema, Document } from "mongoose";

export interface IAssignRequest extends Document {
  taskId: mongoose.Types.ObjectId;
  requesterId: string; 
  teamId: string;
  suggestedMemberIds: string[]; 
  note: string; 
  status: "pending" | "approved" | "rejected";
  resolvedBy?: string; 
  resolvedNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const assignRequestSchema = new Schema<IAssignRequest>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    requesterId: {
      type: String,
      required: true,
    },
    teamId: {
      type: String,
      required: true,
    },
    suggestedMemberIds: {
      type: [String],
      default: [],
    },
    note: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    resolvedBy: {
      type: String,
      default: null,
    },
    resolvedNote: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { timestamps: true }
);

assignRequestSchema.index({ taskId: 1, requesterId: 1, status: 1 });
assignRequestSchema.index({ teamId: 1, status: 1 });

export const AssignRequestModel = mongoose.model<IAssignRequest>(
  "AssignRequest",
  assignRequestSchema
);
