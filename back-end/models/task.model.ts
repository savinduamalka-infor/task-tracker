import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUpdate {
  date: Date;
  note: string;
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
  blockedReason?: string;
  updatedBy: Types.ObjectId;
}

export interface ITask extends Document {
  title: string;
  summary?: string;
  description?: string;
  assigneeId: Types.ObjectId;
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
  priority: "Low" | "Medium" | "High";
  startDate?: Date;
  dueDate?: Date;
  reporterId: Types.ObjectId;
  restrictTo?: Types.ObjectId[];
  teamId: Types.ObjectId;
  completedAt?: Date;
  updates: IUpdate[];
  createdAt: Date;
  updatedAt: Date;
}

const updateSchema = new Schema<IUpdate>(
  {
    date: { type: Date, default: Date.now },
    note: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"],
      required: true,
    },
    blockedReason: { type: String, trim: true },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { _id: false }
);

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    summary: { type: String, trim: true },
    description: { type: String, trim: true },
    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"],
      default: "TODO",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    startDate: { type: Date },
    dueDate: { type: Date },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    restrictTo: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    completedAt: { type: Date },
    updates: {
      type: [updateSchema],
      default: [],
    },
  },
  {
    timestamps: true, 
);

// Basic useful indexes
taskSchema.index({ teamId: 1, status: 1 });
taskSchema.index({ assigneeId: 1 });
taskSchema.index({ teamId: 1, assigneeId: 1 });

export const TaskModel =
  (mongoose.models.Task as mongoose.Model<ITask>) ||
  mongoose.model<ITask>("Task", taskSchema);