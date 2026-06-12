#!/usr/bin/env node
import chalk from 'chalk';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';
`
${chalk.yellow.bold("\u26A0\uFE0F  DEPRECATION WARNING")}

The ${chalk.red('"snap"')} command is deprecated and will be removed in v4.0.0

${chalk.green("Please use one of these instead:")}
  ${chalk.cyan("vr")} <command>        ${chalk.dim("(recommended - short form)")}
  ${chalk.cyan("vreko")} <command>  ${chalk.dim("(explicit form)")}

${chalk.dim("Update your scripts and aliases now to avoid disruption.")}
${chalk.dim("See: https://docs.vreko.dev/cli/migration")}
`;
import('./index.js');
//# sourceMappingURL=deprecated-snap.js.map
//# sourceMappingURL=deprecated-snap.js.map