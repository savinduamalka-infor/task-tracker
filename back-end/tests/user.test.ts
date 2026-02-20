import request from "supertest";
import { describe, it, expect, beforeEach, vi } from "vitest";
import app from "../app";
import { User } from "../models/user.model";

// Mock authentication middleware
vi.mock("../middleware/auth.middleware.js", () => ({
  protectedRoute: (req: any, res: any, next: any) => {
    req.user = {
      id: "507f191e810c19729de860ea",
      name: "Test User",
      email: "test@example.com",
      role: "Admin",
    };
    next();
  },
  adminOnly: (req: any, res: any, next: any) => next(),
}));

beforeEach(async () => {
  await User.deleteMany({});
});

describe("", () => {
  describe("GET /api/me", () => {
    it("should return current user", async () => {
      const res = await request(app).get("/api/me");
      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.id || res.body.user._id).toBe("507f191e810c19729de860ea");
    });
  });

  describe("", () => {
    it("should return all users", async () => {
      await User.create({
        _id: "507f191e810c19729de860ea",
        name: "Test User",
        email: "test@example.com",
        role: "Admin",
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const res = await request(app).get("/api/users");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe("", () => {
    it("should return users without a team", async () => {
      await User.create({
        _id: "507f191e810c19729de860ea",
        name: "No Team User",
        email: "noteam@example.com",
        role: "Member",
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const res = await request(app).get("/api/users/without-team");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.users.length).toBeGreaterThan(0);
    });
  });

  describe("", () => {
    it("should return admin dashboard message", async () => {
      const res = await request(app).get("/api/admin/dashboard");
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Welcome to the admin dashboard");
      expect(res.body.user).toBeDefined();
    });
  });
});
