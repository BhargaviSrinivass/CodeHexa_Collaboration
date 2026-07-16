import { Router } from "express";
import { runCode } from "../controllers/runController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.post("/", runCode);

export default router;
