import { Router } from "express";
import { listProblems, getProblem } from "../controllers/problemController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.get("/", listProblems);
router.get("/:id", getProblem);

export default router;
