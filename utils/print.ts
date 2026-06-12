/**
 * CLI output utility  -  writes directly to process.stdout instead of the console object.
 * Writes to process.stdout so it does not conflict with structured logging.
 */
export function print(...args: unknown[]): void {
	if (args.length === 0) {
		process.stdout.write("\n");
	} else {
		process.stdout.write(`${args.map(String).join(" ")}\n`);
	}
}
