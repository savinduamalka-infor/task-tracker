import mongoose, { Schema } from "mongoose";
import crypto from "crypto";

export interface IUser {
  _id: string;
  email: string;
  name: string;
  role: "Admin" | "Lead" | "Member";
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
      default: () => crypto.randomUUID(),
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
  }
);

export const User =
  (mongoose.models.user as mongoose.Model<IUser>) ||
  mongoose.model<IUser>("user", userSchema, "user");
  
