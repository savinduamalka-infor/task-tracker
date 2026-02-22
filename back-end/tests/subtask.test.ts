import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../app"; 
import { TaskModel } from "../models/task.model";
import * as llmService from "../services/llm.service";

// 1. Mock the protectedRoute middleware to bypass authentication
vi.mock("../middleware/auth.middleware.js", () => ({
  protectedRoute: (req: any, res: any, next: any) => {
    req.user = { id: new mongoose.Types.ObjectId().toString(), teamId: "team-123" };
    next();
  },
}));

describe("Subtask Controller", () => {
  const mockUserId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Subtask Tests", () => {
    it("can't create a subtask if title is whitespace only", async () => {
      const res = await request(app)
        .post("/api/subtasks/suggest") 
        .send({ title: "   " });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Title is required");
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
        reporterId: mockUserId,
        assigneeId: mockUserId
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