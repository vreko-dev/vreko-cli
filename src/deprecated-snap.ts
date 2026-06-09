/**
 * Deprecated "snap" Binary Wrapper
 *
 * This wrapper provides backward compatibility for users who have the old
 * "snap" command installed. It shows a deprecation warning and forwards
 * to the main CLI.
 *
 * Timeline:
 * - v3.1.0: Added with deprecation warning
 * - v4.0.0: Will be removed (breaking change)
 *
 * @module deprecated-snap
 */

import chalk from "chalk";

const _DEPRECATION_MESSAGE = `
${chalk.yellow.bold("⚠️  DEPRECATION WARNING")}

The ${chalk.red('"snap"')} command is deprecated and will be removed in v4.0.0

${chalk.green("Please use one of these instead:")}
  ${chalk.cyan("vr")} <command>        ${chalk.dim("(recommended - short form)")}
  ${chalk.cyan("vreko")} <command>  ${chalk.dim("(explicit form)")}

${chalk.dim("Update your scripts and aliases now to avoid disruption.")}
${chalk.dim("See: https://docs.vreko.dev/cli/migration")}
`;

// Forward to actual CLI
import("./index.js");
