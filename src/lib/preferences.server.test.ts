import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, state, txMock } = vi.hoisted(() => {
  const state = {
    storedPreferences: "{}",
  };

  const txMock = {
    user: {
      findUnique: vi.fn(async () => ({ preferences: state.storedPreferences })),
      update: vi.fn(async ({ data }: { data: { preferences: string } }) => {
        state.storedPreferences = data.preferences;
        return { preferences: state.storedPreferences };
      }),
    },
  };

  const prismaMock = {
    user: {
      findUnique: vi.fn(async () => ({ preferences: state.storedPreferences })),
      update: vi.fn(async ({ data }: { data: { preferences: string } }) => {
        state.storedPreferences = data.preferences;
        return { preferences: state.storedPreferences };
      }),
    },
    $transaction: vi.fn(async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock)),
  };

  return { prismaMock, state, txMock };
});

vi.mock("#/db", () => ({
  prisma: prismaMock,
}));

import {
  getUserPreferences,
  getUserTimezone,
  patchUserPreferences,
  setUserPluginEnabled,
  setUserPluginOptions,
  setUserPreference,
} from "#/lib/preferences.server";

describe("preferences.server", () => {
  beforeEach(() => {
    state.storedPreferences = "{}";
    prismaMock.user.findUnique.mockClear();
    prismaMock.user.update.mockClear();
    prismaMock.$transaction.mockClear();
    txMock.user.findUnique.mockClear();
    txMock.user.update.mockClear();
  });

  it("returns empty preferences for invalid stored JSON", async () => {
    state.storedPreferences = "{bad-json";

    await expect(getUserPreferences("user_1")).resolves.toEqual({});
  });

  it("patchUserPreferences preserves untouched keys", async () => {
    state.storedPreferences = JSON.stringify({
      timezone: "America/Toronto",
      defaultChatModel: "claude-haiku-4-5",
    });

    const updated = await patchUserPreferences("user_1", {
      pushoverUserKey: "pushover-key",
    });

    expect(updated).toEqual({
      timezone: "America/Toronto",
      defaultChatModel: "claude-haiku-4-5",
      pushoverUserKey: "pushover-key",
    });
    expect(JSON.parse(state.storedPreferences)).toEqual(updated);
  });

  it("setUserPreference removes a key when passed undefined", async () => {
    state.storedPreferences = JSON.stringify({
      timezone: "America/Toronto",
      pushoverUserKey: "pushover-key",
    });

    const updated = await setUserPreference("user_1", "pushoverUserKey", undefined);

    expect(updated).toEqual({
      timezone: "America/Toronto",
    });
    expect(JSON.parse(state.storedPreferences)).toEqual({
      timezone: "America/Toronto",
    });
  });

  it("setUserPluginEnabled adds without duplicates and removes cleanly", async () => {
    state.storedPreferences = JSON.stringify({
      enabledPlugins: ["board"],
    });

    const afterDuplicateAdd = await setUserPluginEnabled("user_1", "board", true);
    expect(afterDuplicateAdd.enabledPlugins).toEqual(["board"]);

    const afterAdd = await setUserPluginEnabled("user_1", "calendar", true);
    expect(afterAdd.enabledPlugins).toEqual(["board", "calendar"]);

    const afterRemove = await setUserPluginEnabled("user_1", "board", false);
    expect(afterRemove.enabledPlugins).toEqual(["calendar"]);
  });

  it("setUserPluginOptions updates one plugin without clobbering siblings", async () => {
    state.storedPreferences = JSON.stringify({
      pluginOptions: {
        board: { dashboardColumn: "Doing" },
        radarr: { api_key: "existing" },
      },
    });

    const updated = await setUserPluginOptions("user_1", "board", {
      dashboardColumn: "Done",
      kanbanFile: "Projects/Board.md",
    });

    expect(updated.pluginOptions).toEqual({
      board: {
        dashboardColumn: "Done",
        kanbanFile: "Projects/Board.md",
      },
      radarr: { api_key: "existing" },
    });
  });

  it("getUserTimezone returns undefined when unset and the saved value when present", async () => {
    await expect(getUserTimezone("user_1")).resolves.toBeUndefined();

    state.storedPreferences = JSON.stringify({
      timezone: "America/Toronto",
    });

    await expect(getUserTimezone("user_1")).resolves.toBe("America/Toronto");
  });
});
