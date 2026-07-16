import { Router } from "express";
import { register, login, me, refresh, logout } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/auth.js";
import { authRateLimit } from "../middleware/rateLimit.js";

const router = Router();

router.post("/register", authRateLimit, register);
router.post("/login", authRateLimit, login);
router.post("/refresh", authRateLimit, refresh);
router.post("/logout", logout);
router.get("/me", authMiddleware, me);

export default router;
