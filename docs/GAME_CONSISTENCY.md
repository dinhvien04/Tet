# Bau Cua consistency

## Requirements

- Multi-document bet + settlement use `withMongoTransaction` when MongoDB is a **replica set** (Atlas default).
- Production fails closed with **503** if replica set is unavailable (`REQUIRE_MONGO_TRANSACTIONS` / production default).
- Local standalone MongoDB may run without multi-doc transactions; single-document conditional updates still apply.

## Models

| Model | Role |
|-------|------|
| `BauCuaRound` | Round lifecycle `betting → rolling → rolled` |
| `BauCuaFamilyState` | One active round pointer per family |
| `BauCuaBet` | Bets + unique `(roundId, userId, idempotencyKey)` |
| `BauCuaWallet` | `balance` + `reservedBalance` |
| `BauCuaSettlement` | Unique `roundId` ledger of wallet deltas |

## Flows

### Start

Admin only. Creates round + sets family state active, or returns existing active round.

### Bet

Requires `idempotencyKey`. In one transaction: verify betting window → reserve via `$expr` → insert bet. Retry same key returns same bet without double reserve.

### Roll

Authorization (host/admin) **before** CAS. CAS `betting → rolling` with host filter for non-admin. Then bets, wallet updates, settlement ledger, mark rolled, clear family active — all in one transaction. Unique settlement prevents double pay.

## Recovery

- Stuck `rolling` without settlement: retry roll is safe if settlement unique; otherwise ops can re-run settle script (future).
- Do not auto-roll without host.

## CI

Full concurrency tests need MongoDB replica set in CI (see fix.md Round 2 §10). Unit suite does not start a replica set yet.
