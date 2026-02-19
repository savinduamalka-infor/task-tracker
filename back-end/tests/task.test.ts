import request from "supertest";
import { describe, it, expect, beforeEach, vi } from "vitest";
import app from "../app";
import { TaskModel } from "../models/task.model";

let mockUser = {
  id: "507f191e810c19729de860ea",
  role: "Admin",
};


// Mock authentication middleware
vi.mock("../middleware/auth.middleware.js", () => ({
  protectedRoute: (req: any, res: any, next: any) => {
    req.user = mockUser; 
    next();
  },
  adminOnly: (req: any, res: any, next: any) => next(),
}));

beforeEach(async () => {
  await TaskModel.deleteMany({});
});

//Create task
describe("Task API", () => {
  describe("POST /api/tasks", () => {
    it("should create task successfully", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .send({
          title: "Test Task",
          assigneeId: "507f191e810c19729de860ea",
          status: "TODO",
          priority: "Medium",
        });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe("Test Task");
    });

    it("should allow admin to assign task to another user", async () => {
      mockUser = { id: "adminId", role: "Admin" };

      const res = await request(app)
        .post("/api/tasks")
        .send({
          title: "Admin Task",
          assigneeId: "anotherUserId",
          status: "TODO",
          priority: "Medium",
        });

      expect(res.status).toBe(201);
      expect(res.body.assigneeId).toBe("anotherUserId");
    });

it("should allow team lead to assign task to another user", async () => {
  mockUser = { id: "leadId", role: "TeamLead" };

  const res = await request(app)
    .post("/api/tasks")
    .send({
      title: "Lead Task",
      assigneeId: "anotherUserId",
      status: "TODO",
      priority: "Medium",
    });

  expect(res.status).toBe(201);
  expect(res.body.assigneeId).toBe("anotherUserId");
});

it("should return 403 if member assigns to others", async () => {
  mockUser = {
    id: "6996b08eb4718e64cf534243",
    role: "Member",
  };

  const res = await request(app)
    .post("/api/tasks")
    .send({
      title: "Test Task",
      assigneeId: "23456",
      status: "TODO",
      priority: "Medium",
    });

  expect(res.status).toBe(403);
});

  });

  // tasks
  describe("GET /api/tasks", () => {
    it("should get all tasks", async () => {
      await TaskModel.create({
        title: "Task 1",
        assigneeId: "507f191e810c19729de860ea",
        status: "TODO",
        priority: "Medium",
        reporterId: "507f191e810c19729de860ea",
        isSubtask: false,
      });
      const res = await request(app).get("/api/tasks");
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });
    it("should get only main tasks if mainOnly=true", async () => {
      await TaskModel.create({
        title: "Main Task",
        assigneeId: "507f191e810c19729de860ea",
        status: "TODO",
        priority: "Medium",
        reporterId: "507f191e810c19729de860ea",
        isSubtask: false,
      });
      await TaskModel.create({
        title: "Subtask",
        assigneeId: "507f191e810c19729de860ea",
        status: "TODO",
        priority: "Medium",
        reporterId: "507f191e810c19729de860ea",
        isSubtask: true,
      });
      const res = await request(app).get("/api/tasks?mainOnly=true");
      expect(res.status).toBe(200);
      expect(res.body.every((t: any) => !t.isSubtask)).toBe(true);
    });
  });

  // Get task by ID
  describe("GET /api/tasks/:id", () => {
    it("should get task by id", async () => {
      const task = await TaskModel.create({
        title: "Task 1",
        assigneeId: "507f191e810c19729de860ea",
        status: "TODO",
        priority: "Medium",
        reporterId: "507f191e810c19729de860ea",
        isSubtask: false,
      });
      const res = await request(app).get(`/api/tasks/${task._id}`);
      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Task 1");
    });
    it("should return 404 if task not found", async () => {
      const res = await request(app).get(`/api/tasks/507f191e810c19729de860eb`);
      expect(res.status).toBe(404);
    });
  });

  // Update task
  describe("PATCH /api/tasks/:id", () => {
    it("should update task", async () => {
      const task = await TaskModel.create({
        title: "Task 1",
        assigneeId: "507f191e810c19729de860ea",
        status: "TODO",
        priority: "Medium",
        reporterId: "507f191e810c19729de860ea",
        isSubtask: false,
      });
      const res = await request(app)
        .patch(`/api/tasks/${task._id.toString()}`)
        .send({ status: "DONE" });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("DONE");
    });
    it("should push update with note", async () => {
      const task = await TaskModel.create({
        title: "Task 1",
        assigneeId: "507f191e810c19729de860ea",
        status: "TODO",
        priority: "Medium",
        reporterId: "507f191e810c19729de860ea",
        isSubtask: false,
      });
      const res = await request(app)
        .patch(`/api/tasks/${task._id.toString()}`)
        .send({ updates: { note: "Progress update" } });
      expect(res.status).toBe(200);
      expect(res.body.updates.length).toBe(1);
      expect(res.body.updates[0].note).toBe("Progress update");
    });
    it("should return 400 if update note missing", async () => {
      const task = await TaskModel.create({
        title: "Task 1",
        assigneeId: "507f191e810c19729de860ea",
        status: "TODO",
        priority: "Medium",
        reporterId: "507f191e810c19729de860ea",
        isSubtask: false,
      });
      const res = await request(app)
        .patch(`/api/tasks/${task._id}`)
        .send({ updates: {} });
      expect(res.status).toBe(400);
    });
    it("should return 404 if task not found", async () => {
      const res = await request(app)
        .patch(`/api/tasks/507f191e810c19729de860eb`)
        .send({ status: "DONE" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    it("should delete task and subtasks", async () => {
      const mainTask = await TaskModel.create({
        title: "Main Task",
        assigneeId: "507f191e810c19729de860ea",
        status: "TODO",
        priority: "Medium",
        reporterId: "507f191e810c19729de860ea",
        isSubtask: false,
      });
      await TaskModel.create({
        title: "Subtask",
        assigneeId: "507f191e810c19729de860ea",
        status: "TODO",
        priority: "Medium",
        reporterId: "507f191e810c19729de860ea",
        isSubtask: true,
        parentTaskId: mainTask._id.toString(),
      });
      const res = await request(app).delete(`/api/tasks/${mainTask._id}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Task deleted successfully");
      const subtasks = await TaskModel.find({ parentTaskId: mainTask._id });
      expect(subtasks.length).toBe(0);
    });
    it("should return 404 if task not found", async () => {
      const res = await request(app).delete(`/api/tasks/507f191e810c19729de860eb`);
      expect(res.status).toBe(404);
    });
  });
});
