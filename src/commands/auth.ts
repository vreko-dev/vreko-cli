/**
 * Authentication Commands  -  Multi-Strategy
 *
 * Supports three authentication strategies:
 * 1. Device Code Flow (DEFAULT)  -  RFC 8628 compliant. No flags needed.
 * 2. API Key Flow  -  `--api-key <key>` flag. For automation and invite-gated alpha.
 * 3. Browser OAuth Flow  -  `--browser` flag. Local callback server on port 51234.
 *
 * Credential storage delegates to vreko-dir.ts which uses keychain-first
 * storage with JSON fallback via GlobalCredentials.
 *
 * @see RFC 8628 https://www.rfc-editor.org/rfc/rfc8628
 */

import { execFile } from "node:child_process";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import { syncApiKeyToAllConfigs } from "../services/mcp-service.js";
import {
	type CredentialStorageResult,
	clearCredentials,
	createGlobalDirectory,
	type GlobalCredentials,
	getCredentials,
	saveCredentials,
} from "../services/vreko-dir.js";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * AUTH-03: Resolve and validate the API base URL.
 *
 * A non-localhost API endpoint MUST use https:// so the device-code response
 * (which carries an auth URL) cannot be intercepted on a cleartext MITM path.
 * Localhost (loopback) over http is permitted for local development. Throws at
 * config load when a non-localhost URL is supplied without https.
 */
export function resolveApiUrl(raw: string | undefined = process.env.VREKO_API_URL): string {
	const value = raw || "http://localhost:3002";
	let parsed: URL;
	try {
		parsed = new URL(value);
	} catch {
		throw new Error(`Invalid VREKO_API_URL: ${value}`);
	}
	const isLoopback = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
	if (!isLoopback && parsed.protocol !== "https:") {
		throw new Error(
			`VREKO_API_URL must use https:// for non-localhost hosts (got ${parsed.protocol}//${parsed.hostname}). ` +
				"Cleartext to a remote API exposes the device-code flow to interception.",
		);
	}
	return value;
}

const API_URL = resolveApiUrl();
const CONSOLE_URL = process.env.VREKO_CONSOLE_URL || "http://localhost:3000";

// =============================================================================
// CREDENTIAL TYPES
// =============================================================================

/**
 * Unified credential type  -  discriminated by the presence of `apiKey` vs `accessToken`.
 * Legacy credentials have only `apiKey`. New OAuth credentials use GlobalCredentials.
 */
interface ApiKeyOnlyCredentials {
	apiKey: string;
}

type StoredCredentials = GlobalCredentials | ApiKeyOnlyCredentials;

function isApiKeyCredentials(creds: StoredCredentials): creds is ApiKeyOnlyCredentials {
	return "apiKey" in creds && !("accessToken" in creds);
}

function isTokenCredentials(creds: StoredCredentials): creds is GlobalCredentials {
	return "accessToken" in creds;
}

// =============================================================================
// CREDENTIAL HELPERS
// =============================================================================

/**
 * Load stored credentials. Supports both legacy API key format and new
 * GlobalCredentials (JWT) format. Tries secure keychain first via vreko-dir.
 */
async function loadCredentials(): Promise<StoredCredentials | null> {
	try {
		const creds = await getCredentials();
		if (creds?.accessToken) {
			return creds;
		}
	} catch (error) {
		// Keychain/secure storage failed  -  fall through to legacy check
		console.error(
			chalk.gray(`Secure credential read failed: ${error instanceof Error ? error.message : String(error)}`),
		);
	}

	// Legacy fallback: read plain JSON that may only have apiKey
	try {
		const { readFile } = await import("node:fs/promises");
		const { homedir } = await import("node:os");
		const { join } = await import("node:path");
		const credPath = join(homedir(), ".vreko", "credentials.json");
		const raw = await readFile(credPath, "utf8");
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		if (typeof parsed.apiKey === "string" && parsed.apiKey.length > 0) {
			return { apiKey: parsed.apiKey } as ApiKeyOnlyCredentials;
		}
		if (typeof parsed.accessToken === "string" && parsed.accessToken.length > 0) {
			return parsed as unknown as GlobalCredentials;
		}
		return null;
	} catch {
		return null;
	}
}

