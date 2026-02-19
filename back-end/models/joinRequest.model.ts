import mongoose, { Schema, Document } from "mongoose";

export interface IJoinRequest extends Document {
  userId: string;
  teamId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

const JoinRequestSchema: Schema = new Schema(
  {
    userId: { type: String, required: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Ensure one pending request per user per team
JoinRequestSchema.index({ userId: 1, teamId: 1, status: 1 });

export default mongoose.model<IJoinRequest>("JoinRequest", JoinRequestSchema);
