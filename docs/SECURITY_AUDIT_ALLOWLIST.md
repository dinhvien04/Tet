# npm audit allowlist (high+ gate)

CI runs `npm audit --audit-level=high` and **fails on high/critical**.

As of round 3, remaining findings are **moderate** only and come from transitive dependencies without a non-breaking upgrade path:

| Package | Severity | Advisory | Reason not upgraded | Owner | Review by |
|---|---|---|---|---|---|
| `uuid` (via `next-auth@4`) | moderate | GHSA-w5hq-g745-h8pq | NextAuth v4 pins uuid; Auth.js v5 is a large migration | platform | 2026-09-01 |
| `postcss` (bundled in `next`) | moderate | GHSA-qx2v-qp2m-jg93 | Fixed only by Next canary / major force | platform | 2026-09-01 |
| `brace-expansion` | moderate | GHSA-f886-m6hf-6m8v | Dev/transitive; not production request path | platform | 2026-09-01 |

**Rules**

1. Do **not** use `npm audit --audit-level=high \|\| true`.
2. Do **not** allowlist high/critical without advisory ID, owner, and expiry.
3. Re-run `npm audit` after each Next.js / next-auth upgrade.
4. Prefer `npm audit fix` (non-force) when available.

Last reviewed: 2026-07-11