/** Validate an API key against the auth endpoint (GET /api/auth/get-session). */
async function validateApiKey(key: string): Promise<{ email: string } | null> {
	try {
		const response = await fetch(`${API_URL}/api/auth/get-session`, {
			headers: { "x-api-key": key },
		});
		if (!response.ok) {
			return null;
		}
		const data = (await response.json()) as { user?: { email?: string } };
		return { email: data?.user?.email ?? "unknown" };
	} catch (error) {
		console.error(
			chalk.gray(`API key validation failed: ${error instanceof Error ? error.message : String(error)}`),
		);
		return null;
	}
}

/** Validate a JWT access token against the auth endpoint (GET /api/auth/get-session). */
async function validateToken(token: string): Promise<{ email: string; tier?: string } | null> {
	try {
		const response = await fetch(`${API_URL}/api/auth/get-session`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!response.ok) {
			return null;
		}
		const data = (await response.json()) as { user?: { email?: string; tier?: string } };
		return {
			email: data?.user?.email ?? "unknown",
			tier: data?.user?.tier,
		};
	} catch (error) {
		console.error(chalk.gray(`Token validation failed: ${error instanceof Error ? error.message : String(error)}`));
		return null;
	}
}

/**
 * Open a URL in the default browser. Fails silently if the browser cannot be opened.
 * Uses execFile (not exec) to prevent shell injection from server-controlled URLs.
 */
export function openBrowser(url: string): void {
	// Reject non-https URLs before passing to the OS - prevents shell injection
	// and avoids opening unexpected protocol handlers from a server-controlled string.
	if (!url.startsWith("https://") && !url.startsWith("http://localhost")) {
		return;
	}
	if (process.platform === "darwin") {
		execFile("open", [url], () => {});
	} else if (process.platform === "win32") {
		execFile("cmd", ["/c", "start", "", url], () => {});
	} else {
		execFile("xdg-open", [url], () => {});
	}
}

/**
 * AUTH-07: credential payload delivered to the loopback callback via POST body
 * (never the URL query). `state` is the AUTH-05 nonce echoed back for validation.
 */
interface LoopbackCallbackPayload {
	state?: string;
	access_token?: string;
	refresh_token?: string;
	email?: string;
	tier?: string;
	expires_in?: number | string;
}

/**
 * AUTH-06: print an honest storage-result message. Only the keychain and
 * encrypted-file backends count as "secure"; the plaintext fallback emits a
 * loud downgrade warning naming the weaker backend  -  never "stored securely".
 */
function reportStorageResult(result: CredentialStorageResult | undefined | void): void {
	// Defensive: older/mocked code paths may not return a result.
	if (!result || result.secure) {
		const backend = result?.backend === "keychain" ? "OS keychain" : "encrypted file";
		console.log(chalk.gray(`  Credentials stored securely (${result ? backend : "secure backend"}).`));
		return;
	}
	console.log(
		chalk.yellow(
			"  ⚠ Secure storage unavailable  -  credentials saved to a restricted-permission (0600) plaintext file.",
		),
	);
	if (result.downgradeReason) {
		console.log(chalk.dim(`    Reason: ${result.downgradeReason}`));
	}
	console.log(chalk.dim("    Install/enable a system keychain (keytar) for encrypted storage."));
}

/**
 * AUTH-07: build the console authorize URL for the loopback flow. Carries only
 * the redirect target and the AUTH-05 state nonce  -  never a credential. The
 * console delivers tokens back via a POST body to the loopback /callback.
 */
export function buildLoopbackAuthUrl(consoleUrl: string, redirectUri: string, state: string): string {
	return `${consoleUrl}/auth/cli?redirect=${encodeURIComponent(redirectUri)}&state=${state}`;
}

/** Read a request body to a string with a hard cap to avoid unbounded buffering. */
function readRequestBody(req: import("node:http").IncomingMessage, maxBytes = 64 * 1024): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		let total = 0;
		req.on("data", (chunk: Buffer) => {
			total += chunk.length;
			if (total > maxBytes) {
				reject(new Error("body too large"));
				req.destroy();
				return;
			}
			chunks.push(chunk);
		});
		req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
		req.on("error", reject);
	});
}

/**
 * AUTH-05: constant-time comparison of a received state nonce against the
 * expected one. Returns false on any length/format mismatch  -  never throws.
 */
export function isExpectedState(received: string, expected: string): boolean {
	if (typeof received !== "string" || received.length !== expected.length) {
		return false;
	}
	try {
		return timingSafeEqual(Buffer.from(received, "utf8"), Buffer.from(expected, "utf8"));
	} catch {
		return false;
	}
}

// =============================================================================
// DEVICE CODE FLOW (RFC 8628)
// =============================================================================

