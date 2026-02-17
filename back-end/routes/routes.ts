import { Router } from "express";
import { protectedRoute, adminOnly } from "../middleware/auth.middleware.js";
import { getAdminDashboard, getMe } from "../controllers/user.controller.js";
import { getSession, signOut } from "../controllers/auth.controller.js";
import { createTask, getAllTasks, getTaskById, updateTask, deleteTask } from "../controllers/task.controller.js";

const router = Router();

router.get("/api/auth/session", getSession);
router.post("/api/auth/sign-out", signOut);
router.get("/api/me", protectedRoute, getMe);
router.get("/api/admin/dashboard", protectedRoute, adminOnly, getAdminDashboard);

router.post("/api/tasks", protectedRoute, createTask);
router.get("/api/tasks", protectedRoute, getAllTasks);
router.get("/api/tasks/:id", protectedRoute, getTaskById);
router.put("/api/tasks/:id", protectedRoute, updateTask);
router.delete("/api/tasks/:id", protectedRoute, deleteTask);

export default router;