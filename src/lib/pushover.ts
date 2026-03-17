import { logger } from "#/lib/logger";

const PUSHOVER_API_URL = "https://api.pushover.net/1/messages.json";

type PushoverMessage = {
	userKey: string;
	title: string;
	message: string;
	url?: string;
	urlTitle?: string;
};

export async function sendPushover(msg: PushoverMessage): Promise<boolean> {
	const token = process.env.PUSHOVER_APP_TOKEN;
	if (!token) {
		logger.warn("PUSHOVER_APP_TOKEN not set, skipping push notification");
		return false;
	}

	try {
		const body = new URLSearchParams({
			token,
			user: msg.userKey,
			title: msg.title,
			message: msg.message,
		});

		if (msg.url) body.set("url", msg.url);
		if (msg.urlTitle) body.set("url_title", msg.urlTitle);

		const res = await fetch(PUSHOVER_API_URL, {
			method: "POST",
			body,
		});

		if (!res.ok) {
			const text = await res.text();
			logger.warn({ status: res.status, body: text }, "Pushover API error");
			return false;
		}

		return true;
	} catch (err) {
		logger.warn({ err }, "Pushover send failed");
		return false;
	}
}
