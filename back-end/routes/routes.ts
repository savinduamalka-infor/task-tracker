import { Router } from "express";
import { protectedRoute, adminOnly } from "../middleware/auth.middleware.js";
import { getAdminDashboard, getMe } from "../controllers/user.controller.js";
import { getSession } from "../controllers/auth.controller.js";

const router = Router();

router.get("/api/auth/session", getSession);
router.get("/api/me", protectedRoute, getMe);
router.get("/api/admin/dashboard", protectedRoute, adminOnly, getAdminDashboard);

export default router;