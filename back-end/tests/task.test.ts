import request from "supertest";
import { describe, it, expect, beforeEach, vi } from "vitest";
import app from "../app";
import { TaskModel } from "../models/task.model";

let mockUser = {
  id: "507f191e810c19729de860ea",
  role: "Lead",
  teamId: "team123",
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

describe("", () => {

  // CREATE TASK
  
  describe("POST /api/tasks", () => {

    it("create task successfully (Lead)", async () => {
      mockUser = {
        id: "507f191e810c19729de860ea",
        role: "Lead",
        teamId: "team123",
      };

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

        it("create task successfully (Member)", async () => {
      mockUser = {
        id: "507f191e810c19729de860ea",
        role: "Member",
        teamId: "team123",
      };

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

    it("allow Lead to assign to another user", async () => {
      mockUser = {
        id: "507f191e810c19729de860ab",
        role: "Lead",
        teamId: "team123",
      };

      const res = await request(app)
        .post("/api/tasks")
        .send({
          title: "Lead Task",
          assigneeId: "507f191e810c19729de860ac",
          status: "TODO",
          priority: "Medium",
        });

      expect(res.status).toBe(201);
      expect(res.body.assigneeId).toBe("507f191e810c19729de860ac");
    });

    it("return 403 if Member assigns to others", async () => {
      mockUser = {
        id: "507f191e810c19729de860ad",
        role: "Member",
        teamId: "team123",
      };

      const res = await request(app)
        .post("/api/tasks")
        .send({
          title: "Test Task",
          assigneeId: "507f191e810c19729de860ae",
          status: "TODO",
          priority: "Medium",
        });

      expect(res.status).toBe(403);
    });

    it("return 400 if user has no team", async () => {
      mockUser = {
        id: "507f191e810c19729de860ae",
        role: "Lead",
        teamId: undefined as any,
      };

      const res = await request(app)
        .post("/api/tasks")
        .send({ title: "Task" });

      expect(res.status).toBe(400);
    });

  });

    


  // GET ALL TASKS

  describe("", () => {

    it("get all tasks", async () => {
      await TaskModel.create({
        title: "Task 1",
        teamId: "team123",
        assigneeId: mockUser.id,
        status: "TODO",
        priority: "Medium",
        reporterId: mockUser.id,
        isSubtask: false,
      });

      const res = await request(app).get("/api/tasks");

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it("get only main tasks if mainOnly=true", async () => {
      await TaskModel.create({
        title: "Main Task",
        teamId: "team123",
        assigneeId: mockUser.id,
        status: "TODO",
        priority: "Medium",
        reporterId: mockUser.id,
        isSubtask: false,
      });

      await TaskModel.create({
        title: "Subtask",
        teamId: "team123",
        assigneeId: mockUser.id,
        status: "TODO",
        priority: "Medium",
        reporterId: mockUser.id,
        isSubtask: true,
      });

      const res = await request(app).get("/api/tasks?mainOnly=true");

      expect(res.status).toBe(200);
      expect(res.body.every((t: any) => !t.isSubtask)).toBe(true);
    });
  });


  // GET BY ID

  describe("", () => {

    it("get task by id", async () => {
      const task = await TaskModel.create({
        title: "Task 1",
        teamId: "team123",
        assigneeId: mockUser.id,
        status: "TODO",
        priority: "Medium",
        reporterId: mockUser.id,
        isSubtask: false,
      });

      const res = await request(app).get(`/api/tasks/${task._id}`);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Task 1");
    });

    it("return 404 if task not found", async () => {
      const res = await request(app).get(`/api/tasks/507f191e810c19729de860eb`);
      expect(res.status).toBe(404);
    });

    it("allow a member with no team to view a specific task (Current Behavior)", async () => {
    mockUser = {
      id: "507f191e810c19729de860ea",
      role: "Member",
      teamId:"", 
    };
    const task = await TaskModel.create({
      title: "Confidential Team Task",
      teamId: "secret-team-789",
      assigneeId: "another-user-id",
      reporterId: "another-user-id",
      status: "TODO",
      priority: "High"
    });

    const res = await request(app).get(`/api/tasks/${task._id}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Confidential Team Task");
  });

  });


  // UPDATE TASK

  describe("", () => {

    it("update task status", async () => {
      const task = await TaskModel.create({
        title: "Task 1",
        teamId: "team123",
        assigneeId: mockUser.id,
        status: "TODO",
        priority: "Medium",
        reporterId: mockUser.id,
        isSubtask: false,
      });

      const res = await request(app)
        .patch(`/api/tasks/${task._id}`)
        .send({ status: "DONE" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("DONE");
    });

    it("push update with note (assignee)", async () => {
      mockUser = {
        id: "507f191e810c19729de860ea",
        role: "Member",
        teamId: "team123",
      };

      const task = await TaskModel.create({
        title: "Task 1",
        teamId: "team123",
        assigneeId: mockUser.id,
        status: "TODO",
        priority: "Medium",
        reporterId: mockUser.id,
        isSubtask: false,
      });

      const res = await request(app)
        .patch(`/api/tasks/${task._id}`)
        .send({ updates: { note: "Progress update" } });

      expect(res.status).toBe(200);
      expect(res.body.updates.length).toBe(1);
      expect(res.body.updates[0].note).toBe("Progress update");
    });

it("Member can't attempts to change the assigneeId", async () => {
  mockUser = {
    id: "507f191e810c19729de860ea",
    role: "Member",
    teamId: "team123"
  };

  const task = await TaskModel.create({
    title: "Original Task",
    assigneeId: mockUser.id,
    reporterId: mockUser.id, 
    teamId: "team123",
    status: "TODO",        
    priority: "Medium"
  });

  const res = await request(app)
    .patch(`/api/tasks/${task._id}`)
    .send({ assigneeId: "507f191e810c19729de860eb" }); 

  expect(res.status).toBe(403);
  expect(res.body.error).toBe("Only a Lead can reassign a task");
});

it("return 403 if a Member tries to add a note to a task not assigned to them", async () => {
  mockUser = {
    id: "507f191e810c19729de860ea",
    role: "Member",
    teamId: "team123"
  };

  // Create task assigned to a DIFFERENT user ID
  const differentUserId = "507f191e810c19729de860eb"; 

  const task = await TaskModel.create({
    title: "Someone Else's Task",
    assigneeId: differentUserId, 
    reporterId: differentUserId, 
    helperIds: [],
    teamId: "team123",
    status: "TODO",
    priority: "Medium"
  });

  const res = await request(app)
    .patch(`/api/tasks/${task._id}`)
    .send({ 
      updates: { note: "Trying to comment on a task I don't own" } 
    });

  expect(res.status).toBe(403);
  expect(res.body.error).toBe("Only the assignee or a helper can add updates to this task");
});

  });

  // DELETE TASK

  describe("", () => {

    it("delete task and subtasks (Lead only)", async () => {
      mockUser = {
        id: "leadId",
        role: "Lead",
        teamId: "team123",
      };

      const mainTask = await TaskModel.create({
        title: "Main Task",
        teamId: "team123",
        assigneeId: mockUser.id,
        status: "TODO",
        priority: "Medium",
        reporterId: mockUser.id,
        isSubtask: false,
      });

      await TaskModel.create({
        title: "Subtask",
        teamId: "team123",
        assigneeId: mockUser.id,
        status: "TODO",
        priority: "Medium",
        reporterId: mockUser.id,
        isSubtask: true,
        parentTaskId: mainTask._id.toString(),
      });

      const res = await request(app).delete(`/api/tasks/${mainTask._id}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Task deleted successfully");

      const subtasks = await TaskModel.find({ parentTaskId: mainTask._id });
      expect(subtasks.length).toBe(0);
    });

    it("return 404 if task not found", async () => {
      mockUser = {
        id: "leadId",
        role: "Lead",
        teamId: "team123",
      };

      const res = await request(app).delete(`/api/tasks/507f191e810c19729de860eb`);
      expect(res.status).toBe(404);
    });

      it("return 403 if a Member attempts to delete", async () => {
    mockUser.role = "Member";
    
    const task = await TaskModel.create({
      title: "Task to Delete",
      teamId: "team123",
      assigneeId: mockUser.id,
      reporterId: mockUser.id
    });

    const res = await request(app).delete(`/api/tasks/${task._id}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Only a Lead can delete tasks");
  });

  it("Lead can change the assignee to a new user", async () => {
  const leadId = "507f191e810c19729de860ea";
  const originalAssignee = "507f191e810c19729de860eb";
  const newAssignee = "507f191e810c19729de860ec";

  mockUser = {
    id: leadId,
    role: "Lead",
    teamId: "team123",
  };

  const task = await TaskModel.create({
    title: "Reassign Task",
    teamId: "team123",
    assigneeId: originalAssignee,
    reporterId: leadId,
    status: "TODO",
    priority: "Medium",
  });

  const res = await request(app)
    .patch(`/api/tasks/${task._id}`)
    .send({ assigneeId: newAssignee });

  expect(res.status).toBe(200);
  expect(res.body.assigneeId).toBe(newAssignee);

  const updatedTask = await TaskModel.findById(task._id);
  expect(updatedTask?.assigneeId).toBe(newAssignee);
});

it("Lead can't reassign to the same assignee again", async () => {
  const leadId = "507f191e810c19729de860ea";
  const assigneeId = "507f191e810c19729de860eb";

  mockUser = {
    id: leadId,
    role: "Lead",
    teamId: "team123",
  };

  const task = await TaskModel.create({
    title: "Idempotent Reassign Task",
    teamId: "team123",
    assigneeId,
    reporterId: leadId,
    status: "TODO",
    priority: "Medium",
  });

  const res = await request(app)
    .patch(`/api/tasks/${task._id}`)
    .send({ assigneeId });

  expect(res.status).toBe(400);
  expect(res.body.error).toBe("Task is already assigned to this user");

  const updatedTask = await TaskModel.findById(task._id);
  expect(updatedTask?.assigneeId).toBe(assigneeId);
});

  });



});
