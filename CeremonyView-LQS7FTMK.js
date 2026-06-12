#!/usr/bin/env node
import { BRAND_COLORS } from './chunk-DMXC2JTC.js';
import { __name } from './chunk-EWOJGXRX.js';
import { jsx, jsxs } from 'react/jsx-runtime';
import { useApp, useInput, Box, Text } from 'ink';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';
function CeremonyView({ record }) {
  const { exit } = useApp();
  useInput((_input, _key) => {
    exit();
  }, {
    isActive: true
  });
  if (!record) {
    return /* @__PURE__ */ jsx(Box, {
      borderStyle: "round",
      padding: 1,
      children: /* @__PURE__ */ jsx(Text, {
        dimColor: true,
        children: "Service not connected - ceremony data unavailable."
      })
    });
  }
  const durationMs = record.duration ?? 0;
  const durationMin = Math.floor(durationMs / 6e4);
  const durationSec = Math.floor(durationMs % 6e4 / 1e3);
  const durationStr = durationMin > 0 ? `${durationMin}m ${durationSec}s` : `${durationSec}s`;
  const sessionIdShort = record.sessionId ? record.sessionId.slice(0, 8) : "unknown";
  const workspaceShort = record.workspacePath ? record.workspacePath.slice(-12) : "unknown";
  const generatedAt = (/* @__PURE__ */ new Date()).toLocaleTimeString();
  return /* @__PURE__ */ jsxs(Box, {
    flexDirection: "column",
    borderStyle: "round",
    padding: 1,
    width: 60,
    children: [
      /* @__PURE__ */ jsx(Text, {
        bold: true,
        children: "Vreko Session Summary"
      }),
      /* @__PURE__ */ jsxs(Box, {
        marginTop: 1,
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsxs(Text, {
            children: [
              "Learnings captured:  ",
              /* @__PURE__ */ jsx(Text, {
                color: BRAND_COLORS.primary,
                children: String(record.learningsCaptured ?? 0)
              })
            ]
          }),
          /* @__PURE__ */ jsxs(Text, {
            children: [
              "Checkpoints created: ",
              /* @__PURE__ */ jsx(Text, {
                color: BRAND_COLORS.primary,
                children: String(record.checkpointsCreated ?? 0)
              })
            ]
          }),
          /* @__PURE__ */ jsxs(Text, {
            children: [
              "Duration:            ",
              /* @__PURE__ */ jsx(Text, {
                color: BRAND_COLORS.primary,
                children: durationStr
              })
            ]
          }),
          /* @__PURE__ */ jsxs(Text, {
            children: [
              "Pitfalls avoided:    ",
              /* @__PURE__ */ jsx(Text, {
                color: BRAND_COLORS.primary,
                children: String(record.pitfallsAvoided ?? 0)
              })
            ]
          }),
          /* @__PURE__ */ jsxs(Text, {
            children: [
              "Fragility exposure:  ",
              /* @__PURE__ */ jsx(Text, {
                color: BRAND_COLORS.primary,
                children: (record.fragilityExposure ?? 0).toFixed(2)
              })
            ]
          })
        ]
      }),
      /* @__PURE__ */ jsxs(Box, {
        marginTop: 1,
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsxs(Text, {
            dimColor: true,
            children: [
              "Session: ",
              sessionIdShort
            ]
          }),
          /* @__PURE__ */ jsxs(Text, {
            dimColor: true,
            children: [
              "Workspace: ...",
              workspaceShort
            ]
          }),
          /* @__PURE__ */ jsxs(Text, {
            dimColor: true,
            children: [
              "Generated: ",
              generatedAt
            ]
          })
        ]
      }),
      /* @__PURE__ */ jsx(Box, {
        marginTop: 1,
        children: /* @__PURE__ */ jsx(Text, {
          dimColor: true,
          children: "[any key] continue"
        })
      })
    ]
  });
}
__name(CeremonyView, "CeremonyView");

export { CeremonyView };
//# sourceMappingURL=CeremonyView-LQS7FTMK.js.map
//# sourceMappingURL=CeremonyView-LQS7FTMK.js.map