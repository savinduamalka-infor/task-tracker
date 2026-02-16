import crypto from "crypto";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import type { Db, MongoClient } from "mongodb";

import "../models/user.model";

function buildAuth(db: Db, client?: MongoClient) {
  return betterAuth({
    database: mongodbAdapter(db, {
      client,
      usePlural: false,
    }),

    advanced: {
      database: {
        generateId: () => crypto.randomUUID(),
      },
      disableOriginCheck: true,
      disableCSRFCheck: true,
    },

    emailAndPassword: {
      enabled: true,
    },

    user: {
      additionalFields: {
        role: {
          type: "string",
          defaultValue: "Member",
          input: true,
        },
        teamId: {
          type: "string",
          required: false,
          input: true,
        },
        jobTitle: {
          type: "string",
          required: false,
          input: true,
        },
        isActive: {
          type: "boolean",
          defaultValue: true,
        },
        lastUpdateSubmitted: {
          type: "date",
          required: false,
        },
      },
    },
  });
}

let _auth: ReturnType<typeof buildAuth> | null = null;

export function initAuth(db: Db, client?: MongoClient) {
  _auth = buildAuth(db, client);
  return _auth;
}

export function getAuth() {
  if (!_auth) throw new Error("Auth not initialised – call initAuth() first");
  return _auth;
}

type AuthInstance = ReturnType<typeof buildAuth>;
export type Session = AuthInstance["$Infer"]["Session"]["session"];
export type User    = AuthInstance["$Infer"]["Session"]["user"];