interface DeviceCodeResponse {
	device_code: string;
	user_code: string;
	verification_uri: string;
	verification_uri_complete?: string;
	expires_in: number;
	interval: number;
}

interface DeviceTokenSuccessResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token?: string;
	user?: { email?: string; name?: string };
	tier?: string;
}

interface DeviceTokenErrorResponse {
	error: string;
	error_description?: string;
	interval?: number;
}

/**
 * Device Code login flow (RFC 8628).
 *
 * 1. Request a device code from the server
 * 2. Display the user code and verification URL
 * 3. Auto-open browser to verification_uri_complete
 * 4. Poll for token until authorized, denied, or expired
 * 5. Store credentials via vreko-dir
 */
async function deviceCodeLogin(): Promise<void> {
	const spinner = ora("Requesting device code...").start();

	// Step 1: Request device code
	let deviceCode: DeviceCodeResponse;
	try {
		const response = await fetch(`${API_URL}/api/auth/device/code`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ client_id: "cli" }),
		});

		if (!response.ok) {
			spinner.fail("Failed to request device code from server.");
			const errorBody = await response.text().catch(() => "");
			console.error(chalk.red(`Server responded with ${response.status}: ${errorBody}`));
			process.exit(1);
			return;
		}

		deviceCode = (await response.json()) as DeviceCodeResponse;
	} catch (error) {
		spinner.fail("Failed to connect to Vreko server.");
		console.error(chalk.red(`Network error: ${error instanceof Error ? error.message : String(error)}`));
		process.exit(1);
		return;
	}

	spinner.stop();

	// Step 2: Display user code and verification URL
	console.log();
	console.log(chalk.bold("  To authenticate, visit:"));
	console.log(`  ${chalk.cyan(deviceCode.verification_uri)}`);
	console.log();
	console.log(chalk.bold("  Enter code: ") + chalk.yellow.bold(deviceCode.user_code));
	console.log();

	// Step 3: Auto-open browser
	const openUrl = deviceCode.verification_uri_complete || deviceCode.verification_uri;
	openBrowser(openUrl);
	console.log(chalk.gray("  Browser opened automatically. If not, copy the URL above."));
	console.log();

	// Step 4: Poll for token
	const pollSpinner = ora("Waiting for authorization...").start();
	let interval = (deviceCode.interval || 5) * 1000; // Convert to ms
	const deadline = Date.now() + deviceCode.expires_in * 1000;

	while (Date.now() < deadline) {
		await new Promise((resolve) => setTimeout(resolve, interval));

		try {
			const tokenResponse = await fetch(`${API_URL}/api/auth/device/token`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					device_code: deviceCode.device_code,
					grant_type: "urn:ietf:params:oauth:grant-type:device_code",
					client_id: "cli",
				}),
			});

			if (tokenResponse.ok) {
				// Success  -  user authorized
				const tokenData = (await tokenResponse.json()) as DeviceTokenSuccessResponse;
				pollSpinner.succeed("Authorized!");

				// Step 5: Store credentials
				const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
				const credentials: GlobalCredentials = {
					accessToken: tokenData.access_token,
					refreshToken: tokenData.refresh_token,
					email: tokenData.user?.email ?? "unknown",
					tier: (tokenData.tier as "free" | "pro") ?? "free",
					expiresAt,
				};

				await createGlobalDirectory();
				const storageResult = await saveCredentials(credentials);

				console.log(chalk.green("✓"), `Authenticated as ${credentials.email}`);
				reportStorageResult(storageResult);

				// Post-auth: sync to MCP configs
				try {
					await syncApiKeyToAllConfigs(tokenData.access_token);
				} catch {
					// Non-fatal  -  MCP config sync is best-effort
					console.log(chalk.gray("  Note: MCP config sync skipped (non-critical)."));
				}

				return;
			}

			// Error response  -  check RFC 8628 error codes
			const errorData = (await tokenResponse.json()) as DeviceTokenErrorResponse;

			if (errorData.error === "authorization_pending") {
				// User hasn't authorized yet  -  continue polling
				continue;
			}

			if (errorData.error === "slow_down") {
				// Server asked us to slow down  -  increase interval by 5 seconds
				interval += 5000;
				continue;
			}

			if (errorData.error === "access_denied") {
				pollSpinner.fail("Authorization denied.");
				console.error(chalk.red("The authorization request was denied. Please try again."));
				process.exit(1);
				return;
			}

			if (errorData.error === "not_in_cohort") {
				pollSpinner.stop();
				console.error(chalk.red("\n✗ Your email is not in Pioneer Batch 1."));
				console.error(chalk.dim("  Join the waitlist: https://vreko.dev/pioneer\n"));
				process.exit(1);
				return;
			}

			if (errorData.error === "expired_token") {
				pollSpinner.fail("Device code expired.");
				console.error(chalk.red("The device code has expired. Please run 'vreko login' again."));
				process.exit(1);
				return;
			}

			// Unknown error
			pollSpinner.fail("Authentication failed.");
			console.error(chalk.red(`Server error: ${errorData.error_description || errorData.error}`));
			process.exit(1);
			return;
		} catch (error) {
			// Network error during polling  -  log but continue (transient)
			pollSpinner.text = "Waiting for authorization... (retrying after network error)";
			console.error(chalk.gray(`\n  Poll error: ${error instanceof Error ? error.message : String(error)}`));
		}
	}

	// Deadline reached
	pollSpinner.fail("Device code expired.");
	console.error(chalk.red("The device code has expired. Please run 'vreko login' again."));
	process.exit(1);
}

