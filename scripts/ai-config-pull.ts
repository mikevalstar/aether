import { promises as fs } from "node:fs";
import path from "node:path";

const EXAMPLES_DIR = path.resolve(import.meta.dirname, "../examples/ai-config");

async function pullDir(srcDir: string, destDir: string, prefix = "") {
	let entries: string[];
	try {
		entries = await fs.readdir(srcDir);
	} catch {
		return 0;
	}

	await fs.mkdir(destDir, { recursive: true });
	let pulled = 0;

	for (const name of entries) {
		const src = path.join(srcDir, name);
		const dest = path.join(destDir, name);
		const displayName = prefix ? `${prefix}/${name}` : name;

		const stat = await fs.stat(src);

		if (stat.isDirectory()) {
			pulled += await pullDir(src, dest, displayName);
			continue;
		}

		if (!stat.isFile() || !name.endsWith(".md")) continue;

		await fs.copyFile(src, dest);
		console.log(`  pull: ${displayName}`);
		pulled++;
	}

	return pulled;
}

async function main() {
	const obsidianDir = process.env.OBSIDIAN_DIR;
	const aiConfigRel = process.env.OBSIDIAN_AI_CONFIG;

	if (!obsidianDir || !aiConfigRel) {
		console.error(
			"OBSIDIAN_DIR and OBSIDIAN_AI_CONFIG must be set in .env",
		);
		process.exit(1);
	}

	const sourceDir = path.join(obsidianDir, aiConfigRel);
	const pulled = await pullDir(sourceDir, EXAMPLES_DIR);

	console.log(`\nDone. Pulled ${pulled} file(s) from live config.`);
	console.log(`Source: ${sourceDir}`);
	console.log(`Target: ${EXAMPLES_DIR}`);
}

main();
