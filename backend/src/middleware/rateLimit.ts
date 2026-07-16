import rateLimit from "express-rate-limit";

export const apiRateLimit = rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, slow down" },
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60_000,
  max: 30,
  message: { error: "Too many auth attempts" },
});
