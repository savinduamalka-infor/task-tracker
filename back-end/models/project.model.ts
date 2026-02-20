import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
  name: string;
  description?: string;
  teamId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 255 },
    description: { type: String, trim: true },
    teamId: { type: String, required: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

ProjectSchema.index({ teamId: 1, name: 1 }, { unique: true });

export default mongoose.model<IProject>("Project", ProjectSchema);
