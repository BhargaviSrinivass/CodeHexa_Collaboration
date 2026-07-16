import { prisma } from "../config/prisma.js";
import { getIO } from "../socket/ioRef.js";
import { emitToUser } from "../socket/userSockets.js";

export const socialService = {
  async searchUsers(q: string, currentUserId: string) {
    return prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        lastActiveAt: true,
      },
      take: 20,
    });
  },

  async sendFriendRequest(requesterId: string, addresseeId: string) {
    if (requesterId === addresseeId) throw new Error("Cannot friend yourself");
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });
    if (existing?.status === "ACCEPTED") throw new Error("Already friends");
    if (existing?.status === "PENDING") throw new Error("Request already pending");

    const friendship = await prisma.friendship.create({
      data: { requesterId, addresseeId, status: "PENDING" },
      include: {
        requester: { select: { id: true, username: true } },
        addressee: { select: { id: true, username: true } },
      },
    });

    await prisma.notification.create({
      data: {
        userId: addresseeId,
        type: "friend-request",
        title: "Friend request",
        body: `${friendship.requester.username} sent you a friend request`,
        meta: { friendshipId: friendship.id, fromUserId: requesterId },
      },
    });

    const io = getIO();
    if (io) {
      emitToUser(io, addresseeId, "friend-request", {
        friendshipId: friendship.id,
        from: friendship.requester,
      });
      emitToUser(io, addresseeId, "notification", {
        type: "friend-request",
        message: `${friendship.requester.username} sent you a friend request`,
      });
    }

    return friendship;
  },

  async respondFriend(userId: string, friendshipId: string, accept: boolean) {
    const fr = await prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!fr || fr.addresseeId !== userId) throw new Error("Request not found");
    const updated = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: accept ? "ACCEPTED" : "REJECTED" },
      include: {
        requester: { select: { id: true, username: true } },
        addressee: { select: { id: true, username: true } },
      },
    });
    if (accept) {
      await prisma.notification.create({
        data: {
          userId: fr.requesterId,
          type: "friend-accepted",
          title: "Friend request accepted",
          body: `${updated.addressee.username} accepted your friend request`,
          meta: { friendshipId },
        },
      });
      const io = getIO();
      if (io) {
        emitToUser(io, fr.requesterId, "friend-accepted", {
          friendshipId,
          from: updated.addressee,
        });
        emitToUser(io, fr.requesterId, "notification", {
          type: "friend-accepted",
          message: `${updated.addressee.username} accepted your friend request`,
        });
      }
    }
    return updated;
  },

  async listFriends(userId: string) {
    const rows = await prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: { id: true, username: true, lastActiveAt: true } },
        addressee: { select: { id: true, username: true, lastActiveAt: true } },
      },
    });
    return rows.map((r) => {
      const friend = r.requesterId === userId ? r.addressee : r.requester;
      const online =
        Date.now() - new Date(friend.lastActiveAt).getTime() < 5 * 60_000;
      return {
        friendshipId: r.id,
        ...friend,
        online,
        lastActiveAt: friend.lastActiveAt,
      };
    });
  },

  async listPending(userId: string) {
    return prisma.friendship.findMany({
      where: { addresseeId: userId, status: "PENDING" },
      include: { requester: { select: { id: true, username: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async removeFriend(userId: string, friendshipId: string) {
    const fr = await prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!fr || (fr.requesterId !== userId && fr.addresseeId !== userId)) {
      throw new Error("Friendship not found");
    }
    await prisma.friendship.delete({ where: { id: friendshipId } });
    return { ok: true };
  },
};
