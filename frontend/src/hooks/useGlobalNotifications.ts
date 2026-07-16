import { useEffect, useMemo, useState } from "react";
import { useSocket } from "../contexts/SocketContext";
import { useToast } from "../components/ui/Toast";
import { api } from "../services/api";
import { AppNotification } from "../types";

export function useGlobalNotifications() {
  const { socket } = useSocket();
  const { pushToast } = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    api.getNotifications().then(setNotifications).catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onNotification = (data: { type?: string; message: string }) => {
      pushToast(data.message, "info");
    };

    const onFriendRequest = (data: { from: { username: string } }) => {
      pushToast(`${data.from.username} sent a friend request`, "info");
    };

    const onFriendAccepted = (data: { from: { username: string } }) => {
      pushToast(`${data.from.username} accepted your friend request`, "success");
    };

    const onUserOnline = (data: { username: string }) => {
      pushToast(`${data.username} is online`, "success");
    };

    const onUserOffline = (data: { username: string }) => {
      pushToast(`${data.username} went offline`, "info");
    };

    socket.on("notification", onNotification);
    socket.on("friend-request", onFriendRequest);
    socket.on("friend-accepted", onFriendAccepted);
    socket.on("user-online", onUserOnline);
    socket.on("user-offline", onUserOffline);

    return () => {
      socket.off("notification", onNotification);
      socket.off("friend-request", onFriendRequest);
      socket.off("friend-accepted", onFriendAccepted);
      socket.off("user-online", onUserOnline);
      socket.off("user-offline", onUserOffline);
    };
  }, [socket, pushToast]);

  const unread = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  return { notifications, unread };
}
