import { createServerFn } from "@tanstack/react-start";
import { prisma } from "#/db";
import { ensureSession } from "#/lib/auth.functions";
import { sendPushover } from "#/lib/pushover";

export const getUnreadNotifications = createServerFn({ method: "GET" }).handler(async () => {
  const session = await ensureSession();

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id, read: false },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      body: true,
      link: true,
      createdAt: true,
    },
  });

  return { notifications, count: notifications.length };
});

export const getRecentNotifications = createServerFn({ method: "GET" }).handler(async () => {
  const session = await ensureSession();

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      body: true,
      link: true,
      read: true,
      createdAt: true,
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount };
});

export const markNotificationRead = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => {
    if (!data.id) throw new Error("Notification ID is required");
    return data;
  })
  .handler(async ({ data }) => {
    const session = await ensureSession();

    await prisma.notification.updateMany({
      where: { id: data.id, userId: session.user.id },
      data: { read: true },
    });

    return { success: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" }).handler(async () => {
  const session = await ensureSession();

  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });

  return { success: true };
});

export const testPushoverNotification = createServerFn({ method: "POST" })
  .inputValidator((data: { userKey: string }) => {
    if (!data.userKey?.trim()) throw new Error("Pushover user key is required");
    return { userKey: data.userKey.trim() };
  })
  .handler(async ({ data }) => {
    await ensureSession();

    const token = process.env.PUSHOVER_APP_TOKEN;
    if (!token) {
      return { success: false, error: "PUSHOVER_APP_TOKEN is not configured on the server" };
    }

    const pushed = await sendPushover({
      userKey: data.userKey,
      title: "Aether Test",
      message: "Push notifications are working!",
    });

    return { success: pushed, error: pushed ? undefined : "Failed to send. Check your user key." };
  });
