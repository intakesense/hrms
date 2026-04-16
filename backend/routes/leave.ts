import { Router } from "express";
import { requestLeave, getMyLeaves, getAllLeaves, updateLeaveStatus, previewLeaveDays } from "../controllers/leave.controllers.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import type { IAuthRequest } from "../types/index.js";
import type { Response } from "express";

const router: Router = Router();

// Preview working days for a date range (must be before parameterized routes)
router.get("/preview-days", authMiddleware(), previewLeaveDays);

// Employee can request and view their leaves
router.post("/request", authMiddleware(), requestLeave);
router.get("/my", authMiddleware(), getMyLeaves);

// Get leaves - returns appropriate leaves based on user role
router.get("/", authMiddleware(), async (req: IAuthRequest, res: Response) => {
  // If user is admin/hr, return all leaves, otherwise return their own leaves
  if (req.user?.role === 'admin' || req.user?.role === 'hr') {
    return (getAllLeaves as any)(req, res);
  } else {
    return (getMyLeaves as any)(req, res);
  }
});

// Admin/HR can view all leaves and approve/reject
router.get("/all", authMiddleware(["admin", "hr"]), getAllLeaves);
router.put("/:leaveId/status", authMiddleware(["admin", "hr"]), updateLeaveStatus);

export default router;
