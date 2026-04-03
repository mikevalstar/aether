import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "#/db";
import { ensureSession } from "#/lib/auth.functions";

const notificationListInputSchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    level: z.string().trim().optional(),
    category: z.string().trim().optional(),
    status: z.enum(["all", "unread", "read", "archived"]).optional(),
  })
  .strict();

const notificationIdsSchema = z
  .object({
    ids: z.array(z.string().min(1)),
  })
  .strict();

export type NotificationListItem = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  level: string;
  category: string | null;
  source: string | null;
  read: boolean;
  archived: boolean;
  createdAt: string;
};

export type NotificationListResult = {
  items: NotificationListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const PAGE_SIZE = 50;

export const getNotificationList = createServerFn({ method: "GET" })
  .inputValidator((data) => notificationListInputSchema.parse(data))
  .handler(async ({ data }): Promise<NotificationListResult> => {
    const session = await ensureSession();
    const page = Math.max(1, data.page ?? 1);

    const levelFilter = data.level && data.level !== "all" ? data.level : undefined;
    const categoryFilter = data.category && data.category !== "all" ? data.category : undefined;

    // Status filter
    let readFilter: boolean | undefined;
    let archivedFilter: boolean | undefined;
    switch (data.status) {
      case "unread":
        readFilter = false;
        archivedFilter = false;
        break;
      case "read":
        readFilter = true;
        archivedFilter = false;
        break;
      case "archived":
        archivedFilter = true;
        break;
      default:
        // "all" — show non-archived by default
        archivedFilter = false;
    }

    const where = {
      userId: session.user.id,
      ...(levelFilter ? { level: levelFilter } : {}),
      ...(categoryFilter ? { category: categoryFilter } : {}),
      ...(readFilter !== undefined ? { read: readFilter } : {}),
      ...(archivedFilter !== undefined ? { archived: archivedFilter } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .inputValidator((data) => notificationIdsSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();
    await prisma.notification.updateMany({
      where: { id: { in: data.ids }, userId: session.user.id },
      data: { read: true },
    });
    return { success: true };
  });

export const markNotificationsUnread = createServerFn({ method: "POST" })
  .inputValidator((data) => notificationIdsSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();
    await prisma.notification.updateMany({
      where: { id: { in: data.ids }, userId: session.user.id },
      data: { read: false },
    });
    return { success: true };
  });

export const archiveNotifications = createServerFn({ method: "POST" })
  .inputValidator((data) => notificationIdsSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();
    await prisma.notification.updateMany({
      where: { id: { in: data.ids }, userId: session.user.id },
      data: { archived: true, read: true },
    });
    return { success: true };
  });

export const deleteNotifications = createServerFn({ method: "POST" })
  .inputValidator((data) => notificationIdsSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();
    await prisma.notification.deleteMany({
      where: { id: { in: data.ids }, userId: session.user.id },
    });
    return { success: true };
  });
