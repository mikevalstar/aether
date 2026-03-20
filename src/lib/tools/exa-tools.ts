import { tool } from "ai";
import Exa from "exa-js";
import { z } from "zod";

const exa = new Exa(process.env.EXA_API_KEY);

const EXA_SEARCH_NUM_RESULTS = Number.parseInt(process.env.EXA_SEARCH_NUM_RESULTS ?? "10", 10);
const EXA_SEARCH_MAX_CHARS = Number.parseInt(process.env.EXA_SEARCH_MAX_CHARS ?? "3000", 10);
const EXA_FETCH_MAX_CHARS = Number.parseInt(process.env.EXA_FETCH_MAX_CHARS ?? "4000", 10);

const webSearchTool = tool({
  description:
    "Search the web for current information, news, and articles. Use this when you need up-to-date information or want to find relevant web resources.",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async ({ query }) => {
    try {
      const result = await exa.search(query, {
        type: "auto",
        numResults: EXA_SEARCH_NUM_RESULTS,
        contents: {
          highlights: true,
          maxCharacters: EXA_SEARCH_MAX_CHARS,
        },
      });

      if (!result.results || result.results.length === 0) {
        return { results: [], message: "No search results found." };
      }

      const formattedResults = result.results
        .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.highlights?.[0] ?? ""}`)
        .join("\n\n");

      return {
        results: result.results.map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.highlights?.[0] ?? "",
        })),
        formatted: formattedResults,
      };
    } catch (err) {
      return {
        error: `Search failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
});

const webFetchTool = tool({
  description:
    "Fetch and extract content from a specific URL. Use this when you need to read the full content of a specific web page.",
  inputSchema: z.object({
    url: z.string().url().describe("The URL to fetch"),
    query: z.string().optional().describe("Optional query to extract specific information from the page"),
  }),
  execute: async ({ url, query }) => {
    try {
      const result = await exa.getContents([url], {
        text: true,
        highlights: { maxCharacters: EXA_FETCH_MAX_CHARS },
      });

      const content = result.results[0];
      if (!content) {
        return { error: "Could not fetch content from URL." };
      }

      if (query) {
        return {
          url,
          title: content.title,
          query,
          content: content.text,
        };
      }

      return {
        url,
        title: content.title ?? undefined,
        markdown: content.text ?? "",
      };
    } catch (err) {
      return {
        error: `Failed to fetch URL: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
});

export const exaTools = {
  web_search: webSearchTool,
  web_fetch: webFetchTool,
};
