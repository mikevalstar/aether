const TEAMS_MEET_REGEX = /(?:Join[:\s]+)?https:\/\/teams\.microsoft\.com\/meet\/[^\s<>"]+/gi;

export function extractTeamsLink(description: string | undefined): string | undefined {
  if (!description) return undefined;
  const match = description.match(TEAMS_MEET_REGEX);
  return match?.[0];
}

export type MeetLink = { url: string; type: "google" | "teams" };

export function collectMeetLinks(meetLink: string | undefined, description: string | undefined): MeetLink[] {
  const teamsLink = extractTeamsLink(description);
  return [
    meetLink ? { url: meetLink, type: "google" as const } : null,
    teamsLink ? { url: teamsLink, type: "teams" as const } : null,
  ].filter((l): l is MeetLink => l !== null);
}
