/**
 * Canonical list of phrases used to build the semantic-search fixture.
 *
 * Edit this file to add/remove phrases, then regenerate embeddings:
 *   pnpm embeddings:fixtures
 *
 * The generator is incremental — it only embeds texts missing from the
 * cached JSON, so adding a phrase costs one API call, not all of them.
 */

export type FixtureThread = {
  id: string;
  topic: string;
  title: string;
};

export type FixtureQuery = {
  id: string;
  text: string;
  /** Topic(s) a correct top-1 result should belong to. */
  expectTopics: string[];
};

export const FIXTURE_THREADS: FixtureThread[] = [
  { id: "t-pasta", topic: "cooking", title: "Favorite pasta recipes and sauces" },
  { id: "t-bread", topic: "cooking", title: "How to bake sourdough bread at home" },
  { id: "t-knife", topic: "cooking", title: "Choosing a good chef's knife" },
  { id: "t-jazz", topic: "music", title: "A brief history of jazz music" },
  { id: "t-guitar", topic: "music", title: "Learning to play acoustic guitar" },
  { id: "t-vinyl", topic: "music", title: "Starting a vinyl record collection" },
  { id: "t-react", topic: "coding", title: "React hooks and state management patterns" },
  { id: "t-ts", topic: "coding", title: "TypeScript generics explained with examples" },
  { id: "t-debug", topic: "coding", title: "Debugging async JavaScript code" },
  { id: "t-tokyo", topic: "travel", title: "Planning a two-week Tokyo itinerary" },
  { id: "t-europe", topic: "travel", title: "Backpacking through eastern Europe" },
  { id: "t-tomato", topic: "gardening", title: "Growing tomatoes in container pots" },
  { id: "t-compost", topic: "gardening", title: "Starting a backyard compost bin" },
];

export const FIXTURE_QUERIES: FixtureQuery[] = [
  { id: "q-italian", text: "how do I cook good italian food", expectTopics: ["cooking"] },
  { id: "q-instrument", text: "I want to learn a musical instrument", expectTopics: ["music"] },
  { id: "q-types", text: "typescript type system help", expectTopics: ["coding"] },
  { id: "q-japan", text: "trip planning for Japan", expectTopics: ["travel"] },
  { id: "q-garden", text: "tips for my vegetable garden", expectTopics: ["gardening"] },
];

/** All texts that need embeddings. Order-stable so the fixture diffs cleanly. */
export function allFixtureTexts(): string[] {
  return [...FIXTURE_THREADS.map((t) => t.title), ...FIXTURE_QUERIES.map((q) => q.text)];
}
