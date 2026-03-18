import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { prisma } from "#/db";
import { auth } from "#/lib/auth";
import { ensureSession } from "#/lib/auth.functions";

export type ManagedUserRole = "admin" | "user";

type CreateManagedUserInput = {
  name: string;
  email: string;
  password: string;
  role: ManagedUserRole;
};

type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions?: boolean;
};

function mapManagedUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
  createdAt: Date;
  invitedBy: { id: string; name: string; email: string } | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt.toISOString(),
    invitedBy: user.invitedBy,
  };
}

async function requireAdminUser() {
  const session = await ensureSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      mustChangePassword: true,
    },
  });

  if (!user || user.role !== "admin") {
    throw new Error("Forbidden");
  }

  return { session, user };
}

export const getUsersPageData = createServerFn({ method: "GET" }).handler(async () => {
  const { user } = await requireAdminUser();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      mustChangePassword: true,
      createdAt: true,
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return {
    currentUser: user,
    users: users.map(mapManagedUser),
  };
});

export const createManagedUser = createServerFn({ method: "POST" })
  .inputValidator((data: CreateManagedUserInput) => {
    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();
    const password = data.password.trim();
    const role = data.role;

    if (!name) {
      throw new Error("Name is required");
    }

    if (!email) {
      throw new Error("Email is required");
    }

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    if (role !== "admin" && role !== "user") {
      throw new Error("Invalid role");
    }

    return { name, email, password, role };
  })
  .handler(async ({ data }) => {
    const { user: adminUser } = await requireAdminUser();
    const result = await auth.api.createUser({
      headers: getRequestHeaders(),
      body: {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      },
    });

    const createdUser = await prisma.user.update({
      where: { id: result.user.id },
      data: {
        emailVerified: true,
        mustChangePassword: true,
        invitedById: adminUser.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mustChangePassword: true,
        createdAt: true,
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return mapManagedUser(createdUser);
  });

export const getPasswordSettingsData = createServerFn({
  method: "GET",
}).handler(async () => {
  const session = await ensureSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      mustChangePassword: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error("Not found");
  }

  return user;
});

export const changeOwnPassword = createServerFn({ method: "POST" })
  .inputValidator((data: ChangePasswordInput) => {
    const currentPassword = data.currentPassword.trim();
    const newPassword = data.newPassword.trim();
    const revokeOtherSessions = data.revokeOtherSessions ?? true;

    if (!currentPassword) {
      throw new Error("Current password is required");
    }

    if (newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters");
    }

    return { currentPassword, newPassword, revokeOtherSessions };
  })
  .handler(async ({ data }) => {
    const session = await ensureSession();

    await auth.api.changePassword({
      headers: getRequestHeaders(),
      body: {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        revokeOtherSessions: data.revokeOtherSessions,
      },
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { mustChangePassword: false },
    });

    return { success: true };
  });
