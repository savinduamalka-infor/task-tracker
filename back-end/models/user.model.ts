import mongoose, { Schema } from "mongoose";

export interface IUser {
  _id: string;
  email: string;
  name: string;
  role: "Lead" | "Member";
  teamId?: string;
  jobTitle?: string;
  isActive: boolean;
  lastUpdateSubmitted?: Date;
  emailVerified: boolean;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    _id: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["Admin", "Lead", "Member"],
      required: true,
      default: "Member",
    },
    teamId: {
      type: String,
      default: null,
    },
    jobTitle: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUpdateSubmitted: {
      type: Date,
      default: null,
    }
  },
  {
    timestamps: true,
    collection: "user",
  }
);

export const User =
  (mongoose.models.user as mongoose.Model<IUser>) ||
  mongoose.model<IUser>("user", userSchema, "user");
  
