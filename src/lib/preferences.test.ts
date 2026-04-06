import { describe, expect, it } from "vitest";
import { parsePreferences, serializePreferences, userPreferencesPatchSchema } from "#/lib/preferences";

describe("preferences", () => {
  it("returns an empty object for invalid JSON", () => {
    expect(parsePreferences("{not-valid")).toEqual({});
  });

  it("round-trips valid preferences through serialize and parse", () => {
    const serialized = serializePreferences({
      timezone: "America/Toronto",
      defaultChatModel: "claude-haiku-4-5",
      enabledPlugins: ["board"],
    });

    expect(parsePreferences(serialized)).toEqual({
      timezone: "America/Toronto",
      defaultChatModel: "claude-haiku-4-5",
      enabledPlugins: ["board"],
    });
  });

  it("validates patch payloads with the shared schema", () => {
    expect(
      userPreferencesPatchSchema.parse({
        pushNotificationMinLevel: "high",
        obsidianChatExportFolder: "Aether/Chats/{YYYY}/{MM}",
      }),
    ).toEqual({
      pushNotificationMinLevel: "high",
      obsidianChatExportFolder: "Aether/Chats/{YYYY}/{MM}",
    });
  });

  it("rejects invalid preference values", () => {
    expect(() =>
      userPreferencesPatchSchema.parse({
        defaultChatModel: "not-a-model",
      }),
    ).toThrow();
  });
});
