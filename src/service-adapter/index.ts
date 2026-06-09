/**
 * Vreko Daemon Module
 *
 * Unified export barrel for the daemon/local-service adapter.
 * All old daemon files (server, client, protocol, platform, etc.) have been
 * merged into local-service and removed. This file now only re-exports
 * from the local-service-adapter.
 *
 * @module daemon
 */

export {
	connectServiceClient,
	createServiceClient,
	// Version detection
	DAEMON_GENERATION,
	formatBytes,
	formatDuration,
	getDaemonVersion,
	getLogPath,
	getServicePidPath,
	getServicePidPath as getPidPath,
	getServiceSocketPath,
	getServiceSocketPath as getSocketPath,
	isServiceRunning,
	// Backward compatibility aliases
	isServiceRunning as isDaemonRunning,
	readServicePid,
} from "./local-service-adapter.js";
