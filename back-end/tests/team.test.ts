import request from "supertest";
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app";
import Team from "../models/team.model";
import { User } from "../models/user.model";

//  Mock authentication middleware
let mockUser = {
  id: "507f191e810c19729de860ea",
  role: "Admin",
};

vi.mock("../middleware/auth.middleware.js", () => ({
  protectedRoute: (req: any, res: any, next: any) => {
    req.user = mockUser;
    next();
  },
  adminOnly: (req: any, res: any, next: any) => next(),
}));

beforeEach(async () => {
  await Team.deleteMany({});
  await User.deleteMany({});
});

describe("Team API", () => {

  // Create team
  describe("POST /api/teams", () => {

    it("should create team successfully", async () => {
      const res = await request(app)
        .post("/api/teams")
        .send({ name: "Dev Team", description: "Test team" });

      expect(res.status).toBe(201);
      expect(res.body.team.name).toBe("Dev Team");
    });

    it("should return 400 if name missing", async () => {
      const res = await request(app)
        .post("/api/teams")
        .send({});

      expect(res.status).toBe(400);
    });

    it("should return 400 if team already exists", async () => {

      await request(app)
        .post("/api/teams")
        .send({ name: "Dev Team" });


      const res = await request(app)
        .post("/api/teams")
        .send({ name: "Dev Team" });

      expect(res.status).toBe(409);
    });


  });

  // Get team members
  describe("GET /api/teams/:teamId/members", () => {

    it("should return team members", async () => {
      const team = await Team.create({
        name: "Test",
        createdBy: "507f191e810c19729de860ea",
        members: ["507f191e810c19729de860ea"],
      });

      const res = await request(app)
        .get(`/api/teams/${team._id}/members`);

      expect(res.status).toBe(200);
      expect(res.body.teamName).toBe("Test");
    });

    it("should return 404 if team not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/teams/${fakeId}/members`);

      expect(res.status).toBe(404);
    });

  });

  // Add team member
  describe("POST /api/teams/:teamId/members", () => {

    it("should add member to team", async () => {
      const member = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        name: "John",
        email: "john@test.com",
        role: "Member",
      });

      const team = await Team.create({
        name: "Team A",
        createdBy: "507f191e810c19729de860ea",
        members: [],
      });

      const res = await request(app)
        .post(`/api/teams/${team._id}/members`)
        .send({ memberId: member._id });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Member added");
    });

    it("should return 400 if member already in team", async () => {
      const memberId = new mongoose.Types.ObjectId().toString();

      const team = await Team.create({
        name: "Team A",
        createdBy: "507f191e810c19729de860ea",
        members: [memberId],
      });

      const res = await request(app)
        .post(`/api/teams/${team._id}/members`)
        .send({ memberId });

      expect(res.status).toBe(400);
    });

    it("should return 404 if team not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post(`/api/teams/${fakeId}/members`)
        .send({ memberId: new mongoose.Types.ObjectId().toString() });

      expect(res.status).toBe(404);
    });

    it("should return 403 if user is not admin or creator", async () => {
      const originalUser = { ...mockUser };
      // Change user to normal member
      mockUser = {
        id: "randomUser",
        role: "Member",
      };

      const team = await Team.create({
        name: "Team A",
        createdBy: "someOtherUser",
        members: [],
      });

      const res = await request(app)
        .post(`/api/teams/${team._id}/members`)
        .send({ memberId: new mongoose.Types.ObjectId().toString() });

      expect(res.status).toBe(403);
      mockUser = originalUser;
    });

  });

  // Remove team member
  describe("DELETE /api/teams/:teamId/members/:memberId", () => {
    it("should remove member from team", async () => {
      const memberId = new mongoose.Types.ObjectId().toString();

      const team = await Team.create({
        name: "Team A",
        createdBy: "507f191e810c19729de860ea",
        members: [memberId],
      });

      const res = await request(app)
        .delete(`/api/teams/${team._id}/members/${memberId}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Member removed");
    });

    it("should return 404 if member not in team", async () => {
      const memberId = new mongoose.Types.ObjectId().toString();

      const team = await Team.create({
        name: "Team A",
        createdBy: "507f191e810c19729de860ea",
        members: [],
      });


      const res = await request(app)
        .delete(`/api/teams/${team._id}/members/${memberId}`);

      expect(res.status).toBe(404);
    });

  });

});
