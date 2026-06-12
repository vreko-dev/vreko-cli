# @vreko/cli

## 3.1.7

### Patch Changes

- fix: use absolute raw.githubusercontent.com URLs for lockup images in README so they render correctly on npm and GitHub

## 3.1.6

### Patch Changes

- 91ff9e2: fix: auth security hardening and Better Auth 1.6.16 compatibility
  - Closed IDOR vulnerabilities in the api-key-plugin (users could previously enumerate or modify other users' API keys)
  - Restored `createApiKey`/`verifyApiKey` surface after Better Auth v1.6.5 removed the apiKey plugin; now re-implemented via the plugin injection pattern
  - Passed `schema: {}` to `deviceAuthorization` to satisfy the required field added in Better Auth 1.6.16 (previously caused a runtime crash on `vr login`)
  - Account lockout now fails closed rather than open; unsigned `x-auth-context` accept branch removed

- 91ff9e2: fix: production URL defaults, init guard, and daemon idle timeout
  - CLI now defaults to production API (`api.vreko.dev`) and console (`console.vreko.dev`) endpoints out of the box so global installs work without configuration
  - `vr init` no longer overwrites an existing config unless `--force` is passed; null client returned gracefully on health check failure
  - Daemon auto-start idle timeout raised from 15 min to 240 min to prevent premature shutdown during long coding sessions

- 7f65887: fix: device code login flow now works end-to-end

  `vr login` was failing at two points: the CLI was not targeting the
  correct API endpoint, and the device approval page was resolving to the
  wrong domain. Both are fixed — the approval page now correctly opens
  at `console.vreko.dev/link`.

- Updated dependencies [91ff9e2]
- Updated dependencies [91ff9e2]
- Updated dependencies [7f65887]
  - @vreko/auth@0.1.2
  - @vreko/contracts@1.1.0
  - @vreko/local-service@3.1.1
  - @vreko/claims-ledger@0.1.2
  - @vreko/intelligence@0.1.2
  - @vreko/local-service-client@1.0.1
  - @vreko/mcp@0.1.2
  - @vreko/mcp-client@0.1.2

## 3.1.0

### Minor Changes

- **Security hardening: AUTH-01 through AUTH-08**

  Complete security audit and remediation of the CLI authentication surface:
  - OAuth loopback callback now consumes credentials off the URL query parameter (AUTH-07)
  - State nonce added to loopback OAuth callback to prevent CSRF (AUTH-05)
  - Per-install secret entropy added to credential key derivation (AUTH-04)
  - HTTPS enforced on all non-localhost API URL configurations (AUTH-03)
  - `keytar` declared as optional dep with honest fallback to filesystem storage (AUTH-06)
  - Account lockout wired fail-closed with auth behind rate limiter (AUTH-08)
  - API membership and ownership guards added to IDOR-class procedures (AUTH-02)
  - Shell injection and path traversal mitigations in daemon spawn paths (AUTH-01)

- **CLI activation flow and MCP server hardening**

  Platform activation surface and MCP stability improvements:
  - `vr init` is now additive: re-running preserves existing config unless `--force` is passed
  - Supervisor install added to `postinstall` and `preuninstall` lifecycle hooks
  - Per-edit ingress breadcrumb wired so the daemon records edits attributed to the correct AI tool (R-SEAM-4, R-FIX-3)
  - Daemon connection probe timeout decoupled from per-request RPC timeout
  - MCP server: null-safety guards added for optional session array fields
  - MCP server: daemon version injected at build time via tsup `define` for accurate health reporting

### Patch Changes

- Updated dependencies []:
  - @vreko/local-service@3.1.0
  - @vreko/contracts@1.0.1
  - @vreko/claims-ledger@0.1.1
  - @vreko/intelligence@0.1.1
  - @vreko/local-service-client@0.0.2
  - @vreko/mcp@0.1.1
  - @vreko/mcp-client@0.1.1
  - @vreko/auth@0.1.1

## 1.6.0

### Minor Changes

- **Platform Version Alignment**: Version bumped to match VS Code extension v1.6.0
- Part of prevention layer release - collision avoidance system positioning
- No breaking changes - fully compatible with v1.1.14

## 1.1.14

### Patch Changes

- docs: Updated README with professional hero banner
- docs: Fixed GitHub repository URLs to point to vreko-cli repo
- docs: Fixed Discord invite link
- chore: Added .npmignore and .gitattributes for clean package publishing

## 0.2.1

### Patch Changes

- Updated dependencies
  - @vreko/core@0.1.2

## 0.2.0

### Minor Changes

- 884ce9e: refactor: Major repository reorganization
  - Consolidated 10 packages into 4 new packages:
    - @vreko/infrastructure (logging, metrics, tracing)
    - @vreko/integrations (email, payments)
    - @vreko/platform (database schemas, Supabase client)
    - @vreko/config (utility functions, feature flags)
  - Removed deprecated packages: @vreko/database, @vreko/storage, @vreko/telemetry, @vreko/logs, @vreko/observability, @vreko/payments, @vreko/mail, @vreko/feature-flags, @vreko/utils, @vreko/supabase
  - Updated dependencies across all packages to use new consolidated packages
  - Moved utility functions from @vreko/utils to @vreko/config/src/utils
  - Moved feature flag management to @vreko/contracts/src/feature-manager.ts
  - Updated VS Code extension to use new package structure
  - Updated SDK to use @vreko/infrastructure instead of @vreko/logs
  - Updated all import paths to reflect new package structure

### Patch Changes

- Updated dependencies [884ce9e]
  - @vreko/sdk@0.2.0
  - @vreko/contracts@0.2.0
  - @vreko/core@0.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [1ad4518]
  - @vreko/core@0.1.1
  - @vreko/storage@0.0.1

## 0.1.1-beta-beta.20251006185958

### Patch Changes

- Updated dependencies
  - @vreko/core@0.1.1-beta-beta.20251006185958
  - @vreko/storage@0.0.1-beta-beta.20251006185958