// =============================================================================
// BROWSER OAUTH FLOW (Stretch Goal)
// =============================================================================

/**
 * Browser OAuth login flow.
 *
 * 1. Start a local HTTP server on port 51234 (or fallback ports)
 * 2. Open browser to the console auth page with redirect to localhost
 * 3. Receive OAuth callback with token parameters
 * 4. Store credentials and shut down server
 */
async function browserOAuthLogin(): Promise<void> {
	const ports = [51234, 51235, 51236];
	let server: ReturnType<typeof createServer> | null = null;
	let resolvedPort: number | null = null;

	// Try to find an available port
	for (const port of ports) {
		try {
			server = await new Promise<ReturnType<typeof createServer>>((resolve, reject) => {
				const s = createServer();
				s.listen(port, "127.0.0.1", () => resolve(s));
				s.on("error", reject);
			});
			resolvedPort = port;
			break;
		} catch {
			// Port in use, try next
		}
	}

	if (!server || !resolvedPort) {
		console.error(chalk.red("Failed to start local auth server. Ports 51234-51236 are in use."));
		console.log(chalk.gray("Try 'vreko login' (device code flow) instead."));
		process.exit(1);
		return;
	}

	// AUTH-05: generate a cryptographically random state nonce for this attempt.
	// It is sent in the authorize URL and must be echoed back on the callback; a
	// missing or mismatched state is rejected, closing the local token-fixation
	// window (a different local process cannot inject a token into our callback).
	const expectedState = randomBytes(32).toString("hex");

	const redirectUri = `http://localhost:${resolvedPort}/callback`;
	const authUrl = buildLoopbackAuthUrl(CONSOLE_URL, redirectUri, expectedState);

	console.log();
	console.log(chalk.bold("  Opening browser for authentication..."));
	console.log(chalk.gray(`  If the browser doesn't open, visit: ${authUrl}`));
	console.log();

	openBrowser(authUrl);

	const spinner = ora("Waiting for browser authorization...").start();

	// Set up timeout
	const timeoutMs = 120_000; // 2 minutes
	const timeout = setTimeout(() => {
		spinner.fail("Browser authorization timed out.");
		console.error(chalk.red("No callback received within 2 minutes. Please try again."));
		server?.close();
		process.exit(1);
	}, timeoutMs);

	return new Promise<void>((resolve) => {
		server?.on("request", async (req, res) => {
			const url = new URL(req.url || "/", `http://localhost:${resolvedPort}`);

			if (url.pathname !== "/callback") {
				res.writeHead(404);
				res.end("Not found");
				return;
			}

			// AUTH-07: the credential must NOT travel in the URL query (browser
			// history + Referer capture it). The console posts the tokens to this
			// loopback as a JSON body; GET only serves an instructional page.
			if (req.method !== "POST") {
				res.writeHead(200, { "Content-Type": "text/html" });
				res.end(
					"<html><body><h1>Vreko CLI login</h1><p>Waiting for the console to deliver your credentials. You can close this window once the terminal confirms.</p></body></html>",
				);
				return;
			}

			const body = await readRequestBody(req);
			let payload: LoopbackCallbackPayload;
			try {
				payload = JSON.parse(body) as LoopbackCallbackPayload;
			} catch {
				res.writeHead(400, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "invalid_body" }));
				return;
			}

			// AUTH-05: validate the state nonce before doing anything with the
			// callback. Reject (and persist nothing) if it is missing or does not
			// match the value we generated for this attempt.
			const receivedState = payload.state;
			if (!receivedState || !isExpectedState(receivedState, expectedState)) {
				res.writeHead(400, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "invalid_state" }));
				return;
			}

			const accessToken = payload.access_token;
			const refreshToken = payload.refresh_token ?? undefined;
			const email = payload.email ?? "unknown";
			const tier = (payload.tier as "free" | "pro") ?? "free";
			const expiresIn = Number.parseInt(String(payload.expires_in ?? "604800"), 10);

			if (!accessToken) {
				res.writeHead(400, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "missing_access_token" }));
				return;
			}

			// Store credentials
			const credentials: GlobalCredentials = {
				accessToken,
				refreshToken,
				email,
				tier,
				expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
			};

			await createGlobalDirectory();
			const storageResult = await saveCredentials(credentials);

			// Acknowledge to the console (JSON, not a navigated URL)
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ ok: true }));

			clearTimeout(timeout);
			spinner.succeed("Authorized!");

			console.log(chalk.green("✓"), `Authenticated as ${email}`);
			reportStorageResult(storageResult);

			// Post-auth: sync to MCP configs
			try {
				await syncApiKeyToAllConfigs(accessToken);
			} catch {
				console.log(chalk.gray("  Note: MCP config sync skipped (non-critical)."));
			}

			server?.close();
			server?.unref();
			resolve();
		});
	});
}

