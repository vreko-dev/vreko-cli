#!/usr/bin/env node
import chalk from 'chalk';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';
var BRAND_COLORS = {
  /** Primary brand green - main color for headers, highlights */
  primary: "#4ADE80",
  /** Darker green for secondary elements */
  primaryDark: "#22C55E",
  /** Light green for subtle highlights */
  primaryLight: "#6EE7A7",
  /** Semantic colors */
  success: "#34D399",
  warning: "#FF6B35",
  error: "#EF4444",
  info: "#3B82F6",
  /** Neutral colors */
  muted: "#71717A",
  text: "#FAFAFA"
};
var theme = {
  /** Primary brand color - use for headers, highlights, commands */
  brand: chalk.hex(BRAND_COLORS.primary),
  /** Primary brand color bold - use for section headers */
  brandBold: chalk.hex(BRAND_COLORS.primary).bold,
  /** Darker brand color - use for secondary emphasis */
  brandDark: chalk.hex(BRAND_COLORS.primaryDark),
  /** Success messages */
  success: chalk.hex(BRAND_COLORS.success),
  /** Warning messages */
  warning: chalk.hex(BRAND_COLORS.warning),
  /** Error messages */
  error: chalk.hex(BRAND_COLORS.error),
  /** Informational (semantic blue - use sparingly) */
  info: chalk.hex(BRAND_COLORS.info),
  /** Muted/secondary text */
  muted: chalk.gray,
  /** Dimmed text */
  dim: chalk.dim,
  /** Bold text */
  bold: chalk.bold,
  /** White text */
  white: chalk.white,
  /** Table headers - use brand color */
  tableHeader: chalk.hex(BRAND_COLORS.primary)
};
({
  success: chalk.green("\u2713"),
  error: chalk.red("\u2717"),
  warning: chalk.yellow("\u26A0"),
  info: theme.brand("\u2139"),
  step: theme.brand("\u203A"),
  bullet: theme.brand("\u2022")
});

export { BRAND_COLORS };
//# sourceMappingURL=chunk-DMXC2JTC.js.map
//# sourceMappingURL=chunk-DMXC2JTC.js.map