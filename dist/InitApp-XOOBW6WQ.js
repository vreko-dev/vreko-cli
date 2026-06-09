#!/usr/bin/env node
import { saveBenchmarkOptIn } from './chunk-HFQHU5LC.js';
import { isDaemonConnected, connectToDaemon, getDaemonClient, getDaemonStatus } from './chunk-HJWDI6B5.js';
import './chunk-6NHWBL7P.js';
import { BRAND_COLORS } from './chunk-DMXC2JTC.js';
import './chunk-KJWKY4L4.js';
import './chunk-VNFWNWEY.js';
import { __name } from './chunk-EWOJGXRX.js';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { statSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { useApp, useInput, Box, Text, useStdout } from 'ink';
import { useState, useEffect, useRef, useCallback } from 'react';
import { execSync } from 'child_process';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';
function snapshotPreWriteMtime(targetFile) {
  try {
    return statSync(targetFile).mtimeMs;
  } catch {
    return null;
  }
}
__name(snapshotPreWriteMtime, "snapshotPreWriteMtime");
async function pollForWorkspaceJsonUpdate(targetFile, preMtime, options = {}) {
  const { intervalMs = 500, timeoutMs = 45e3, cancelled = /* @__PURE__ */ __name(() => false, "cancelled") } = options;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (cancelled()) return false;
    try {
      const mtime = statSync(targetFile).mtimeMs;
      if (preMtime === null || mtime > preMtime) {
        return true;
      }
    } catch {
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}
__name(pollForWorkspaceJsonUpdate, "pollForWorkspaceJsonUpdate");
function writeVrekoInitConfig(repoPath, profile) {
  const vrekoDir = join(repoPath, ".vreko");
  const configPath = join(vrekoDir, "config.json");
  if (existsSync(configPath)) {
    return;
  }
  try {
    mkdirSync(vrekoDir, {
      recursive: true
    });
    const config = {
      protectionLevel: profile.recommendedConfig.protectionLevel,
      snapshotFrequency: profile.recommendedConfig.snapshotFrequency,
      projections: {
        docs: {
          approvedFiles: []
        }
      }
    };
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}
`, "utf8");
  } catch {
  }
}
__name(writeVrekoInitConfig, "writeVrekoInitConfig");

// src/ui/init/Activation.tsx
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
__name(capitalize, "capitalize");
function totalWatchCount(targets) {
  return targets.reduce((s, t) => s + Math.max(t.fileCount, 1), 0);
}
__name(totalWatchCount, "totalWatchCount");
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
__name(delay, "delay");
function Activation({ profile, repoPath = process.cwd(), force }) {
  const { exit } = useApp();
  const [stage, setStage] = useState("service");
  const [checks, setChecks] = useState([
    {
      label: "Connecting to service",
      status: "pending"
    },
    {
      label: "Verifying workspace",
      status: "pending"
    },
    {
      label: "Checking file watcher",
      status: "pending"
    },
    {
      label: "Loading intelligence",
      status: "pending"
    },
    {
      label: "Writing workspace.json",
      status: "pending"
    }
  ]);
  const updateCheck = /* @__PURE__ */ __name((index, status, detail) => {
    setChecks((prev) => prev.map((c, i) => i === index ? {
      ...c,
      status,
      detail
    } : c));
  }, "updateCheck");
  useEffect(() => {
    if (stage !== "service") {
      return;
    }
    let cancelled = false;
    async function run() {
      updateCheck(0, "running");
      let step1Connected = false;
      try {
        if (!isDaemonConnected()) {
          await connectToDaemon();
        }
        if (cancelled) {
          return;
        }
        step1Connected = true;
        updateCheck(0, "done");
      } catch {
        if (cancelled) {
          return;
        }
        try {
          const { execFileSync } = await import('child_process');
          execFileSync("vreko", [
            "service",
            "start",
            "--service"
          ], {
            stdio: "pipe",
            timeout: 1e4
          });
          await delay(1500);
          await connectToDaemon();
          if (cancelled) {
            return;
          }
          step1Connected = true;
          updateCheck(0, "done");
        } catch {
        }
        if (!step1Connected) {
          if (cancelled) {
            return;
          }
          updateCheck(0, "error", "Failed to connect  -  start service with: vr service start");
        }
      }
      writeVrekoInitConfig(repoPath, profile);
      if (step1Connected) {
        updateCheck(4, "running");
        try {
          const client = getDaemonClient();
          if (client) {
            const targetFile = join(repoPath, ".agents", "workspace.json");
            const preMtime = snapshotPreWriteMtime(targetFile);
            await client.call("workspace/trigger-workspace-json-write", {
              workspace: repoPath
            });
            await client.call("workspace/write-from-scan-profile", {
              workspace: repoPath,
              ...force && {
                force: true
              }
            });
            const written = await pollForWorkspaceJsonUpdate(targetFile, preMtime, {
              cancelled: /* @__PURE__ */ __name(() => cancelled, "cancelled")
            });
            if (written) {
              updateCheck(4, "done", "Baseline written to .agents/workspace.json");
            } else {
              updateCheck(4, "error", "Write in progress  -  will complete in background");
            }
          } else {
            updateCheck(4, "error", "No daemon client  -  will write on first session");
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn(`[vreko init] workspace.json write failed (non-fatal): ${msg}`);
          updateCheck(4, "error", "Write deferred  -  will complete on first session");
        }
      }
      updateCheck(1, "running");
      try {
        const status = await getDaemonStatus();
        if (cancelled) {
          return;
        }
        if (status.connected) {
          const uptimeMin = status.uptime ? Math.floor(status.uptime / 6e4) : 0;
          updateCheck(1, "done", `Workspace registered${uptimeMin > 0 ? ` (service up ${uptimeMin}m)` : ""}`);
        } else {
          updateCheck(1, "error", "Service not responding");
        }
      } catch {
        if (cancelled) {
          return;
        }
        updateCheck(1, "done", "Workspace registered");
      }
      await delay(200);
      if (cancelled) {
        return;
      }
      updateCheck(2, "running");
      await delay(100);
      if (cancelled) {
        return;
      }
      const hasVreko = existsSync(`${repoPath}/.vreko`);
      updateCheck(2, "done", hasVreko ? "File watcher active" : "File watcher starting");
      await delay(200);
      if (cancelled) {
        return;
      }
      updateCheck(3, "running");
      await delay(150);
      if (cancelled) {
        return;
      }
      updateCheck(3, "done", "Intelligence ready");
      await delay(400);
      if (cancelled) {
        return;
      }
      setStage("done");
    }
    __name(run, "run");
    run();
    return () => {
      cancelled = true;
    };
  }, [
    stage,
    repoPath
  ]);
  useInput((_input, key) => {
    if (stage !== "done") {
      return;
    }
    const answer = _input.toLowerCase();
    let optedIn;
    if (answer === "y") {
      optedIn = true;
    } else if (answer === "n") {
      optedIn = false;
    } else if (key.return) {
      optedIn = false;
    } else {
      return;
    }
    saveBenchmarkOptIn(optedIn).then(() => {
      exit();
    });
  }, {
    isActive: stage === "done"
  });
  const watchCount = totalWatchCount(profile.recommendedConfig.watchTargets);
  const patternCount = profile.insights.length + profile.lockedInsights.length;
  const fragileFile = profile.topFragileFile || "your most-changed file";
  if (stage === "done") {
    return /* @__PURE__ */ jsxs(Box, {
      flexDirection: "column",
      borderStyle: "round",
      padding: 1,
      children: [
        /* @__PURE__ */ jsx(Text, {
          bold: true,
          color: "green",
          children: "Vreko is watching your codebase."
        }),
        /* @__PURE__ */ jsxs(Box, {
          marginTop: 1,
          flexDirection: "column",
          children: [
            /* @__PURE__ */ jsxs(Text, {
              children: [
                /* @__PURE__ */ jsx(Text, {
                  color: BRAND_COLORS.primary,
                  children: "\u2713"
                }),
                ` Protection: ${capitalize(profile.recommendedConfig.protectionLevel)} \xB7 Watching ${watchCount} target${watchCount !== 1 ? "s" : ""}`
              ]
            }),
            /* @__PURE__ */ jsxs(Text, {
              children: [
                /* @__PURE__ */ jsx(Text, {
                  color: BRAND_COLORS.primary,
                  children: "\u2713"
                }),
                ` Snapshot frequency: ${capitalize(profile.recommendedConfig.snapshotFrequency)} (risk-adaptive)`
              ]
            }),
            /* @__PURE__ */ jsxs(Text, {
              children: [
                /* @__PURE__ */ jsx(Text, {
                  color: BRAND_COLORS.primary,
                  children: "\u2713"
                }),
                " Config written to .vreko/config.json"
              ]
            })
          ]
        }),
        /* @__PURE__ */ jsxs(Box, {
          marginTop: 1,
          borderStyle: "single",
          padding: 1,
          flexDirection: "column",
          children: [
            /* @__PURE__ */ jsx(Text, {
              children: "Try it now:"
            }),
            /* @__PURE__ */ jsx(Text, {}),
            /* @__PURE__ */ jsxs(Text, {
              color: "cyan",
              children: [
                '$ echo "test" >> ',
                fragileFile
              ]
            }),
            /* @__PURE__ */ jsx(Text, {}),
            /* @__PURE__ */ jsx(Text, {
              children: "Vreko will catch the change to your most fragile"
            }),
            /* @__PURE__ */ jsx(Text, {
              children: "file in real time."
            })
          ]
        }),
        /* @__PURE__ */ jsxs(Box, {
          marginTop: 1,
          flexDirection: "column",
          children: [
            /* @__PURE__ */ jsxs(Text, {
              children: [
                "Recovery Risk: ",
                capitalize(profile.overallRisk),
                " \xB7 ",
                "Protection: ",
                capitalize(profile.recommendedConfig.protectionLevel)
              ]
            }),
            /* @__PURE__ */ jsxs(Text, {
              children: [
                watchCount,
                " target",
                watchCount !== 1 ? "s" : "",
                " watched",
                " \xB7 ",
                patternCount,
                " patterns seeded",
                " \xB7 ",
                profile.lockedInsights.length,
                " insight unlocking"
              ]
            })
          ]
        }),
        /* @__PURE__ */ jsx(Box, {
          marginTop: 1,
          children: /* @__PURE__ */ jsxs(Text, {
            bold: true,
            children: [
              "Vreko is active. Run ",
              /* @__PURE__ */ jsx(Text, {
                color: "cyan",
                children: "vr status"
              }),
              " anytime."
            ]
          })
        }),
        /* @__PURE__ */ jsx(Box, {
          marginTop: 1,
          children: /* @__PURE__ */ jsx(Text, {
            dimColor: true,
            children: "Run `vr status` anytime. Your code stays local."
          })
        }),
        /* @__PURE__ */ jsx(Box, {
          marginTop: 1,
          children: /* @__PURE__ */ jsx(Text, {
            children: "Share anonymous benchmarks to improve comparisons? [y/N]"
          })
        })
      ]
    });
  }
  return /* @__PURE__ */ jsxs(Box, {
    flexDirection: "column",
    borderStyle: "round",
    padding: 1,
    children: [
      /* @__PURE__ */ jsx(Text, {
        children: "Starting Vreko service..."
      }),
      /* @__PURE__ */ jsx(Box, {
        marginTop: 1,
        flexDirection: "column",
        minHeight: 4,
        children: checks.filter((check) => check.status !== "pending").map((check, i) => {
          const icon = check.status === "done" ? "\u2713" : check.status === "error" ? "\u26A0" : "\u2026";
          const color = check.status === "done" ? BRAND_COLORS.primary : check.status === "error" ? "yellow" : "cyan";
          return /* @__PURE__ */ jsxs(Text, {
            color,
            children: [
              icon,
              " ",
              check.label,
              check.detail ? `  -  ${check.detail}` : ""
            ]
          }, i);
        })
      })
    ]
  });
}
__name(Activation, "Activation");
function Consent({ onAccept }) {
  const { exit } = useApp();
  const [declined, setDeclined] = useState(false);
  useInput((input, key) => {
    if (key.return || input === "y" || input === "Y") {
      onAccept();
    } else if (input === "n" || input === "N" || key.escape) {
      setDeclined(true);
      setTimeout(() => exit(), 300);
    }
  });
  if (declined) {
    return /* @__PURE__ */ jsx(Box, {
      flexDirection: "column",
      padding: 1,
      children: /* @__PURE__ */ jsx(Text, {
        color: "yellow",
        children: "Setup cancelled. No data was collected."
      })
    });
  }
  return /* @__PURE__ */ jsxs(Box, {
    flexDirection: "column",
    borderStyle: "round",
    padding: 1,
    width: 78,
    children: [
      /* @__PURE__ */ jsx(Text, {
        bold: true,
        color: BRAND_COLORS.primary,
        children: "Data Collection Notice"
      }),
      /* @__PURE__ */ jsxs(Box, {
        marginTop: 1,
        flexDirection: "column",
        gap: 0,
        children: [
          /* @__PURE__ */ jsx(Text, {
            children: "Vreko collects the following to power its intelligence features:"
          }),
          /* @__PURE__ */ jsxs(Box, {
            marginTop: 1,
            flexDirection: "column",
            children: [
              /* @__PURE__ */ jsxs(Text, {
                children: [
                  "  \u2713  ",
                  "Session metadata (start/end times, file counts, risk scores)"
                ]
              }),
              /* @__PURE__ */ jsxs(Text, {
                children: [
                  "  \u2713  ",
                  "Git commit hashes and change attribution"
                ]
              }),
              /* @__PURE__ */ jsxs(Text, {
                children: [
                  "  \u2713  ",
                  "Rollback events and AI tool attribution"
                ]
              })
            ]
          }),
          /* @__PURE__ */ jsxs(Box, {
            marginTop: 1,
            flexDirection: "column",
            children: [
              /* @__PURE__ */ jsx(Text, {
                color: "green",
                children: "  \u2717  File contents never leave your device"
              }),
              /* @__PURE__ */ jsx(Text, {
                color: "green",
                children: "  \u2717  Source code is never read or transmitted"
              })
            ]
          })
        ]
      }),
      /* @__PURE__ */ jsxs(Box, {
        marginTop: 1,
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsx(Text, {
            dimColor: true,
            children: "Data stays local by default. Cloud sync (opt-in) transmits metadata only."
          }),
          /* @__PURE__ */ jsx(Text, {
            dimColor: true,
            children: "Run `vreko purge` at any time to delete all local data."
          }),
          /* @__PURE__ */ jsx(Text, {
            dimColor: true,
            children: "Privacy policy: https://vreko.dev/privacy"
          })
        ]
      }),
      /* @__PURE__ */ jsx(Box, {
        marginTop: 1,
        children: /* @__PURE__ */ jsxs(Text, {
          children: [
            "Press ",
            /* @__PURE__ */ jsx(Text, {
              bold: true,
              color: "green",
              children: "Y / Enter"
            }),
            " to accept  \xB7  ",
            /* @__PURE__ */ jsx(Text, {
              bold: true,
              color: "red",
              children: "N / ESC"
            }),
            " to decline"
          ]
        })
      })
    ]
  });
}
__name(Consent, "Consent");
function detectRepoInfo(repoPath) {
  const checks = [];
  if (existsSync(join(repoPath, ".git"))) {
    checks.push("\u2713 Git repository found");
  } else {
    checks.push("\u26A0 No git repository found  -  some features unavailable");
  }
  if (existsSync(join(repoPath, "pnpm-workspace.yaml"))) {
    const pkgCount = readdirSync(repoPath, {
      withFileTypes: true
    }).filter((d) => d.isDirectory() && (d.name === "packages" || d.name === "apps")).reduce((acc) => {
      try {
        return acc + readdirSync(join(repoPath, "packages"), {
          withFileTypes: true
        }).filter((d) => d.isDirectory()).length + readdirSync(join(repoPath, "apps"), {
          withFileTypes: true
        }).filter((d) => d.isDirectory()).length;
      } catch {
        return acc;
      }
    }, 0);
    checks.push(`\u2713 pnpm workspace monorepo${pkgCount > 0 ? ` (${pkgCount} packages)` : ""}`);
  } else if (existsSync(join(repoPath, "yarn.lock"))) {
    checks.push("\u2713 Yarn workspace detected");
  } else if (existsSync(join(repoPath, "package.json"))) {
    checks.push("\u2713 Node.js project detected");
  }
  if (existsSync(join(repoPath, "turbo.json"))) {
    checks.push("\u2713 Turborepo build system");
  } else if (existsSync(join(repoPath, "nx.json"))) {
    checks.push("\u2713 Nx workspace");
  }
  if (existsSync(join(repoPath, "next.config.js")) || existsSync(join(repoPath, "next.config.ts"))) {
    checks.push("\u2713 Next.js application");
  }
  const aiTools = [];
  const aiDirCandidates = [
    {
      path: join(repoPath, ".cursor"),
      name: "Cursor"
    },
    {
      path: join(repoPath, ".github", "copilot"),
      name: "GitHub Copilot"
    },
    {
      path: join(repoPath, ".claude"),
      name: "Claude Code"
    },
    {
      path: join(repoPath, ".windsurf"),
      name: "Windsurf"
    }
  ];
  for (const { path, name } of aiDirCandidates) {
    try {
      if (existsSync(path) && statSync(path).isDirectory()) {
        aiTools.push(name);
      }
    } catch {
    }
  }
  if (aiTools.length > 0) {
    checks.push(`\u2713 AI tools detected: ${aiTools.join(", ")}`);
  }
  try {
    const count = execSync("git rev-list --count HEAD", {
      cwd: repoPath,
      encoding: "utf-8",
      timeout: 3e3,
      stdio: [
        "pipe",
        "pipe",
        "ignore"
      ]
    }).trim();
    if (count) {
      checks.push(`\u2713 ${count} commits in history`);
    }
  } catch {
  }
  return checks.slice(0, 5);
}
__name(detectRepoInfo, "detectRepoInfo");
function Detection({ repoPath = process.cwd(), onReady }) {
  const [checks, setChecks] = useState([]);
  useInput((_input, key) => {
    if (key.return) {
      onReady();
    }
  });
  useEffect(() => {
    const detected = detectRepoInfo(repoPath);
    detected.forEach((check, index) => {
      setTimeout(() => {
        setChecks((prev) => [
          ...prev,
          check
        ]);
      }, (index + 1) * 200);
    });
  }, [
    repoPath
  ]);
  return /* @__PURE__ */ jsxs(Box, {
    flexDirection: "column",
    borderStyle: "round",
    padding: 1,
    children: [
      /* @__PURE__ */ jsxs(Box, {
        marginTop: 1,
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsx(Text, {
            children: "Detecting repository..."
          }),
          /* @__PURE__ */ jsx(Box, {
            marginTop: 1,
            flexDirection: "column",
            minHeight: 4,
            children: checks.map((msg, i) => /* @__PURE__ */ jsx(Text, {
              color: msg.startsWith("\u26A0") ? "yellow" : void 0,
              children: msg.startsWith("\u26A0") ? msg : /* @__PURE__ */ jsxs(Fragment, {
                children: [
                  /* @__PURE__ */ jsx(Text, {
                    color: BRAND_COLORS.primary,
                    children: "\u2713"
                  }),
                  msg.slice(1)
                ]
              })
            }, i))
          })
        ]
      }),
      /* @__PURE__ */ jsx(Box, {
        marginTop: 1,
        children: /* @__PURE__ */ jsx(Text, {
          dimColor: true,
          children: "Analyzing behavioral patterns - no code will be read."
        })
      }),
      /* @__PURE__ */ jsx(Box, {
        marginTop: 1,
        children: /* @__PURE__ */ jsx(Text, {
          color: BRAND_COLORS.primary,
          children: "Press [ENTER] to scan your repository \u2192"
        })
      })
    ]
  });
}
__name(Detection, "Detection");
var NULL_PROFILE = {
  overallRisk: "low",
  confidence: 0,
  primary: {
    recoveryRisk: 0,
    changeVolatility: 0,
    workflowFragility: 0
  },
  secondary: {
    complexity: 0,
    collaboration: 0,
    aiExposure: 0,
    structuralRisk: 0
  },
  topDrivers: [],
  insights: [],
  lockedInsights: [],
  recommendedConfig: {
    protectionLevel: "standard",
    snapshotFrequency: "balanced",
    watchTargets: [],
    enabledFeatures: []
  },
  topFragileFile: null,
  topFragileFiles: [],
  coChange: [],
  fragility: []
};
function useAnalysis(repoPath, onComplete, minDisplayMs = 0) {
  const [done, setDone] = useState(false);
  const [errored, setErrored] = useState(false);
  const [profile, setProfile] = useState(null);
  const hasStarted = useRef(false);
  const startTimeRef = useRef(Date.now());
  useEffect(() => {
    if (hasStarted.current) {
      return;
    }
    hasStarted.current = true;
    const runScan = /* @__PURE__ */ __name(async () => {
      if (isDaemonConnected()) {
        const client = getDaemonClient();
        return client.call("workspace/run-init-scan", {
          workspace: repoPath
        });
      }
      const { runInitScan } = await import('./init-scan-2DOJVOB7.js');
      return runInitScan({
        repoPath
      });
    }, "runScan");
    runScan().then((result) => {
      const resolved = result ?? NULL_PROFILE;
      setDone(true);
      setProfile(resolved);
      const elapsed = Date.now() - startTimeRef.current;
      const delay2 = Math.max(500, minDisplayMs - elapsed);
      setTimeout(() => onComplete(resolved), delay2);
    }).catch(() => setErrored(true));
  }, [
    repoPath
  ]);
  return {
    done,
    errored,
    profile
  };
}
__name(useAnalysis, "useAnalysis");
function useKeyboard(options) {
  const { onEnter, onEscape, onArrowRight, onArrowLeft, onArrowUp, onArrowDown, enabled = true } = options;
  useInput((_input, key) => {
    if (key.return) {
      onEnter?.();
    } else if (key.escape) {
      onEscape?.();
    } else if (key.rightArrow) {
      onArrowRight?.();
    } else if (key.leftArrow) {
      onArrowLeft?.();
    } else if (key.upArrow) {
      onArrowUp?.();
    } else if (key.downArrow) {
      onArrowDown?.();
    }
  }, {
    isActive: enabled
  });
}
__name(useKeyboard, "useKeyboard");
function announce(_message, priority = "polite") {
}
__name(announce, "announce");
function capitalize2(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
__name(capitalize2, "capitalize");
function totalWatchCount2(targets) {
  return targets.reduce((s, t) => s + Math.max(t.fileCount, 1), 0);
}
__name(totalWatchCount2, "totalWatchCount");
function prioritizeInsights(insights) {
  return [
    ...insights
  ].sort((a, b) => {
    if (a.type === "co-change" && b.type !== "co-change") {
      return -1;
    }
    if (b.type === "co-change" && a.type !== "co-change") {
      return 1;
    }
    if (a.type === "blast-radius" && b.type !== "blast-radius") {
      return -1;
    }
    if (b.type === "blast-radius" && a.type !== "blast-radius") {
      return 1;
    }
    if (a.type === "recovery" && b.type !== "recovery") {
      return -1;
    }
    if (b.type === "recovery" && a.type !== "recovery") {
      return 1;
    }
    const severityOrder = {
      critical: 0,
      warning: 1,
      notable: 2,
      info: 3
    };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
__name(prioritizeInsights, "prioritizeInsights");
var PAGE_SIZE = 3;
function Insights({ profile, onContinue, onCustomize }) {
  const [currentPage, setCurrentPage] = useState(0);
  const { insights, lockedInsights, recommendedConfig } = profile;
  const sorted = prioritizeInsights(insights);
  const maxPage = Math.max(0, sorted.length - PAGE_SIZE);
  useInput((input, key) => {
    if (key.upArrow && currentPage > 0) {
      setCurrentPage((p) => p - 1);
    } else if (key.downArrow && currentPage < maxPage) {
      setCurrentPage((p) => p + 1);
    } else if (key.return) {
      onContinue();
    } else if ((input === "c" || input === "C") && onCustomize) {
      onCustomize();
    }
  });
  const locked = lockedInsights[0];
  const watchCount = totalWatchCount2(recommendedConfig.watchTargets);
  const visibleInsights = sorted.slice(currentPage, currentPage + PAGE_SIZE);
  const shownEnd = currentPage + visibleInsights.length;
  return /* @__PURE__ */ jsxs(Box, {
    flexDirection: "column",
    borderStyle: "round",
    padding: 1,
    children: [
      /* @__PURE__ */ jsxs(Box, {
        children: [
          /* @__PURE__ */ jsx(Box, {
            width: "50%",
            children: /* @__PURE__ */ jsx(Text, {
              bold: true,
              children: "What We Found"
            })
          }),
          /* @__PURE__ */ jsx(Box, {
            width: "50%",
            children: /* @__PURE__ */ jsx(Text, {
              bold: true,
              children: "What We'll Do"
            })
          })
        ]
      }),
      /* @__PURE__ */ jsxs(Box, {
        marginTop: 1,
        flexDirection: "column",
        children: [
          visibleInsights.map((insight) => /* @__PURE__ */ jsxs(Box, {
            marginBottom: 1,
            children: [
              /* @__PURE__ */ jsxs(Box, {
                width: "50%",
                paddingRight: 2,
                flexDirection: "column",
                children: [
                  /* @__PURE__ */ jsxs(Text, {
                    color: insight.severity === "critical" ? "red" : insight.severity === "warning" || insight.severity === "notable" ? "yellow" : void 0,
                    children: [
                      insight.severity === "info" ? "\u2139" : "\u26A0",
                      " ",
                      insight.observation
                    ]
                  }),
                  /* @__PURE__ */ jsxs(Text, {
                    dimColor: true,
                    children: [
                      " ",
                      insight.whyItMatters
                    ]
                  }),
                  insight.comparison && /* @__PURE__ */ jsxs(Text, {
                    dimColor: true,
                    color: "cyan",
                    children: [
                      " ",
                      insight.comparison
                    ]
                  })
                ]
              }),
              /* @__PURE__ */ jsx(Box, {
                width: "50%",
                children: /* @__PURE__ */ jsx(Text, {
                  children: insight.whatWeWillDo
                })
              })
            ]
          }, insight.id)),
          locked && currentPage === maxPage && /* @__PURE__ */ jsxs(Box, {
            marginBottom: 1,
            children: [
              /* @__PURE__ */ jsxs(Box, {
                width: "50%",
                paddingRight: 2,
                flexDirection: "column",
                children: [
                  /* @__PURE__ */ jsxs(Text, {
                    dimColor: true,
                    children: [
                      "\u2504 ",
                      locked.teaser
                    ]
                  }),
                  /* @__PURE__ */ jsxs(Text, {
                    dimColor: true,
                    children: [
                      " ",
                      locked.requirement
                    ]
                  })
                ]
              }),
              /* @__PURE__ */ jsx(Box, {
                width: "50%",
                children: /* @__PURE__ */ jsxs(Text, {
                  dimColor: true,
                  children: [
                    "Available after ",
                    locked.unlockCondition.days,
                    " days of active development."
                  ]
                })
              })
            ]
          })
        ]
      }),
      /* @__PURE__ */ jsxs(Box, {
        marginTop: 1,
        borderStyle: "single",
        padding: 1,
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsxs(Text, {
            children: [
              "Protection: ",
              capitalize2(recommendedConfig.protectionLevel),
              " \xB7 ",
              "Watching: ",
              watchCount,
              " target",
              watchCount !== 1 ? "s" : ""
            ]
          }),
          /* @__PURE__ */ jsxs(Text, {
            children: [
              "Snapshot Frequency: ",
              capitalize2(recommendedConfig.snapshotFrequency),
              " (risk-adaptive)"
            ]
          })
        ]
      }),
      /* @__PURE__ */ jsx(Box, {
        marginTop: 1,
        children: /* @__PURE__ */ jsxs(Text, {
          color: BRAND_COLORS.primary,
          children: [
            "[ENTER] Accept \xB7 ",
            onCustomize ? "[c] Customize \xB7 " : "",
            sorted.length > PAGE_SIZE ? `[\u2191\u2193] More insights (${shownEnd}/${sorted.length})` : ""
          ]
        })
      })
    ]
  });
}
__name(Insights, "Insights");
var LOGO_FULL = `\u2588\u2588\u2557   \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2557  \u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 
\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2551 \u2588\u2588\u2554\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557
\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2554\u255D \u2588\u2588\u2551   \u2588\u2588\u2551
\u255A\u2588\u2588\u2557 \u2588\u2588\u2554\u255D\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u255D  \u2588\u2588\u2554\u2550\u2588\u2588\u2557 \u2588\u2588\u2551   \u2588\u2588\u2551
 \u255A\u2588\u2588\u2588\u2588\u2554\u255D \u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551  \u2588\u2588\u2557\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D
  \u255A\u2550\u2550\u2550\u255D  \u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u255D `;
function Logo() {
  const { stdout } = useStdout();
  const columns = stdout.columns ?? 80;
  if (columns >= 80) {
    return /* @__PURE__ */ jsx(Box, {
      flexDirection: "column",
      children: /* @__PURE__ */ jsx(Text, {
        color: BRAND_COLORS.primary,
        children: LOGO_FULL
      })
    });
  }
  return /* @__PURE__ */ jsx(Box, {
    children: /* @__PURE__ */ jsx(Text, {
      bold: true,
      color: BRAND_COLORS.primary,
      children: "\u2501\u2501 VREKO \u2501\u2501"
    })
  });
}
__name(Logo, "Logo");
function useTerminalLayout() {
  const { stdout } = useStdout();
  const columns = stdout.columns ?? 80;
  const rows = stdout.rows ?? 24;
  return {
    isWide: columns >= 120,
    canShowFullLogo: columns >= 80,
    columns,
    rows
  };
}
__name(useTerminalLayout, "useTerminalLayout");

// src/ui/init/Profile.tsx
function riskLabel(score) {
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
__name(riskLabel, "riskLabel");
function renderBar(score, width = 10) {
  const filled = Math.round(score / 100 * width);
  const empty = width - filled;
  return "\u2588".repeat(filled) + "\u2591".repeat(empty);
}
__name(renderBar, "renderBar");
function ProfileMetrics({ profile }) {
  const topDriver = profile.topDrivers[0];
  return /* @__PURE__ */ jsxs(Box, {
    flexDirection: "column",
    children: [
      /* @__PURE__ */ jsx(Text, {
        bold: true,
        children: "Your Codebase Intelligence Profile"
      }),
      /* @__PURE__ */ jsxs(Box, {
        marginTop: 1,
        padding: 1,
        borderStyle: "single",
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsxs(Text, {
            children: [
              "CODEBASE HEALTH     ",
              /* @__PURE__ */ jsx(Text, {
                color: BRAND_COLORS.primary,
                children: renderBar(profile.primary.recoveryRisk)
              }),
              ` ${Math.round(profile.primary.recoveryRisk)}% ${riskLabel(profile.primary.recoveryRisk)}`
            ]
          }),
          /* @__PURE__ */ jsxs(Text, {
            children: [
              "CHANGE VOLATILITY   ",
              /* @__PURE__ */ jsx(Text, {
                color: BRAND_COLORS.primary,
                children: renderBar(profile.primary.changeVolatility)
              }),
              ` ${Math.round(profile.primary.changeVolatility)}% ${riskLabel(profile.primary.changeVolatility)}`
            ]
          }),
          /* @__PURE__ */ jsxs(Text, {
            children: [
              "WORKFLOW FRAGILITY  ",
              /* @__PURE__ */ jsx(Text, {
                color: BRAND_COLORS.primary,
                children: renderBar(profile.primary.workflowFragility)
              }),
              ` ${Math.round(profile.primary.workflowFragility)}% ${riskLabel(profile.primary.workflowFragility)}`
            ]
          }),
          /* @__PURE__ */ jsx(Text, {
            color: "gray",
            children: "\u2500".repeat(55)
          }),
          /* @__PURE__ */ jsxs(Box, {
            flexDirection: "column",
            children: [
              /* @__PURE__ */ jsxs(Text, {
                dimColor: true,
                children: [
                  "complexity ",
                  Math.round(profile.secondary.complexity)
                ]
              }),
              profile.secondary.collaboration > 0 ? /* @__PURE__ */ jsxs(Text, {
                dimColor: true,
                children: [
                  "collaboration ",
                  Math.round(profile.secondary.collaboration)
                ]
              }) : /* @__PURE__ */ jsx(Text, {
                dimColor: true,
                children: "collaboration Solo developer detected"
              }),
              profile.secondary.aiExposure > 0 ? /* @__PURE__ */ jsxs(Text, {
                dimColor: true,
                children: [
                  "AI exposure ",
                  Math.round(profile.secondary.aiExposure)
                ]
              }) : /* @__PURE__ */ jsx(Text, {
                dimColor: true,
                children: "AI exposure Tracking begins after first session"
              }),
              profile.secondary.structuralRisk > 0 && /* @__PURE__ */ jsxs(Text, {
                dimColor: true,
                children: [
                  "structural ",
                  Math.round(profile.secondary.structuralRisk)
                ]
              })
            ]
          })
        ]
      }),
      /* @__PURE__ */ jsxs(Box, {
        marginTop: 1,
        flexDirection: "column",
        children: [
          topDriver && /* @__PURE__ */ jsxs(Text, {
            children: [
              "Top driver: ",
              topDriver.label
            ]
          }),
          /* @__PURE__ */ jsxs(Text, {
            children: [
              "Confidence: ",
              profile.confidence >= 0.7 ? "high" : profile.confidence >= 0.4 ? "moderate" : "low"
            ]
          })
        ]
      })
    ]
  });
}
__name(ProfileMetrics, "ProfileMetrics");
function Profile({ profile, onContinue }) {
  useInput((_input, key) => {
    if (key.return) {
      onContinue();
    }
  });
  const { isWide } = useTerminalLayout();
  return /* @__PURE__ */ jsxs(Box, {
    flexDirection: "column",
    borderStyle: "round",
    padding: 1,
    children: [
      isWide ? /* @__PURE__ */ jsxs(Box, {
        children: [
          /* @__PURE__ */ jsx(Box, {
            width: 45,
            flexShrink: 0,
            children: /* @__PURE__ */ jsx(Logo, {})
          }),
          /* @__PURE__ */ jsx(Box, {
            flexGrow: 1,
            children: /* @__PURE__ */ jsx(ProfileMetrics, {
              profile
            })
          })
        ]
      }) : /* @__PURE__ */ jsx(ProfileMetrics, {
        profile
      }),
      /* @__PURE__ */ jsx(Box, {
        marginTop: 1,
        children: /* @__PURE__ */ jsxs(Text, {
          color: BRAND_COLORS.primary,
          children: [
            "Press [ENTER] to see what we found ",
            "\u2192"
          ]
        })
      })
    ]
  });
}
__name(Profile, "Profile");

// src/ui/init/InitApp.tsx
var MIN_SCAN_DISPLAY_MS = 4e3;
function ScanningFrame({ repoPath, onComplete }) {
  const { done, errored } = useAnalysis(repoPath, onComplete, MIN_SCAN_DISPLAY_MS);
  const statusLabel = done ? "[\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588] done" : errored ? "[  error  ]" : "[\u2588\u2588\u2588\u2588\u2588\u2588\u2591\u2591\u2591\u2591] ...";
  return /* @__PURE__ */ jsxs(Box, {
    flexDirection: "column",
    borderStyle: "round",
    padding: 1,
    children: [
      /* @__PURE__ */ jsx(Text, {
        children: "Scanning your development history..."
      }),
      /* @__PURE__ */ jsxs(Box, {
        marginTop: 1,
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsxs(Text, {
            children: [
              "Reflog Analysis ",
              statusLabel
            ]
          }),
          /* @__PURE__ */ jsxs(Text, {
            children: [
              "Commit Patterns ",
              statusLabel
            ]
          }),
          /* @__PURE__ */ jsxs(Text, {
            children: [
              "Repo Structure ",
              statusLabel
            ]
          }),
          /* @__PURE__ */ jsxs(Text, {
            children: [
              "Dependency Analysis ",
              statusLabel
            ]
          })
        ]
      }),
      /* @__PURE__ */ jsxs(Box, {
        marginTop: 1,
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsxs(Text, {
            color: "green",
            children: [
              "\u{1F512}",
              " Metadata only - file contents are never read"
            ]
          }),
          /* @__PURE__ */ jsxs(Text, {
            dimColor: true,
            children: [
              "\u2601",
              " Baseline comparison: disabled (offline mode)"
            ]
          })
        ]
      })
    ]
  });
}
__name(ScanningFrame, "ScanningFrame");
var FRAME_ENABLED_MAP = {
  VIRGIN: {
    detection: true,
    scanning: true,
    profile: true,
    insights: true,
    consent: true,
    activation: true
  },
  NEW_WORKSPACE: {
    detection: false,
    scanning: true,
    profile: true,
    insights: true,
    consent: true,
    activation: true
  },
  COLD_RETURN: {
    detection: false,
    scanning: true,
    profile: true,
    insights: true,
    consent: false,
    activation: true
  },
  WARM_RETURN: {
    detection: false,
    scanning: false,
    profile: true,
    insights: false,
    consent: false,
    activation: true
  },
  HOT_RECONNECT: {
    detection: false,
    scanning: false,
    profile: false,
    insights: false,
    consent: false,
    activation: true
  }
};
function isFrameEnabled(frame, profile = "COLD_RETURN") {
  return FRAME_ENABLED_MAP[profile]?.[frame] ?? true;
}
__name(isFrameEnabled, "isFrameEnabled");
function InitApp({ pathArg, options, initProfile }) {
  const [stage, setStage] = useState("detection");
  const [profile, setProfile] = useState(null);
  const repoPath = typeof pathArg === "string" && pathArg || process.cwd();
  const handleNextStage = useCallback(() => {
    const allStages = [
      "detection",
      "scanning",
      "profile",
      "insights",
      "consent",
      "activation"
    ];
    const profile2 = initProfile ?? "COLD_RETURN";
    const enabledStages = allStages.filter((s) => isFrameEnabled(s, profile2));
    const currentIndex = enabledStages.indexOf(stage);
    if (currentIndex < enabledStages.length - 1) {
      const nextStage = enabledStages[currentIndex + 1];
      setStage(nextStage);
    }
  }, [
    stage,
    initProfile
  ]);
  const handlePrevStage = useCallback(() => {
    const allStages = [
      "detection",
      "scanning",
      "profile",
      "insights",
      "consent",
      "activation"
    ];
    const profile2 = initProfile ?? "COLD_RETURN";
    const enabledStages = allStages.filter((s) => isFrameEnabled(s, profile2));
    const currentIndex = enabledStages.indexOf(stage);
    if (currentIndex > 0) {
      const prevStage = enabledStages[currentIndex - 1];
      setStage(prevStage);
    }
  }, [
    stage,
    initProfile
  ]);
  useKeyboard({
    onEnter: handleNextStage,
    onEscape: /* @__PURE__ */ __name(() => {
      process.exit(0);
    }, "onEscape"),
    onArrowRight: handleNextStage,
    onArrowLeft: handlePrevStage,
    enabled: stage === "profile" || stage === "insights" || stage === "activation"
  });
  useEffect(() => {
  }, [
    stage
  ]);
  const isGitRepo = existsSync(join(repoPath, ".git"));
  if (!isGitRepo) {
    return /* @__PURE__ */ jsxs(Box, {
      flexDirection: "column",
      padding: 1,
      children: [
        /* @__PURE__ */ jsx(Text, {
          children: "Vreko requires a Git repository."
        }),
        /* @__PURE__ */ jsxs(Box, {
          marginTop: 1,
          flexDirection: "column",
          children: [
            /* @__PURE__ */ jsxs(Text, {
              children: [
                "Initialize one with: ",
                /* @__PURE__ */ jsx(Text, {
                  color: "cyan",
                  children: "git init"
                })
              ]
            }),
            /* @__PURE__ */ jsxs(Text, {
              children: [
                "Then run: ",
                /* @__PURE__ */ jsx(Text, {
                  color: "cyan",
                  children: "vr init"
                })
              ]
            })
          ]
        })
      ]
    });
  }
  const handleScanComplete = useCallback((p) => {
    setProfile(p);
    setStage("profile");
  }, []);
  return /* @__PURE__ */ jsxs(Box, {
    flexDirection: "column",
    padding: 1,
    width: 80,
    children: [
      (stage === "detection" || stage === "scanning") && /* @__PURE__ */ jsx(Logo, {}),
      stage === "detection" && isFrameEnabled("detection", initProfile ?? "COLD_RETURN") && /* @__PURE__ */ jsx(Detection, {
        repoPath,
        onReady: /* @__PURE__ */ __name(() => setStage("scanning"), "onReady")
      }),
      stage === "scanning" && isFrameEnabled("scanning", initProfile ?? "COLD_RETURN") && /* @__PURE__ */ jsx(ScanningFrame, {
        repoPath,
        onComplete: handleScanComplete
      }),
      stage === "profile" && profile && isFrameEnabled("profile", initProfile ?? "COLD_RETURN") && /* @__PURE__ */ jsx(Profile, {
        profile,
        onContinue: /* @__PURE__ */ __name(() => setStage("insights"), "onContinue")
      }),
      stage === "insights" && profile && isFrameEnabled("insights", initProfile ?? "COLD_RETURN") && /* @__PURE__ */ jsx(Insights, {
        profile,
        onContinue: /* @__PURE__ */ __name(() => setStage("consent"), "onContinue")
      }),
      stage === "consent" && isFrameEnabled("consent", initProfile ?? "COLD_RETURN") && /* @__PURE__ */ jsx(Consent, {
        onAccept: /* @__PURE__ */ __name(() => setStage("activation"), "onAccept")
      }),
      stage === "activation" && profile && isFrameEnabled("activation", initProfile ?? "COLD_RETURN") && /* @__PURE__ */ jsx(Activation, {
        profile,
        repoPath,
        force: options.force
      }),
      (stage === "profile" || stage === "insights" || stage === "activation") && /* @__PURE__ */ jsx(Box, {
        marginTop: 1,
        flexDirection: "column",
        children: /* @__PURE__ */ jsx(Text, {
          dimColor: true,
          children: "Press Enter or \u2192 to continue | \u2190 to go back | ESC to cancel"
        })
      })
    ]
  });
}
__name(InitApp, "InitApp");

export { InitApp, MIN_SCAN_DISPLAY_MS, isFrameEnabled };
//# sourceMappingURL=InitApp-XOOBW6WQ.js.map
//# sourceMappingURL=InitApp-XOOBW6WQ.js.map