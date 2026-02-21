import request from "supertest";
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app";
import Team from "../models/team.model";
import { User } from "../models/user.model";
import { TaskModel } from "../models/task.model";

//  Mock authentication middleware
let mockUser = {
  id: "507f191e810c19729de860ea",
  role: "Lead",
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

  // Create team - POST /api/teams
  describe("", () => {

    it("should create team successfully", async () => {
      const res = await request(app)
        .post("/api/teams")
        .send({ name: "Dev Team", description: "Test team" });

      expect(res.status).toBe(201);
      expect(res.body.team.name).toBe("Dev Team");
    });

    it("cant create team if name missing", async () => {
      const res = await request(app)
        .post("/api/teams")
        .send({});

      expect(res.status).toBe(400);
    });

    it("cant create team if team already exists", async () => {

      await request(app)
        .post("/api/teams")
        .send({ name: "Dev Team" });


      const res = await request(app)
        .post("/api/teams")
        .send({ name: "Dev Team" });

      expect(res.status).toBe(409);
    });


  });

  // Get team members - GET /api/teams/:teamId/members
  describe("", () => {

    it("return team members", async () => {
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

    it("return 404 if team not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/teams/${fakeId}/members`);

      expect(res.status).toBe(404);
    });

  });

  // Add team member - POST /api/teams/:teamId/members
  describe("", () => {

    it("add member to team", async () => {
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

    it("not allow to add member if member already in team", async () => {
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



    it("cant add member if user is not lead", async () => {
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

  // Remove team member - DELETE /api/teams/:teamId/members/:memberId
  describe("", () => {
    it("remove member from team", async () => {
      const memberId = new mongoose.Types.ObjectId().toString();

      const team = await Team.create({
        name: "Team A",
        createdBy: "507f191e810c19729de860ea",
        members: [memberId],
      });

      const res = await request(app)
        .delete(`/api/teams/${team._id}/members/${memberId}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Member removed and tasks reassigned to lead");
    });

    it("return 404 if member not in team", async () => {
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

    it("not allow removing the team lead", async () => {
      const team = await Team.create({
        name: "Lead Safety Team",
        createdBy: mockUser.id,
        members: [mockUser.id],
      });

      const res = await request(app)
        .delete(`/api/teams/${team._id}/members/${mockUser.id}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Team lead cannot be removed/i);
    });

    it("should automatically reassign member tasks to lead when member is removed", async () => {
      const memberId = new mongoose.Types.ObjectId().toString();
      const team = await Team.create({
        name: "Reassignment Team",
        createdBy: mockUser.id,
        members: [mockUser.id, memberId],
      });

      // Create a task assigned to the member
      const task = await TaskModel.create({
        title: "Member Task",
        assigneeId: memberId,
        teamId: team._id.toString(),
        reporterId: mockUser.id
      });

      const res = await request(app)
        .delete(`/api/teams/${team._id}/members/${memberId}`);

      expect(res.status).toBe(200);

      // Verify task now belongs to the lead
      const updatedTask = await TaskModel.findById(task._id);
      expect(updatedTask?.assigneeId).toBe(mockUser.id);
    });

    it("prevent deleting a team if it still has active tasks", async () => {
      const team = await Team.create({
        name: "Active Task Team",
        createdBy: mockUser.id,
        members: [mockUser.id],
      });

      // Create an active task for this team
      await TaskModel.create({
        title: "Blocking Task",
        assigneeId: mockUser.id,
        teamId: team._id.toString(),
        reporterId: mockUser.id
      });

      const res = await request(app)
        .delete(`/api/teams/${team._id}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Cannot delete team with existing tasks/i);
      
      // Verify team still exists
      const checkTeam = await Team.findById(team._id);
      expect(checkTeam).not.toBeNull();
    });

  });

});