// =============================================================================
// COMMAND DEFINITIONS
// =============================================================================

/**
 * `vreko login`  -  Authenticate with Vreko.
 *
 * Default (no flags): Device Code Flow (RFC 8628)  -  best UX for interactive use.
 * `--api-key <key>`: API Key Flow  -  for automation and invite-gated alpha.
 * `--browser`: Browser OAuth Flow  -  local callback server on port 51234.
 */
export function createLoginCommand(): Command {
	return new Command("login")
		.description("Authenticate with Vreko")
		.option("--api-key <key>", "Authenticate with an API key (starts with sk_live_)")
		.option("--browser", "Authenticate via browser OAuth (local callback)")
		.action(async (options: { apiKey?: string; browser?: boolean }) => {
			if (options.apiKey) {
				// API Key flow
				const key = options.apiKey;

				if (!key.startsWith("sk_live_")) {
					console.error(chalk.red("Invalid API key format. Keys start with sk_live_"));
					process.exit(1);
					return;
				}

				console.log(chalk.gray("Validating API key..."));
				const user = await validateApiKey(key);

				if (!user) {
					console.error(chalk.red("Invalid API key. Please check your key and try again."));
					console.log(chalk.gray("Get your key at: https://console.vreko.dev"));
					process.exit(1);
					return;
				}

				// Store as GlobalCredentials for unified handling
				await createGlobalDirectory();
				await saveCredentials({
					accessToken: key,
					email: user.email,
					tier: "free",
				});

				// Also sync to MCP configs
				try {
					await syncApiKeyToAllConfigs(key);
				} catch {
					// Non-fatal
				}

				console.log(chalk.green("✓"), `Authenticated as ${user.email}`);
				console.log(chalk.gray("API key saved to ~/.vreko/credentials.json"));
				return;
			}

			if (options.browser) {
				// Browser OAuth flow
				await browserOAuthLogin();
				return;
			}

			// Default: Device Code flow
			await deviceCodeLogin();
		});
}

/**
 * `vreko set-key <key>`  -  alias for `vreko login --api-key <key>`.
 *
 * Explicit sub-command matching the `vreko auth set-key` spec.
 */
export function createSetKeyCommand(): Command {
	return new Command("set-key")
		.description("Store your Vreko API key")
		.argument("<key>", "Your API key (starts with sk_live_)")
		.action(async (key: string) => {
			if (!key.startsWith("sk_live_")) {
				console.error(chalk.red("Invalid API key format. Keys start with sk_live_"));
				process.exit(1);
				return;
			}

			console.log(chalk.gray("Validating API key..."));
			const user = await validateApiKey(key);

			if (!user) {
				console.error(chalk.red("Invalid API key. Please check your key and try again."));
				console.log(chalk.gray("Get your key at: https://console.vreko.dev"));
				process.exit(1);
				return;
			}

			await createGlobalDirectory();
			await saveCredentials({
				accessToken: key,
				email: user.email,
				tier: "free",
			});

			// Sync to MCP configs
			try {
				await syncApiKeyToAllConfigs(key);
			} catch {
				// Non-fatal
			}

			console.log(chalk.green("✓"), `Authenticated as ${user.email}`);
			console.log(chalk.gray("API key saved to ~/.vreko/credentials.json"));
		});
}

