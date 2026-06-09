#!/usr/bin/env node
import { __name } from './chunk-EWOJGXRX.js';
import { mkdir, writeFile, access, constants, readFile, appendFile, stat } from 'fs/promises';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { z } from 'zod';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';
var VREKO_DIR = ".vreko";
var GLOBAL_VREKO_DIR = ".vreko";
var WorkspaceConfigSchema = z.object({
  workspaceId: z.string().optional(),
  tier: z.enum([
    "free",
    "pro"
  ]).optional(),
  protectionLevel: z.enum([
    "standard",
    "strict"
  ]).optional(),
  syncEnabled: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
var WorkspaceVitalsSchema = z.object({
  framework: z.string().optional(),
  frameworkConfidence: z.number().optional(),
  packageManager: z.enum([
    "npm",
    "pnpm",
    "yarn",
    "bun"
  ]).optional(),
  typescript: z.object({
    enabled: z.boolean(),
    strict: z.boolean().optional(),
    version: z.string().optional()
  }).optional(),
  criticalFiles: z.array(z.string()).optional(),
  detectedAt: z.string()
});
var ProtectedFileSchema = z.object({
  pattern: z.string(),
  addedAt: z.string(),
  reason: z.string().optional()
});
var SessionStateSchema = z.object({
  id: z.string(),
  task: z.string().optional(),
  startedAt: z.string(),
  snapshotCount: z.number(),
  filesModified: z.number().optional(),
  state: z.enum([
    "active",
    "ended"
  ]).optional(),
  active: z.boolean().optional()
});
var LearningEntrySchema = z.object({
  id: z.string(),
  type: z.enum([
    "pattern",
    "pitfall",
    "efficiency",
    "discovery",
    "workflow"
  ]),
  trigger: z.string(),
  action: z.string(),
  source: z.string(),
  createdAt: z.string()
});
var ViolationEntrySchema = z.object({
  type: z.string(),
  file: z.string(),
  message: z.string(),
  count: z.number().optional(),
  date: z.string(),
  prevention: z.string().optional()
});
var GlobalCredentialsSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  email: z.string(),
  tier: z.enum([
    "free",
    "pro"
  ]),
  expiresAt: z.string().optional()
});
var GlobalConfigSchema = z.object({
  apiUrl: z.string().optional(),
  defaultWorkspace: z.string().optional(),
  analytics: z.boolean().optional()
});
function getGlobalDir() {
  return join(homedir(), GLOBAL_VREKO_DIR);
}
__name(getGlobalDir, "getGlobalDir");
function getWorkspaceDir(workspaceRoot) {
  return join(workspaceRoot || process.cwd(), VREKO_DIR);
}
__name(getWorkspaceDir, "getWorkspaceDir");
function getGlobalPath(relativePath) {
  return join(getGlobalDir(), relativePath);
}
__name(getGlobalPath, "getGlobalPath");
function getWorkspacePath(relativePath, workspaceRoot) {
  return join(getWorkspaceDir(workspaceRoot), relativePath);
}
__name(getWorkspacePath, "getWorkspacePath");
async function createVrekoDirectory(workspaceRoot) {
  const baseDir = getWorkspaceDir(workspaceRoot);
  const dirs = [
    "",
    "patterns",
    "learnings",
    "session",
    "snapshots"
  ];
  for (const dir of dirs) {
    await mkdir(join(baseDir, dir), {
      recursive: true
    });
  }
  const gitignore = `# Vreko Directory
# Ignore snapshot content (large binary data)
snapshots/
embeddings.db

# Keep these for team sharing
!patterns/
!learnings/
!vitals.json
!config.json
!protected.json
`.trim();
  await writeFile(join(baseDir, ".gitignore"), gitignore);
}
__name(createVrekoDirectory, "createVrekoDirectory");
async function createGlobalDirectory() {
  const baseDir = getGlobalDir();
  const dirs = [
    "",
    "cache",
    "mcp-configs"
  ];
  for (const dir of dirs) {
    await mkdir(join(baseDir, dir), {
      recursive: true
    });
  }
}
__name(createGlobalDirectory, "createGlobalDirectory");
async function isVrekoInitialized(workspaceRoot) {
  try {
    const dirPath = getWorkspaceDir(workspaceRoot);
    await access(dirPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
__name(isVrekoInitialized, "isVrekoInitialized");
async function isLoggedIn() {
  try {
    const credentials = await getCredentials();
    if (!credentials?.accessToken) {
      return false;
    }
    if (credentials.expiresAt) {
      const expiresAt = new Date(credentials.expiresAt);
      if (expiresAt < /* @__PURE__ */ new Date()) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
__name(isLoggedIn, "isLoggedIn");
async function readVrekoJson(relativePath, workspaceRoot) {
  try {
    const content = await readFile(getWorkspacePath(relativePath, workspaceRoot), "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
__name(readVrekoJson, "readVrekoJson");
async function writeVrekoJson(relativePath, data, workspaceRoot) {
  const fullPath = getWorkspacePath(relativePath, workspaceRoot);
  await mkdir(dirname(fullPath), {
    recursive: true
  });
  await writeFile(fullPath, JSON.stringify(data, null, 2));
}
__name(writeVrekoJson, "writeVrekoJson");
async function appendVrekoJsonl(relativePath, data, workspaceRoot) {
  const fullPath = getWorkspacePath(relativePath, workspaceRoot);
  await mkdir(dirname(fullPath), {
    recursive: true
  });
  await appendFile(fullPath, `${JSON.stringify(data)}
`);
}
__name(appendVrekoJsonl, "appendVrekoJsonl");
async function loadVrekoJsonl(relativePath, workspaceRoot) {
  try {
    const content = await readFile(getWorkspacePath(relativePath, workspaceRoot), "utf-8");
    return content.split("\n").filter((line) => line.trim()).map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}
__name(loadVrekoJsonl, "loadVrekoJsonl");
async function readGlobalJson(relativePath) {
  try {
    const content = await readFile(getGlobalPath(relativePath), "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
__name(readGlobalJson, "readGlobalJson");
async function writeGlobalJson(relativePath, data, mode) {
  const fullPath = getGlobalPath(relativePath);
  await mkdir(dirname(fullPath), {
    recursive: true
  });
  await writeFile(fullPath, JSON.stringify(data, null, 2), mode !== void 0 ? {
    mode
  } : void 0);
}
__name(writeGlobalJson, "writeGlobalJson");
async function deleteGlobalJson(relativePath) {
  const fullPath = getGlobalPath(relativePath);
  try {
    const { unlink } = await import('fs/promises');
    await unlink(fullPath);
  } catch {
  }
}
__name(deleteGlobalJson, "deleteGlobalJson");
async function getWorkspaceConfig(workspaceRoot) {
  const data = await readVrekoJson("config.json", workspaceRoot);
  if (!data) {
    return null;
  }
  const result = WorkspaceConfigSchema.safeParse(data);
  return result.success ? result.data : null;
}
__name(getWorkspaceConfig, "getWorkspaceConfig");
async function saveWorkspaceConfig(config, workspaceRoot) {
  await writeVrekoJson("config.json", config, workspaceRoot);
}
__name(saveWorkspaceConfig, "saveWorkspaceConfig");
async function getWorkspaceVitals(workspaceRoot) {
  const data = await readVrekoJson("vitals.json", workspaceRoot);
  if (!data) {
    return null;
  }
  const result = WorkspaceVitalsSchema.safeParse(data);
  return result.success ? result.data : null;
}
__name(getWorkspaceVitals, "getWorkspaceVitals");
async function saveWorkspaceVitals(vitals, workspaceRoot) {
  await writeVrekoJson("vitals.json", vitals, workspaceRoot);
}
__name(saveWorkspaceVitals, "saveWorkspaceVitals");
async function getProtectedFiles(workspaceRoot) {
  const data = await readVrekoJson("protected.json", workspaceRoot);
  if (!data) {
    return [];
  }
  const result = z.array(ProtectedFileSchema).safeParse(data);
  return result.success ? result.data : [];
}
__name(getProtectedFiles, "getProtectedFiles");
async function saveProtectedFiles(files, workspaceRoot) {
  await writeVrekoJson("protected.json", files, workspaceRoot);
}
__name(saveProtectedFiles, "saveProtectedFiles");
async function getCurrentSession(workspaceRoot) {
  const data = await readVrekoJson("session/current.json", workspaceRoot);
  if (!data) {
    return null;
  }
  const result = SessionStateSchema.safeParse(data);
  return result.success ? result.data : null;
}
__name(getCurrentSession, "getCurrentSession");
async function saveCurrentSession(session, workspaceRoot) {
  await writeVrekoJson("session/current.json", session, workspaceRoot);
}
__name(saveCurrentSession, "saveCurrentSession");
async function endCurrentSession(workspaceRoot) {
  const fullPath = getWorkspacePath("session/current.json", workspaceRoot);
  try {
    const { unlink } = await import('fs/promises');
    await unlink(fullPath);
  } catch {
  }
}
__name(endCurrentSession, "endCurrentSession");
async function recordLearning(learning, workspaceRoot) {
  await appendVrekoJsonl("learnings/user-learnings.jsonl", learning, workspaceRoot);
}
__name(recordLearning, "recordLearning");
async function getLearnings(workspaceRoot) {
  const data = await loadVrekoJsonl("learnings/user-learnings.jsonl", workspaceRoot);
  return data.filter((item) => LearningEntrySchema.safeParse(item).success);
}
__name(getLearnings, "getLearnings");
async function recordViolation(violation, workspaceRoot) {
  await appendVrekoJsonl("patterns/violations.jsonl", violation, workspaceRoot);
}
__name(recordViolation, "recordViolation");
async function getViolations(workspaceRoot) {
  const data = await loadVrekoJsonl("patterns/violations.jsonl", workspaceRoot);
  return data.filter((item) => ViolationEntrySchema.safeParse(item).success);
}
__name(getViolations, "getViolations");
async function getCredentials() {
  try {
    const { getCredentialsSecure } = await import('./secure-credentials-JXWAQLS2.js');
    return await getCredentialsSecure();
  } catch {
    return readGlobalJson("credentials.json");
  }
}
__name(getCredentials, "getCredentials");
async function saveCredentials(credentials) {
  try {
    const { saveCredentialsSecure, getSecureCredentials } = await import('./secure-credentials-JXWAQLS2.js');
    await saveCredentialsSecure(credentials);
    const providerName = getSecureCredentials().getProviderName();
    const backend = providerName.includes("keytar") || providerName.includes("keychain") ? "keychain" : "encrypted-file";
    return {
      backend,
      secure: true
    };
  } catch (error) {
    const downgradeReason = error instanceof Error ? error.message : String(error);
    await createGlobalDirectory();
    await writeGlobalJson("credentials.json", credentials, 384);
    return {
      backend: "plaintext-file",
      secure: false,
      downgradeReason
    };
  }
}
__name(saveCredentials, "saveCredentials");
async function clearCredentials() {
  try {
    const { clearCredentialsSecure } = await import('./secure-credentials-JXWAQLS2.js');
    return await clearCredentialsSecure();
  } catch {
    await deleteGlobalJson("credentials.json");
  }
}
__name(clearCredentials, "clearCredentials");
async function getGlobalConfig() {
  const data = await readGlobalJson("config.json");
  if (!data) {
    return null;
  }
  const result = GlobalConfigSchema.safeParse(data);
  return result.success ? result.data : null;
}
__name(getGlobalConfig, "getGlobalConfig");
async function saveGlobalConfig(config) {
  await createGlobalDirectory();
  await writeGlobalJson("config.json", config);
}
__name(saveGlobalConfig, "saveGlobalConfig");
async function saveBenchmarkOptIn(optedIn) {
  await createGlobalDirectory();
  let existing = {};
  try {
    const raw = await readGlobalJson("config.json");
    if (raw !== null) {
      existing = raw;
    }
  } catch {
  }
  existing.benchmarks = {
    ...existing.benchmarks ?? {},
    optIn: optedIn
  };
  await writeGlobalJson("config.json", existing);
}
__name(saveBenchmarkOptIn, "saveBenchmarkOptIn");
async function findWorkspaceRoot(startDir) {
  let currentDir = startDir || process.cwd();
  const maxDepth = 10;
  let depth = 0;
  while (depth < maxDepth) {
    try {
      await access(join(currentDir, VREKO_DIR), constants.F_OK);
      return currentDir;
    } catch {
    }
    try {
      await access(join(currentDir, "package.json"), constants.F_OK);
      return currentDir;
    } catch {
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
    depth++;
  }
  return null;
}
__name(findWorkspaceRoot, "findWorkspaceRoot");
async function pathExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
__name(pathExists, "pathExists");
async function getStats(path) {
  try {
    const stats = await stat(path);
    return {
      size: stats.size,
      modifiedAt: stats.mtime
    };
  } catch {
    return null;
  }
}
__name(getStats, "getStats");

export { GlobalConfigSchema, GlobalCredentialsSchema, LearningEntrySchema, ProtectedFileSchema, SessionStateSchema, ViolationEntrySchema, WorkspaceConfigSchema, WorkspaceVitalsSchema, appendVrekoJsonl, clearCredentials, createGlobalDirectory, createVrekoDirectory, deleteGlobalJson, endCurrentSession, findWorkspaceRoot, getCredentials, getCurrentSession, getGlobalConfig, getGlobalDir, getGlobalPath, getLearnings, getProtectedFiles, getStats, getViolations, getWorkspaceConfig, getWorkspaceDir, getWorkspacePath, getWorkspaceVitals, isLoggedIn, isVrekoInitialized, loadVrekoJsonl, pathExists, readGlobalJson, readVrekoJson, recordLearning, recordViolation, saveBenchmarkOptIn, saveCredentials, saveCurrentSession, saveGlobalConfig, saveProtectedFiles, saveWorkspaceConfig, saveWorkspaceVitals, writeGlobalJson, writeVrekoJson };
//# sourceMappingURL=chunk-HFQHU5LC.js.map
//# sourceMappingURL=chunk-HFQHU5LC.js.map