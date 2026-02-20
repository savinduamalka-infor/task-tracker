import mongoose, { Schema, Document } from "mongoose";

export interface IUpdate {
  date: Date;
  note: string;
  blockedReason?: string;
  subtaskCompletions?: string[];
  updatedBy: string;
}

export interface ITask extends Document {
  title: string;
  summary?: string;
  description?: string;
  assigneeId: string;
  helperIds: string[];
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
  priority: "Low" | "Medium" | "High";
  startDate?: Date;
  dueDate?: Date;
  reporterId: string;
  restrictTo?: string[];
  teamId?: string;
  completedAt?: Date;
  parentTaskId?: string;
  isSubtask: boolean;
  projectId?: string;
  updates: IUpdate[];
  createdAt: Date;
  updatedAt: Date;
}

const updateSchema = new Schema<IUpdate>(
  {
    date: { type: Date, default: Date.now },
    note: { type: String, required: true, trim: true },
    blockedReason: { type: String, trim: true },
    subtaskCompletions: {
      type: [String],
      default: undefined,
    },
    updatedBy: {
      type: String,
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
      type: String,
      required: true,
    },
    helperIds: {
      type: [String],
      default: [],
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
      type: String,
      required: true,
    },
    restrictTo: {
      type: [String],
      default: [],
    },
    teamId: {
      type: String,
      default: null,
    },
    completedAt: { type: Date },
    parentTaskId: {
      type: String,
      default: null,
    },
    isSubtask: {
      type: Boolean,
      default: false,
    },
    projectId: {
      type: String,
      default: null,
    },
    updates: {
      type: [updateSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Basic useful indexes
taskSchema.index({ teamId: 1, status: 1 });
taskSchema.index({ assigneeId: 1 });
taskSchema.index({ teamId: 1, assigneeId: 1 });
taskSchema.index({ parentTaskId: 1 });
taskSchema.index({ projectId: 1 });

export const TaskModel =
  (mongoose.models.Task as mongoose.Model<ITask>) ||
  mongoose.model<ITask>("Task", taskSchema);