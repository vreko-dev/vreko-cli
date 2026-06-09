# @vreko/cli

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
