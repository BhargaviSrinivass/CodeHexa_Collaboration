import { prisma } from "../config/prisma.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { issueTokens } from "./tokenService.js";
import { settingsService } from "./userDataService.js";

export class AuthService {
  async register(username: string, email: string, password: string) {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existing) {
      throw new Error(
        existing.email === email ? "Email already registered" : "Username already taken"
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { username, email, passwordHash },
    });
    await settingsService.get(user.id);
    await prisma.progress.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });

    const tokens = await issueTokens({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    return {
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: user.id, username: user.username, email: user.email },
    };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      throw new Error("Invalid email or password");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    const tokens = await issueTokens({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    return {
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: user.id, username: user.username, email: user.email },
    };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        lastActiveAt: true,
        emailVerified: true,
      },
    });
    if (!user) throw new Error("User not found");
    return user;
  }
}

export const authService = new AuthService();
