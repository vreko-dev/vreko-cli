#!/usr/bin/env node
import { __name, __require } from './chunk-EWOJGXRX.js';
import { EventEmitter } from 'events';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';
var __defProp = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp(target, "name", {
  value,
  configurable: true
}), "__name");
var __require2 = /* @__PURE__ */ ((x) => typeof __require !== "undefined" ? __require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: /* @__PURE__ */ __name((a, b) => (typeof __require !== "undefined" ? __require : a)[b], "get")
}) : x)(function(x) {
  if (typeof __require !== "undefined") return __require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var DiscoveryEmitter = class extends EventEmitter {
  static {
    __name(this, "DiscoveryEmitter");
  }
  static {
    __name2(this, "DiscoveryEmitter");
  }
  emitDiscovery(discovery) {
    if (discovery.confidence > 0.85) {
      this.emit("discovery", discovery);
    }
  }
};
function createDiscoveryEmitter() {
  return new DiscoveryEmitter();
}
__name(createDiscoveryEmitter, "createDiscoveryEmitter");
__name2(createDiscoveryEmitter, "createDiscoveryEmitter");
var execFileAsync = promisify(execFile);
var ARTIFACT_BASENAMES = /* @__PURE__ */ new Set([
  "pnpm-lock.yaml",
  "yarn.lock",
  "package-lock.json",
  "bun.lockb",
  "Gemfile.lock",
  "Cargo.lock",
  "poetry.lock",
  "go.sum",
  "composer.lock",
  "package.json",
  "apple-touch-icon.png",
  "favicon.ico",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "icon-192.png",
  "icon-512.png"
]);
var ARTIFACT_BUILD_SEGMENTS = /* @__PURE__ */ new Set([
  "dist",
  ".next",
  "__generated__",
  ".turbo",
  ".cache"
]);
function isArtifactFile(filePath) {
  const parts = filePath.split("/");
  const basename = parts[parts.length - 1];
  if (ARTIFACT_BASENAMES.has(basename)) {
    return true;
  }
  if (basename.endsWith(".d.ts") || basename.endsWith(".gen.ts") || basename.endsWith(".generated.ts") || basename.endsWith(".gen.js") || basename.endsWith(".generated.js") || basename.endsWith(".min.js") || basename.endsWith(".min.css")) {
    return true;
  }
  if (basename.endsWith(".png") || basename.endsWith(".ico") || basename.endsWith(".jpg") || basename.endsWith(".jpeg") || basename.endsWith(".svg") || basename.endsWith(".gif") || basename.endsWith(".webp")) {
    return true;
  }
  for (const segment of parts.slice(0, -1)) {
    if (ARTIFACT_BUILD_SEGMENTS.has(segment)) {
      return true;
    }
  }
  return false;
}
__name(isArtifactFile, "isArtifactFile");
__name2(isArtifactFile, "isArtifactFile");
function topLevelDir(filePath) {
  const parts = filePath.split("/");
  return parts.length > 1 ? parts[0] : ".";
}
__name(topLevelDir, "topLevelDir");
__name2(topLevelDir, "topLevelDir");
function withinHours(a, b, hours) {
  return Math.abs(a.getTime() - b.getTime()) <= hours * 60 * 60 * 1e3;
}
__name(withinHours, "withinHours");
__name2(withinHours, "withinHours");
async function analyzeGitLog(repoPath, emitter) {
  const signals = {
    avgCommitsPerDay: 0,
    commitFrequencyVariance: 0,
    largeCommitRatio: 0,
    diffusion: {
      avgFilesTouchedPerCommit: 0,
      crossDirectoryDiffusionRate: 0,
      rollbackAdjacentCommitRate: 0,
      largeSessionClusterRate: 0,
      maxSingleCommitSpread: 0
    },
    rollbackCorrelation: {
      resetAfterLargeCommitRate: 0,
      resetAfterBranchSwitchRate: 0,
      resetAfterLateNightRate: 0,
      resetAfterCrossPackageRate: 0,
      branchSpecificRollbackDensity: /* @__PURE__ */ new Map(),
      medianTimeToRecovery: 0,
      topRecoveryTrigger: "large-commit"
    },
    fileChurnRanking: [],
    coChangeGraph: [],
    hotspotFiles: [],
    contributorCount: 0,
    busFactorEstimate: 0,
    mergeConflictFrequency: 0
  };
  try {
    const { stdout: logStdout } = await execFileAsync(
      "git",
      // --no-merges: merge commits produce empty numstat output  -  file changes
      // were already counted in the original feature commits, so merge commits
      // only add noise and cause fileChurnRanking to appear empty on repos with
      // dense merge-commit histories (e.g. large open-source monorepos on canary branches).
      //
      // Omit --all: scanning every ref (tags, remote branches) on large repos like
      // Next.js (~34k commits) exhausts the 10-second timeout and SIGTERM-kills the
      // child process, causing the catch block to swallow the error and return all-zero
      // signals. HEAD-reachable history is sufficient for behavioral intelligence  -  the
      // developer's active branch is what matters, not all historical branches.
      [
        "log",
        "--format=COMMIT:%H %aI %P|%s",
        "--numstat",
        "--no-merges",
        "-n",
        "10000"
      ],
      {
        cwd: repoPath,
        maxBuffer: 20 * 1024 * 1024,
        // 60 s: gives large monorepos (Next.js-scale, ~34k commits HEAD-reachable)
        // enough headroom while still bounding the scan. The scan result is cached
        // for 24 hours so a one-time 30-60s wait is acceptable on first run.
        timeout: 6e4
      }
    );
    const commits = parseLogOutput(logStdout);
    if (commits.length === 0) {
      return signals;
    }
    const dates = commits.map((c) => c.date.getTime()).sort((a, b) => a - b);
    const timeSpanMs = dates[dates.length - 1] - dates[0];
    const days = Math.max(timeSpanMs / (24 * 60 * 60 * 1e3), 1);
    signals.avgCommitsPerDay = commits.length / days;
    const commitsByDay = /* @__PURE__ */ new Map();
    for (const c of commits) {
      const dayKey = c.date.toISOString().slice(0, 10);
      commitsByDay.set(dayKey, (commitsByDay.get(dayKey) || 0) + 1);
    }
    const dailyCounts = [
      ...commitsByDay.values()
    ];
    const mean = dailyCounts.reduce((a, b) => a + b, 0) / Math.max(dailyCounts.length, 1);
    signals.commitFrequencyVariance = Math.sqrt(dailyCounts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / Math.max(dailyCounts.length, 1));
    const largeCommits = commits.filter((c) => c.files.length >= 10);
    signals.largeCommitRatio = largeCommits.length / commits.length * 100;
    signals.diffusion = computeDiffusion(commits);
    signals.rollbackCorrelation = computeRollbackCorrelation(commits);
    signals.fileChurnRanking = computeFileChurn(commits);
    signals.coChangeGraph = computeCoChangeGraph(commits);
    signals.hotspotFiles = signals.fileChurnRanking.filter((f) => f.revertCount > 0 || f.changeCount > 5).sort((a, b) => {
      const hasRevertA = a.revertCount > 0 ? 1 : 0;
      const hasRevertB = b.revertCount > 0 ? 1 : 0;
      if (hasRevertB !== hasRevertA) return hasRevertB - hasRevertA;
      if (a.revertCount > 0 && b.revertCount > 0) {
        return b.revertCount / b.changeCount - a.revertCount / a.changeCount;
      }
      return b.changeCount - a.changeCount;
    }).slice(0, 10).map((f) => f.path);
    const { stdout: shortlogOut } = await execFileAsync("git", [
      "shortlog",
      "-sn",
      "--all"
    ], {
      cwd: repoPath,
      maxBuffer: 1024 * 1024,
      timeout: 1e4
    });
    const contributors = shortlogOut.split("\n").filter(Boolean);
    signals.contributorCount = contributors.length;
    signals.busFactorEstimate = Math.max(1, Math.min(signals.contributorCount, Math.ceil(signals.contributorCount * 0.3)));
    const mergeCommits = commits.filter((c) => c.parentCount > 1);
    signals.mergeConflictFrequency = commits.length > 0 ? mergeCommits.length / commits.length * 100 : 0;
    if (emitter && signals.coChangeGraph.length > 0) {
      const topPair = signals.coChangeGraph[0];
      if (topPair.confidence > 0.9) {
        emitter.emit("discovery", {
          source: "gitlog",
          confidence: topPair.confidence,
          message: `${topPair.fileA} and ${topPair.fileB} change together ${Math.round(topPair.confidence * 100)}% of the time`,
          detailMessage: "Vreko will track this relationship",
          relatedInsightId: "co-change-instability"
        });
      }
    }
    if (emitter && signals.avgCommitsPerDay > 10) {
      emitter.emit("discovery", {
        source: "gitlog",
        confidence: 0.88,
        message: "High commit frequency detected",
        detailMessage: "Vreko can group these logically"
      });
    }
  } catch (_error) {
  }
  return signals;
}
__name(analyzeGitLog, "analyzeGitLog");
__name2(analyzeGitLog, "analyzeGitLog");
function parseLogOutput(stdout) {
  const commits = [];
  const lines = stdout.split("\n");
  let current = null;
  for (const line of lines) {
    if (line.startsWith("COMMIT:")) {
      if (current) {
        commits.push(current);
      }
      const rest = line.slice(7);
      const pipeIdx = rest.indexOf("|");
      if (pipeIdx === -1) {
        continue;
      }
      const metaPart = rest.slice(0, pipeIdx).trim();
      const subject = rest.slice(pipeIdx + 1);
      const parts = metaPart.split(/\s+/);
      if (parts.length < 2) {
        continue;
      }
      const sha = parts[0];
      const dateStr = parts[1];
      const parentHashes = parts.slice(2);
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) {
        continue;
      }
      current = {
        sha,
        date,
        parentCount: parentHashes.length,
        files: [],
        isRevert: subject.toLowerCase().startsWith("revert"),
        subject
      };
    } else if (current && line.trim()) {
      const parts = line.split("	");
      if (parts.length >= 3) {
        const added = parts[0] === "-" ? 0 : Number.parseInt(parts[0], 10) || 0;
        const deleted = parts[1] === "-" ? 0 : Number.parseInt(parts[1], 10) || 0;
        current.files.push({
          path: parts[2],
          added,
          deleted
        });
      }
    }
  }
  if (current) {
    commits.push(current);
  }
  return commits;
}
__name(parseLogOutput, "parseLogOutput");
__name2(parseLogOutput, "parseLogOutput");
function computeDiffusion(commits) {
  if (commits.length === 0) {
    return {
      avgFilesTouchedPerCommit: 0,
      crossDirectoryDiffusionRate: 0,
      rollbackAdjacentCommitRate: 0,
      largeSessionClusterRate: 0,
      maxSingleCommitSpread: 0
    };
  }
  const fileCounts = commits.map((c) => c.files.length);
  const avgFilesTouchedPerCommit = fileCounts.reduce((a, b) => a + b, 0) / commits.length;
  const crossDirCommits = commits.filter((c) => {
    const dirs = new Set(c.files.map((f) => topLevelDir(f.path)));
    return dirs.size >= 2;
  });
  const crossDirectoryDiffusionRate = crossDirCommits.length / commits.length * 100;
  let rollbackAdjacentCount = 0;
  const sortedByDate = [
    ...commits
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
  for (let i = 0; i < sortedByDate.length; i++) {
    for (let j = i + 1; j < sortedByDate.length; j++) {
      if (!withinHours(sortedByDate[i].date, sortedByDate[j].date, 6)) {
        break;
      }
      if (sortedByDate[j].isRevert) {
        rollbackAdjacentCount++;
        break;
      }
    }
  }
  const rollbackAdjacentCommitRate = rollbackAdjacentCount / commits.length * 100;
  let clusterCount = 0;
  for (let i = 0; i < sortedByDate.length; i++) {
    let windowEnd = i;
    while (windowEnd + 1 < sortedByDate.length && withinHours(sortedByDate[i].date, sortedByDate[windowEnd + 1].date, 2)) {
      windowEnd++;
    }
    if (windowEnd - i + 1 >= 5) {
      clusterCount++;
      i = windowEnd;
    }
  }
  const largeSessionClusterRate = clusterCount / Math.max(commits.length / 5, 1) * 100;
  const maxSingleCommitSpread = Math.max(...fileCounts, 0);
  return {
    avgFilesTouchedPerCommit,
    crossDirectoryDiffusionRate,
    rollbackAdjacentCommitRate,
    largeSessionClusterRate,
    maxSingleCommitSpread
  };
}
__name(computeDiffusion, "computeDiffusion");
__name2(computeDiffusion, "computeDiffusion");
function computeRollbackCorrelation(commits) {
  const result = {
    resetAfterLargeCommitRate: 0,
    resetAfterBranchSwitchRate: 0,
    resetAfterLateNightRate: 0,
    resetAfterCrossPackageRate: 0,
    branchSpecificRollbackDensity: /* @__PURE__ */ new Map(),
    medianTimeToRecovery: 0,
    topRecoveryTrigger: "large-commit"
  };
  const sorted = [
    ...commits
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
  const reverts = sorted.filter((c) => c.isRevert);
  if (reverts.length === 0) {
    return result;
  }
  let afterLargeCount = 0;
  let afterLateNightCount = 0;
  let afterCrossPackageCount = 0;
  const recoveryTimes = [];
  for (const revert of reverts) {
    const precedingIdx = sorted.findIndex((c) => c.sha === revert.sha) - 1;
    if (precedingIdx < 0) {
      continue;
    }
    for (let i = precedingIdx; i >= 0; i--) {
      const preceding = sorted[i];
      if (!withinHours(preceding.date, revert.date, 6)) {
        break;
      }
      const timeDiff = (revert.date.getTime() - preceding.date.getTime()) / (1e3 * 60);
      recoveryTimes.push(timeDiff);
      if (preceding.files.length >= 5) {
        afterLargeCount++;
      }
      if (preceding.date.getHours() >= 22 || preceding.date.getHours() < 5) {
        afterLateNightCount++;
      }
      const dirs = new Set(preceding.files.map((f) => topLevelDir(f.path)));
      if (dirs.size >= 2) {
        afterCrossPackageCount++;
      }
      break;
    }
  }
  const total = Math.max(reverts.length, 1);
  result.resetAfterLargeCommitRate = afterLargeCount / total * 100;
  result.resetAfterLateNightRate = afterLateNightCount / total * 100;
  result.resetAfterCrossPackageRate = afterCrossPackageCount / total * 100;
  if (recoveryTimes.length > 0) {
    recoveryTimes.sort((a, b) => a - b);
    const mid = Math.floor(recoveryTimes.length / 2);
    result.medianTimeToRecovery = recoveryTimes.length % 2 === 0 ? (recoveryTimes[mid - 1] + recoveryTimes[mid]) / 2 : recoveryTimes[mid];
  }
  const triggers = {
    "large-commit": afterLargeCount,
    "late-night": afterLateNightCount,
    "cross-package": afterCrossPackageCount,
    "branch-switch": 0
  };
  result.topRecoveryTrigger = Object.entries(triggers).sort((a, b) => b[1] - a[1])[0][0];
  return result;
}
__name(computeRollbackCorrelation, "computeRollbackCorrelation");
__name2(computeRollbackCorrelation, "computeRollbackCorrelation");
function computeFileChurn(commits) {
  const churnMap = /* @__PURE__ */ new Map();
  for (const commit of commits) {
    for (const file of commit.files) {
      if (isArtifactFile(file.path)) continue;
      const entry = churnMap.get(file.path) || {
        changeCount: 0,
        totalLines: 0,
        revertCount: 0,
        lastChanged: commit.date
      };
      entry.changeCount++;
      entry.totalLines += file.added + file.deleted;
      if (commit.isRevert) {
        entry.revertCount++;
      }
      if (commit.date > entry.lastChanged) {
        entry.lastChanged = commit.date;
      }
      churnMap.set(file.path, entry);
    }
  }
  return [
    ...churnMap.entries()
  ].map(([path, data]) => ({
    path,
    changeCount: data.changeCount,
    avgLinesChanged: data.changeCount > 0 ? data.totalLines / data.changeCount : 0,
    revertCount: data.revertCount,
    lastChanged: data.lastChanged.toISOString()
  })).sort((a, b) => b.changeCount - a.changeCount).slice(0, 50);
}
__name(computeFileChurn, "computeFileChurn");
__name2(computeFileChurn, "computeFileChurn");
function computeCoChangeGraph(commits) {
  const pairCounts = /* @__PURE__ */ new Map();
  const fileCounts = /* @__PURE__ */ new Map();
  for (const commit of commits) {
    const paths = commit.files.map((f) => f.path);
    for (const p of paths) {
      fileCounts.set(p, (fileCounts.get(p) || 0) + 1);
    }
    if (paths.length < 2 || paths.length > 20) {
      continue;
    }
    for (let i = 0; i < paths.length; i++) {
      for (let j = i + 1; j < paths.length; j++) {
        const key = [
          paths[i],
          paths[j]
        ].sort().join("|||");
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    }
  }
  const edges = [];
  for (const [key, count] of pairCounts) {
    if (count < 3) {
      continue;
    }
    const [fileA, fileB] = key.split("|||");
    if (isArtifactFile(fileA) && isArtifactFile(fileB)) {
      continue;
    }
    const maxChanges = Math.max(fileCounts.get(fileA) || 1, fileCounts.get(fileB) || 1);
    edges.push({
      fileA,
      fileB,
      coChangeCount: count,
      confidence: count / maxChanges
    });
  }
  return edges.sort((a, b) => b.confidence - a.confidence).slice(0, 20);
}
__name(computeCoChangeGraph, "computeCoChangeGraph");
__name2(computeCoChangeGraph, "computeCoChangeGraph");
function generateInsights(signals, baseline) {
  const insights = [];
  if (signals.reflog && signals.reflog.resetToHEADCount > 5) {
    const rc = signals.gitlog?.rollbackCorrelation;
    const correlationDetail = rc?.topRecoveryTrigger ? ` Most correlate with ${rc.topRecoveryTrigger.replace(/-/g, " ")} changes.` : "";
    const comparison = baseline ? `${(signals.reflog.resetToHEADCount / Math.max(baseline.baselines.avgResetToHEADRate, 1)).toFixed(1)}x the average for repos like yours` : void 0;
    insights.push({
      id: "high-reset-rate",
      severity: signals.reflog.resetToHEADCount > 15 ? "critical" : "warning",
      observation: `${signals.reflog.resetToHEADCount} recovery events in recent history`,
      whyItMatters: `Frequent resets indicate volatile development sessions.${correlationDetail}`,
      whatWeWillDo: "Increase snapshot density during high-diffusion sessions",
      comparison
    });
  }
  if (signals.gitlog) {
    const fragileFiles = signals.gitlog.fileChurnRanking.filter((f) => f.changeCount >= 20 && f.revertCount >= 3);
    for (const file of fragileFiles.slice(0, 2)) {
      const isWeaklyTested = signals.structure?.testAdjacency.weaklyTestedHotspots.some((h) => file.path.startsWith(h));
      insights.push({
        id: `fragile-hotspot-${file.path}`,
        severity: "warning",
        observation: `${file.path} changed ${file.changeCount}x, reverted ${file.revertCount}x${isWeaklyTested ? ". Weakly test-adjacent" : ""}`,
        whyItMatters: "High-churn files with reverts are the most likely to need recovery",
        whatWeWillDo: "Watch this file as a fragile hotspot with enhanced monitoring"
      });
    }
  }
  if (signals.gitlog && signals.gitlog.diffusion.crossDirectoryDiffusionRate > 30) {
    const rc = signals.gitlog.rollbackCorrelation;
    const comparison = baseline ? `${(signals.gitlog.diffusion.crossDirectoryDiffusionRate / Math.max(baseline.baselines.avgCrossDirectoryDiffusionRate, 1)).toFixed(1)}x the average` : void 0;
    insights.push({
      id: "cross-directory-blast",
      severity: "warning",
      observation: `${Math.round(signals.gitlog.diffusion.crossDirectoryDiffusionRate)}% of commits span multiple directories`,
      whyItMatters: `Wide-reaching changes are harder to roll back safely. ${rc.resetAfterCrossPackageRate > 10 ? `${Math.round(rc.resetAfterCrossPackageRate)}% of reverts follow cross-package changes.` : ""}`.trim(),
      whatWeWillDo: "Track cross-directory blast radius and auto-snapshot before high-diffusion commits",
      comparison
    });
  }
  if (signals.gitlog) {
    const strongPairs = signals.gitlog.coChangeGraph.filter((e) => e.confidence > 0.7);
    if (strongPairs.length > 0) {
      const top = strongPairs[0];
      insights.push({
        id: "co-change-instability",
        severity: "info",
        observation: `${top.fileA} and ${top.fileB} co-change at ${Math.round(top.confidence * 100)}% rate`,
        whyItMatters: "Tightly coupled files that change together may break if one is modified alone",
        whatWeWillDo: "Track co-change relationships and warn if one file changes without the other"
      });
    }
  }
  if (signals.reflog && signals.reflog.lateNightRatio > 0.2) {
    insights.push({
      id: "temporal-risk",
      severity: "notable",
      observation: `${Math.round(signals.reflog.lateNightRatio * 100)}% of activity occurs during late-night hours`,
      whyItMatters: "Late-night development sessions correlate with higher error rates",
      whatWeWillDo: "Increase snapshot frequency during late-night sessions"
    });
  }
  if (signals.structure) {
    const weakPackages = signals.structure.testAdjacency.packageTestAdjacency.filter((p) => p.churnScore > 2 && p.testRatio < 0.1);
    if (weakPackages.length > 0) {
      insights.push({
        id: "weak-test-adjacency",
        severity: "notable",
        observation: `${weakPackages.length} high-churn package(s) with minimal test coverage`,
        whyItMatters: "Code that changes frequently without tests is most likely to break unexpectedly",
        whatWeWillDo: "Prioritize snapshot protection for untested hotspots"
      });
    }
  }
  if (signals.reflog && signals.reflog.branchAbandonmentRate > 30) {
    insights.push({
      id: "branch-abandonment",
      severity: "info",
      observation: `${Math.round(signals.reflog.branchAbandonmentRate)}% of branches are never merged`,
      whyItMatters: "Abandoned branches may indicate experimental work that could benefit from snapshot protection",
      whatWeWillDo: "Track branch lifecycle patterns to identify recovery-prone experiments"
    });
  }
  if (signals.gitlog && signals.gitlog.busFactorEstimate < 2) {
    const singleAuthorFiles = signals.gitlog.fileChurnRanking.filter((f) => f.changeCount >= 10);
    if (singleAuthorFiles.length > 0) {
      insights.push({
        id: "bus-factor-risk",
        severity: "notable",
        observation: `Low bus factor: ${singleAuthorFiles.length} high-churn files maintained by a single contributor`,
        whyItMatters: "Single-contributor files are at higher risk if that contributor is unavailable",
        whatWeWillDo: "Enhanced snapshot protection for single-contributor hotspots"
      });
    }
  }
  if (baseline && signals.reflog) {
    if (signals.reflog.forceResetRate > baseline.baselines.avgForceResetRate * 1.5) {
      insights.push({
        id: "above-baseline-resets",
        severity: "info",
        observation: "Force reset rate above typical for your repo type",
        whyItMatters: "Higher-than-average reset frequency suggests more volatile workflows",
        whatWeWillDo: "Calibrate protection levels against aggregate baselines",
        comparison: `${(signals.reflog.forceResetRate / Math.max(baseline.baselines.avgForceResetRate, 0.1)).toFixed(1)}x the average`
      });
    }
  }
  if (signals.gitlog && signals.topology) {
    const highFanInPaths = new Map(signals.topology.highFanInFiles.map((f) => [
      f.path,
      f.importedByCount
    ]));
    for (const hotspotPath of signals.gitlog.hotspotFiles) {
      const importedByCount = highFanInPaths.get(hotspotPath);
      if (importedByCount !== void 0) {
        const churnEntry = signals.gitlog.fileChurnRanking.find((f) => f.path === hotspotPath);
        const changeCount = churnEntry?.changeCount ?? 0;
        const revertCount = churnEntry?.revertCount ?? 0;
        insights.push({
          id: "fused-structural-temporal-hotspot",
          severity: "critical",
          observation: `\`${hotspotPath}\` changed ${changeCount} times, reverted ${revertCount} times, and is imported by ${importedByCount} files`,
          whyItMatters: "This file is both structurally critical (high blast radius) and behaviorally unstable (frequent changes and rollbacks). Changes here cascade across your codebase.",
          whatWeWillDo: "Vreko will apply maximum protection density and provide structural context to AI tools before they modify this file."
        });
        break;
      }
    }
  }
  const locked = selectLockedInsight(signals);
  return {
    insights: insights.slice(0, 7),
    locked
  };
}
__name(generateInsights, "generateInsights");
__name2(generateInsights, "generateInsights");
function selectLockedInsight(signals) {
  if (signals.reflog && signals.reflog.lateNightRatio > 0.2) {
    return {
      id: "temporal-risk-windows",
      teaser: "Identify your personal risk windows -- the times and patterns where recovery is most likely",
      requirement: "Requires observed coding sessions to validate temporal patterns",
      unlockCondition: {
        type: "days_observed",
        days: 3
      }
    };
  }
  if (signals.gitlog && signals.gitlog.busFactorEstimate < 2) {
    return {
      id: "collaboration-risk",
      teaser: "Detect when your coding patterns diverge from your stable baseline",
      requirement: "Requires observed coding sessions to establish baseline patterns",
      unlockCondition: {
        type: "days_observed",
        days: 5
      }
    };
  }
  return {
    id: "session-risk-windows",
    teaser: "Identify your personal risk windows",
    requirement: "Requires observed coding sessions",
    unlockCondition: {
      type: "days_observed",
      days: 3
    }
  };
}
__name(selectLockedInsight, "selectLockedInsight");
__name2(selectLockedInsight, "selectLockedInsight");
var execFileAsync2 = promisify(execFile);
function parseDateFromLine(line) {
  const match = line.match(/\{([^}]+)\}/);
  if (!match) {
    return null;
  }
  const d = new Date(match[1]);
  return Number.isNaN(d.getTime()) ? null : d;
}
__name(parseDateFromLine, "parseDateFromLine");
__name2(parseDateFromLine, "parseDateFromLine");
function parseBranchFromLine(line) {
  const match = line.match(/refs\/heads\/([^@]+)@/);
  return match ? match[1] : null;
}
__name(parseBranchFromLine, "parseBranchFromLine");
__name2(parseBranchFromLine, "parseBranchFromLine");
async function scanReflog(repoPath, emitter) {
  const signals = {
    forceResetRate: 0,
    rebaseFrequency: 0,
    branchAbandonmentRate: 0,
    contextSwitchRate: 0,
    peakActivityWindows: [],
    weekendActivityRatio: 0,
    lateNightRatio: 0,
    resetToHEADCount: 0,
    reflogChurnByBranch: /* @__PURE__ */ new Map(),
    avgTimeBetweenResets: 0
  };
  try {
    const { stdout } = await execFileAsync2("git", [
      "reflog",
      "--all",
      "--date=iso"
    ], {
      cwd: repoPath,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 1e4
    });
    const lines = stdout.split("\n").filter(Boolean);
    if (lines.length === 0) {
      return signals;
    }
    const timestamps = [];
    const resetTimestamps = [];
    let resetCount = 0;
    let forceResetCount = 0;
    let rebaseCount = 0;
    let checkoutCount = 0;
    let weekendCount = 0;
    let lateNightCount = 0;
    const hourCounts = new Array(24).fill(0);
    const branchesCreated = /* @__PURE__ */ new Set();
    const branchesMerged = /* @__PURE__ */ new Set();
    const branchChurn = /* @__PURE__ */ new Map();
    for (const line of lines) {
      const date = parseDateFromLine(line);
      if (date) {
        timestamps.push(date);
        const hour = date.getHours();
        hourCounts[hour]++;
        const day = date.getDay();
        if (day === 0 || day === 6) {
          weekendCount++;
        }
        if (hour >= 22 || hour < 5) {
          lateNightCount++;
        }
      }
      const branch = parseBranchFromLine(line);
      if (branch) {
        branchChurn.set(branch, (branchChurn.get(branch) || 0) + 1);
      }
      if (line.includes("reset: moving to HEAD")) {
        resetCount++;
        if (date) {
          resetTimestamps.push(date.getTime());
        }
      }
      if (line.includes("reset: moving to") && !line.includes("reset: moving to HEAD")) {
        forceResetCount++;
        if (date) {
          resetTimestamps.push(date.getTime());
        }
      }
      if (line.includes("rebase")) {
        rebaseCount++;
      }
      if (line.includes("checkout: moving from")) {
        checkoutCount++;
      }
      if (line.includes("branch: Created from")) {
        if (branch) {
          branchesCreated.add(branch);
        }
      }
      if (line.includes("merge")) {
        const mergedMatch = line.match(/merge\s+(\S+)/);
        if (mergedMatch) {
          branchesMerged.add(mergedMatch[1].replace(/[:;]$/, ""));
        }
      }
    }
    const sortedTimestamps = timestamps.map((d) => d.getTime()).sort((a, b) => a - b);
    const timeSpanMs = sortedTimestamps.length > 1 ? sortedTimestamps[sortedTimestamps.length - 1] - sortedTimestamps[0] : 7 * 24 * 60 * 60 * 1e3;
    const weeks = Math.max(timeSpanMs / (7 * 24 * 60 * 60 * 1e3), 1);
    const days = Math.max(timeSpanMs / (24 * 60 * 60 * 1e3), 1);
    signals.resetToHEADCount = resetCount;
    signals.forceResetRate = (forceResetCount + resetCount) / weeks;
    signals.rebaseFrequency = rebaseCount / weeks;
    signals.contextSwitchRate = checkoutCount / days;
    const abandoned = [
      ...branchesCreated
    ].filter((b) => !branchesMerged.has(b));
    signals.branchAbandonmentRate = branchesCreated.size > 0 ? abandoned.length / branchesCreated.size * 100 : 0;
    signals.weekendActivityRatio = lines.length > 0 ? weekendCount / lines.length : 0;
    signals.lateNightRatio = lines.length > 0 ? lateNightCount / lines.length : 0;
    const meanActivity = lines.length / 24;
    const stddev = Math.sqrt(hourCounts.reduce((sum, c) => sum + (c - meanActivity) ** 2, 0) / 24);
    const threshold = meanActivity + stddev;
    const peakWindows = [];
    let windowStart = null;
    for (let h = 0; h < 24; h++) {
      if (hourCounts[h] > threshold) {
        if (windowStart === null) {
          windowStart = h;
        }
      } else {
        if (windowStart !== null) {
          peakWindows.push({
            startHour: windowStart,
            endHour: h
          });
          windowStart = null;
        }
      }
    }
    if (windowStart !== null) {
      peakWindows.push({
        startHour: windowStart,
        endHour: 24
      });
    }
    signals.peakActivityWindows = peakWindows;
    signals.reflogChurnByBranch = branchChurn;
    if (resetTimestamps.length > 1) {
      const sorted = resetTimestamps.sort((a, b) => a - b);
      let totalGap = 0;
      for (let i = 1; i < sorted.length; i++) {
        totalGap += sorted[i] - sorted[i - 1];
      }
      signals.avgTimeBetweenResets = totalGap / (sorted.length - 1) / (1e3 * 60);
    }
    if (emitter && resetCount > 5) {
      emitter.emit("discovery", {
        source: "reflog",
        confidence: 0.9,
        message: `Found ${resetCount} reset events in your history`,
        detailMessage: "Vreko will learn your rollback patterns"
      });
    }
    if (emitter && signals.lateNightRatio > 0.2) {
      emitter.emit("discovery", {
        source: "reflog",
        confidence: 0.88,
        message: `${Math.round(signals.lateNightRatio * 100)}% of git activity happens after 10pm`,
        detailMessage: "Vreko will increase protection during late-night sessions"
      });
    }
  } catch (_error) {
  }
  return signals;
}
__name(scanReflog, "scanReflog");
__name2(scanReflog, "scanReflog");
var execFileAsync3 = promisify(execFile);
function countFiles(dir, predicate, maxDepth = 4, currentDepth = 0) {
  if (currentDepth >= maxDepth || !existsSync(dir)) {
    return 0;
  }
  let count = 0;
  try {
    const entries = readdirSync(dir, {
      withFileTypes: true
    });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist" || entry.name === "build") {
        continue;
      }
      if (entry.isFile() && predicate(entry.name)) {
        count++;
      } else if (entry.isDirectory()) {
        count += countFiles(join(dir, entry.name), predicate, maxDepth, currentDepth + 1);
      }
    }
  } catch {
  }
  return count;
}
__name(countFiles, "countFiles");
__name2(countFiles, "countFiles");
function detectTestFramework(repoPath) {
  if (existsSync(join(repoPath, "vitest.config.ts")) || existsSync(join(repoPath, "vitest.config.js"))) {
    return "vitest";
  }
  if (existsSync(join(repoPath, "jest.config.ts")) || existsSync(join(repoPath, "jest.config.js"))) {
    return "jest";
  }
  if (existsSync(join(repoPath, ".mocharc.yml")) || existsSync(join(repoPath, ".mocharc.json"))) {
    return "mocha";
  }
  if (existsSync(join(repoPath, "pytest.ini")) || existsSync(join(repoPath, "pyproject.toml"))) {
    return "pytest";
  }
  try {
    const pkg = JSON.parse(readFileSync(join(repoPath, "package.json"), "utf-8"));
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies
    };
    if (allDeps.vitest) {
      return "vitest";
    }
    if (allDeps.jest) {
      return "jest";
    }
    if (allDeps.mocha) {
      return "mocha";
    }
  } catch {
  }
  return null;
}
__name(detectTestFramework, "detectTestFramework");
__name2(detectTestFramework, "detectTestFramework");
function detectFramework(repoPath) {
  if (existsSync(join(repoPath, "next.config.ts")) || existsSync(join(repoPath, "next.config.js")) || existsSync(join(repoPath, "next.config.mjs"))) {
    return "next.js";
  }
  if (existsSync(join(repoPath, "nuxt.config.ts"))) {
    return "nuxt";
  }
  if (existsSync(join(repoPath, "angular.json"))) {
    return "angular";
  }
  if (existsSync(join(repoPath, "svelte.config.js"))) {
    return "svelte";
  }
  if (existsSync(join(repoPath, "vite.config.ts")) || existsSync(join(repoPath, "vite.config.js"))) {
    return "vite";
  }
  try {
    const pkg = JSON.parse(readFileSync(join(repoPath, "package.json"), "utf-8"));
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies
    };
    if (allDeps.next) {
      return "next.js";
    }
    if (allDeps.react) {
      return "react";
    }
    if (allDeps.vue) {
      return "vue";
    }
    if (allDeps.express) {
      return "express";
    }
    if (allDeps.hono) {
      return "hono";
    }
  } catch {
  }
  return null;
}
__name(detectFramework, "detectFramework");
__name2(detectFramework, "detectFramework");
function detectPackageDirs(repoPath) {
  const dirs = [];
  const candidates = [
    "packages",
    "apps",
    "libs",
    "modules",
    "services"
  ];
  for (const candidate of candidates) {
    const candidatePath = join(repoPath, candidate);
    if (!existsSync(candidatePath)) {
      continue;
    }
    try {
      const entries = readdirSync(candidatePath, {
        withFileTypes: true
      });
      for (const entry of entries) {
        if (entry.isDirectory() && existsSync(join(candidatePath, entry.name, "package.json"))) {
          dirs.push(join(candidate, entry.name));
        }
      }
    } catch {
    }
  }
  if (dirs.length === 0) {
    dirs.push(".");
  }
  return dirs;
}
__name(detectPackageDirs, "detectPackageDirs");
__name2(detectPackageDirs, "detectPackageDirs");
function computeTestAdjacency(repoPath, packageDirs, churnFiles) {
  const isTestFile = /* @__PURE__ */ __name2((name) => name.endsWith(".test.ts") || name.endsWith(".test.tsx") || name.endsWith(".test.js") || name.endsWith(".spec.ts") || name.endsWith(".spec.tsx") || name.endsWith(".spec.js"), "isTestFile");
  const isSourceFile = /* @__PURE__ */ __name2((name) => (name.endsWith(".ts") || name.endsWith(".tsx") || name.endsWith(".js") || name.endsWith(".jsx")) && !isTestFile(name) && !name.endsWith(".d.ts") && !name.endsWith(".config.ts") && !name.endsWith(".config.js"), "isSourceFile");
  const packageTestAdjacency = [];
  const churnSet = new Set(churnFiles || []);
  for (const pkgDir of packageDirs) {
    const fullPath = join(repoPath, pkgDir);
    const srcPath = existsSync(join(fullPath, "src")) ? join(fullPath, "src") : fullPath;
    const hasTestDir = existsSync(join(fullPath, "__tests__")) || existsSync(join(fullPath, "test")) || existsSync(join(fullPath, "tests"));
    const testFileCount = countFiles(fullPath, isTestFile);
    const sourceFileCount = countFiles(srcPath, isSourceFile);
    const testRatio = sourceFileCount > 0 ? testFileCount / sourceFileCount : 0;
    let churnScore = 0;
    if (churnSet.size > 0) {
      for (const f of churnSet) {
        if (f.startsWith(pkgDir)) {
          churnScore++;
        }
      }
    }
    packageTestAdjacency.push({
      packagePath: pkgDir,
      hasTestDir: hasTestDir || testFileCount > 0,
      testFileCount,
      sourceFileCount,
      testRatio,
      churnScore
    });
  }
  const weaklyTestedHotspots = packageTestAdjacency.filter((p) => p.churnScore > 2 && p.testRatio < 0.3).map((p) => p.packagePath);
  const totalSource = packageTestAdjacency.reduce((s, p) => s + p.sourceFileCount, 0);
  const overallTestAdjacencyScore = totalSource > 0 ? Math.min(100, packageTestAdjacency.reduce((s, p) => s + p.testRatio * p.sourceFileCount, 0) / totalSource * 100) : 0;
  return {
    packageTestAdjacency,
    weaklyTestedHotspots,
    overallTestAdjacencyScore
  };
}
__name(computeTestAdjacency, "computeTestAdjacency");
__name2(computeTestAdjacency, "computeTestAdjacency");
function detectSensitiveSurfaces(repoPath) {
  const envPatterns = [
    ".env",
    ".env.local",
    ".env.development",
    ".env.production",
    ".env.staging"
  ];
  const hasEnvFiles = envPatterns.some((p) => existsSync(join(repoPath, p)));
  const credPatterns = [
    ".npmrc",
    ".pypirc",
    "docker-compose.yml",
    "docker-compose.yaml"
  ];
  const hasCredentialConfigs = credPatterns.some((p) => existsSync(join(repoPath, p)));
  let hasCISecrets = false;
  const workflowDir = join(repoPath, ".github", "workflows");
  if (existsSync(workflowDir)) {
    try {
      const files = readdirSync(workflowDir);
      for (const f of files) {
        try {
          const content = readFileSync(join(workflowDir, f), "utf-8");
          if (content.includes("secrets.")) {
            hasCISecrets = true;
            break;
          }
        } catch {
        }
      }
    } catch {
    }
  }
  const hasInfraState = existsSync(join(repoPath, "terraform.tfstate")) || existsSync(join(repoPath, ".terraform"));
  let sensitivePathCount = 0;
  if (hasEnvFiles) {
    sensitivePathCount += envPatterns.filter((p) => existsSync(join(repoPath, p))).length;
  }
  if (hasCredentialConfigs) {
    sensitivePathCount += credPatterns.filter((p) => existsSync(join(repoPath, p))).length;
  }
  if (hasCISecrets) {
    sensitivePathCount++;
  }
  if (hasInfraState) {
    sensitivePathCount++;
  }
  return {
    hasEnvFiles,
    hasCredentialConfigs,
    hasCISecrets,
    hasInfraState,
    sensitivePathCount
  };
}
__name(detectSensitiveSurfaces, "detectSensitiveSurfaces");
__name2(detectSensitiveSurfaces, "detectSensitiveSurfaces");
async function detectStructure(repoPath, emitter) {
  const isTurbo = existsSync(join(repoPath, "turbo.json"));
  const isNx = existsSync(join(repoPath, "nx.json"));
  const isLerna = existsSync(join(repoPath, "lerna.json"));
  const isPnpmWorkspace = existsSync(join(repoPath, "pnpm-workspace.yaml"));
  let repoType = "single";
  if (isTurbo) {
    repoType = "monorepo-turbo";
  } else if (isNx) {
    repoType = "monorepo-nx";
  } else if (isLerna) {
    repoType = "monorepo-lerna";
  } else if (isPnpmWorkspace) {
    repoType = "polyrepo";
  }
  let packageManager = null;
  if (existsSync(join(repoPath, "pnpm-lock.yaml"))) {
    packageManager = "pnpm";
  } else if (existsSync(join(repoPath, "bun.lockb"))) {
    packageManager = "bun";
  } else if (existsSync(join(repoPath, "yarn.lock"))) {
    packageManager = "yarn";
  } else if (existsSync(join(repoPath, "package-lock.json"))) {
    packageManager = "npm";
  }
  const configExtensions = [
    ".json",
    ".yaml",
    ".yml",
    ".toml",
    ".config.ts",
    ".config.js",
    ".config.mjs"
  ];
  let configFileCount = 0;
  try {
    const rootFiles = readdirSync(repoPath);
    for (const f of rootFiles) {
      if (configExtensions.some((ext) => f.endsWith(ext))) {
        configFileCount++;
      }
    }
  } catch {
  }
  let gitignoreComplexity = 0;
  try {
    const gitignore = readFileSync(join(repoPath, ".gitignore"), "utf-8");
    gitignoreComplexity = gitignore.split("\n").filter((l) => l.trim() && !l.startsWith("#")).length;
  } catch {
  }
  const [ageResult, countResult, branchResult] = await Promise.all([
    execFileAsync3("git", [
      "log",
      "--reverse",
      "--format=%aI",
      "-1"
    ], {
      cwd: repoPath,
      timeout: 5e3
    }).catch(() => ({
      stdout: ""
    })),
    execFileAsync3("git", [
      "rev-list",
      "--count",
      "--all"
    ], {
      cwd: repoPath,
      timeout: 5e3
    }).catch(() => ({
      stdout: "0"
    })),
    execFileAsync3("git", [
      "branch",
      "-a",
      "--format=%(refname:short) %(committerdate:iso)"
    ], {
      cwd: repoPath,
      timeout: 5e3
    }).catch(() => ({
      stdout: ""
    }))
  ]);
  let age = 0;
  if (ageResult.stdout.trim()) {
    const firstDate = new Date(ageResult.stdout.trim());
    age = Math.floor((Date.now() - firstDate.getTime()) / (24 * 60 * 60 * 1e3));
  }
  const totalCommits = Number.parseInt(countResult.stdout.trim(), 10) || 0;
  let activeBranches = 0;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1e3;
  for (const line of branchResult.stdout.split("\n").filter(Boolean)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
      const branchDate = new Date(parts.slice(1).join(" "));
      if (!Number.isNaN(branchDate.getTime()) && branchDate.getTime() > thirtyDaysAgo) {
        activeBranches++;
      }
    }
  }
  const packageDirs = detectPackageDirs(repoPath);
  const testAdjacency = computeTestAdjacency(repoPath, packageDirs);
  const sensitiveSurfaces = detectSensitiveSurfaces(repoPath);
  const structure = {
    repoType,
    framework: detectFramework(repoPath),
    packageManager,
    hasCI: existsSync(join(repoPath, ".github", "workflows")) || existsSync(join(repoPath, ".gitlab-ci.yml")) || existsSync(join(repoPath, ".circleci")),
    hasDocker: existsSync(join(repoPath, "Dockerfile")) || existsSync(join(repoPath, "docker-compose.yml")),
    testFramework: detectTestFramework(repoPath),
    configFileCount,
    gitignoreComplexity,
    age,
    totalCommits,
    activeBranches,
    testAdjacency,
    sensitiveSurfaces
  };
  if (emitter && sensitiveSurfaces.hasEnvFiles) {
    emitter.emit("discovery", {
      source: "structure",
      confidence: 0.95,
      message: "Detected environment variables",
      detailMessage: "Vreko ignores .env files completely"
    });
  }
  if (emitter && testAdjacency.weaklyTestedHotspots.length > 0) {
    emitter.emit("discovery", {
      source: "structure",
      confidence: 0.87,
      message: `${testAdjacency.weaklyTestedHotspots.length} package(s) with high churn but low test coverage`,
      detailMessage: "Vreko will monitor these as fragile zones"
    });
  }
  return structure;
}
__name(detectStructure, "detectStructure");
__name2(detectStructure, "detectStructure");
var execFileAsync4 = promisify(execFile);
function writeScanCache(path, cache) {
  writeFileSync(path, JSON.stringify(cache, null, 2));
}
__name(writeScanCache, "writeScanCache");
__name2(writeScanCache, "writeScanCache");
function readScanCache(path) {
  if (!existsSync(path)) {
    return null;
  }
  try {
    const data = JSON.parse(readFileSync(path, "utf-8"));
    if (!data.lastScannedHead || !data.lastScannedAt) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
__name(readScanCache, "readScanCache");
__name2(readScanCache, "readScanCache");
async function computeDelta(cache, repoPath) {
  try {
    const { stdout: currentHead } = await execFileAsync4("git", [
      "rev-parse",
      "HEAD"
    ], {
      cwd: repoPath,
      timeout: 5e3
    });
    const head = currentHead.trim();
    if (head === cache.lastScannedHead) {
      return {
        needsFullScan: false
      };
    }
    try {
      await execFileAsync4("git", [
        "merge-base",
        "--is-ancestor",
        cache.lastScannedHead,
        head
      ], {
        cwd: repoPath,
        timeout: 5e3
      });
      const { stdout: countOut } = await execFileAsync4("git", [
        "rev-list",
        "--count",
        `${cache.lastScannedHead}..${head}`
      ], {
        cwd: repoPath,
        timeout: 5e3
      });
      const count = Number.parseInt(countOut.trim(), 10) || 0;
      return {
        needsFullScan: false,
        commitRange: {
          from: cache.lastScannedHead,
          to: head,
          count
        }
      };
    } catch {
      return {
        needsFullScan: true
      };
    }
  } catch {
    return {
      needsFullScan: true
    };
  }
}
__name(computeDelta, "computeDelta");
__name2(computeDelta, "computeDelta");
var ScanEventEmitter = class extends EventEmitter {
  static {
    __name(this, "ScanEventEmitter");
  }
  static {
    __name2(this, "ScanEventEmitter");
  }
  // --- DiscoveryEmitter compatibility ---
  emitDiscovery(discovery) {
    if (discovery.confidence > 0.85) {
      this.emit("discovery", discovery);
    }
  }
  // --- Scan-specific events ---
  emitProgress(event) {
    this.emit("progress", event);
  }
  emitFinding(event) {
    this.emit("finding", event);
  }
  emitComplete(profile) {
    this.emit("complete", profile);
  }
  onDiscovery(handler) {
    this.on("discovery", handler);
    return this;
  }
  onProgress(handler) {
    this.on("progress", handler);
    return this;
  }
  onFinding(handler) {
    this.on("finding", handler);
    return this;
  }
  onComplete(handler) {
    this.on("complete", handler);
    return this;
  }
};
function createScanEventEmitter() {
  return new ScanEventEmitter();
}
__name(createScanEventEmitter, "createScanEventEmitter");
__name2(createScanEventEmitter, "createScanEventEmitter");
var ACTIVE_SCAN_LOCKS = /* @__PURE__ */ new Set();
var DEFAULT_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1e3;
function resolveCachePath(workspaceHash) {
  const cacheDir = join(homedir(), ".vreko", "cache", "init-scan");
  mkdirSync(cacheDir, {
    recursive: true
  });
  return join(cacheDir, `${workspaceHash}.json`);
}
__name(resolveCachePath, "resolveCachePath");
__name2(resolveCachePath, "resolveCachePath");
function isCacheValid(cache, maxAgeMs = DEFAULT_CACHE_MAX_AGE_MS) {
  if (!cache) {
    return false;
  }
  const cachedAt = Date.parse(cache.lastScannedAt);
  if (!Number.isFinite(cachedAt)) {
    return false;
  }
  return Date.now() - cachedAt < maxAgeMs;
}
__name(isCacheValid, "isCacheValid");
__name2(isCacheValid, "isCacheValid");
function isScanInProgress(workspaceHash) {
  return ACTIVE_SCAN_LOCKS.has(workspaceHash);
}
__name(isScanInProgress, "isScanInProgress");
__name2(isScanInProgress, "isScanInProgress");
function acquireScanLock(workspaceHash) {
  if (ACTIVE_SCAN_LOCKS.has(workspaceHash)) {
    return null;
  }
  ACTIVE_SCAN_LOCKS.add(workspaceHash);
  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    ACTIVE_SCAN_LOCKS.delete(workspaceHash);
  };
}
__name(acquireScanLock, "acquireScanLock");
__name2(acquireScanLock, "acquireScanLock");
function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}
__name(clamp, "clamp");
__name2(clamp, "clamp");
function computeRecoveryRisk(signals) {
  const reflog = signals.reflog;
  const gitlog = signals.gitlog;
  let score = 0;
  if (reflog) {
    score += Math.min(reflog.resetToHEADCount * 3, 40);
    score += Math.min(reflog.forceResetRate * 5, 15);
  }
  if (gitlog) {
    const rc = gitlog.rollbackCorrelation;
    score += Math.min(rc.resetAfterLargeCommitRate * 0.3, 15);
    score += Math.min(rc.resetAfterCrossPackageRate * 0.3, 10);
    const totalReverts = gitlog.fileChurnRanking.reduce((s, f) => s + f.revertCount, 0);
    score += Math.min(totalReverts * 2, 20);
  }
  return clamp(score);
}
__name(computeRecoveryRisk, "computeRecoveryRisk");
__name2(computeRecoveryRisk, "computeRecoveryRisk");
function computeChangeVolatility(signals) {
  const reflog = signals.reflog;
  const gitlog = signals.gitlog;
  let score = 0;
  if (reflog) {
    score += Math.min(reflog.forceResetRate * 4, 20);
    score += Math.min(reflog.rebaseFrequency * 2, 10);
    score += Math.min(reflog.branchAbandonmentRate * 0.2, 10);
  }
  if (gitlog) {
    const d = gitlog.diffusion;
    score += Math.min(d.crossDirectoryDiffusionRate * 0.5, 20);
    score += Math.min(gitlog.largeCommitRatio * 0.4, 15);
    score += Math.min(d.largeSessionClusterRate * 0.5, 15);
    score += Math.min(gitlog.commitFrequencyVariance * 2, 10);
  }
  return clamp(score);
}
__name(computeChangeVolatility, "computeChangeVolatility");
__name2(computeChangeVolatility, "computeChangeVolatility");
function computeWorkflowFragility(signals) {
  const gitlog = signals.gitlog;
  const structure = signals.structure;
  let score = 0;
  if (gitlog) {
    const fragileCount = gitlog.fileChurnRanking.filter((f) => f.revertCount > 0 && f.changeCount > 5).length;
    score += Math.min(fragileCount * 5, 25);
    const unstablePairs = gitlog.coChangeGraph.filter((e) => e.confidence > 0.7);
    score += Math.min(unstablePairs.length * 3, 15);
    score += Math.min(gitlog.hotspotFiles.length * 2, 10);
  }
  if (structure) {
    const testGap = 100 - structure.testAdjacency.overallTestAdjacencyScore;
    score += Math.min(testGap * 0.3, 20);
    score += Math.min(structure.testAdjacency.weaklyTestedHotspots.length * 5, 15);
    score += Math.min(structure.sensitiveSurfaces.sensitivePathCount * 3, 15);
  }
  return clamp(score);
}
__name(computeWorkflowFragility, "computeWorkflowFragility");
__name2(computeWorkflowFragility, "computeWorkflowFragility");
function computeComplexity(signals) {
  const structure = signals.structure;
  if (!structure) {
    return 0;
  }
  let score = 0;
  score += Math.min(structure.configFileCount * 2, 30);
  const packageCount = structure.testAdjacency.packageTestAdjacency.length;
  score += Math.min(packageCount * 3, 30);
  score += Math.min(structure.gitignoreComplexity, 20);
  score += structure.repoType.startsWith("monorepo") ? 20 : 0;
  return clamp(score);
}
__name(computeComplexity, "computeComplexity");
__name2(computeComplexity, "computeComplexity");
function computeCollaboration(signals) {
  const gitlog = signals.gitlog;
  if (!gitlog) {
    return 0;
  }
  let score = 0;
  score += Math.min(gitlog.contributorCount * 5, 30);
  score += Math.min(gitlog.mergeConflictFrequency * 0.5, 20);
  if (gitlog.busFactorEstimate <= 1) {
    score += 30;
  } else if (gitlog.busFactorEstimate <= 2) {
    score += 15;
  }
  return clamp(score);
}
__name(computeCollaboration, "computeCollaboration");
__name2(computeCollaboration, "computeCollaboration");
function calculateStructuralRisk(topology) {
  if (!topology) {
    return 0;
  }
  let score = 0;
  score += Math.min(30, topology.circularChainCount * 8);
  const highFanInRatio = topology.highFanInFiles.length / Math.max(topology.moduleCount, 1);
  score += Math.min(25, highFanInRatio * 500);
  score += Math.min(20, topology.ruleViolationCount * 3);
  const orphanRatio = topology.orphanFileCount / Math.max(topology.moduleCount, 1);
  score += Math.min(15, orphanRatio * 150);
  const edgeDensity = topology.edgeCount / Math.max(topology.moduleCount, 1);
  if (edgeDensity > 10) {
    score += 10;
  }
  return Math.min(100, Math.round(score));
}
__name(calculateStructuralRisk, "calculateStructuralRisk");
__name2(calculateStructuralRisk, "calculateStructuralRisk");
function computeAiExposure(repoPath, toolIdentity) {
  if (!repoPath) {
    return 0;
  }
  let score = 0;
  const aiIndicators = [
    ".cursor",
    ".github/copilot",
    ".codeium",
    ".continue",
    ".aider",
    ".windsurf",
    ".claude",
    ".augment",
    ".roo"
  ];
  for (const indicator of aiIndicators) {
    if (existsSync(join(repoPath, indicator))) {
      score += 15;
    }
  }
  if (toolIdentity && toolIdentity.confidence >= 0.5) {
    const TOOL_RISK_MULTIPLIERS = {
      devin: 1.4,
      "claude-code": 1.2,
      cursor: 1,
      "github-copilot": 0.9,
      windsurf: 1,
      augment: 1,
      cline: 1.1,
      roocode: 1.1,
      aider: 1
    };
    const multiplier = TOOL_RISK_MULTIPLIERS[toolIdentity.tool] ?? 1;
    score = Math.round(score * multiplier);
  }
  try {
    const { execSync } = __require2("child_process");
    const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: repoPath,
      timeout: 5e3,
      encoding: "utf-8"
    }).trim();
    if (/^devin\/\d{10}-/.test(currentBranch)) {
      score += 10;
    }
  } catch {
  }
  return clamp(score);
}
__name(computeAiExposure, "computeAiExposure");
__name2(computeAiExposure, "computeAiExposure");
function buildTopDrivers(signals) {
  const drivers = [];
  if (signals.reflog && signals.reflog.resetToHEADCount > 3) {
    drivers.push({
      id: "repeated-recoveries",
      label: "Repeated recovery events",
      scoreImpact: Math.min(signals.reflog.resetToHEADCount * 3, 40),
      evidence: [
        `${signals.reflog.resetToHEADCount} reset-to-HEAD events detected`,
        signals.reflog.avgTimeBetweenResets > 0 ? `Average ${Math.round(signals.reflog.avgTimeBetweenResets)} minutes between resets` : "Multiple resets in short timeframe"
      ],
      protectiveAction: "Increase snapshot density during volatile periods"
    });
  }
  if (signals.gitlog) {
    const rc = signals.gitlog.rollbackCorrelation;
    if (rc.resetAfterLargeCommitRate > 20 || rc.resetAfterCrossPackageRate > 20) {
      drivers.push({
        id: "rollback-correlation",
        label: `Recoveries correlate with ${rc.topRecoveryTrigger.replace(/-/g, " ")} changes`,
        scoreImpact: Math.max(rc.resetAfterLargeCommitRate, rc.resetAfterCrossPackageRate) * 0.3,
        evidence: [
          rc.resetAfterLargeCommitRate > 0 ? `${Math.round(rc.resetAfterLargeCommitRate)}% of reverts follow large commits` : "",
          rc.resetAfterCrossPackageRate > 0 ? `${Math.round(rc.resetAfterCrossPackageRate)}% of reverts follow cross-package changes` : ""
        ].filter(Boolean),
        protectiveAction: "Auto-snapshot before high-diffusion commits"
      });
    }
    if (signals.gitlog.hotspotFiles.length > 0) {
      const topChurn = signals.gitlog.fileChurnRanking[0];
      drivers.push({
        id: "fragile-hotspots",
        label: "Fragile file hotspots detected",
        scoreImpact: Math.min(signals.gitlog.hotspotFiles.length * 5, 25),
        evidence: [
          topChurn ? `${topChurn.path} changed ${topChurn.changeCount} times (${topChurn.revertCount} reverts)` : "Multiple high-churn files with reverts"
        ],
        protectiveAction: "Watch fragile files with enhanced monitoring"
      });
    }
    if (signals.gitlog.diffusion.crossDirectoryDiffusionRate > 20) {
      drivers.push({
        id: "cross-directory-blast",
        label: "High cross-directory change diffusion",
        scoreImpact: Math.min(signals.gitlog.diffusion.crossDirectoryDiffusionRate * 0.5, 20),
        evidence: [
          `${Math.round(signals.gitlog.diffusion.crossDirectoryDiffusionRate)}% of commits span multiple directories`
        ],
        protectiveAction: "Track cross-directory blast radius"
      });
    }
  }
  if (signals.structure?.testAdjacency.weaklyTestedHotspots.length) {
    drivers.push({
      id: "weak-test-coverage",
      label: "Weakly-tested high-churn areas",
      scoreImpact: Math.min(signals.structure.testAdjacency.weaklyTestedHotspots.length * 5, 15),
      evidence: signals.structure.testAdjacency.weaklyTestedHotspots.map((p) => `${p} has high churn but low test coverage`),
      protectiveAction: "Prioritize snapshot protection for untested hotspots"
    });
  }
  return drivers.sort((a, b) => b.scoreImpact - a.scoreImpact).slice(0, 5);
}
__name(buildTopDrivers, "buildTopDrivers");
__name2(buildTopDrivers, "buildTopDrivers");
function buildRecommendedConfig(signals, recoveryRisk) {
  const protectionLevel = recoveryRisk > 70 ? "maximum" : recoveryRisk > 40 ? "enhanced" : "standard";
  const snapshotFrequency = recoveryRisk > 70 ? "aggressive" : recoveryRisk > 40 ? "balanced" : "conservative";
  const watchTargets = [];
  if (signals.gitlog) {
    for (const file of signals.gitlog.hotspotFiles.slice(0, 5)) {
      const churnEntry = signals.gitlog.fileChurnRanking.find((f) => f.path === file);
      watchTargets.push({
        path: file,
        fileCount: 1,
        reason: churnEntry?.revertCount ? "fragile detected" : "high churn"
      });
    }
    for (const edge of signals.gitlog.coChangeGraph.slice(0, 3)) {
      if (edge.confidence > 0.7) {
        const dir = edge.fileA.includes("/") ? edge.fileA.substring(0, edge.fileA.lastIndexOf("/")) : ".";
        if (!watchTargets.some((t) => t.path === dir)) {
          watchTargets.push({
            path: dir,
            fileCount: 2,
            reason: "co-change patterns"
          });
        }
      }
    }
  }
  if (signals.structure) {
    for (const hotspot of signals.structure.testAdjacency.weaklyTestedHotspots.slice(0, 3)) {
      if (!watchTargets.some((t) => t.path === hotspot)) {
        watchTargets.push({
          path: hotspot,
          fileCount: 0,
          reason: "weak test coverage"
        });
      }
    }
  }
  if (watchTargets.length === 0 && signals.gitlog?.fileChurnRanking.length) {
    const topChurned = [
      ...signals.gitlog.fileChurnRanking
    ].filter((f) => f.changeCount > 0).sort((a, b) => b.changeCount - a.changeCount).slice(0, 5);
    for (const file of topChurned) {
      watchTargets.push({
        path: file.path,
        fileCount: 1,
        reason: "frequently changed"
      });
    }
  }
  const enabledFeatures = [
    "real-time-protection"
  ];
  if (recoveryRisk > 50) {
    enabledFeatures.push("pre-commit-snapshot");
  }
  if (signals.gitlog?.coChangeGraph.length) {
    enabledFeatures.push("co-change-tracking");
  }
  return {
    protectionLevel,
    snapshotFrequency,
    watchTargets,
    enabledFeatures
  };
}
__name(buildRecommendedConfig, "buildRecommendedConfig");
__name2(buildRecommendedConfig, "buildRecommendedConfig");
function riskTier(score) {
  if (score > 75) {
    return "high";
  }
  if (score > 50) {
    return "elevated";
  }
  if (score > 25) {
    return "moderate";
  }
  return "low";
}
__name(riskTier, "riskTier");
__name2(riskTier, "riskTier");
function computeConfidence(signals) {
  let sources = 0;
  let weight = 0;
  if (signals.reflog) {
    sources++;
    weight += 0.4;
  }
  if (signals.gitlog) {
    sources++;
    weight += 0.4;
  }
  if (signals.structure) {
    sources++;
    weight += 0.2;
  }
  return sources === 0 ? 0.1 : weight;
}
__name(computeConfidence, "computeConfidence");
__name2(computeConfidence, "computeConfidence");
function buildTopFragileFiles(signals) {
  if (!signals.gitlog?.fileChurnRanking.length) {
    return [];
  }
  const withReverts = [
    ...signals.gitlog.fileChurnRanking
  ].filter((f) => f.changeCount >= 3 && f.revertCount > 0).sort((a, b) => b.revertCount / b.changeCount - a.revertCount / a.changeCount).slice(0, 20).map((f) => ({
    path: f.path,
    changeCount: f.changeCount,
    revertCount: f.revertCount
  }));
  if (withReverts.length > 0) {
    return withReverts;
  }
  return [
    ...signals.gitlog.fileChurnRanking
  ].filter((f) => f.changeCount > 0).sort((a, b) => b.changeCount - a.changeCount).slice(0, 5).map((f) => ({
    path: f.path,
    changeCount: f.changeCount,
    revertCount: 0
  }));
}
__name(buildTopFragileFiles, "buildTopFragileFiles");
__name2(buildTopFragileFiles, "buildTopFragileFiles");
function findTopFragileFile(signals) {
  if (!signals.gitlog?.fileChurnRanking.length) {
    return null;
  }
  const ranked = [
    ...signals.gitlog.fileChurnRanking
  ].filter((f) => f.changeCount >= 3 && f.revertCount > 0).sort((a, b) => b.revertCount / b.changeCount - a.revertCount / a.changeCount);
  return ranked.length > 0 ? ranked[0].path : null;
}
__name(findTopFragileFile, "findTopFragileFile");
__name2(findTopFragileFile, "findTopFragileFile");
var FRAGILITY_MIN_SAMPLE = 5;
function confidenceWeight(changeCount) {
  return Math.min(changeCount / FRAGILITY_MIN_SAMPLE, 1);
}
__name(confidenceWeight, "confidenceWeight");
__name2(confidenceWeight, "confidenceWeight");
function isExcludedFromFragilityRanking(filePath) {
  return isArtifactFile(filePath);
}
__name(isExcludedFromFragilityRanking, "isExcludedFromFragilityRanking");
__name2(isExcludedFromFragilityRanking, "isExcludedFromFragilityRanking");
function buildFragilityArray(signals) {
  if (!signals.gitlog?.fileChurnRanking.length) {
    return [];
  }
  return signals.gitlog.fileChurnRanking.map((f) => {
    const excluded = isExcludedFromFragilityRanking(f.path);
    const revertRate = f.changeCount > 0 ? f.revertCount / f.changeCount : 0;
    const fragilityScore = excluded ? 0 : revertRate * confidenceWeight(f.changeCount);
    return {
      file: f.path,
      changeCount: f.changeCount,
      revertCount: f.revertCount,
      revertRate,
      fragilityScore,
      excluded
    };
  });
}
__name(buildFragilityArray, "buildFragilityArray");
__name2(buildFragilityArray, "buildFragilityArray");
function buildCoChangeArray(signals) {
  if (!signals.gitlog?.coChangeGraph.length) {
    return [];
  }
  return signals.gitlog.coChangeGraph.map((edge) => ({
    files: [
      edge.fileA,
      edge.fileB
    ],
    rate: edge.confidence,
    occurrences: edge.coChangeCount,
    generated: isArtifactFile(edge.fileA) && isArtifactFile(edge.fileB)
  }));
}
__name(buildCoChangeArray, "buildCoChangeArray");
__name2(buildCoChangeArray, "buildCoChangeArray");
function synthesize(signals, baseline, repoPath) {
  const { insights, locked } = generateInsights(signals, baseline);
  const recoveryRisk = computeRecoveryRisk(signals);
  const changeVolatility = computeChangeVolatility(signals);
  const workflowFragility = computeWorkflowFragility(signals);
  return {
    overallRisk: riskTier(recoveryRisk),
    confidence: computeConfidence(signals),
    primary: {
      recoveryRisk,
      changeVolatility,
      workflowFragility
    },
    secondary: {
      complexity: computeComplexity(signals),
      collaboration: computeCollaboration(signals),
      aiExposure: computeAiExposure(repoPath, void 0),
      structuralRisk: calculateStructuralRisk(signals.topology)
    },
    topDrivers: buildTopDrivers(signals),
    insights,
    lockedInsights: [
      locked
    ],
    recommendedConfig: buildRecommendedConfig(signals, recoveryRisk),
    topFragileFile: findTopFragileFile(signals),
    topFragileFiles: buildTopFragileFiles(signals),
    coChange: buildCoChangeArray(signals),
    fragility: buildFragilityArray(signals)
  };
}
__name(synthesize, "synthesize");
__name2(synthesize, "synthesize");
async function runTopologyScan(provider, repoPath, emitter) {
  const scanEmitter = emitter;
  scanEmitter?.emitProgress?.({
    stage: "topology",
    progress: 0,
    message: "Analyzing dependencies..."
  });
  try {
    const result = await provider.scan?.(repoPath);
    if (!result) {
      scanEmitter?.emitProgress?.({
        stage: "topology",
        progress: 100,
        message: "Topology scan returned no data"
      });
      return null;
    }
    for (const file of result.highFanInFiles.slice(0, 3)) {
      emitter?.emitDiscovery?.({
        source: "structure",
        confidence: 0.9,
        message: `${file.path} is imported by ${file.importedByCount} files`,
        detailMessage: "Vreko will treat this as a structural hotspot with enhanced blast radius monitoring",
        relatedInsightId: "fused-structural-temporal-hotspot"
      });
    }
    if (result.circularChainCount > 0) {
      emitter?.emitDiscovery?.({
        source: "structure",
        confidence: 0.95,
        message: `${result.circularChainCount} circular dependency chain(s) detected`,
        detailMessage: "Circular dependencies increase change risk  -  Vreko will monitor these chains closely"
      });
    }
    scanEmitter?.emitProgress?.({
      stage: "topology",
      progress: 100,
      message: `Topology: ${result.moduleCount} modules, ${result.edgeCount} edges in ${result.cruiseDurationMs}ms`
    });
    return result;
  } catch (_err) {
    scanEmitter?.emitProgress?.({
      stage: "topology",
      progress: 100,
      message: "Topology scan failed (non-fatal)"
    });
    return null;
  }
}
__name(runTopologyScan, "runTopologyScan");
__name2(runTopologyScan, "runTopologyScan");
async function runInitScan({ repoPath, emitter, topologyProvider }) {
  const scanEmitter = emitter;
  const [reflogSignals, gitlogSignals, structureSignals, topologySignals] = await Promise.all([
    scanReflog(repoPath, emitter),
    analyzeGitLog(repoPath, emitter),
    detectStructure(repoPath, emitter),
    topologyProvider?.scan ? runTopologyScan(topologyProvider, repoPath, emitter) : Promise.resolve(null)
  ]);
  scanEmitter?.emitProgress?.({
    stage: "synthesis",
    progress: 0,
    message: "Synthesizing risk profile..."
  });
  const profile = synthesize({
    reflog: reflogSignals,
    gitlog: gitlogSignals,
    structure: structureSignals,
    topology: topologySignals
  });
  scanEmitter?.emitProgress?.({
    stage: "synthesis",
    progress: 100,
    message: "Scan complete"
  });
  scanEmitter?.emitComplete?.(profile);
  return profile;
}
__name(runInitScan, "runInitScan");
__name2(runInitScan, "runInitScan");
async function runInitScan2(input, emitter) {
  if (typeof input !== "string") {
    return runInitScan({
      repoPath: input.repoPath,
      emitter: input.emitter,
      topologyProvider: input.topologyProvider
    });
  }
  const repoPath = input;
  const em = emitter ?? createDiscoveryEmitter();
  const [reflog, gitlog, structure] = await Promise.all([
    scanReflog(repoPath, em),
    analyzeGitLog(repoPath, em),
    detectStructure(repoPath, em)
  ]);
  const signals = {
    reflog,
    gitlog,
    structure,
    topology: null
  };
  const profile = synthesize(signals, void 0, repoPath);
  return {
    profile,
    emitter: em
  };
}
__name(runInitScan2, "runInitScan2");
__name2(runInitScan2, "runInitScan");

export { DiscoveryEmitter, ScanEventEmitter, acquireScanLock, analyzeGitLog, computeDelta, createDiscoveryEmitter, createScanEventEmitter, detectStructure, generateInsights, isCacheValid, isScanInProgress, readScanCache, resolveCachePath, runInitScan2 as runInitScan, scanReflog, synthesize, writeScanCache };
//# sourceMappingURL=init-scan-2DOJVOB7.js.map
//# sourceMappingURL=init-scan-2DOJVOB7.js.map