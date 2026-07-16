import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { aiRateLimit } from "../middleware/aiRateLimit.js";
import * as ai from "../controllers/aiController.js";

const router = Router();

router.use(authMiddleware);
router.use(aiRateLimit(40, 60_000));

router.post("/hint", ai.hint);
router.post("/review", ai.review);
router.post("/explain", ai.explain);
router.post("/debug", ai.debug);
router.post("/complexity", ai.complexity);
router.post("/edge-cases", ai.edgeCases);
router.post("/chat", ai.chat);
router.post("/summary", ai.createSummary);
router.get("/summary/:roomId", ai.getSummary);
router.get("/progress", ai.getProgress);
router.post("/progress/solve", ai.recordSolve);

export default router;
