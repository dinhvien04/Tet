# MongoDB indexes (Tết Connect)

Indexes declared on Mongoose schemas (created on first model use / app boot):

| Collection | Index | Notes |
|---|---|---|
| users | `email` unique | also `role` |
| family_members | `(familyId, userId)` unique | membership |
| posts | `(familyId, createdAt, _id)` sort | feed cursor |
| photos | `(familyId, uploadedAt)` | album |
| events | `(familyId, date)` | upcoming |
| event_tasks | `(eventId, status)`, `assignedTo` | tasks |
| notifications | `(userId, read, createdAt)`, `dedupeKey` unique sparse | |
| reactions | `(postId, userId)` unique | |
| comments | `(postId, createdAt)` | |
| baucuaround | `(familyId, roundNumber)` unique | |
| baucuabet | `(roundId, userId)`, idempotency sparse unique | |
| baucuawallet | `(familyId, userId)` unique | |
| ratelimits | `key` unique, TTL `expiresAt` | |

## Transactions

Bau Cua atomic updates use single-document `findOneAndUpdate` / `$expr` where possible so they work on standalone MongoDB. Multi-document transactions need a replica set (Atlas default). Document this for production:

```text
Local standalone: conditional updates OK
Production Atlas: replica set required for multi-doc transactions if added later
```
