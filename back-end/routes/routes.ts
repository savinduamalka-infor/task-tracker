import { Router } from "express";
import { protectedRoute, adminOnly } from "../middleware/auth.middleware.js";
import { getAdminDashboard, getMe, getUsersWithoutTeam } from "../controllers/user.controller.js";
import { getSession, signOut } from "../controllers/auth.controller.js";
import { createTeam, addTeamMember, removeTeamMember, getTeamMembers } from "../controllers/team.controller";
const router = Router();

router.get("/api/auth/session", getSession);
router.post("/api/auth/sign-out", signOut);
router.get("/api/me", protectedRoute, getMe);
router.get("/api/admin/dashboard", protectedRoute, adminOnly, getAdminDashboard);
router.post("/api/teams", protectedRoute, createTeam);
router.post("/api/teams/:teamId/members", protectedRoute, addTeamMember);
router.delete("/api/teams/:teamId/members/:memberId", protectedRoute, removeTeamMember);
router.get(
	"/api/users/without-team",
	protectedRoute,
	adminOnly,
	getUsersWithoutTeam,
);
router.get("/api/teams/:teamId/members", protectedRoute, getTeamMembers);

export default router;
