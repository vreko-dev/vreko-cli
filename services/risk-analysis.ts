/**
 * Risk Analysis Service
 *
 * File-level risk analysis with daemon-IPC primary path and
 * regex-pattern fallback when the daemon is unavailable.
 *
 * @module services/risk-analysis
 */

import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { connectToDaemon } from "./service-client.js";

export interface FileRiskResult {
	riskScore: number;
	riskLevel: string;
	signals: Array<{ signal: string; value: number }>;
}

/**
 * Analyze a file using daemon IPC with regex-pattern fallback.
 */
export async function analyzeFileRisk(
	filePath: string,
	content: string,
	workspaceRoot: string,
): Promise<FileRiskResult> {
	try {
		const client = await connectToDaemon();
		const result = await client.validation.comprehensive({
			workspace: workspaceRoot,
			filePath,
			code: content,
		});
		// Derive a 0-10 risk score from validation confidence + issue count
		// passed + high confidence → low score; failed + low confidence → high score
		const riskScore = result.passed
			? Math.round((1 - result.confidence) * 4) // 0–4
			: Math.round(4 + (1 - result.confidence) * 6); // 4–10
		const riskLevel = riskScore > 7 ? "high" : riskScore > 4 ? "medium" : "low";
		return { riskScore, riskLevel, signals: [] };
	} catch {
		return analyzeFileRiskWithPatterns(filePath, content);
	}
}

/**
 * Lightweight regex-pattern fallback when the daemon is unavailable.
 */
export function analyzeFileRiskWithPatterns(filePath: string, content: string): FileRiskResult {
	const factors: Array<{ signal: string; value: number }> = [];
	if (content.includes("eval(")) {
		factors.push({ signal: "eval()", value: 3 });
	}
	if (content.includes("Function(")) {
		factors.push({ signal: "Function constructor", value: 2 });
	}
	if (/process\.env\.[A-Z_]{6,}/.test(content)) {
		factors.push({ signal: "env access", value: 1 });
	}
	if (/secret|password|api[_-]?key/i.test(filePath)) {
		factors.push({ signal: "sensitive filename", value: 4 });
	}
	const riskScore = Math.min(
		10,
		factors.reduce((sum, f) => sum + f.value, 0),
	);
	const riskLevel = riskScore > 7 ? "high" : riskScore > 4 ? "medium" : "low";
	return { riskScore, riskLevel, signals: factors };
}

/**
 * Recursively collect all non-hidden, non-node_modules file paths under `dir`.
 */
export async function getAllFiles(dir: string, baseDir: string = dir): Promise<string[]> {
	const files: string[] = [];
	try {
		const entries = await readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = join(dir, entry.name);
			if (entry.name === "node_modules" || entry.name === ".git" || entry.name.startsWith(".")) {
				continue;
			}
			if (entry.isDirectory()) {
				files.push(...(await getAllFiles(fullPath, baseDir)));
			} else {
				files.push(relative(baseDir, fullPath));
			}
		}
	} catch {
		// Ignore permission errors
	}
	return files;
}
