import { Router } from "express";
import { createRoom, joinRoom, getRoom, getRecentRoom } from "../controllers/roomController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.get("/recent", getRecentRoom);
router.post("/", createRoom);
router.post("/join", joinRoom);
router.get("/:id", getRoom);

export default router;
