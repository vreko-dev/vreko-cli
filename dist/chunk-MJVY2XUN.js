#!/usr/bin/env node
import { __name } from './chunk-EWOJGXRX.js';
import { readFileSync, mkdirSync, writeFileSync, existsSync, statSync, copyFileSync } from 'fs';
import { homedir, platform } from 'os';
import { join, resolve, dirname } from 'path';
import { randomUUID } from 'crypto';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';
var __defProp = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp(target, "name", {
  value,
  configurable: true
}), "__name");
var CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1e3;
function getCacheFilePath() {
  return join(homedir(), ".vreko", "mcp-configs", "paths.json");
}
__name(getCacheFilePath, "getCacheFilePath");
__name2(getCacheFilePath, "getCacheFilePath");
function readCache() {
  try {
    const raw = readFileSync(getCacheFilePath(), "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed.version === 1 && typeof parsed.discovered === "object") {
      return parsed;
    }
  } catch {
  }
  return {
    version: 1,
    discovered: {}
  };
}
__name(readCache, "readCache");
__name2(readCache, "readCache");
function writeCache(cache) {
  try {
    const dir = join(homedir(), ".vreko", "mcp-configs");
    mkdirSync(dir, {
      recursive: true
    });
    writeFileSync(getCacheFilePath(), JSON.stringify(cache, null, 2));
  } catch {
  }
}
__name(writeCache, "writeCache");
__name2(writeCache, "writeCache");
function getCachedPath(clientName) {
  const cache = readCache();
  const entry = cache.discovered[clientName];
  if (!entry) {
    return null;
  }
  const age = Date.now() - new Date(entry.discoveredAt).getTime();
  if (age > CACHE_TTL_MS) {
    return null;
  }
  if (!existsSync(entry.path)) {
    delete cache.discovered[clientName];
    writeCache(cache);
    return null;
  }
  return entry.path;
}
__name(getCachedPath, "getCachedPath");
__name2(getCachedPath, "getCachedPath");
function setCachedPath(clientName, configPath) {
  const cache = readCache();
  cache.discovered[clientName] = {
    path: configPath,
    discoveredAt: /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString(),
    platform: process.platform
  };
  writeCache(cache);
}
__name(setCachedPath, "setCachedPath");
__name2(setCachedPath, "setCachedPath");
function evictCachedPath(clientName) {
  const cache = readCache();
  if (cache.discovered[clientName]) {
    delete cache.discovered[clientName];
    writeCache(cache);
  }
}
__name(evictCachedPath, "evictCachedPath");
__name2(evictCachedPath, "evictCachedPath");
function getAllCachedPaths() {
  return readCache().discovered;
}
__name(getAllCachedPaths, "getAllCachedPaths");
__name2(getAllCachedPaths, "getAllCachedPaths");
var CLIENT_CONFIGS = {
  claude: /* @__PURE__ */ __name2((home) => {
    switch (platform()) {
      case "darwin":
        return [
          join(home, "Library/Application Support/Claude/claude_desktop_config.json")
        ];
      case "win32":
        return [
          join(process.env.APPDATA || "", "Claude/claude_desktop_config.json")
        ];
      default:
        return [
          join(home, ".config/Claude/claude_desktop_config.json")
        ];
    }
  }, "claude"),
  // Project-level first (user preference), then global fallback
  cursor: /* @__PURE__ */ __name2((_home, cwd) => [
    ...cwd ? [
      join(cwd, ".cursor/mcp.json")
    ] : [],
    join(_home, ".cursor/mcp.json")
  ], "cursor"),
  // Windsurf only has a global config  -  no project-level support (confirmed by Windsurf docs, June 2025)
  windsurf: /* @__PURE__ */ __name2((home) => [
    join(home, ".codeium/windsurf/mcp_config.json")
  ], "windsurf"),
  // Continue: global config.json or config.yaml; project-level .continue/mcpServers/mcp.json
  continue: /* @__PURE__ */ __name2((home, cwd) => [
    ...cwd ? [
      join(cwd, ".continue/mcpServers/mcp.json")
    ] : [],
    join(home, ".continue/config.json"),
    join(home, ".continue/config.yaml")
  ], "continue"),
  // New clients
  vscode: /* @__PURE__ */ __name2((_home, cwd) => [
    ...cwd ? [
      join(cwd, ".vscode/mcp.json")
    ] : []
  ], "vscode"),
  // Zed: global ~/.config/zed/settings.json, plus project-level .zed/settings.json
  zed: /* @__PURE__ */ __name2((home, cwd) => [
    ...cwd ? [
      join(cwd, ".zed/settings.json")
    ] : [],
    join(home, ".config/zed/settings.json")
  ], "zed"),
  // Cline / Roo Code store their actual settings in VS Code extension globalStorage,
  // but `vreko tools configure --cline/--roo-code` writes to these paths as a side-channel.
  // Detection via these paths is best-effort; users may need `vreko mcp link --client cline` instead.
  cline: /* @__PURE__ */ __name2((home) => [
    join(home, ".cline/mcp.json")
  ], "cline"),
  gemini: /* @__PURE__ */ __name2((home) => [
    join(home, ".gemini/settings.json")
  ], "gemini"),
  aider: /* @__PURE__ */ __name2((home) => [
    join(home, ".aider/mcp.yaml")
  ], "aider"),
  "roo-code": /* @__PURE__ */ __name2((home) => [
    join(home, ".roo-code/mcp.json")
  ], "roo-code"),
  // Qoder (VS Code fork) - supports both project-level and global configs
  qoder: /* @__PURE__ */ __name2((home, cwd) => {
    const workspaceConfig = cwd ? [
      join(cwd, ".qoder-mcp-config.json")
    ] : [];
    const globalConfigs = (() => {
      switch (platform()) {
        case "darwin":
          return [
            join(home, "Library/Application Support/Qoder/SharedClientCache/mcp.json"),
            join(home, "Library/Application Support/Qoder/SharedClientCache/extension/local/mcp.json")
          ];
        case "win32":
          return [
            join(process.env.APPDATA || "", "Qoder/mcp.json")
          ];
        default:
          return [
            join(home, ".config/Qoder/mcp.json")
          ];
      }
    })();
    return [
      ...workspaceConfig,
      ...globalConfigs
    ];
  }, "qoder"),
  // Claude Code CLI  -  project-scoped .mcp.json at workspace root
  "claude-code": /* @__PURE__ */ __name2((_home, cwd) => [
    ...cwd ? [
      join(cwd, ".mcp.json")
    ] : [
      join(process.cwd(), ".mcp.json")
    ]
  ], "claude-code")
};
var CLIENT_DISPLAY_NAMES = {
  claude: "Claude Desktop",
  cursor: "Cursor",
  windsurf: "Windsurf",
  continue: "Continue",
  vscode: "VS Code",
  zed: "Zed",
  cline: "Cline",
  gemini: "Gemini/Antigravity",
  aider: "Aider",
  "roo-code": "Roo Code",
  qoder: "Qoder",
  "claude-code": "Claude Code"
};
var UNSUPPORTED_DEFAULT_INIT_CLIENTS = /* @__PURE__ */ new Set([
  "zed",
  "continue"
]);
function hasVrekoServerName(name, format) {
  if (name === "vreko") {
    return true;
  }
  if (format && name === `vreko-${format}`) {
    return true;
  }
  return name.startsWith("vreko-");
}
__name(hasVrekoServerName, "hasVrekoServerName");
__name2(hasVrekoServerName, "hasVrekoServerName");
function detectAIClients(options = {}) {
  const home = homedir();
  const cwd = options.cwd || process.cwd();
  const clients = [];
  const seenPaths = /* @__PURE__ */ new Set();
  for (const [name, getPaths] of Object.entries(CLIENT_CONFIGS)) {
    const candidates = getPaths(home, cwd);
    const cachedPath = getCachedPath(name);
    const paths = cachedPath && candidates.includes(cachedPath) ? [
      cachedPath,
      ...candidates.filter((p) => p !== cachedPath)
    ] : candidates;
    for (const configPath of paths) {
      if (seenPaths.has(configPath)) {
        continue;
      }
      seenPaths.add(configPath);
      const exists = existsSync(configPath);
      let hasVreko = false;
      if (exists) {
        setCachedPath(name, configPath);
        try {
          const content = readFileSync(configPath, "utf-8");
          if (configPath.endsWith(".yaml") || configPath.endsWith(".yml")) {
            hasVreko = content.includes("vreko");
          } else {
            const parsed = JSON.parse(content);
            hasVreko = checkForVreko(parsed, name);
          }
        } catch {
        }
      }
      clients.push({
        name,
        displayName: CLIENT_DISPLAY_NAMES[name] || name,
        configPath,
        exists,
        hasVreko,
        format: name
      });
    }
  }
  const detected = clients.filter((c) => c.exists);
  const needsSetup = detected.filter((c) => !c.hasVreko && !UNSUPPORTED_DEFAULT_INIT_CLIENTS.has(c.name));
  return {
    clients,
    detected,
    needsSetup
  };
}
__name(detectAIClients, "detectAIClients");
__name2(detectAIClients, "detectAIClients");
function getClient(clientName) {
  const result = detectAIClients();
  return result.clients.find((c) => c.name === clientName && c.exists);
}
__name(getClient, "getClient");
__name2(getClient, "getClient");
function getConfiguredClients() {
  const result = detectAIClients();
  return result.detected.filter((c) => c.hasVreko);
}
__name(getConfiguredClients, "getConfiguredClients");
__name2(getConfiguredClients, "getConfiguredClients");
function checkForVreko(config, format) {
  if (!config || typeof config !== "object") {
    return false;
  }
  const configObj = config;
  switch (format) {
    case "claude":
    case "cursor":
    case "windsurf":
    case "cline":
    case "roo-code":
    case "claude-code":
      if ("mcpServers" in configObj && typeof configObj.mcpServers === "object" && configObj.mcpServers !== null) {
        const servers = configObj.mcpServers;
        return Object.keys(servers).some((serverName) => hasVrekoServerName(serverName, format));
      }
      return false;
    case "qoder":
      if ("mcpServers" in configObj && typeof configObj.mcpServers === "object" && configObj.mcpServers !== null) {
        const servers = configObj.mcpServers;
        return Object.keys(servers).some((k) => hasVrekoServerName(k));
      }
      return false;
    case "vscode":
      if ("servers" in configObj && typeof configObj.servers === "object" && configObj.servers !== null) {
        const servers = configObj.servers;
        return Object.keys(servers).some((serverName) => hasVrekoServerName(serverName, "vscode"));
      }
      return false;
    case "gemini":
    case "zed":
      if ("context_servers" in configObj && typeof configObj.context_servers === "object" && configObj.context_servers !== null) {
        const servers = configObj.context_servers;
        return Object.keys(servers).some((serverName) => hasVrekoServerName(serverName, "zed"));
      }
      if ("mcpServers" in configObj && typeof configObj.mcpServers === "object" && configObj.mcpServers !== null) {
        const servers = configObj.mcpServers;
        return Object.keys(servers).some((serverName) => hasVrekoServerName(serverName, format));
      }
      return false;
    case "continue":
      if ("experimental" in configObj && typeof configObj.experimental === "object" && configObj.experimental !== null) {
        const experimental = configObj.experimental;
        if ("modelContextProtocolServers" in experimental && Array.isArray(experimental.modelContextProtocolServers)) {
          return experimental.modelContextProtocolServers.some((server) => typeof server === "object" && server !== null && typeof server.name === "string" && hasVrekoServerName(server.name));
        }
      }
      return false;
    case "aider":
      return false;
    default:
      return false;
  }
}
__name(checkForVreko, "checkForVreko");
__name2(checkForVreko, "checkForVreko");
function getClientConfigPath(clientName, cwd) {
  const getPaths = CLIENT_CONFIGS[clientName];
  if (!getPaths) {
    return void 0;
  }
  const paths = getPaths(homedir(), cwd);
  return paths[0];
}
__name(getClientConfigPath, "getClientConfigPath");
__name2(getClientConfigPath, "getClientConfigPath");
function readClientConfig(client) {
  try {
    const content = readFileSync(client.configPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return void 0;
  }
}
__name(readClientConfig, "readClientConfig");
__name2(readClientConfig, "readClientConfig");
function detectWorkspaceConfig(workspaceRoot) {
  const root = workspaceRoot || process.cwd();
  const claudeCodeConfig = join(root, ".mcp.json");
  if (existsSync(claudeCodeConfig)) {
    try {
      const content = readFileSync(claudeCodeConfig, "utf-8");
      if (content.includes("vreko")) {
        return {
          path: claudeCodeConfig,
          type: "claude-code"
        };
      }
    } catch {
    }
  }
  const qoderConfig = join(root, ".qoder-mcp-config.json");
  if (existsSync(qoderConfig)) {
    try {
      const content = readFileSync(qoderConfig, "utf-8");
      if (content.includes("vreko")) {
        return {
          path: qoderConfig,
          type: "qoder"
        };
      }
    } catch {
    }
  }
  const cursorConfig = join(root, ".cursor", "mcp.json");
  if (existsSync(cursorConfig)) {
    try {
      const content = readFileSync(cursorConfig, "utf-8");
      if (content.includes("vreko")) {
        return {
          path: cursorConfig,
          type: "cursor"
        };
      }
    } catch {
    }
  }
  const vscodeConfig = join(root, ".vscode", "mcp.json");
  if (existsSync(vscodeConfig)) {
    try {
      const content = readFileSync(vscodeConfig, "utf-8");
      if (content.includes("vreko")) {
        return {
          path: vscodeConfig,
          type: "vscode"
        };
      }
    } catch {
    }
  }
  const windsurfConfig = join(root, ".windsurf", "mcp.json");
  if (existsSync(windsurfConfig)) {
    try {
      const content = readFileSync(windsurfConfig, "utf-8");
      if (content.includes("vreko")) {
        return {
          path: windsurfConfig,
          type: "windsurf"
        };
      }
    } catch {
    }
  }
  return null;
}
__name(detectWorkspaceConfig, "detectWorkspaceConfig");
__name2(detectWorkspaceConfig, "detectWorkspaceConfig");
function getVrekoConfigDir() {
  const isWindows = process.platform === "win32";
  if (isWindows) {
    return join(process.env.APPDATA || homedir(), "Vreko");
  }
  return join(homedir(), ".vreko");
}
__name(getVrekoConfigDir, "getVrekoConfigDir");
__name2(getVrekoConfigDir, "getVrekoConfigDir");
function getConfigDirWithMigration() {
  const newDir = getVrekoConfigDir();
  const oldDir = join(homedir(), ".snapback");
  if (!existsSync(newDir) && existsSync(oldDir)) {
    try {
      const stat = statSync(oldDir);
      if (stat.isDirectory() && !stat.isSymbolicLink()) {
        mkdirSync(newDir, {
          recursive: true
        });
        const oldIdentity = join(oldDir, "identity.json");
        if (existsSync(oldIdentity)) {
          copyFileSync(oldIdentity, join(newDir, "identity.json"));
        }
      }
    } catch {
    }
  }
  return newDir;
}
__name(getConfigDirWithMigration, "getConfigDirWithMigration");
__name2(getConfigDirWithMigration, "getConfigDirWithMigration");
function getIdentityFilePath() {
  return join(getVrekoConfigDir(), "identity.json");
}
__name(getIdentityFilePath, "getIdentityFilePath");
__name2(getIdentityFilePath, "getIdentityFilePath");
var cachedIdentity = null;
function getOrCreateIdentity() {
  if (cachedIdentity) {
    return cachedIdentity;
  }
  const identityPath = getIdentityFilePath();
  if (existsSync(identityPath)) {
    try {
      const content = readFileSync(identityPath, "utf-8");
      const identity2 = JSON.parse(content);
      if (identity2.userId && identity2.installId) {
        cachedIdentity = identity2;
        return identity2;
      }
    } catch {
    }
  }
  const identity = {
    userId: randomUUID(),
    installId: randomUUID(),
    createdAt: /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString()
  };
  const configDir = getVrekoConfigDir();
  mkdirSync(configDir, {
    recursive: true
  });
  writeFileSync(identityPath, JSON.stringify(identity, null, 2));
  cachedIdentity = identity;
  return identity;
}
__name(getOrCreateIdentity, "getOrCreateIdentity");
__name2(getOrCreateIdentity, "getOrCreateIdentity");
function getCLIVersion() {
  try {
    const packagePaths = [
      join(__dirname, "../package.json"),
      join(__dirname, "../../package.json"),
      join(process.cwd(), "package.json")
    ];
    for (const pkgPath of packagePaths) {
      if (existsSync(pkgPath)) {
        const content = readFileSync(pkgPath, "utf-8");
        const pkg = JSON.parse(content);
        if (pkg.name?.includes("vreko") || pkg.name?.includes("vreko")) {
          return pkg.version || "1.0.0";
        }
      }
    }
  } catch {
  }
  return "1.0.0";
}
__name(getCLIVersion, "getCLIVersion");
__name2(getCLIVersion, "getCLIVersion");
function createManagedMetadata(client, options) {
  const identity = getOrCreateIdentity();
  return {
    userId: identity.userId,
    installId: identity.installId,
    client,
    workspaceId: options.workspaceId,
    cliVersion: getCLIVersion(),
    updatedAt: /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString(),
    transport: options.transport
  };
}
__name(createManagedMetadata, "createManagedMetadata");
__name2(createManagedMetadata, "createManagedMetadata");
function isOwnedByThisInstall(metadata) {
  if (!metadata?.installId) {
    return false;
  }
  const identity = getOrCreateIdentity();
  return metadata.installId === identity.installId;
}
__name(isOwnedByThisInstall, "isOwnedByThisInstall");
__name2(isOwnedByThisInstall, "isOwnedByThisInstall");
function resetIdentityCache() {
  cachedIdentity = null;
}
__name(resetIdentityCache, "resetIdentityCache");
__name2(resetIdentityCache, "resetIdentityCache");
var execAsync = promisify(exec);
async function detectMCPProcesses() {
  try {
    const { stdout } = await execAsync('ps aux | grep -E "(mcp.*--stdio|--stdio.*mcp|uvx.*mcp-server|npx.*mcp|node.*mcp)" | grep -v grep', {
      timeout: 5e3
    });
    const processes = parseProcessOutput(stdout);
    const vrekoProcesses = processes.filter((p) => p.isVreko);
    return {
      allProcesses: processes,
      vrekoProcesses,
      vrekoRunning: vrekoProcesses.length > 0,
      totalCount: processes.length,
      checkedAt: /* @__PURE__ */ new Date()
    };
  } catch {
    return {
      allProcesses: [],
      vrekoProcesses: [],
      vrekoRunning: false,
      totalCount: 0,
      checkedAt: /* @__PURE__ */ new Date()
    };
  }
}
__name(detectMCPProcesses, "detectMCPProcesses");
__name2(detectMCPProcesses, "detectMCPProcesses");
function parseProcessOutput(output) {
  const lines = output.trim().split("\n").filter((line) => line.trim());
  const processes = [];
  for (const line of lines) {
    const match = line.match(/^(\S+)\s+(\d+)\s+.*?\s+(.+)$/);
    if (!match) {
      continue;
    }
    const [, , pidStr, command] = match;
    const pid = Number.parseInt(pidStr, 10);
    if (Number.isNaN(pid)) {
      continue;
    }
    const serverName = extractServerName(command);
    const isVreko = command.toLowerCase().includes("vreko");
    processes.push({
      pid,
      command: command.trim(),
      serverName,
      isVreko
    });
  }
  return processes;
}
__name(parseProcessOutput, "parseProcessOutput");
__name2(parseProcessOutput, "parseProcessOutput");
function extractServerName(command) {
  const patterns = [
    // vreko mcp --stdio
    /vreko[/\s]/i,
    // mcp-server-fetch
    /mcp-server-(\w+)/,
    // @modelcontextprotocol/server-sequential-thinking
    /server-(\w+)/,
    // context7-mcp
    /(\w+)-mcp/,
    // fly mcp server
    /fly.*mcp/i,
    // supabase-mcp
    /supabase-mcp/i
  ];
  for (const pattern of patterns) {
    const match = command.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }
  return "mcp";
}
__name(extractServerName, "extractServerName");
__name2(extractServerName, "extractServerName");
async function isVrekoMCPRunning() {
  const health = await detectMCPProcesses();
  return health.vrekoRunning;
}
__name(isVrekoMCPRunning, "isVrekoMCPRunning");
__name2(isVrekoMCPRunning, "isVrekoMCPRunning");
function isVrekoServerName(name, format) {
  if (name === "vreko") {
    return true;
  }
  if (format && name === `vreko-${format}`) {
    return true;
  }
  return name.startsWith("vreko-");
}
__name(isVrekoServerName, "isVrekoServerName");
__name2(isVrekoServerName, "isVrekoServerName");
function validateClientConfig(client) {
  const issues = [];
  if (!existsSync(client.configPath)) {
    issues.push({
      severity: "error",
      code: "CONFIG_NOT_FOUND",
      message: `Config file not found: ${client.configPath}`,
      fix: `Run: vreko tools configure --${client.name}`
    });
    return {
      valid: false,
      issues
    };
  }
  let configContent;
  let parsedConfig;
  try {
    configContent = readFileSync(client.configPath, "utf-8");
  } catch (error) {
    issues.push({
      severity: "error",
      code: "CONFIG_READ_ERROR",
      message: `Cannot read config file: ${error instanceof Error ? error.message : "Unknown error"}`,
      fix: "Check file permissions"
    });
    return {
      valid: false,
      issues
    };
  }
  try {
    parsedConfig = JSON.parse(configContent);
  } catch (error) {
    issues.push({
      severity: "error",
      code: "CONFIG_PARSE_ERROR",
      message: `Invalid JSON in config file: ${error instanceof Error ? error.message : "Unknown error"}`,
      fix: `Edit ${client.configPath} to fix JSON syntax, or run: vreko tools configure --${client.name} --force`
    });
    return {
      valid: false,
      issues
    };
  }
  if (!client.hasVreko) {
    issues.push({
      severity: "warning",
      code: "VREKO_NOT_CONFIGURED",
      message: "Vreko MCP server not found in config",
      fix: `Run: vreko tools configure --${client.name}`
    });
    return {
      valid: false,
      issues
    };
  }
  const vrekoConfig = extractVrekoConfig(parsedConfig, client.format);
  if (!vrekoConfig) {
    issues.push({
      severity: "error",
      code: "VREKO_CONFIG_INVALID",
      message: "Vreko config found but cannot be parsed"
    });
    return {
      valid: false,
      issues
    };
  }
  validateVrekoConfig(vrekoConfig, issues);
  if (vrekoConfig.command && vrekoConfig.args) {
    const workspaceIdx = vrekoConfig.args.indexOf("--workspace");
    if (workspaceIdx !== -1 && workspaceIdx + 1 < vrekoConfig.args.length) {
      const workspacePath = vrekoConfig.args[workspaceIdx + 1];
      const wsValidation = validateWorkspacePath(workspacePath);
      if (!wsValidation.exists) {
        issues.push({
          severity: "error",
          code: "WORKSPACE_NOT_FOUND",
          message: `Workspace path does not exist: ${workspacePath}`,
          fix: "Update workspace path or run: vreko tools configure --force"
        });
      } else if (!wsValidation.hasMarkers) {
        issues.push({
          severity: "warning",
          code: "WORKSPACE_NO_MARKERS",
          message: `Workspace path has no markers (.git, package.json, .vreko): ${workspacePath}`,
          fix: "Run: vreko init"
        });
      }
    }
  }
  return {
    valid: issues.filter((i) => i.severity === "error").length === 0,
    issues,
    config: vrekoConfig
  };
}
__name(validateClientConfig, "validateClientConfig");
__name2(validateClientConfig, "validateClientConfig");
function validateWorkspacePath(workspacePath) {
  const absPath = resolve(workspacePath);
  if (!existsSync(absPath)) {
    return {
      exists: false,
      hasMarkers: false,
      path: absPath
    };
  }
  const hasGit = existsSync(resolve(absPath, ".git"));
  const hasPackageJson = existsSync(resolve(absPath, "package.json"));
  const hasVreko = existsSync(resolve(absPath, ".vreko"));
  return {
    exists: true,
    hasMarkers: hasGit || hasPackageJson || hasVreko,
    path: absPath
  };
}
__name(validateWorkspacePath, "validateWorkspacePath");
__name2(validateWorkspacePath, "validateWorkspacePath");
function extractVrekoConfig(parsed, format) {
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const config = parsed;
  switch (format) {
    case "vscode":
      if ("servers" in config && typeof config.servers === "object" && config.servers !== null) {
        const servers = config.servers;
        for (const [name, server] of Object.entries(servers)) {
          if (isVrekoServerName(name, format) && typeof server === "object" && server !== null) {
            return server;
          }
        }
      }
      return null;
    case "claude":
    case "cursor":
    case "windsurf":
    case "cline":
    case "roo-code":
    case "qoder":
    case "gemini":
    case "zed":
    case "claude-code":
      if ("mcpServers" in config && typeof config.mcpServers === "object" && config.mcpServers !== null) {
        const servers = config.mcpServers;
        for (const [name, server] of Object.entries(servers)) {
          if (isVrekoServerName(name, format) && typeof server === "object" && server !== null) {
            return server;
          }
        }
      }
      return null;
    case "continue":
      if ("experimental" in config && typeof config.experimental === "object" && config.experimental !== null) {
        const experimental = config.experimental;
        if ("modelContextProtocolServers" in experimental && Array.isArray(experimental.modelContextProtocolServers)) {
          const server = experimental.modelContextProtocolServers.find((s) => typeof s === "object" && s !== null && typeof s.name === "string" && isVrekoServerName(s.name));
          return server ? server : null;
        }
      }
      return null;
    default:
      return null;
  }
}
__name(extractVrekoConfig, "extractVrekoConfig");
__name2(extractVrekoConfig, "extractVrekoConfig");
function validateVrekoConfig(config, issues) {
  if (!config.command && !config.url) {
    issues.push({
      severity: "error",
      code: "MISSING_COMMAND_OR_URL",
      message: "Config must have either 'command' (stdio) or 'url' (HTTP)",
      fix: "Run: vreko tools configure --force"
    });
    return;
  }
  if (config.command) {
    if (!isCommandExecutable(config.command)) {
      issues.push({
        severity: "error",
        code: "COMMAND_NOT_EXECUTABLE",
        message: `Command not found or not executable: ${config.command}`,
        fix: "Run: vreko tools repair (will auto-fix node path)"
      });
    }
    if (!config.args || !Array.isArray(config.args)) {
      issues.push({
        severity: "error",
        code: "MISSING_ARGS",
        message: "Command-based config must have 'args' array",
        fix: "Run: vreko tools configure --force"
      });
    } else {
      if (!config.args.includes("mcp")) {
        issues.push({
          severity: "error",
          code: "MISSING_MCP_ARG",
          message: "Args must include 'mcp' command",
          fix: "Run: vreko tools configure --force"
        });
      }
      if (!config.args.includes("--stdio")) {
        issues.push({
          severity: "error",
          code: "MISSING_STDIO_ARG",
          message: "Args must include '--stdio' flag",
          fix: "Run: vreko mcp repair --client <name>"
        });
      }
      if (config.args.includes("shim")) {
        issues.push({
          severity: "error",
          code: "DEPRECATED_SHIM_COMMAND",
          message: "Args contain deprecated 'shim' command - use '--stdio' instead",
          fix: "Run: vreko mcp repair --client <name>"
        });
      }
      if (!config.args.includes("--workspace")) {
        issues.push({
          severity: "warning",
          code: "MISSING_WORKSPACE_ARG",
          message: "Args should include '--workspace' path for reliability",
          fix: "Run: vreko tools configure --force"
        });
      }
      if (config.args.length > 0) {
        const cliPath = config.args[0];
        if (cliPath?.endsWith(".js") && !existsSync(cliPath)) {
          issues.push({
            severity: "error",
            code: "CLI_PATH_NOT_FOUND",
            message: `CLI script not found: ${cliPath}`,
            fix: "Rebuild CLI: pnpm --filter @vreko/cli build"
          });
        }
      }
    }
  }
  if (config.url) {
    try {
      new URL(config.url);
    } catch {
      issues.push({
        severity: "error",
        code: "INVALID_URL",
        message: `Invalid server URL: ${config.url}`,
        fix: "Run: vreko tools configure --force"
      });
    }
  }
  if (config.env) {
    if (!config.env.VREKO_API_KEY && !config.env.VREKO_WORKSPACE_ID) {
      issues.push({
        severity: "info",
        code: "NO_AUTH",
        message: "No API key or workspace ID found (free tier will be used)"
      });
    }
  }
}
__name(validateVrekoConfig, "validateVrekoConfig");
__name2(validateVrekoConfig, "validateVrekoConfig");
function isCommandExecutable(command) {
  if (command.startsWith("/") || command.match(/^[A-Z]:\\/i)) {
    return existsSync(command);
  }
  try {
    const isWindows = process.platform === "win32";
    const cmd = isWindows ? `where ${command}` : `which ${command}`;
    execSync(cmd, {
      encoding: "utf-8",
      timeout: 5e3
    });
    return true;
  } catch {
    return false;
  }
}
__name(isCommandExecutable, "isCommandExecutable");
__name2(isCommandExecutable, "isCommandExecutable");
var cachedNodePath = null;
function resolveNodePath() {
  if (cachedNodePath) {
    return cachedNodePath;
  }
  try {
    const isWindows = process.platform === "win32";
    const command = isWindows ? "where node" : "which node";
    const result = execSync(command, {
      encoding: "utf-8",
      timeout: 5e3
    }).trim();
    const nodePath = result.split(/\r?\n/)[0].trim();
    if (nodePath && existsSync(nodePath)) {
      cachedNodePath = nodePath;
      return nodePath;
    }
  } catch {
    const commonPaths = [
      "/opt/homebrew/bin/node",
      "/usr/local/bin/node",
      "/usr/bin/node",
      "C:\\Program Files\\nodejs\\node.exe"
    ];
    for (const path of commonPaths) {
      if (existsSync(path)) {
        cachedNodePath = path;
        return path;
      }
    }
  }
  return "node";
}
__name(resolveNodePath, "resolveNodePath");
__name2(resolveNodePath, "resolveNodePath");
function resolveVrekoBinaryPath() {
  try {
    const isWindows = process.platform === "win32";
    const command = isWindows ? "where vreko" : "which vreko";
    const result = execSync(command, {
      encoding: "utf-8",
      timeout: 5e3
    }).trim();
    const binaryPath = result.split(/\r?\n/)[0].trim();
    if (binaryPath && existsSync(binaryPath)) {
      return binaryPath;
    }
  } catch {
  }
  const commonPaths = [
    "/opt/homebrew/bin/vreko",
    "/usr/local/bin/vreko",
    "/usr/bin/vreko"
  ];
  for (const p of commonPaths) {
    if (existsSync(p)) {
      return p;
    }
  }
  return "vreko";
}
__name(resolveVrekoBinaryPath, "resolveVrekoBinaryPath");
__name2(resolveVrekoBinaryPath, "resolveVrekoBinaryPath");
function isCommandExecutable2(command) {
  if (command.startsWith("/") || command.match(/^[A-Z]:\\/i)) {
    return existsSync(command);
  }
  try {
    const isWindows = process.platform === "win32";
    const cmd = isWindows ? `where ${command}` : `which ${command}`;
    execSync(cmd, {
      encoding: "utf-8",
      timeout: 5e3
    });
    return true;
  } catch {
    return false;
  }
}
__name(isCommandExecutable2, "isCommandExecutable2");
__name2(isCommandExecutable2, "isCommandExecutable");
function getVrekoMCPConfig(options = {}) {
  const { apiKey, workspaceId, serverUrl, useBinary = false, customCommand, additionalEnv, workspaceRoot, useLocalDev = false, localCliPath, useDoppler = false, dopplerProject = "vreko-shared", dopplerConfig = "dev", useSse = false, useStreamableHttp = false, client } = options;
  const useNpx = options.useNpx === true;
  const env = {
    ...additionalEnv
  };
  if (apiKey) {
    env.VREKO_API_KEY = apiKey;
  }
  if (customCommand) {
    return {
      command: customCommand,
      args: [],
      ...Object.keys(env).length > 0 && {
        env
      }
    };
  }
  if (client === "claude" && !customCommand && !useSse && !useStreamableHttp && !useDoppler && !useNpx && !localCliPath) {
    const tier = apiKey ? "pro" : "free";
    const args = [
      "--yes",
      "@vreko/cli",
      "mcp",
      "--stdio",
      "--tier",
      tier
    ];
    if (workspaceRoot) {
      args.push("--workspace", workspaceRoot);
    }
    return {
      command: "npx",
      args
    };
  }
  if (useSse || useStreamableHttp) {
    const url2 = serverUrl || "https://mcp.vreko.dev/mcp";
    const headers2 = {};
    if (workspaceId) {
      headers2["x-workspace-id"] = workspaceId;
    }
    if (apiKey) {
      headers2["x-api-key"] = apiKey;
    }
    return {
      url: url2,
      ...Object.keys(headers2).length > 0 && {
        headers: headers2
      }
    };
  }
  if (useDoppler && localCliPath) {
    const nodePath = resolveNodePath();
    const dopplerBase = [
      "run",
      "--project",
      dopplerProject,
      "--config",
      dopplerConfig,
      "--"
    ];
    const tier = apiKey ? "pro" : "free";
    const dopplerArgs = [
      ...dopplerBase,
      nodePath,
      localCliPath,
      "mcp",
      "--stdio",
      "--tier",
      tier
    ];
    if (workspaceRoot) {
      dopplerArgs.push("--workspace", workspaceRoot);
    }
    return {
      command: "doppler",
      args: dopplerArgs
    };
  }
  if (useNpx) {
    const tier = apiKey ? "pro" : "free";
    const args = [
      "--yes",
      "@vreko/cli",
      "mcp",
      "--stdio",
      "--tier",
      tier
    ];
    if (workspaceRoot) {
      args.push("--workspace", workspaceRoot);
    }
    return {
      command: "npx",
      args,
      ...Object.keys(env).length > 0 && {
        env
      }
    };
  }
  if (useLocalDev && localCliPath) {
    const tier = apiKey ? "pro" : "free";
    const args = [
      localCliPath,
      "mcp",
      "--stdio",
      "--tier",
      tier
    ];
    if (workspaceRoot) {
      args.push("--workspace", workspaceRoot);
    }
    const nodePath = resolveNodePath();
    return {
      command: nodePath,
      args,
      ...Object.keys(env).length > 0 && {
        env
      }
    };
  }
  if (useBinary) {
    const tier = apiKey ? "pro" : "free";
    const args = [
      "mcp",
      "--stdio",
      "--tier",
      tier
    ];
    if (workspaceRoot) {
      args.push("--workspace", workspaceRoot);
    }
    return {
      command: resolveVrekoBinaryPath(),
      args,
      ...Object.keys(env).length > 0 && {
        env
      }
    };
  }
  const url = serverUrl || "https://mcp.vreko.dev/mcp";
  const headers = {};
  if (workspaceId) {
    headers["x-workspace-id"] = workspaceId;
  }
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }
  return {
    url,
    ...Object.keys(headers).length > 0 && {
      headers
    }
  };
}
__name(getVrekoMCPConfig, "getVrekoMCPConfig");
__name2(getVrekoMCPConfig, "getVrekoMCPConfig");
function writeClientConfig(client, mcpConfig) {
  try {
    const configDir = dirname(client.configPath);
    mkdirSync(configDir, {
      recursive: true
    });
    let existingConfig = {
      mcpServers: {}
    };
    let hasExistingConfig = false;
    if (existsSync(client.configPath)) {
      try {
        const content = readFileSync(client.configPath, "utf-8");
        existingConfig = JSON.parse(content);
        hasExistingConfig = Object.keys(existingConfig).length > 0;
      } catch {
      }
    }
    let backup;
    if (hasExistingConfig) {
      backup = `${client.configPath}.backup.${Date.now()}`;
      writeFileSync(backup, JSON.stringify(existingConfig, null, 2));
    }
    const newConfig = mergeConfig(existingConfig, mcpConfig, client.format);
    writeFileSync(client.configPath, JSON.stringify(newConfig, null, 2));
    return {
      success: true,
      backup
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
__name(writeClientConfig, "writeClientConfig");
__name2(writeClientConfig, "writeClientConfig");
function removeVrekoConfig(client) {
  try {
    if (!existsSync(client.configPath)) {
      return {
        success: true
      };
    }
    const content = readFileSync(client.configPath, "utf-8");
    const config = JSON.parse(content);
    switch (client.format) {
      case "claude":
      case "cursor":
      case "windsurf":
      case "cline":
      case "roo-code":
      case "gemini":
      case "claude-code":
      case "qoder": {
        for (const key of Object.keys(config.mcpServers ?? {})) {
          if (isVrekoServerName2(key, client.format)) {
            delete config.mcpServers[key];
          }
        }
        break;
      }
      case "vscode": {
        const vscodeConfig = config;
        const servers = vscodeConfig.servers;
        for (const key of Object.keys(servers ?? {})) {
          if (servers && isVrekoServerName2(key, client.format)) {
            delete servers[key];
          }
        }
        break;
      }
      case "zed": {
        const zedConfig = config;
        const contextServers = zedConfig.context_servers;
        for (const key of Object.keys(contextServers ?? {})) {
          if (contextServers && isVrekoServerName2(key, client.format)) {
            delete contextServers[key];
          }
        }
        break;
      }
      case "continue": {
        const experimental = config.experimental;
        if (experimental?.modelContextProtocolServers) {
          const servers = experimental.modelContextProtocolServers;
          experimental.modelContextProtocolServers = servers.filter((s) => !isVrekoServerName2(s.name, "continue"));
        }
        break;
      }
    }
    writeFileSync(client.configPath, JSON.stringify(config, null, 2));
    evictCachedPath(client.name);
    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
__name(removeVrekoConfig, "removeVrekoConfig");
__name2(removeVrekoConfig, "removeVrekoConfig");
function getServerKey(client) {
  if (!client) {
    return "vreko";
  }
  return `vreko-${client}`;
}
__name(getServerKey, "getServerKey");
__name2(getServerKey, "getServerKey");
function isVrekoServerName2(name, client) {
  const serverKey = getServerKey(client);
  return name === serverKey || name === "vreko" || name.startsWith("vreko-");
}
__name(isVrekoServerName2, "isVrekoServerName2");
__name2(isVrekoServerName2, "isVrekoServerName");
function mergeConfig(existing, vrekoConfig, format) {
  const serverKey = getServerKey(format);
  switch (format) {
    case "claude":
    case "cursor":
    case "cline":
    case "roo-code":
    case "gemini":
    case "claude-code":
      return {
        ...existing,
        mcpServers: {
          ...existing.mcpServers || {},
          [serverKey]: vrekoConfig
        }
      };
    case "windsurf":
      return {
        ...existing,
        mcpServers: {
          ...existing.mcpServers || {},
          [serverKey]: {
            ...vrekoConfig,
            disabled: false,
            alwaysAllow: []
          }
        }
      };
    case "qoder": {
      let qoderType;
      if (vrekoConfig.url) {
        const isLocal = vrekoConfig.url.startsWith("http://localhost") || vrekoConfig.url.startsWith("http://127.0.0.1");
        qoderType = isLocal ? "sse" : "http";
      } else {
        qoderType = "stdio";
      }
      return {
        ...existing,
        mcpServers: {
          ...existing.mcpServers || {},
          [serverKey]: {
            type: qoderType,
            ...vrekoConfig
          }
        }
      };
    }
    case "vscode": {
      const vscodeConfig = existing;
      const servers = vscodeConfig.servers || {};
      const { mcpServers: _, ...rest } = vscodeConfig;
      return {
        ...rest,
        servers: {
          ...servers,
          [serverKey]: {
            type: "stdio",
            ...vrekoConfig
          }
        }
      };
    }
    case "zed": {
      const zedConfig = existing;
      const contextServers = zedConfig.context_servers || {};
      const { mcpServers: _, ...rest } = zedConfig;
      return {
        ...rest,
        context_servers: {
          ...contextServers,
          [serverKey]: vrekoConfig
        }
      };
    }
    case "continue": {
      const continueConfig = existing;
      const experimental = continueConfig.experimental || {};
      const servers = experimental.modelContextProtocolServers || [];
      const filteredServers = servers.filter((s) => {
        const name = s.name;
        return !name?.startsWith("vreko");
      });
      filteredServers.push({
        name: serverKey,
        ...vrekoConfig
      });
      return {
        ...continueConfig,
        experimental: {
          ...experimental,
          modelContextProtocolServers: filteredServers
        }
      };
    }
    case "aider":
      return existing;
    default:
      return {
        ...existing,
        mcpServers: {
          ...existing.mcpServers || {},
          [serverKey]: vrekoConfig
        }
      };
  }
}
__name(mergeConfig, "mergeConfig");
__name2(mergeConfig, "mergeConfig");
function patchApiKeyInClientConfig(client, apiKey) {
  try {
    if (!existsSync(client.configPath)) {
      return false;
    }
    const raw = readFileSync(client.configPath, "utf-8");
    const config = JSON.parse(raw);
    let patched = false;
    const patchEntry = /* @__PURE__ */ __name2((entry) => {
      if (typeof entry !== "object" || entry === null) {
        return false;
      }
      const e = entry;
      if (e.url && typeof e.url === "string") {
        if (!e.headers || typeof e.headers !== "object") {
          e.headers = {};
        }
        e.headers["x-api-key"] = apiKey;
        const headers = e.headers;
        if (headers.Authorization?.includes("<your-token>")) {
          delete headers.Authorization;
        }
        return true;
      }
      if (!e.env || typeof e.env !== "object") {
        e.env = {};
      }
      e.env.VREKO_API_KEY = apiKey;
      return true;
    }, "patchEntry");
    switch (client.format) {
      case "claude":
      case "cursor":
      case "windsurf":
      case "cline":
      case "roo-code":
      case "gemini":
      case "claude-code": {
        const servers = config.mcpServers || {};
        for (const [name, entry] of Object.entries(servers)) {
          if (isVrekoServerName2(name, client.format)) {
            patched = patchEntry(entry) || patched;
          }
        }
        break;
      }
      case "qoder": {
        const servers = config.mcpServers || {};
        for (const [name, entry] of Object.entries(servers)) {
          if (isVrekoServerName2(name, client.format)) {
            patched = patchEntry(entry) || patched;
          }
        }
        break;
      }
      case "vscode": {
        const servers = config.servers || {};
        for (const [name, entry] of Object.entries(servers)) {
          if (isVrekoServerName2(name, client.format)) {
            patched = patchEntry(entry) || patched;
          }
        }
        break;
      }
      case "zed": {
        const servers = config.context_servers || {};
        for (const [name, entry] of Object.entries(servers)) {
          if (isVrekoServerName2(name, client.format)) {
            patched = patchEntry(entry) || patched;
          }
        }
        break;
      }
      case "continue": {
        const exp = config.experimental || {};
        const list = exp.modelContextProtocolServers || [];
        for (const item of list) {
          if (typeof item.name === "string" && isVrekoServerName2(item.name, "continue")) {
            patched = patchEntry(item) || patched;
          }
        }
        break;
      }
    }
    if (patched) {
      writeFileSync(client.configPath, JSON.stringify(config, null, 2));
    }
    return patched;
  } catch {
    return false;
  }
}
__name(patchApiKeyInClientConfig, "patchApiKeyInClientConfig");
__name2(patchApiKeyInClientConfig, "patchApiKeyInClientConfig");
function validateConfig(client) {
  try {
    const content = readFileSync(client.configPath, "utf-8");
    const config = JSON.parse(content);
    switch (client.format) {
      case "claude":
      case "cursor":
      case "windsurf":
      case "cline":
      case "roo-code":
      case "gemini":
      case "claude-code":
      case "qoder": {
        const servers = config.mcpServers ?? {};
        return Object.entries(servers).some(([name, serverConfig]) => isVrekoServerName2(name, client.format) && typeof serverConfig === "object" && serverConfig !== null && Boolean(serverConfig.command || serverConfig.url));
      }
      case "vscode": {
        const vscodeConfig = config;
        const servers = vscodeConfig.servers;
        return Boolean(Object.entries(servers ?? {}).some(([name, serverConfig]) => isVrekoServerName2(name, client.format) && typeof serverConfig === "object" && serverConfig !== null && Boolean(serverConfig.command || serverConfig.url)));
      }
      case "zed": {
        const zedConfig = config;
        const contextServers = zedConfig.context_servers;
        return Boolean(Object.entries(contextServers ?? {}).some(([name, serverConfig]) => isVrekoServerName2(name, client.format) && typeof serverConfig === "object" && serverConfig !== null && Boolean(serverConfig.command || serverConfig.url)));
      }
      case "continue": {
        const expCfg = config.experimental;
        const srvs = expCfg?.modelContextProtocolServers;
        return Boolean(srvs?.some((s) => isVrekoServerName2(s.name, "continue") && (s.command || s.url)));
      }
      case "aider":
        return false;
      default:
        return false;
    }
  } catch {
    return false;
  }
}
__name(validateConfig, "validateConfig");
__name2(validateConfig, "validateConfig");
function repairClientConfig(client, options = {}) {
  const fixed = [];
  const remaining = [];
  const validation = validateClientConfig(client);
  if (options.force) {
    return performFullReconfiguration(client, options);
  }
  if (validation.valid && validation.issues.length === 0) {
    return {
      success: true,
      fixed: [],
      remaining: []
    };
  }
  for (const issue of validation.issues) {
    const fixResult = attemptFix(client, issue, validation, options);
    if (fixResult.success) {
      fixed.push(issue.message);
    } else {
      remaining.push(issue.message);
    }
  }
  const hasCriticalErrors = remaining.some((msg) => validation.issues.find((i) => i.message === msg && i.severity === "error"));
  if (hasCriticalErrors) {
    return performFullReconfiguration(client, options);
  }
  return {
    success: remaining.length === 0,
    fixed,
    remaining
  };
}
__name(repairClientConfig, "repairClientConfig");
__name2(repairClientConfig, "repairClientConfig");
function injectWorkspacePath(client, workspaceRoot) {
  const fixed = [];
  const remaining = [];
  const detectedWorkspace = workspaceRoot || detectWorkspaceRoot(process.cwd());
  if (!detectedWorkspace) {
    return {
      success: false,
      fixed,
      remaining: [
        "Could not auto-detect workspace root"
      ],
      error: "No workspace markers found (.git, package.json, .vreko)"
    };
  }
  if (!existsSync(detectedWorkspace)) {
    return {
      success: false,
      fixed,
      remaining: [
        `Workspace path does not exist: ${detectedWorkspace}`
      ],
      error: "Invalid workspace path"
    };
  }
  const validation = validateClientConfig(client);
  if (!validation.config) {
    return {
      success: false,
      fixed,
      remaining: [
        "No existing Vreko config found"
      ],
      error: "Must run initial configuration first"
    };
  }
  if (!validation.config.command) {
    return {
      success: true,
      fixed: [
        "Config uses HTTP transport - no workspace path needed"
      ],
      remaining: []
    };
  }
  const hasWorkspace = validation.config.args?.includes("--workspace");
  if (hasWorkspace) {
    fixed.push("Workspace path already configured");
    return {
      success: true,
      fixed,
      remaining
    };
  }
  const result = performFullReconfiguration(client, {
    workspaceRoot: detectedWorkspace
  });
  if (result.success) {
    fixed.push(`Injected workspace path: ${detectedWorkspace}`);
  }
  return {
    success: result.success,
    fixed,
    remaining
  };
}
__name(injectWorkspacePath, "injectWorkspacePath");
__name2(injectWorkspacePath, "injectWorkspacePath");
function attemptFix(client, issue, _validation, options) {
  switch (issue.code) {
    case "CONFIG_NOT_FOUND":
    case "CONFIG_PARSE_ERROR":
    case "VREKO_NOT_CONFIGURED":
    case "MISSING_COMMAND_OR_URL":
    case "MISSING_ARGS":
    case "MISSING_MCP_ARG":
    case "MISSING_STDIO_ARG":
    case "DEPRECATED_SHIM_COMMAND":
    case "INVALID_URL":
      return performFullReconfiguration(client, options);
    case "COMMAND_NOT_EXECUTABLE": {
      return performFullReconfiguration(client, options);
    }
    case "CLI_PATH_NOT_FOUND": {
      const cliPath = findCliPath();
      if (cliPath) {
        return performFullReconfiguration(client, options);
      }
      return {
        success: false
      };
    }
    case "MISSING_WORKSPACE_ARG": {
      const workspace = options.workspaceRoot || detectWorkspaceRoot(process.cwd());
      if (workspace) {
        return performFullReconfiguration(client, {
          ...options,
          workspaceRoot: workspace
        });
      }
      return {
        success: false
      };
    }
    case "WORKSPACE_NOT_FOUND": {
      const detected = detectWorkspaceRoot(process.cwd());
      if (detected) {
        return performFullReconfiguration(client, {
          ...options,
          workspaceRoot: detected
        });
      }
      return {
        success: false
      };
    }
    case "WORKSPACE_NO_MARKERS":
      return {
        success: true
      };
    case "NO_AUTH":
      return {
        success: true
      };
    default:
      return {
        success: false
      };
  }
}
__name(attemptFix, "attemptFix");
__name2(attemptFix, "attemptFix");
function performFullReconfiguration(client, options) {
  try {
    const workspaceRoot = options.workspaceRoot || detectWorkspaceRoot(process.cwd());
    const cliPath = findCliPath();
    let mcpConfig;
    if (cliPath && workspaceRoot) {
      mcpConfig = getVrekoMCPConfig({
        apiKey: options.apiKey,
        workspaceId: options.workspaceId,
        workspaceRoot,
        useLocalDev: true,
        localCliPath: cliPath,
        client: client.format
      });
      const _nodePath = resolveNodePath();
    } else {
      mcpConfig = getVrekoMCPConfig({
        apiKey: options.apiKey,
        workspaceId: options.workspaceId,
        useLocalDev: false,
        client: client.format
      });
    }
    const writeResult = writeClientConfig(client, mcpConfig);
    if (writeResult.success) {
      return {
        success: true,
        fixed: [
          "Full reconfiguration completed (node path resolved)"
        ],
        remaining: []
      };
    }
    return {
      success: false,
      fixed: [],
      remaining: [
        "Write failed"
      ],
      error: writeResult.error
    };
  } catch (error) {
    return {
      success: false,
      fixed: [],
      remaining: [
        "Reconfiguration failed"
      ],
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
__name(performFullReconfiguration, "performFullReconfiguration");
__name2(performFullReconfiguration, "performFullReconfiguration");
function detectWorkspaceRoot(startPath) {
  let currentPath = resolve(startPath);
  const maxIterations = 50;
  let iterations = 0;
  while (iterations < maxIterations) {
    iterations++;
    const hasGit = existsSync(resolve(currentPath, ".git"));
    const hasPackageJson = existsSync(resolve(currentPath, "package.json"));
    const hasVreko = existsSync(resolve(currentPath, ".vreko"));
    if (hasGit || hasPackageJson || hasVreko) {
      return currentPath;
    }
    const parent = resolve(currentPath, "..");
    if (parent === currentPath) {
      break;
    }
    currentPath = parent;
  }
  return null;
}
__name(detectWorkspaceRoot, "detectWorkspaceRoot");
__name2(detectWorkspaceRoot, "detectWorkspaceRoot");
function findCliPath() {
  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, "apps/cli/dist/index.js"),
    resolve(cwd, "dist/index.js"),
    resolve(cwd, "../cli/dist/index.js"),
    resolve(cwd, "../../apps/cli/dist/index.js")
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      return path;
    }
  }
  return void 0;
}
__name(findCliPath, "findCliPath");
__name2(findCliPath, "findCliPath");

export { createManagedMetadata, detectAIClients, detectMCPProcesses, detectWorkspaceConfig, evictCachedPath, getAllCachedPaths, getCachedPath, getClient, getClientConfigPath, getConfigDirWithMigration, getConfiguredClients, getOrCreateIdentity, getServerKey, getVrekoConfigDir, getVrekoMCPConfig, injectWorkspacePath, isCommandExecutable2, isOwnedByThisInstall, isVrekoMCPRunning, patchApiKeyInClientConfig, readClientConfig, removeVrekoConfig, repairClientConfig, resetIdentityCache, resolveNodePath, resolveVrekoBinaryPath, setCachedPath, validateClientConfig, validateConfig, validateWorkspacePath, writeClientConfig };
//# sourceMappingURL=chunk-MJVY2XUN.js.map
//# sourceMappingURL=chunk-MJVY2XUN.js.map