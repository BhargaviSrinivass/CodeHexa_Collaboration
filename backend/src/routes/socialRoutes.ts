import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import * as c from "../controllers/socialController.js";

const router = Router();
router.use(authMiddleware);

router.get("/users/search", c.searchUsers);
router.get("/friends", c.listFriends);
router.post("/friends/request", c.sendFriend);
router.post("/friends/respond", c.respondFriend);
router.delete("/friends/:id", c.removeFriend);

router.get("/bookmarks", c.listBookmarks);
router.post("/bookmarks", c.createBookmark);
router.delete("/bookmarks/:id", c.deleteBookmark);

router.get("/settings", c.getSettings);
router.patch("/settings", c.updateSettings);

router.get("/notifications", c.listNotifications);
router.post("/notifications/read", c.readNotifications);

router.get("/analytics", c.analytics);
router.get("/leaderboard", c.leaderboard);
router.get("/sessions", c.sessions);
router.post("/sessions/end", c.endSession);

router.get("/search", c.search);

router.get("/profile", c.getProfile);
router.get("/profile/:userId", c.getProfile);
router.patch("/profile", c.updateProfile);

export default router;