/**
 * `vreko logout`  -  clear all stored credentials.
 */
export function createLogoutCommand(): Command {
	return new Command("logout").description("Remove stored credentials").action(async () => {
		await clearCredentials();
		console.log(chalk.green("✓"), "Credentials cleared.");
	});
}

/**
 * `vreko whoami`  -  show current authentication status.
 * Detects credential type (API key vs JWT) and displays appropriate info.
 */
export function createWhoamiCommand(): Command {
	return new Command("whoami").description("Show current authentication status").action(async () => {
		const creds = await loadCredentials();

		if (!creds) {
			console.log(chalk.yellow("Not authenticated."));
			console.log(chalk.gray("Run: vreko login"));
			console.log(chalk.gray("  or: vreko login --api-key <your-api-key>"));
			return;
		}

		if (isApiKeyCredentials(creds)) {
			// Legacy API key credentials
			const preview = `${creds.apiKey.substring(0, 16)}...`;
			console.log(chalk.green("✓"), `Authenticated with API key: ${chalk.bold(preview)}`);
			console.log(chalk.gray("  Auth method: api-key"));

			const user = await validateApiKey(creds.apiKey).catch(() => null);
			if (user) {
				console.log(chalk.gray(`  User: ${user.email}`));
			} else {
				console.log(chalk.yellow("  Warning: API key validation failed (offline or key revoked?)"));
			}
			return;
		}

		if (isTokenCredentials(creds)) {
			// JWT / device-code credentials
			const isApiKey = creds.accessToken.startsWith("sk_live_");
			const authMethod = isApiKey ? "api-key" : "device-code";

			console.log(chalk.green("✓"), `Authenticated as ${chalk.bold(creds.email)}`);
			console.log(chalk.gray(`  Auth method: ${authMethod}`));
			console.log(chalk.gray(`  Tier: ${creds.tier}`));

			if (creds.expiresAt) {
				const expiresAt = new Date(creds.expiresAt);
				const now = new Date();
				if (expiresAt < now) {
					console.log(chalk.yellow(`  Token expired: ${expiresAt.toLocaleString()}`));
				} else {
					console.log(chalk.gray(`  Expires: ${expiresAt.toLocaleString()}`));
				}
			}

			// Validate token against server
			const user = await validateToken(creds.accessToken).catch(() => null);
			if (user) {
				console.log(chalk.gray(`  Verified: ${user.email}`));
			} else {
				console.log(chalk.yellow("  Warning: Token validation failed (offline or token expired?)"));
			}
			return;
		}
	});
}

/**
 * `vreko workspaces`  -  stub for backward compatibility.
 *
 * Workspace-scoped sessions are removed in the alpha. All auth is global
 * via credentials stored in ~/.vreko/.
 */
export function createWorkspacesCommand(): Command {
	return new Command("workspaces").description("Show authentication info").action(async () => {
		const creds = await loadCredentials();

		if (!creds) {
			console.log(chalk.yellow("Not authenticated."));
			console.log(chalk.gray("Run: vreko login"));
			return;
		}

		if (isApiKeyCredentials(creds)) {
			console.log(chalk.green("✓"), "Authenticated (global)");
			console.log(chalk.gray(`  Key: ${creds.apiKey.substring(0, 16)}...`));
			console.log(chalk.gray("  Scope: all workspaces"));
		} else if (isTokenCredentials(creds)) {
			console.log(chalk.green("✓"), `Authenticated as ${creds.email} (global)`);
			console.log(chalk.gray(`  Tier: ${creds.tier}`));
			console.log(chalk.gray("  Scope: all workspaces"));
		}
	});
}

// =============================================================================
// RE-EXPORTS: legacy helpers consumed by other CLI modules
// =============================================================================

/** @deprecated Use loadCredentials() directly */
export async function ensureValidCredentials(): Promise<string | null> {
	const creds = await loadCredentials();
	if (!creds) {
		return null;
	}
	if (isApiKeyCredentials(creds)) {
		return creds.apiKey;
	}
	if (isTokenCredentials(creds)) {
		return creds.accessToken;
	}
	return null;
}
