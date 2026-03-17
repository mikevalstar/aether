import { Cron } from "croner";
import { prisma } from "#/db";
import { logger } from "#/lib/logger";

// ── Types ────────────────────────────────────────────────────────────

type SystemTask = {
	name: string;
	cron: string;
	handler: () => Promise<void>;
};

// ── System task definitions ──────────────────────────────────────────

const systemTaskDefs: SystemTask[] = [
	{
		name: "cleanup-stale-records",
		cron: "0 * * * *", // every hour
		handler: cleanupStaleRecords,
	},
];

// ── Running jobs ─────────────────────────────────────────────────────

const systemJobs: Cron[] = [];

export function startSystemTasks(): void {
	for (const def of systemTaskDefs) {
		try {
			const job = new Cron(
				def.cron,
				{
					name: `system:${def.name}`,
					timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
					protect: true,
					catch: (err: unknown) => {
						logger.error({ systemTask: def.name, err }, "System task error");
					},
					unref: true,
				},
				() => {
					void def.handler();
				},
			);
			systemJobs.push(job);
			logger.info({ systemTask: def.name, cron: def.cron }, "System task registered");
		} catch (err) {
			logger.error({ systemTask: def.name, err }, "Failed to register system task");
		}
	}
}

export function stopSystemTasks(): void {
	for (const job of systemJobs) {
		job.stop();
	}
	systemJobs.length = 0;
}

// ── Task: Cleanup stale records ──────────────────────────────────────

async function cleanupStaleRecords(): Promise<void> {
	// Find stale tasks: file deleted + never run
	const staleTasks = await prisma.task.findMany({
		where: { fileExists: false, lastRunAt: null },
		select: { id: true, filename: true },
	});

	// Find stale workflows: file deleted + never run
	const staleWorkflows = await prisma.workflow.findMany({
		where: { fileExists: false, lastRunAt: null },
		select: { id: true, filename: true },
	});

	if (staleTasks.length === 0 && staleWorkflows.length === 0) {
		return; // nothing to do — no activity log
	}

	// Delete stale records
	if (staleTasks.length > 0) {
		await prisma.task.deleteMany({
			where: { id: { in: staleTasks.map((t) => t.id) } },
		});
	}

	if (staleWorkflows.length > 0) {
		await prisma.workflow.deleteMany({
			where: { id: { in: staleWorkflows.map((w) => w.id) } },
		});
	}

	// Log activity
	const adminUser = await prisma.user.findFirst({
		where: { role: "admin" },
		orderBy: { createdAt: "asc" },
	});

	if (!adminUser) return;

	const parts: string[] = [];
	if (staleTasks.length > 0) {
		parts.push(`${staleTasks.length} stale task(s)`);
	}
	if (staleWorkflows.length > 0) {
		parts.push(`${staleWorkflows.length} stale workflow(s)`);
	}

	await prisma.activityLog.create({
		data: {
			type: "system_task",
			summary: `Cleaned up ${parts.join(" and ")}`,
			metadata: JSON.stringify({
				taskName: "cleanup-stale-records",
				deletedTasks: staleTasks.map((t) => t.filename),
				deletedWorkflows: staleWorkflows.map((w) => w.filename),
			}),
			userId: adminUser.id,
		},
	});

	logger.info(
		{
			deletedTasks: staleTasks.length,
			deletedWorkflows: staleWorkflows.length,
		},
		`Cleaned up ${parts.join(" and ")}`,
	);
}
