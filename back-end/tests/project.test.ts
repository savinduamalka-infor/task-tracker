import { describe, it, expect, beforeEach, vi, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../app";
import ProjectModel from "../models/project.model";
import { TaskModel } from "../models/task.model";
import Team from "../models/team.model";

const mockLeadId = new mongoose.Types.ObjectId().toString();
const mockMemberId = new mongoose.Types.ObjectId().toString();
const mockTeamId = new mongoose.Types.ObjectId().toString();
const otherTeamId = new mongoose.Types.ObjectId().toString();

// Dynamic Auth Mock
let activeUser: any = { id: mockLeadId, role: "Lead", teamId: mockTeamId };

vi.mock("../middleware/auth.middleware.js", () => ({
  protectedRoute: (req: any, res: any, next: any) => {
    req.user = activeUser;
    next();
  },
}));

describe("Project Controller Logic", () => {
  beforeEach(async () => {
    // Clear Database
    await ProjectModel.deleteMany({});
    await Team.deleteMany({});
    await TaskModel.deleteMany({});
    vi.clearAllMocks();

    // 1. Setup default team with ALL required fields (Fixes ValidationError)
    await Team.create({
      _id: new mongoose.Types.ObjectId(mockTeamId),
      name: "My Team",
      members: [mockLeadId, mockMemberId],
      createdBy: mockLeadId, // Requirement from your schema
    });

    // 2. Mock the direct MongoDB driver call used in resolveTeamId
    vi.spyOn(mongoose.connection, 'db', 'get').mockReturnValue({
      collection: (name: string) => ({
        findOne: vi.fn().mockImplementation(async (query: any) => {
          if (name === "user" && query._id.toString() === mockLeadId) {
            return { _id: query._id, teamId: mockTeamId };
          }
          if (name === "user" && query._id.toString() === mockMemberId) {
            return { _id: query._id, teamId: mockTeamId };
          }
          return null;
        })
      })
    } as any);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe("create project", () => {
    it("should allow a Lead to create a project in their own team", async () => {
      activeUser = { id: mockLeadId, role: "Lead", teamId: mockTeamId };

      const res = await request(app)
        .post(`/api/teams/${mockTeamId}/projects`)
        .send({ name: "New Project", description: "Desc" });

      expect(res.status).toBe(201);
      expect(res.body.project.name).toBe("New Project");
    });

    it("should reject if a Member tries to create a project", async () => {
      activeUser = { id: mockMemberId, role: "Member", teamId: mockTeamId };

      const res = await request(app)
        .post(`/api/teams/${mockTeamId}/projects`)
        .send({ name: "Member Project" });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Only Leads can create projects/i);
    });

    it("should reject if a Lead tries to create a project for a DIFFERENT team", async () => {
      activeUser = { id: mockLeadId, role: "Lead", teamId: mockTeamId };
      
      // Create another team that the Lead is NOT part of
      await Team.create({ 
        _id: new mongoose.Types.ObjectId(otherTeamId), 
        name: "Other Team", 
        members: [],
        createdBy: new mongoose.Types.ObjectId().toString()
      });

      const res = await request(app)
        .post(`/api/teams/${otherTeamId}/projects`)
        .send({ name: "Hack Project" });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/own team/i);
    });
  });

  describe("", () => {
    it("should reject duplicate project names in the same team ", async () => {
      activeUser = { id: mockLeadId, role: "Lead", teamId: mockTeamId };
      await ProjectModel.create({ name: "Unique", teamId: mockTeamId, createdBy: mockLeadId });

      const res = await request(app)
        .post(`/api/teams/${mockTeamId}/projects`)
        .send({ name: "Unique" });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it("should trim project names automatically", async () => {
      activeUser = { id: mockLeadId, role: "Lead", teamId: mockTeamId };
      const res = await request(app)
        .post(`/api/teams/${mockTeamId}/projects`)
        .send({ name: "   Spaced Project   " });

      expect(res.body.project.name).toBe("Spaced Project");
    });
  });

  describe("", () => {
    it("should delete all associated tasks when a project is deleted", async () => {
      activeUser = { id: mockLeadId, role: "Lead", teamId: mockTeamId };

      const project = await ProjectModel.create({ 
        name: "To Delete", 
        teamId: mockTeamId, 
        createdBy: mockLeadId 
      });
      
      // Create a task for this project
      await TaskModel.create({ 
        title: "Task 1", 
        projectId: project._id, 
        assigneeId: mockLeadId,
        reporterId: mockLeadId,
        status: "TODO",
        priority: "Medium"
      });

      const res = await request(app).delete(`/api/projects/${project._id}`);

      expect(res.status).toBe(200);
      const taskCount = await TaskModel.countDocuments({ projectId: project._id });
      expect(taskCount).toBe(0); 
    });
  });

  describe("", () => {
    it("should allow a member of the team to view the project", async () => {
      activeUser = { id: mockMemberId, role: "Member", teamId: mockTeamId };
      const project = await ProjectModel.create({ name: "Visible", teamId: mockTeamId, createdBy: mockLeadId });

      const res = await request(app).get(`/api/projects/${project._id}`);
      expect(res.status).toBe(200);
      expect(res.body.project.name).toBe("Visible");
    });

    it("should forbid a user from another team from viewing the project", async () => {
      activeUser = { id: new mongoose.Types.ObjectId().toString(), role: "Member", teamId: "different-team" };
      const project = await ProjectModel.create({ name: "Hidden", teamId: mockTeamId, createdBy: mockLeadId });

      const res = await request(app).get(`/api/projects/${project._id}`);
      expect(res.status).toBe(403);
    });
  });
});