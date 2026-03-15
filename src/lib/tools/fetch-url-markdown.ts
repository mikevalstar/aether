import { Readability } from "@mozilla/readability";
import { tool } from "ai";
import { parseHTML } from "linkedom";
import TurndownService from "turndown";
import { z } from "zod";

const MAX_CONTENT_LENGTH = 50000;

const CHROME_USER_AGENT =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const fetchUrlMarkdown = tool({
	description:
		"Fetch a URL and return its main content as clean markdown. Strips ads, navigation, footers, and other boilerplate. Use this when you need to read the full content of a specific web page.",
	inputSchema: z.object({
		url: z.string().url().describe("The URL to fetch"),
	}),
	execute: async ({ url }) => {
		try {
			const response = await fetch(url, {
				headers: {
					"User-Agent": CHROME_USER_AGENT,
					Accept:
						"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
					"Accept-Language": "en-US,en;q=0.9",
				},
				redirect: "follow",
			});

			if (!response.ok) {
				return {
					error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
				};
			}

			const html = await response.text();
			const { document } = parseHTML(html);

			const reader = new Readability(document as unknown as Document);
			const article = reader.parse();

			if (!article) {
				return {
					error:
						"Could not extract readable content from the page. The page may be dynamically rendered or require JavaScript.",
				};
			}

			const turndown = new TurndownService({
				headingStyle: "atx",
				codeBlockStyle: "fenced",
			});

			if (!article.content) {
				return {
					error: "Could not extract article content from the page.",
				};
			}

			let markdown = turndown.turndown(article.content);

			if (markdown.length > MAX_CONTENT_LENGTH) {
				markdown =
					markdown.slice(0, MAX_CONTENT_LENGTH) +
					"\n\n[Content truncated due to length]";
			}

			return {
				title: article.title,
				byline: article.byline,
				url,
				markdown,
			};
		} catch (err) {
			return {
				error: `Failed to fetch or parse URL: ${err instanceof Error ? err.message : String(err)}`,
			};
		}
	},
});
