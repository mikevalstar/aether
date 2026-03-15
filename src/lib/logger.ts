import pino from "pino";

const logDir = process.env.LOG_DIR ?? "./logs";

export const logger = pino({
	level: process.env.LOG_LEVEL ?? "info",
	transport: {
		targets: [
			// Pretty console output (always)
			{
				target: "pino-pretty",
				level: process.env.LOG_LEVEL ?? "info",
				options: {
					colorize: true,
					translateTime: "HH:MM:ss",
					ignore: "pid,hostname",
				},
			},
			// JSON log files with daily rotation
			{
				target: "pino-roll",
				level: process.env.LOG_LEVEL ?? "info",
				options: {
					file: `${logDir}/aether`,
					frequency: "daily",
					dateFormat: "yyyy-MM-dd",
					mkdir: true,
				},
			},
		],
	},
});
