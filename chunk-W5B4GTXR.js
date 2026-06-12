#!/usr/bin/env node
import { BRAND_COLORS } from './chunk-DMXC2JTC.js';
import { __name } from './chunk-EWOJGXRX.js';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { Box, Text, useInput, useApp } from 'ink';
import React, { useState, useEffect, useRef } from 'react';
import { extendTheme, defaultTheme, ThemeProvider, Badge, Alert, Spinner, ProgressBar, Select, UnorderedList } from '@inkjs/ui';
import * as Sentry from '@sentry/node';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';
var vrekoTheme = extendTheme(defaultTheme, {
  components: {
    Spinner: {
      styles: {
        frame: /* @__PURE__ */ __name(() => ({
          color: BRAND_COLORS.primary
        }), "frame")
      }
    },
    Badge: {
      styles: {
        container: /* @__PURE__ */ __name(({ color }) => ({
          borderColor: color === "green" ? BRAND_COLORS.primary : void 0
        }), "container")
      }
    },
    ProgressBar: {
      styles: {
        filled: /* @__PURE__ */ __name(() => ({
          color: BRAND_COLORS.primary
        }), "filled")
      }
    }
  }
});
function VrekoTheme({ children }) {
  return /* @__PURE__ */ jsx(ThemeProvider, {
    theme: vrekoTheme,
    children
  });
}
__name(VrekoTheme, "VrekoTheme");
var InkErrorBoundary = class extends React.Component {
  static {
    __name(this, "InkErrorBoundary");
  }
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }
  componentDidCatch(error, info) {
    Sentry.captureException(error, {
      extra: {
        componentStack: info.componentStack,
        panel: this.props.panel
      }
    });
  }
  render() {
    if (this.state.hasError) {
      return /* @__PURE__ */ jsx(Box, {
        children: /* @__PURE__ */ jsxs(Text, {
          color: "red",
          children: [
            "\u26A0",
            " ",
            this.props.panel,
            " panel error - data unavailable"
          ]
        })
      });
    }
    return this.props.children;
  }
};
var BRAND_GREEN = "#4ADE80";
var DARK = "#0F172A";
var WHITE = "#F8FAFC";
var SUBTLE = "#64748B";
function GeckoGlyph() {
  return /* @__PURE__ */ jsxs(Text, {
    children: [
      /* @__PURE__ */ jsx(Text, {
        color: BRAND_GREEN,
        children: "\u25B0"
      }),
      /* @__PURE__ */ jsx(Text, {
        color: DARK,
        backgroundColor: BRAND_GREEN,
        children: "\u25CF"
      }),
      /* @__PURE__ */ jsx(Text, {
        color: BRAND_GREEN,
        children: "\u25B8"
      })
    ]
  });
}
__name(GeckoGlyph, "GeckoGlyph");
function VrekoHeader({ version, variant = "default", subtitle = "developer intelligence" }) {
  if (variant === "ceremony") {
    return /* @__PURE__ */ jsxs(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: [
        /* @__PURE__ */ jsxs(Text, {
          children: [
            /* @__PURE__ */ jsx(GeckoGlyph, {}),
            /* @__PURE__ */ jsx(Text, {
              color: WHITE,
              children: " vreko"
            }),
            /* @__PURE__ */ jsxs(Text, {
              color: SUBTLE,
              children: [
                " v",
                version
              ]
            })
          ]
        }),
        /* @__PURE__ */ jsx(Text, {
          children: /* @__PURE__ */ jsxs(Text, {
            color: SUBTLE,
            children: [
              " ",
              subtitle
            ]
          })
        })
      ]
    });
  }
  return /* @__PURE__ */ jsxs(Box, {
    marginBottom: 1,
    children: [
      /* @__PURE__ */ jsx(GeckoGlyph, {}),
      /* @__PURE__ */ jsx(Text, {
        color: WHITE,
        children: " vreko"
      }),
      /* @__PURE__ */ jsxs(Text, {
        color: SUBTLE,
        children: [
          " v",
          version
        ]
      })
    ]
  });
}
__name(VrekoHeader, "VrekoHeader");
function useDaemonPolling(client, intervalMs = 5e3) {
  const [daemon, setDaemon] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    function formatUptime(ms) {
      const s = Math.floor(ms / 1e3);
      const m = Math.floor(s / 60);
      const h = Math.floor(m / 60);
      const d = Math.floor(h / 24);
      if (d > 0) {
        return `${d}d ${h % 24}h`;
      }
      if (h > 0) {
        return `${h}h ${m % 60}m`;
      }
      if (m > 0) {
        return `${m}m ${s % 60}s`;
      }
      return `${s}s`;
    }
    __name(formatUptime, "formatUptime");
    const poll = /* @__PURE__ */ __name(async () => {
      try {
        const status = await client.daemon.status();
        if (cancelled) {
          return;
        }
        setDaemon({
          pid: status.pid,
          version: status.version,
          uptime: formatUptime(status.uptime),
          connections: status.connections,
          memoryMB: Math.round(status.memoryUsage.heapUsed / (1024 * 1024))
        });
        setError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setDaemon(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    }, "poll");
    poll();
    const id = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [
    client,
    intervalMs
  ]);
  return {
    daemon,
    error
  };
}
__name(useDaemonPolling, "useDaemonPolling");
var INITIAL = {
  snapshots: {
    count: 0,
    latestAt: null
  },
  learnings: {
    count: 0
  },
  momentum: null,
  error: null
};
function useSlowPolling(client, intervalMs = 6e4) {
  const [state, setState] = useState(INITIAL);
  const lastGoodRef = useRef({
    snapshots: INITIAL.snapshots,
    learnings: INITIAL.learnings,
    momentum: INITIAL.momentum
  });
  useEffect(() => {
    let cancelled = false;
    const cwd = process.cwd();
    const poll = /* @__PURE__ */ __name(async () => {
      const lg = lastGoodRef.current;
      let snapshotCount = lg.snapshots.count;
      let latestAt = lg.snapshots.latestAt;
      let learningCount = lg.learnings.count;
      let momentumData = lg.momentum;
      const errors = [];
      try {
        const snap = await client.snapshot.list({
          limit: 1,
          orderBy: "createdAt",
          orderDir: "desc"
        });
        snapshotCount = snap.totalCount ?? 0;
        latestAt = snap.snapshots[0]?.createdAt ?? null;
      } catch (err) {
        errors.push(`snapshots: ${err instanceof Error ? err.message : String(err)}`);
      }
      try {
        const learn = await client.learning.list({
          workspace: cwd,
          limit: 1
        });
        learningCount = learn.total;
      } catch (err) {
        errors.push(`learnings: ${err instanceof Error ? err.message : String(err)}`);
      }
      try {
        const mom = await client.momentum.status({
          workspace: cwd
        });
        momentumData = {
          fileCount: mom.fileCount,
          averageScore: mom.averageScore
        };
      } catch (err) {
        errors.push(`momentum: ${err instanceof Error ? err.message : String(err)}`);
      }
      if (cancelled) {
        return;
      }
      lastGoodRef.current = {
        snapshots: {
          count: snapshotCount,
          latestAt
        },
        learnings: {
          count: learningCount
        },
        momentum: momentumData
      };
      setState({
        snapshots: {
          count: snapshotCount,
          latestAt
        },
        learnings: {
          count: learningCount
        },
        momentum: momentumData,
        error: errors.length > 0 ? errors.join("; ") : null
      });
    }, "poll");
    poll();
    const id = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [
    client,
    intervalMs
  ]);
  return state;
}
__name(useSlowPolling, "useSlowPolling");

// src/ui/tui/panels/DashboardPanel.tsx
function formatTimeAgo(ts) {
  if (!ts) {
    return "never";
  }
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diffMs / 6e4);
  if (mins < 1) {
    return "just now";
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${Math.floor(hours / 24)}d ago`;
}
__name(formatTimeAgo, "formatTimeAgo");
function DashboardPanel({ client }) {
  const { daemon, error: daemonError } = useDaemonPolling(client, 5e3);
  const { snapshots, learnings, momentum, error: slowError } = useSlowPolling(client, 6e4);
  const columns = process.stdout.columns ?? 80;
  const daemonVersion = daemon?.version ?? " - ";
  const isConnected = daemon !== null;
  const error = daemonError ?? slowError;
  return /* @__PURE__ */ jsxs(Box, {
    flexDirection: "column",
    paddingX: 1,
    children: [
      /* @__PURE__ */ jsx(VrekoHeader, {
        version: daemonVersion
      }),
      /* @__PURE__ */ jsx(Box, {
        marginBottom: 1,
        children: /* @__PURE__ */ jsx(Badge, {
          color: isConnected ? "green" : "red",
          children: isConnected ? "daemon connected" : "daemon offline"
        })
      }),
      error && /* @__PURE__ */ jsx(Box, {
        marginBottom: 1,
        children: /* @__PURE__ */ jsx(Alert, {
          variant: "error",
          children: error
        })
      }),
      /* @__PURE__ */ jsxs(Box, {
        flexDirection: columns >= 100 ? "row" : "column",
        gap: 3,
        children: [
          /* @__PURE__ */ jsxs(Box, {
            flexDirection: "column",
            minWidth: 24,
            children: [
              /* @__PURE__ */ jsx(Text, {
                bold: true,
                underline: true,
                children: "Daemon"
              }),
              daemon ? /* @__PURE__ */ jsxs(Fragment, {
                children: [
                  /* @__PURE__ */ jsxs(Text, {
                    children: [
                      "PID ",
                      /* @__PURE__ */ jsx(Text, {
                        color: BRAND_COLORS.primary,
                        children: daemon.pid
                      })
                    ]
                  }),
                  /* @__PURE__ */ jsxs(Text, {
                    children: [
                      "Uptime ",
                      /* @__PURE__ */ jsx(Text, {
                        color: BRAND_COLORS.primary,
                        children: daemon.uptime
                      })
                    ]
                  }),
                  /* @__PURE__ */ jsxs(Text, {
                    children: [
                      "Memory ",
                      /* @__PURE__ */ jsxs(Text, {
                        dimColor: true,
                        children: [
                          daemon.memoryMB,
                          " MB"
                        ]
                      })
                    ]
                  }),
                  /* @__PURE__ */ jsxs(Text, {
                    children: [
                      "Conns ",
                      /* @__PURE__ */ jsx(Text, {
                        dimColor: true,
                        children: daemon.connections
                      })
                    ]
                  })
                ]
              }) : /* @__PURE__ */ jsx(Spinner, {
                label: "connecting..."
              })
            ]
          }),
          /* @__PURE__ */ jsxs(Box, {
            flexDirection: "column",
            minWidth: 24,
            children: [
              /* @__PURE__ */ jsx(Text, {
                bold: true,
                underline: true,
                children: "Protection"
              }),
              /* @__PURE__ */ jsxs(Text, {
                children: [
                  "Snapshots ",
                  /* @__PURE__ */ jsx(Text, {
                    color: BRAND_COLORS.primary,
                    children: snapshots.count
                  })
                ]
              }),
              /* @__PURE__ */ jsxs(Text, {
                children: [
                  "Last snap ",
                  /* @__PURE__ */ jsx(Text, {
                    dimColor: true,
                    children: formatTimeAgo(snapshots.latestAt)
                  })
                ]
              }),
              /* @__PURE__ */ jsxs(Text, {
                children: [
                  "Learnings ",
                  /* @__PURE__ */ jsx(Text, {
                    color: BRAND_COLORS.primary,
                    children: learnings.count
                  })
                ]
              })
            ]
          }),
          /* @__PURE__ */ jsxs(Box, {
            flexDirection: "column",
            minWidth: 30,
            children: [
              /* @__PURE__ */ jsx(Text, {
                bold: true,
                underline: true,
                children: "Momentum"
              }),
              momentum ? /* @__PURE__ */ jsxs(Fragment, {
                children: [
                  /* @__PURE__ */ jsxs(Text, {
                    children: [
                      "Files tracked ",
                      /* @__PURE__ */ jsx(Text, {
                        dimColor: true,
                        children: momentum.fileCount
                      })
                    ]
                  }),
                  /* @__PURE__ */ jsxs(Box, {
                    children: [
                      /* @__PURE__ */ jsx(Text, {
                        children: "Score "
                      }),
                      /* @__PURE__ */ jsx(ProgressBar, {
                        value: Math.round(momentum.averageScore * 100)
                      }),
                      /* @__PURE__ */ jsxs(Text, {
                        children: [
                          " ",
                          /* @__PURE__ */ jsxs(Text, {
                            dimColor: true,
                            children: [
                              Math.round(momentum.averageScore * 100),
                              "%"
                            ]
                          })
                        ]
                      })
                    ]
                  })
                ]
              }) : /* @__PURE__ */ jsx(Text, {
                dimColor: true,
                children: "No momentum data yet"
              })
            ]
          })
        ]
      }),
      /* @__PURE__ */ jsx(Box, {
        marginTop: 1,
        children: /* @__PURE__ */ jsx(Text, {
          dimColor: true,
          children: "r:refresh 1-4:panels q:quit"
        })
      })
    ]
  });
}
__name(DashboardPanel, "DashboardPanel");
function LearningsPanel({ client }) {
  const [learnings, setLearnings] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const hasStarted = useRef(false);
  useEffect(() => {
    if (hasStarted.current) {
      return;
    }
    hasStarted.current = true;
    let cancelled = false;
    const cwd = process.cwd();
    const load = /* @__PURE__ */ __name(async () => {
      setIsLoading(true);
      try {
        const result = await client.learning.list({
          workspace: cwd,
          limit: 50
        });
        if (cancelled) {
          return;
        }
        const items = result.learnings.map((l) => ({
          type: l.type,
          trigger: l.trigger,
          action: l.action
        }));
        setLearnings(items);
        setTotal(result.total);
        setError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, "load");
    load();
    return () => {
      cancelled = true;
    };
  }, [
    client
  ]);
  useInput((input) => {
    if (input === "f") {
      setShowFilterMenu((v) => !v);
    }
  });
  const filtered = learnings.filter((l) => {
    if (filter === "all") {
      return true;
    }
    return l.action.length > 0;
  });
  const filterOptions = [
    {
      label: "All learnings",
      value: "all"
    },
    {
      label: "With action only",
      value: "active"
    }
  ];
  return /* @__PURE__ */ jsxs(Box, {
    flexDirection: "column",
    paddingX: 1,
    children: [
      /* @__PURE__ */ jsxs(Box, {
        gap: 2,
        marginBottom: 1,
        children: [
          /* @__PURE__ */ jsxs(Text, {
            bold: true,
            children: [
              "Learnings (",
              total,
              " total)"
            ]
          }),
          /* @__PURE__ */ jsxs(Text, {
            dimColor: true,
            children: [
              "[f:filter = ",
              filter,
              "]"
            ]
          })
        ]
      }),
      error && /* @__PURE__ */ jsx(Box, {
        marginBottom: 1,
        children: /* @__PURE__ */ jsx(Alert, {
          variant: "error",
          children: error
        })
      }),
      isLoading && /* @__PURE__ */ jsx(Spinner, {
        label: "Loading patterns..."
      }),
      !isLoading && learnings.length === 0 && !error && /* @__PURE__ */ jsx(Box, {
        marginTop: 1,
        children: /* @__PURE__ */ jsx(Text, {
          dimColor: true,
          children: "No patterns learned yet. Run an AI session and use vreko_learn to record patterns."
        })
      }),
      showFilterMenu ? /* @__PURE__ */ jsxs(Box, {
        flexDirection: "column",
        marginBottom: 1,
        children: [
          /* @__PURE__ */ jsx(Text, {
            children: "Filter by:"
          }),
          /* @__PURE__ */ jsx(Select, {
            options: filterOptions,
            onChange: /* @__PURE__ */ __name((v) => {
              setFilter(v);
              setShowFilterMenu(false);
            }, "onChange")
          })
        ]
      }) : !isLoading && filtered.length > 0 && /* @__PURE__ */ jsxs(UnorderedList, {
        children: [
          filtered.slice(0, 30).map((l, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: stable list rendered once at mount
            /* @__PURE__ */ jsx(UnorderedList.Item, {
              children: /* @__PURE__ */ jsxs(Text, {
                children: [
                  /* @__PURE__ */ jsx(Text, {
                    bold: true,
                    children: l.type
                  }),
                  /* @__PURE__ */ jsxs(Text, {
                    dimColor: true,
                    children: [
                      " ",
                      "- ",
                      l.trigger.length > 40 ? `${l.trigger.slice(0, 40)}\u2026` : l.trigger
                    ]
                  })
                ]
              })
            }, `${l.type}-${i}`)
          )),
          filtered.length > 30 && /* @__PURE__ */ jsx(UnorderedList.Item, {
            children: /* @__PURE__ */ jsxs(Text, {
              dimColor: true,
              children: [
                "...and ",
                filtered.length - 30,
                " more. Use vr patterns for full list."
              ]
            })
          })
        ]
      }),
      /* @__PURE__ */ jsx(Box, {
        marginTop: 1,
        children: /* @__PURE__ */ jsx(Text, {
          dimColor: true,
          children: "f:filter 1-4:panels q:quit"
        })
      })
    ]
  });
}
__name(LearningsPanel, "LearningsPanel");
function formatSessionDuration(startedAt) {
  const diffMs = Date.now() - new Date(startedAt).getTime();
  const mins = Math.floor(diffMs / 6e4);
  const hours = Math.floor(mins / 60);
  if (hours > 0) {
    return `${hours}h ${mins % 60}m`;
  }
  return `${mins}m`;
}
__name(formatSessionDuration, "formatSessionDuration");
function SessionCard({ session }) {
  return /* @__PURE__ */ jsxs(Box, {
    flexDirection: "column",
    borderStyle: "round",
    paddingX: 1,
    marginBottom: 1,
    children: [
      /* @__PURE__ */ jsxs(Text, {
        children: [
          "ID ",
          /* @__PURE__ */ jsxs(Text, {
            bold: true,
            children: [
              session.id.slice(0, 20),
              "..."
            ]
          })
        ]
      }),
      /* @__PURE__ */ jsxs(Text, {
        children: [
          "Duration ",
          /* @__PURE__ */ jsx(Text, {
            color: BRAND_COLORS.primary,
            children: formatSessionDuration(session.startedAt)
          })
        ]
      }),
      /* @__PURE__ */ jsxs(Text, {
        children: [
          "Started ",
          /* @__PURE__ */ jsx(Text, {
            dimColor: true,
            children: new Date(session.startedAt).toLocaleTimeString()
          })
        ]
      })
    ]
  });
}
__name(SessionCard, "SessionCard");
function SessionUnavailableNotice({ show }) {
  if (!show) {
    return null;
  }
  return /* @__PURE__ */ jsxs(Box, {
    marginTop: 1,
    flexDirection: "column",
    children: [
      /* @__PURE__ */ jsx(Text, {
        dimColor: true,
        children: "Session management is available via MCP tools:"
      }),
      /* @__PURE__ */ jsx(Text, {
        dimColor: true,
        children: " vreko_begin vreko_end vreko_pulse"
      }),
      /* @__PURE__ */ jsx(Text, {
        dimColor: true,
        children: "In-TUI session control arriving in a future release."
      })
    ]
  });
}
__name(SessionUnavailableNotice, "SessionUnavailableNotice");
function useSessionLoader(client, cwd) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionUnavailable, setSessionUnavailable] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const load = /* @__PURE__ */ __name(async () => {
      setIsLoading(true);
      try {
        const response = await client.session.current({
          workspacePath: cwd
        });
        if (cancelled) {
          return;
        }
        const currentSession = response && typeof response === "object" && "session" in response ? response.session : response;
        if (currentSession) {
          setSession({
            id: currentSession.id,
            startedAt: currentSession.startedAt
          });
        } else {
          setSession(null);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("not found") || msg.includes("not implemented") || msg.includes("method")) {
          setSessionUnavailable(true);
        } else {
          setError(msg);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, "load");
    load();
    return () => {
      cancelled = true;
    };
  }, [
    client,
    cwd
  ]);
  return {
    session,
    setSession,
    isLoading,
    error,
    setError,
    sessionUnavailable
  };
}
__name(useSessionLoader, "useSessionLoader");
function useSessionActions(client, cwd, session, setSession, setError) {
  const [viewMode, setViewMode] = useState("overview");
  const [statusMessage, setStatusMessage] = useState(null);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  const handleAction = /* @__PURE__ */ __name(async (action) => {
    if (action === "back") {
      setViewMode("overview");
      return;
    }
    setViewMode("working");
    if (action === "start") {
      try {
        const result = await client.session.start({
          workspacePath: cwd
        });
        if (!isMountedRef.current) {
          return;
        }
        if (result?.id) {
          setSession({
            id: result.id,
            startedAt: result.startedAt
          });
          setStatusMessage("Session started.");
        }
      } catch (err) {
        if (!isMountedRef.current) {
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (isMountedRef.current) {
          setViewMode("overview");
        }
      }
    }
    if (action === "end" && session) {
      try {
        await client.session.end({
          sessionId: session.id
        });
        if (!isMountedRef.current) {
          return;
        }
        setSession(null);
        setStatusMessage("Session ended. Ceremony written to .vreko/docs/last-ceremony.md.");
      } catch (err) {
        if (!isMountedRef.current) {
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (isMountedRef.current) {
          setViewMode("overview");
        }
      }
    }
  }, "handleAction");
  return {
    viewMode,
    statusMessage,
    handleAction
  };
}
__name(useSessionActions, "useSessionActions");
function SessionPanel({ client }) {
  const cwd = process.cwd();
  const { session, setSession, isLoading, error, setError, sessionUnavailable } = useSessionLoader(client, cwd);
  const { viewMode, statusMessage, handleAction } = useSessionActions(client, cwd, session, setSession, setError);
  const sessionActions = session ? [
    {
      label: "End session (save & ceremony)",
      value: "end"
    },
    {
      label: "<- Cancel",
      value: "back"
    }
  ] : [
    {
      label: "Start new session",
      value: "start"
    },
    {
      label: "<- Cancel",
      value: "back"
    }
  ];
  return /* @__PURE__ */ jsxs(Box, {
    flexDirection: "column",
    paddingX: 1,
    children: [
      /* @__PURE__ */ jsx(Text, {
        bold: true,
        children: "Session"
      }),
      isLoading && /* @__PURE__ */ jsx(Spinner, {
        label: "Loading session..."
      }),
      /* @__PURE__ */ jsx(SessionUnavailableNotice, {
        show: sessionUnavailable
      }),
      error && /* @__PURE__ */ jsx(Box, {
        marginTop: 1,
        children: /* @__PURE__ */ jsx(Alert, {
          variant: "error",
          children: error
        })
      }),
      statusMessage && !error && /* @__PURE__ */ jsx(Box, {
        marginTop: 1,
        children: /* @__PURE__ */ jsx(Alert, {
          variant: "success",
          children: statusMessage
        })
      }),
      !isLoading && !sessionUnavailable && /* @__PURE__ */ jsxs(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          session ? /* @__PURE__ */ jsx(SessionCard, {
            session
          }) : /* @__PURE__ */ jsx(Box, {
            marginBottom: 1,
            children: /* @__PURE__ */ jsx(Text, {
              dimColor: true,
              children: "No active session."
            })
          }),
          viewMode === "working" ? /* @__PURE__ */ jsx(Spinner, {
            label: "Working..."
          }) : /* @__PURE__ */ jsx(Select, {
            options: sessionActions,
            onChange: handleAction
          })
        ]
      }),
      /* @__PURE__ */ jsx(Box, {
        marginTop: 1,
        children: /* @__PURE__ */ jsx(Text, {
          dimColor: true,
          children: "1-4:panels q:quit"
        })
      })
    ]
  });
}
__name(SessionPanel, "SessionPanel");
function formatSnapshotDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
__name(formatSnapshotDate, "formatSnapshotDate");
function SnapshotPanel({ client }) {
  const [snapshots, setSnapshots] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [selectedId, setSelectedId] = useState(null);
  const [actionResult, setActionResult] = useState(null);
  const [page, setPage] = useState(0);
  const hasStarted = useRef(false);
  const PAGE_SIZE = 20;
  useEffect(() => {
    if (hasStarted.current && page === 0) {
      return;
    }
    hasStarted.current = true;
    let cancelled = false;
    const load = /* @__PURE__ */ __name(async () => {
      setIsLoading(true);
      try {
        const result = await client.snapshot.list({
          limit: PAGE_SIZE,
          cursor: page > 0 ? String(page * PAGE_SIZE) : void 0,
          orderBy: "createdAt",
          orderDir: "desc"
        });
        if (cancelled) {
          return;
        }
        const items = result.snapshots.map((s) => ({
          id: s.id,
          relativePath: s.relativePath,
          filePath: s.filePath,
          trigger: s.trigger,
          createdAt: s.createdAt
        }));
        setSnapshots((prev) => page === 0 ? items : [
          ...prev,
          ...items
        ]);
        setTotalCount(result.totalCount ?? result.snapshots.length);
        setError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, "load");
    load();
    return () => {
      cancelled = true;
    };
  }, [
    client,
    page
  ]);
  const snapshotOptions = [
    ...snapshots.map((s) => ({
      label: `${formatSnapshotDate(s.createdAt)}  [${s.trigger}]  ${s.relativePath}`,
      value: s.id
    })),
    ...snapshots.length < totalCount ? [
      {
        label: `Load more (${totalCount - snapshots.length} remaining)`,
        value: "__load_more__"
      }
    ] : []
  ];
  const actionOptions = [
    {
      label: "Restore this snapshot",
      value: "restore"
    },
    {
      label: "Diff against current file",
      value: "diff"
    },
    {
      label: "Delete snapshot",
      value: "delete"
    },
    {
      label: "Back to list",
      value: "back"
    }
  ];
  const handleSnapshotSelect = /* @__PURE__ */ __name((value) => {
    if (value === "__load_more__") {
      setPage((p) => p + 1);
      return;
    }
    setSelectedId(value);
    setViewMode("action");
    setActionResult(null);
  }, "handleSnapshotSelect");
  const handleAction = /* @__PURE__ */ __name(async (action) => {
    if (action === "back") {
      setViewMode("list");
      setSelectedId(null);
      return;
    }
    if (!selectedId) {
      return;
    }
    setActionResult(null);
    try {
      switch (action) {
        case "restore": {
          await client.snapshot.restore({
            snapshotId: selectedId,
            createBackup: true,
            dryRun: false
          });
          setActionResult("Snapshot restored successfully.");
          break;
        }
        case "diff": {
          const result = await client.snapshot.diff({
            baseSnapshotId: selectedId,
            contextLines: 3,
            format: "unified"
          });
          const stats = result.stats;
          setActionResult(`Diff: +${stats.additions} -${stats.deletions} across ${stats.filesChanged} file(s)`);
          break;
        }
        case "delete": {
          await client.snapshot.delete({
            snapshotIds: [
              selectedId
            ],
            dryRun: false
          });
          setActionResult("Snapshot deleted.");
          hasStarted.current = false;
          setPage(0);
          setSnapshots([]);
          setViewMode("list");
          break;
        }
      }
    } catch (err) {
      setActionResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, "handleAction");
  return /* @__PURE__ */ jsxs(Box, {
    flexDirection: "column",
    paddingX: 1,
    children: [
      /* @__PURE__ */ jsxs(Text, {
        bold: true,
        children: [
          "Snapshots (",
          totalCount,
          " total)"
        ]
      }),
      error && /* @__PURE__ */ jsx(Box, {
        marginTop: 1,
        children: /* @__PURE__ */ jsx(Alert, {
          variant: "error",
          children: error
        })
      }),
      isLoading && snapshots.length === 0 && /* @__PURE__ */ jsx(Spinner, {
        label: "Loading snapshots..."
      }),
      !isLoading && snapshots.length === 0 && !error && /* @__PURE__ */ jsx(Box, {
        marginTop: 1,
        children: /* @__PURE__ */ jsx(Text, {
          dimColor: true,
          children: "No snapshots yet. Vreko creates snapshots automatically as you work with AI."
        })
      }),
      viewMode === "list" && snapshotOptions.length > 0 && /* @__PURE__ */ jsxs(Box, {
        marginTop: 1,
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsx(Text, {
            dimColor: true,
            children: "\u2191\u2193 navigate ENTER select 1-4:panels"
          }),
          /* @__PURE__ */ jsx(Select, {
            options: snapshotOptions,
            onChange: handleSnapshotSelect,
            visibleOptionCount: 12
          })
        ]
      }),
      viewMode === "action" && selectedId && /* @__PURE__ */ jsxs(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          /* @__PURE__ */ jsxs(Text, {
            children: [
              "Selected: ",
              /* @__PURE__ */ jsx(Text, {
                bold: true,
                children: selectedId.slice(0, 8)
              })
            ]
          }),
          actionResult && /* @__PURE__ */ jsx(Box, {
            marginY: 1,
            children: /* @__PURE__ */ jsx(Alert, {
              variant: actionResult.startsWith("Error") ? "error" : "success",
              children: actionResult
            })
          }),
          /* @__PURE__ */ jsx(Select, {
            options: actionOptions,
            onChange: handleAction
          })
        ]
      }),
      /* @__PURE__ */ jsx(Box, {
        marginTop: 1,
        children: /* @__PURE__ */ jsx(Text, {
          dimColor: true,
          children: "1-4:panels q:quit"
        })
      })
    ]
  });
}
__name(SnapshotPanel, "SnapshotPanel");
function StatusPanel({ client }) {
  const { daemon, error: daemonError } = useDaemonPolling(client, 5e3);
  const { snapshots, learnings, momentum, error: slowError } = useSlowPolling(client, 6e4);
  const isConnected = daemon !== null;
  const error = daemonError ?? slowError;
  const daemonVersion = daemon?.version ?? " - ";
  return /* @__PURE__ */ jsxs(Box, {
    flexDirection: "column",
    paddingX: 1,
    children: [
      /* @__PURE__ */ jsx(VrekoHeader, {
        version: daemonVersion,
        subtitle: "workspace status"
      }),
      /* @__PURE__ */ jsx(Box, {
        marginBottom: 1,
        children: /* @__PURE__ */ jsx(Badge, {
          color: isConnected ? "green" : "red",
          children: isConnected ? `daemon v${daemonVersion}  pid:${daemon?.pid}  uptime:${daemon?.uptime}` : "daemon offline  -  run: vr service start"
        })
      }),
      error && /* @__PURE__ */ jsx(Box, {
        marginBottom: 1,
        children: /* @__PURE__ */ jsx(Alert, {
          variant: "warning",
          children: error
        })
      }),
      /* @__PURE__ */ jsxs(Box, {
        flexDirection: "column",
        borderStyle: "round",
        paddingX: 1,
        marginBottom: 1,
        children: [
          /* @__PURE__ */ jsx(Text, {
            bold: true,
            children: "Workspace Health"
          }),
          /* @__PURE__ */ jsxs(Text, {
            children: [
              "Snapshots ",
              /* @__PURE__ */ jsx(Text, {
                color: BRAND_COLORS.primary,
                children: snapshots.count
              })
            ]
          }),
          /* @__PURE__ */ jsxs(Text, {
            children: [
              "Learnings ",
              /* @__PURE__ */ jsx(Text, {
                color: BRAND_COLORS.primary,
                children: learnings.count
              })
            ]
          }),
          /* @__PURE__ */ jsxs(Text, {
            children: [
              "Momentum",
              " ",
              /* @__PURE__ */ jsx(Text, {
                dimColor: true,
                children: momentum ? `${Math.round(momentum.averageScore * 100)}%` : "uncalibrated"
              })
            ]
          }),
          /* @__PURE__ */ jsxs(Text, {
            children: [
              "Connection",
              " ",
              isConnected ? /* @__PURE__ */ jsx(Text, {
                color: BRAND_COLORS.primary,
                children: "healthy"
              }) : /* @__PURE__ */ jsx(Text, {
                color: BRAND_COLORS.error,
                children: "offline"
              })
            ]
          })
        ]
      }),
      !daemon && /* @__PURE__ */ jsx(Spinner, {
        label: "Connecting to daemon..."
      }),
      /* @__PURE__ */ jsx(Box, {
        marginTop: 1,
        children: /* @__PURE__ */ jsx(Text, {
          dimColor: true,
          children: "r:refresh 1-4:panels q:quit"
        })
      })
    ]
  });
}
__name(StatusPanel, "StatusPanel");
var LABELS = {
  dashboard: [
    "[1] Dashboard",
    "[1]"
  ],
  session: [
    "[2] Session",
    "[2]"
  ],
  snapshots: [
    "[3] Snapshots",
    "[3]"
  ],
  learnings: [
    "[4] Learnings",
    "[4]"
  ]
};
var PANELS = [
  "dashboard",
  "session",
  "snapshots",
  "learnings"
];
function TabBar({ active }) {
  const columns = process.stdout.columns ?? 80;
  const narrow = columns < 80;
  return /* @__PURE__ */ jsxs(Box, {
    gap: 2,
    marginBottom: 1,
    borderStyle: "single",
    borderColor: "#4ADE80",
    paddingX: 1,
    children: [
      PANELS.map((p) => /* @__PURE__ */ jsx(Text, {
        color: p === active ? "#4ADE80" : void 0,
        bold: p === active,
        dimColor: p !== active,
        children: narrow ? LABELS[p][1] : LABELS[p][0]
      }, p)),
      /* @__PURE__ */ jsx(Text, {
        dimColor: true,
        children: " q:quit r:refresh"
      })
    ]
  });
}
__name(TabBar, "TabBar");

// src/ui/tui/TuiApp.tsx
var PANELS2 = [
  "dashboard",
  "session",
  "snapshots",
  "learnings"
];
function TuiApp({ client, initialPanel = "dashboard", statusFocus = false }) {
  const { exit } = useApp();
  const [activePanel, setActivePanel] = useState(initialPanel);
  useEffect(() => {
    return () => {
      client.close();
    };
  }, [
    client
  ]);
  useInput((input, key) => {
    if (input === "q" || key.ctrl && input === "c") {
      exit();
      return;
    }
    if (input === "1") {
      setActivePanel("dashboard");
      return;
    }
    if (input === "2") {
      setActivePanel("session");
      return;
    }
    if (input === "3") {
      setActivePanel("snapshots");
      return;
    }
    if (input === "4") {
      setActivePanel("learnings");
      return;
    }
    if (key.rightArrow) {
      const idx = PANELS2.indexOf(activePanel);
      setActivePanel(PANELS2[(idx + 1) % PANELS2.length]);
      return;
    }
    if (key.leftArrow) {
      const idx = PANELS2.indexOf(activePanel);
      setActivePanel(PANELS2[(idx - 1 + PANELS2.length) % PANELS2.length]);
    }
  });
  return /* @__PURE__ */ jsx(VrekoTheme, {
    children: /* @__PURE__ */ jsxs(Box, {
      flexDirection: "column",
      children: [
        /* @__PURE__ */ jsx(TabBar, {
          active: activePanel
        }),
        activePanel === "dashboard" && /* @__PURE__ */ jsx(InkErrorBoundary, {
          panel: "dashboard",
          children: statusFocus ? /* @__PURE__ */ jsx(StatusPanel, {
            client
          }) : /* @__PURE__ */ jsx(DashboardPanel, {
            client
          })
        }),
        activePanel === "session" && /* @__PURE__ */ jsx(InkErrorBoundary, {
          panel: "session",
          children: /* @__PURE__ */ jsx(SessionPanel, {
            client
          })
        }),
        activePanel === "snapshots" && /* @__PURE__ */ jsx(InkErrorBoundary, {
          panel: "snapshots",
          children: /* @__PURE__ */ jsx(SnapshotPanel, {
            client
          })
        }),
        activePanel === "learnings" && /* @__PURE__ */ jsx(InkErrorBoundary, {
          panel: "learnings",
          children: /* @__PURE__ */ jsx(LearningsPanel, {
            client
          })
        })
      ]
    })
  });
}
__name(TuiApp, "TuiApp");

export { TuiApp };
//# sourceMappingURL=chunk-W5B4GTXR.js.map
//# sourceMappingURL=chunk-W5B4GTXR.js.map