import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import { signToken, verifyToken, JwtPayload } from "../utils/jwt.js";

const REFRESH_DAYS = 30;

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issueTokens(payload: JwtPayload) {
  const accessToken = signToken(payload);
  const refreshToken = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      userId: payload.userId,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  });
  return { accessToken, refreshToken, expiresIn: "7d" };
}

export async function rotateRefreshToken(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.expiresAt < new Date()) {
    throw new Error("Invalid refresh token");
  }
  await prisma.refreshToken.delete({ where: { id: stored.id } });
  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user) throw new Error("User not found");
  return issueTokens({
    userId: user.id,
    username: user.username,
    email: user.email,
  });
}

export async function revokeRefreshToken(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

export { verifyToken };
