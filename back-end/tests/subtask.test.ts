import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../app"; 
import { TaskModel } from "../models/task.model";
import * as llmService from "../services/llm.service";

let activeUser = { 
  id: new mongoose.Types.ObjectId().toString(), 
  role: "Member", 
  teamId: "team-123" 
};

vi.mock("../middleware/auth.middleware.js", () => ({
  protectedRoute: (req: any, res: any, next: any) => {
    req.user = activeUser;
    next();
  },
}));

describe("Subtask Controller", () => {
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const adminId = new mongoose.Types.ObjectId().toString();
  beforeEach(async() => {
    vi.clearAllMocks();
    await TaskModel.deleteMany({});
    activeUser = { id: adminId, role: "Member", teamId: "team-123" };
  });

  describe("", () => {
    
    it("can't create a subtask if title is whitespace only", async () => {
      const res = await request(app)
        .post("/api/subtasks/suggest") 
        .send({ title: "   " });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Title is required");
    });

    it("can't add subtask when user is not assignee, helper, or lead", async () => {
      const userAId = new mongoose.Types.ObjectId().toString();
      const parentTask = await TaskModel.create({
        title: "User A's Task",
        assigneeId: userAId,
        teamId: "team-123",
        reporterId: userAId,
        priority: "Medium"
      });

      activeUser = { 
        id: new mongoose.Types.ObjectId().toString(), 
        role: "Member", 
        teamId: "team-123" 
      };

      const res = await request(app)
        .post(`/api/subtasks/${parentTask._id}`)
        .send({ title: "I am an intruder" });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Only the assignee, a helper, or a Lead/i);
    });

    it("allow nested subtasks", async () => {
      // Parent
      const level1 = await TaskModel.create({
        title: "Level 1 Parent",
        assigneeId: activeUser.id,
        teamId: "team-123",
        reporterId: activeUser.id
      });

      // Subtask of Level
      const level2Res = await request(app)
        .post(`/api/subtasks/${level1._id}`)
        .send({ title: "Level 2 Subtask" });
      
      const level2Id = level2Res.body._id;

      // Subtask of subtask
      const res = await request(app)
        .post(`/api/subtasks/${level2Id}`)
        .send({ title: "Level 3 Subtask" });

      expect(res.status).toBe(201);
      expect(res.body.parentTaskId).toBe(level2Id);
      expect(res.body.isSubtask).toBe(true);
      expect(res.body.summary).toContain(`Subtask of: Level 2 Subtask`);
    });

    it("return subtasks  ", async () => {
      const mockData = [{ title: "Subtask 1", description: "Desc 1" }];
      vi.spyOn(llmService, "generateSubtasks").mockResolvedValue(mockData);

      const res = await request(app)
        .post("/api/subtasks/suggest")
        .send({ title: "Valid Title", description: "Valid Desc" });

      expect(res.status).toBe(200);
      expect(res.body.subtasks).toEqual(mockData);
    });



    it("successfully create a subtask inheriting parent metadata", async () => {
      const parent = await TaskModel.create({
        title: "Parent Task",
        priority: "High",
        status: "TODO",
        teamId: "team-123",
       reporterId: new mongoose.Types.ObjectId(activeUser.id),
    assigneeId: new mongoose.Types.ObjectId(activeUser.id)
      });

      const res = await request(app)
        .post(`/api/subtasks/${parent._id}`)
        .send({ title: "New Subtask" });

      expect(res.status).toBe(201);
      expect(res.body.parentTaskId).toBe(parent._id.toString());
      expect(res.body.isSubtask).toBe(true);
    });

    it("return 404 for a non existent parent task ID", async () => {
      const randomId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/api/subtasks/${randomId}`)
        .send({ title: "Ghost Subtask" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Parent task not found");
    });
  });
});