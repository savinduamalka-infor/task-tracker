import mongoose, { Schema, Document } from "mongoose";

export interface ITeam extends Document {
  name: string;
  description?: string;
  createdBy: string;
  members: string[];
}


const TeamSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    createdBy: { type: String, required: true },
    members: [{ type: String }],

  },
  { timestamps: true }
);

export default mongoose.model<ITeam>("Team", TeamSchema);
