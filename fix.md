# GROK 4.5 — TẾT CONNECT REVIEW ROUND 4

> Repository: `https://github.com/dinhvien04/Tet`
>
> Commit đã review: `d9e7210c9c42b2af5c1554ec0ee16a233834ac36`
>
> Đây là prompt nối tiếp các vòng sửa trước. Không làm lại dự án và không ưu tiên thêm tính năng mới.

---

## 1. Mục tiêu

Bản hiện tại đã sửa được nhiều vấn đề lớn:

- Next.js `16.2.10`, NextAuth `4.24.14`.
- Cookie NextAuth dùng mặc định.
- CSP production đã bỏ `unsafe-eval`.
- Bầu Cua có transaction, shared family state và settlement ledger.
- Soft-delete credentials user đã sửa schema password.
- Upload dùng Sharp và có cleanup job.
- CI đã dựng MongoDB replica set.
- Có audit event, request ID và migration script.

Vòng này tập trung vào **reliability và bằng chứng test thật**:

1. CI không được che test failure.
2. E2E phải chạy production server thật, không skip.
3. Integration test phải gọi đúng service/route production.
4. Transactional outbox phải được tạo cùng transaction.
5. Cleanup worker phải claim job nguyên tử và có lease.
6. Admin invariant không được drift.
7. Game bootstrap không được tiếp tục transaction sau duplicate-key.
8. Quota reservation phải idempotent thật.
9. Migration phải đọc đúng collection và fail đúng exit code.
10. Request ID phải xuyên middleware → route → audit.

---

## 2. Quy tắc bắt buộc

### Baseline

Chạy:

```bash
git status
git rev-parse HEAD
git log --oneline -12
node --version
npm --version
npm ci --legacy-peer-deps
npm run lint
npm run typecheck
npm run test:unit
npm run test:security
npm run test:integration
npm run test:e2e
npm run test:property
npm test
npm run build
npm audit --audit-level=high
```

Báo rõ:

- Số suite/test pass.
- Số test fail.
- Số test bị skip.
- Test nào dùng DB thật.
- Test nào mock.
- E2E có start server thật hay không.

### Không được làm

- Không deploy.
- Không push thẳng `main`.
- Không dùng production database.
- Không thêm feature mới.
- Không dùng `|| true`.
- Không dùng dấu `;` để nối quality commands.
- Không biến test thành `expect(true).toBe(true()`.
- Không gọi test là integration nếu code production bị copy lại trong test.
- Không source-string matching làm bằng chứng behavioral chính.
- Không catch `E11000` trong transaction rồi tiếp tục dùng session.
- Không swallow cleanup failure làm mất khả năng retry.
- Không hard-code migration confirmation.
- Không tuyên bố CI xanh nếu chưa có workflow run/check thật.

---

# 3. P0 — CI đang có thể che unit-test failure

Workflow hiện có:

```yaml
run: npm run test:unit ; npm run test:security
```

Nếu unit fail nhưng security pass, shell có thể trả exit code của command cuối.

## Sửa

Tách thành hai step:

```yaml
- name: Unit tests
  run: npm run test:unit

- name: Security tests
  run: npm run test:security
```

Không dùng:

```text
;
|| true
set +e
continue-on-error
```

cho required quality gates.

## Final gate

Tạo job:

```yaml
final-gate:
  if: always()
  needs:
    - quality
    - integration
    - e2e
    - build
    - audit
```

Final gate phải fail nếu bất kỳ job required nào:

- failure.
- cancelled.
- skipped không hợp lệ.

Branch protection chỉ cần check `final-gate`, nhưng final-gate phải phụ thuộc đầy đủ.

## Kiểm tra

- Cố ý tạo unit test fail trên branch test.
- Xác nhận workflow fail.
- Revert test.
- Chạy lại workflow.

---

# 4. P0 — E2E hiện tự skip

`tests/e2e-protected-routes.test.ts` chỉ chạy khi có:

```text
E2E_BASE_URL
```

Nếu thiếu, suite chính bị skip và skip marker vẫn pass.

CI hiện không start production server trước E2E.

## Tạo E2E job thật

1. Install.
2. Start MongoDB replica set.
3. Seed test database.
4. `npm run build`.
5. Start `npm run start`.
6. Wait readiness.
7. Set `E2E_BASE_URL`.
8. Run E2E.
9. Stop server.
10. Upload server logs khi fail.

Ví dụ:

```bash
npm run build
npm run start > /tmp/tet-e2e.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID || true' EXIT

for i in $(seq 1 60); do
  curl -fsS http://127.0.0.1:3000/api/health/ready && break
  sleep 1
done

E2E_BASE_URL=http://127.0.0.1:3000 npm run test:e2e
```

Khi `CI=true` mà thiếu `E2E_BASE_URL`, test phải throw thay vì skip.

## E2E bắt buộc

Anonymous:

- `/dashboard`
- `/family`
- `/profile`
- `/admin`
- `/events`
- `/photos`
- `/posts`
- `/games/bau-cua`

Authenticated:

- Credentials login.
- Session cookie.
- Dashboard access.
- Protected API.
- Logout.
- Cookie cũ bị chặn.

Session invalidation:

- Login.
- Bump `sessionVersion`.
- Request tiếp theo bị từ chối.

CSP:

- Production có CSP.
- Không có `unsafe-eval`.
- Trang render thành công.

---

# 5. P0 — Integration test đang copy logic production

`tests/bau-cua-mongo.integration.test.ts` định nghĩa lại các transaction tương tự route.

Điều này chỉ chứng minh code trong test hoạt động, không chứng minh:

```text
app/api/games/bau-cua/start/route.ts
app/api/games/bau-cua/bet/route.ts
app/api/games/bau-cua/roll/route.ts
```

đúng.

`tests/bau-cua-concurrency.test.ts` còn đọc source và kiểm `toContain()`.

`account-delete-mongo.integration.test.ts` mới test schema save, chưa gọi deletion transaction thật.

## Tách production service

Tạo:

```text
lib/services/bau-cua/start-round.ts
lib/services/bau-cua/place-bet.ts
lib/services/bau-cua/settle-round.ts
lib/services/account/delete-account.ts
lib/services/admin/change-system-role.ts
lib/services/admin/change-family-role.ts
```

Route chỉ:

1. Parse.
2. Auth.
3. Gọi service.
4. Map error sang HTTP.

Integration tests phải import đúng service production.

## Route tests

Gọi route handler với:

- `NextRequest`.
- Auth helper mock tối thiểu.
- MongoDB thật.
- Không mock service/model đang được kiểm tra.

Hoặc gọi HTTP qua E2E server.

## Không coi source-string test là concurrency test

Có thể giữ static-policy test, nhưng đổi tên rõ và không dùng làm bằng chứng chính.

---

# 6. P0 — Start game bắt duplicate-key trong transaction

Start route hiện có flow:

```text
state chưa tồn tại
→ create state
→ catch E11000
→ tiếp tục query trong cùng transaction
```

Write error có thể abort transaction. Không tiếp tục session đó.

## Sửa

Ưu tiên một trong hai:

### A. Tạo state khi family được tạo

- Family.
- FamilyMember admin.
- BauCuaFamilyState idle.
- FamilyAdminState.

Tạo trong cùng family-create transaction.

Backfill family cũ bằng migration.

### B. Ensure state trước transaction

- Upsert state ngoài game transaction.
- Sau đó transaction chỉ CAS state.

### C. Để duplicate throw

- Không catch trong callback.
- Bên ngoài transaction retry bounded.

## CAS cuối

Update:

```text
starting → betting
```

phải filter:

- familyId.
- status `starting`.
- expected version.
- expected activeRoundId/null.

Kiểm tra kết quả update.

Nếu update null:

- Throw.
- Rollback round create.
- Không trả round orphan.

## Tests DB thật

- 20 start đồng thời khi state chưa tồn tại.
- Duplicate bootstrap.
- Không round orphan.
- Không state kẹt `starting`.
- ActiveRoundId luôn trỏ round tồn tại.
- Tối đa một active round.

---

# 7. P0 — Admin invariant bootstrap và drift

`ensureFamilyAdminState()` và `ensureSystemAdminState()` cũng:

```text
create state
→ catch E11000
→ tiếp tục trong transaction
```

Sửa giống game state: không tiếp tục transaction đã lỗi.

## Drift hiện tại

Nếu state đã tồn tại, helper trả counter trong state mà không đối chiếu actual count.

State có thể lệch khi:

- Credentials registration tạo admin theo `SYSTEM_ADMIN_EMAILS`.
- Google OAuth tạo admin.
- Thay đổi env admin list.
- Seed/import.
- Migration.
- Direct repair.

Ví dụ:

```text
SystemAdminState.adminCount=1
→ register thêm admin từ env
→ actual=2 nhưng state vẫn=1
```

## Thiết kế ưu tiên

Dùng shared lock/version document để tạo write conflict, nhưng actual `User`/`FamilyMember` là nguồn sự thật.

Trong transaction:

1. CAS lock/version.
2. Count actual.
3. Kiểm invariant.
4. Update role/membership.
5. Increment version.
6. Commit.

Không cần counter lâu dài nếu counter dễ drift.

Nếu giữ counter, mọi path tạo/promote/delete admin phải update counter:

- Register.
- Google sign-in.
- Admin PATCH.
- Account delete.
- Family create.
- Family member promote/demote/delete.
- Seed/migration.

## SYSTEM_ADMIN_EMAILS policy

Ghi rõ:

- Có tự promote user hiện có không?
- Xóa email khỏi env có tự demote không?
- Env role hay DB role ưu tiên?
- Env admin có được demote qua UI không?
- Reconciliation chạy khi nào?

## Tests

- Concurrent first bootstrap.
- Register admin sau khi state tồn tại.
- Google admin creation.
- Concurrent demote/delete.
- Account delete đồng thời role change.
- State drift.
- Không còn 0 admin.

Phải dùng MongoDB replica set thật.

---

# 8. P0 — Account deletion outbox chưa atomic

Deletion transaction hiện:

1. Collect photo publicIds vào biến memory.
2. Xóa Photo metadata.
3. Commit DB transaction.
4. Sau commit mới gọi `enqueueStorageCleanup()`.

Nếu process chết sau commit nhưng trước enqueue:

- User đã deleted.
- Photo metadata mất.
- Cloudinary object còn.
- Không còn job và không còn source DB chứa publicId.

Đây chưa phải transactional outbox.

## Sửa

Trong cùng transaction:

1. Đọc Photo publicIds.
2. Tạo StorageCleanupJob records.
3. Soft-delete/anonymize user.
4. Xóa metadata theo policy.
5. Commit.

Cleanup job phải truyền cùng `session`.

Sau commit, HTTP response trả ngay; cron xử lý job.

## Idempotency key

Mỗi cleanup operation có unique key:

```text
account-delete:<userId>:<publicId>
photo-delete:<photoId>:<publicId>
upload-rollback:<operationId>:<publicId>
```

Retry deletion không tạo duplicate.

## Audit

Security-critical audit `account.deleted` nên:

- Ghi trong cùng transaction.
- Hoặc dùng audit outbox.

Không chỉ best-effort sau commit nếu audit được dùng cho compliance.

## Crash tests

Inject lỗi:

- Sau Photo delete.
- Trước transaction commit.
- Sau transaction commit.
- Trước worker run.

Kết quả:

- Trước commit: rollback user + metadata + jobs.
- Sau commit: cleanup job luôn tồn tại.

---

# 9. P0 — Cleanup model và worker chưa an toàn

## Index không unique

Schema có index `(publicId,status)` nhưng thiếu:

```ts
unique: true
```

Comment nói dedupe và code catch E11000, nhưng E11000 không thể xảy ra từ index không unique.

Dùng unique `idempotencyKey`, không unique theo mutable status.

## Worker không claim atomically

Hiện:

```text
find pending list
→ set job processing
→ save
→ destroy
```

Hai cron instance có thể cùng đọc và xử lý một job.

## Thiết kế claim + lease

Fields:

```text
idempotencyKey
status
leaseId
leaseExpiresAt
processingStartedAt
attempts
nextRetryAt
```

Claim:

```ts
findOneAndUpdate(
  {
    $or: [
      { status: 'pending', nextRetryAt: { $lte: now } },
      { status: 'processing', leaseExpiresAt: { $lt: now } }
    ]
  },
  {
    $set: {
      status: 'processing',
      leaseId,
      leaseExpiresAt
    },
    $inc: { attempts: 1 }
  },
  {
    sort: { nextRetryAt: 1 },
    new: true
  }
)
```

Complete/fail filter thêm:

```text
_id
leaseId
status=processing
```

Worker cũ hết lease không được ghi đè worker mới.

## Crash recovery

Nếu process chết sau khi claim:

- Sau lease expiry, job được reclaim.

Không để `processing` vĩnh viễn.

## Cloudinary result

Phân loại:

- `ok`: completed.
- `not found`: idempotent completed.
- transient: retry.
- permanent invalid ID: failed/manual.

## Local path traversal

Với `local:` cleanup:

- Resolve base `public/uploads`.
- Resolve target.
- Verify target nằm trong base.
- Từ chối `..`, absolute path, null byte.

Test:

```text
local:../../.env
local:/etc/passwd
local:uploads/../../../secret
```

---

# 10. P1 — Rate-limit reservationId chưa có tác dụng

`checkRateLimit()` tạo `reservationId` nhưng:

- Không lưu DB.
- Không liên kết bucket.
- Release không nhận reservationId.
- Release lần hai vẫn decrement.

Comment “idempotent release” chưa đúng.

## Tách abstraction

### Attempt limiter

```ts
checkAttemptLimit()
```

- Chỉ increment.
- Không release.
- Dùng cho request/minute và abuse.

### Reservable quota

```ts
reserveQuota()
consumeQuota()
releaseQuota()
```

Dùng cho:

- AI daily success quota.
- Upload daily quota.

## Reservation model

```text
reservationId unique
bucketKey
scope
subjectId
status: reserved | consumed | released
expiresAt
createdAt
```

Reserve và bucket increment phải atomic.

Release:

1. Find reservation status reserved.
2. Mark released.
3. Decrement exact bucket.
4. Cùng transaction.

Release lần hai là no-op.

Consume:

- reserved → consumed.
- Không increment lần nữa.

## AI request idempotency

Client gửi `requestId`.

Unique:

```text
userId + requestId
```

Retry không:

- Gọi provider hai lần.
- Consume quota hai lần.
- Tạo hai kết quả.

Không lưu prompt/traits nếu không cần.

## Upload operation ID

Retry upload không tạo hai Cloudinary objects.

---

# 11. P1 — Migration đang có thể đọc sai collection

Migration hard-code:

```text
baucuaround
baucuaWallets
```

Mongoose mặc định dùng plural/lowercase model name, ví dụ:

```text
BauCuaRound → baucuarounds
BauCuaWallet → baucuawallets
```

Audit có thể đọc collection rỗng và báo sai.

## Sửa

Không hard-code đoán tên.

Dùng:

```ts
Model.collection.name
Model.collection
```

Hoặc:

```text
listCollections()
```

và fail nếu expected collection không tồn tại.

## Scan toàn DB

Không dùng:

```text
famIds.slice(0, 500)
```

Dùng cursor/batch để scan tất cả.

## Exit code

Script hiện luôn exit 0 dù có findings.

Tạo:

```text
migration:round4:audit
migration:round4:audit:strict
```

- Audit thường xuất report, exit 0.
- Strict có critical/error findings → exit 1.
- CI dùng strict.

## Apply safety

Không tự:

```text
state idle + activeRoundId != null
→ clear activeRoundId
```

trước khi kiểm round.

Safe auto-fix chỉ khi:

- Round không tồn tại.
- Hoặc round terminal và settlement hoàn tất.

Manual review khi:

- Round betting/rolling.
- Có bet.
- Có reserved balance.
- Missing settlement.

## Confirmation

Không hard-code:

```text
--confirm=YES
```

trong package script.

Yêu cầu token chứa database name hoặc env riêng.

## Migration tests

- Đúng collection name.
- >500 families.
- Strict exit.
- Dry-run không write.
- Real active round không bị clear.
- Terminal stale pointer được repair.
- Apply idempotent.

---

# 12. P1 — Integration configuration vẫn có test giả

`tests/rate-limit-concurrency.test.ts` mock:

- Mongo connection.
- RateLimit model.

Nhưng file nằm trong integration config.

Chuyển:

- Mock test → unit suite.
- Tạo `rate-limit-mongo.integration.test.ts` dùng collection thật.

## Rate-limit DB tests

- 100 concurrent first upserts.
- Không E11000 ra API.
- Count đúng.
- Boundary window.
- Exact bucket.
- Reservation release hai lần.
- TTL/index tồn tại.

## Admin tests

`tests/admin-invariant.test.ts` cũng mock model; đây là unit test, không phải integration.

Tạo DB integration riêng.

## Test classification

Tên/file/config phải đúng:

```text
*.unit.test.ts
*.integration.test.ts
*.e2e.test.ts
*.property.test.ts
```

Không đưa mocked test vào integration chỉ để tăng số lượng.

---

# 13. P1 — Transaction capability negative cache

`supportsMongoTransactions()` cache kết quả false suốt process lifetime.

Nếu probe đầu lỗi tạm thời:

- Cache false.
- Các route transaction trả 503 cho tới restart.

## Sửa

- Positive result cache lâu.
- Negative result TTL ngắn.
- Phân biệt:
  - DB unavailable.
  - Probe timeout.
  - Unsupported standalone.
  - Permission error.
- Có retry.
- Hoặc chạy transaction trực tiếp và map server error.

Test:

- First probe fail.
- Second probe success.
- Reconnect.
- Managed Mongo hello.
- Standalone thật.

---

# 14. P1 — Request ID chưa xuyên request path

Middleware hiện set `X-Request-Id` trên response, nhưng chưa clone/set request headers cho downstream route.

Audit thường nhận requestId null.

## Sửa middleware

```ts
const requestHeaders = new Headers(req.headers)
requestHeaders.set('x-request-id', requestId)

const res = NextResponse.next({
  request: {
    headers: requestHeaders,
  },
})

res.headers.set('x-request-id', requestId)
```

Route:

```ts
const requestId = getOrCreateRequestId(request)
```

Truyền vào:

- AuditEvent.
- Error log.
- Cleanup job.
- AI provider log.
- Game settlement log.

Không tin incoming ID từ internet mù; validate hoặc luôn tạo server ID.

Test cùng ID ở:

- Response.
- Route.
- Audit DB.
- Error log.

---

# 15. P1 — Audit metadata chỉ sanitize top-level

Metadata sanitizer hiện chỉ kiểm key cấp đầu.

Nested secret có thể lọt:

```json
{
  "request": {
    "password": "...",
    "inviteCode": "..."
  }
}
```

## Recursive sanitizer

Yêu cầu:

- Case-insensitive blocked keys.
- Recursive object/array.
- Depth limit.
- Item count limit.
- String max length.
- Circular-safe.
- Date/ObjectId safe.
- Không lưu request body nguyên khối.

Test:

- Nested password.
- Nested token.
- Array secrets.
- Mixed-case `Authorization`.
- Circular object.
- Huge metadata.

## Durable vs best-effort audit

Phân loại:

### Durable

- System role.
- Family admin role.
- Account deletion.
- Invite rotation.
- Game settlement.

Ghi cùng transaction hoặc audit outbox.

### Best-effort

- Non-critical analytics.

Không dùng best-effort rồi tuyên bố audit trail đầy đủ.

---

# 16. P1 — CSP tiếp tục theo lộ trình, không bật mù

Production đã bỏ `unsafe-eval`, giữ lại.

Hiện vẫn có:

```text
unsafe-inline
```

Không gọi đây là strict CSP.

## Lộ trình

1. Tạo strict CSP Report-Only.
2. Thu thập violation.
3. E2E browser.
4. Route-group policy.
5. Enforce sau khi hết violation hợp lệ.

Nonce CSP có tradeoff:

- Dynamic rendering.
- Mất static optimization.
- CDN/cache impact.
- Tăng server load.

Đánh giá riêng:

- Public landing.
- Authenticated app.

Không ép toàn app dynamic nếu không cần.

Nguồn:

```text
https://nextjs.org/docs/app/guides/content-security-policy
```

---

# 17. P2 — Registration và Google creation

Credentials register route cần:

- Type validation trước `.trim()`.
- Max lengths.
- Normalize email.
- Rate limit user/IP.
- Duplicate email race xử lý E11000.
- Không trả 500 cho duplicate.

Nếu role tạo ra là admin:

- Admin invariant phải update trong cùng transaction.

Google sign-in:

- Hai callback đồng thời cùng email.
- Unique race phải idempotent.
- Admin invariant update.
- Deleted account không được tự revive.

---

# 18. P2 — UI/component test không được bỏ quên

Default Vitest include có thể chỉ bắt:

```text
tests/**/*.test.ts
```

Các `.test.tsx` có thể không chạy.

Tạo config include:

```text
tests/**/*.test.{ts,tsx}
```

Phân loại:

- Component unit.
- Integration.
- E2E.

Property test:

- Chạy nightly hoặc PR theo path.
- Không archive vĩnh viễn.

---

# 19. Migration round 4 audit

Tạo:

```bash
npm run migration:round4:audit
npm run migration:round4:audit:strict
npm run migration:round4:apply -- --confirm=<token>
```

Audit:

- Actual collection names.
- Cleanup duplicate jobs.
- Processing jobs hết lease.
- Deleted user photos không có cleanup job.
- Game state/round/settlement drift.
- State `starting` quá timeout.
- Bet timestamp sau settlement.
- Reserved orphan.
- Family/system admin drift.
- Raw invite rate keys.
- Negative rate count.
- Critical audit thiếu request ID.
- Wrong collection artifacts từ migration cũ.

Apply chỉ sửa case chắc chắn an toàn.

---

# 20. CI jobs bắt buộc

```text
quality
integration
e2e
build
audit
migration-audit
final-gate
```

Sau khi push branch:

- Mở PR.
- Xác nhận workflow thực sự chạy.
- Đọc từng job.
- Ghi run URL/ID.
- Không chỉ nói YAML đúng.

---

# 21. Lệnh cuối

```bash
npm ci --legacy-peer-deps
npm run lint
npm run typecheck
npm run test:unit
npm run test:security
npm run test:integration
npm run test:e2e
npm run test:property
npm test
npm run build
npm run validate:env
npm run migration:round4:audit
npm run migration:round4:audit:strict
npm audit --audit-level=high
```

Nếu dùng actionlint:

```bash
npx actionlint
```

Không đánh dấu E2E pass nếu suite skip.

---

# 22. Checklist nghiệm thu

## CI

- [ ] Không còn dấu `;` che exit code.
- [ ] Không `|| true`.
- [ ] Có final gate.
- [ ] E2E chạy server thật.
- [ ] Latest PR checks xanh.

## Tests

- [ ] Integration gọi production service.
- [ ] Route handler được test.
- [ ] Không copy transaction logic.
- [ ] Mock test không nằm integration suite.
- [ ] TSX tests được include.
- [ ] Skipped tests được báo.

## Game

- [ ] State bootstrap không tiếp tục sau duplicate.
- [ ] CAS cuối được kiểm kết quả.
- [ ] Không round orphan.
- [ ] Concurrent start test DB thật.

## Admin

- [ ] Bootstrap an toàn.
- [ ] Registration/Google cập nhật invariant.
- [ ] Env policy rõ.
- [ ] Drift audit toàn DB.
- [ ] Last-admin concurrency DB thật.

## Outbox

- [ ] Cleanup job tạo trong business transaction.
- [ ] Unique idempotency key thật.
- [ ] Atomic claim.
- [ ] Lease/reclaim.
- [ ] Local path traversal blocked.
- [ ] Crash không làm mất cleanup.

## Quota

- [ ] Reservation được persist.
- [ ] Release idempotent.
- [ ] Attempt limiter tách quota.
- [ ] AI/upload retry không double charge.

## Migration

- [ ] Đúng collection name.
- [ ] Scan toàn DB.
- [ ] Strict exit code.
- [ ] Không auto-clear active game mơ hồ.
- [ ] Apply confirmation không hard-code.

## Observability

- [ ] Request ID xuyên response/route/audit.
- [ ] Critical audit durable.
- [ ] Metadata recursive sanitize.

---

# 23. Format báo cáo cuối

## A. Baseline

| Command | Result | Skipped | DB thật/mock |
|---|---|---|---|

## B. Finding verification

| ID | Finding | Confirmed/Partial/False | Evidence |
|---|---|---|---|

## C. Changed files

| File | Change | Test |
|---|---|---|

## D. Behavioral evidence

| Scenario | Production implementation called | Result |
|---|---|---|

## E. Concurrency

| Scenario | Requests/workers | Expected | Actual |
|---|---:|---|---|

## F. CI

| Job | Run URL/ID | Status |
|---|---|---|

## G. Migration

- Collections resolved.
- Documents scanned.
- Findings.
- Exit code.
- Dry-run/apply result.

## H. Remaining risk

| Severity | Risk | Reason | Next action |
|---|---|---|---|

Không ghi production-ready nếu:

- E2E skip.
- Latest CI chưa chạy.
- Outbox chưa atomic.
- Cleanup chưa lease.
- Admin state còn drift.
- Integration test còn copy logic.

---

# 24. Thứ tự thực hiện

1. Baseline và đếm skip.
2. Sửa CI dấu `;`.
3. Tạo final gate.
4. Tạo E2E production job.
5. Tách production services.
6. Chuyển integration tests sang services/routes thật.
7. Sửa game/admin bootstrap.
8. Sửa admin drift.
9. Đưa cleanup jobs vào account deletion transaction.
10. Thêm unique operation key + worker lease.
11. Tách limiter/quota reservation.
12. Sửa migration.
13. Truyền request ID.
14. Harden audit sanitizer.
15. Đánh giá strict CSP report-only.
16. Chạy toàn bộ gate.
17. Push PR và xác minh Actions.
18. Báo cáo đúng format.

Không dừng ở review. Hãy trực tiếp sửa code và cung cấp bằng chứng test.

---

# 25. Tài liệu chính thức

```text
Next.js CSP:
https://nextjs.org/docs/app/guides/content-security-policy

Mongoose transactions:
https://mongoosejs.com/docs/transactions.html

Mongoose model/collection naming:
https://mongoosejs.com/docs/models.html

NextAuth options/cookies:
https://next-auth.js.org/configuration/options

MongoDB transaction considerations:
https://www.mongodb.com/docs/manual/core/transactions-production-consideration/

GitHub Actions:
https://docs.github.com/en/actions
```

Ưu tiên:

1. Behavior từ test gọi implementation production.
2. Tài liệu chính thức.
3. Source framework/package.
4. Không tin commit message nếu code/test không chứng minh.

---

# 26. Lời nhắc cuối

Không nhầm:

```text
“có integration test file”
```

với:

```text
“production implementation được integration test”
```

Không nhầm:

```text
“có outbox helper”
```

với:

```text
“outbox record commit cùng transaction”
```

Không nhầm:

```text
“index có comment dedupe”
```

với:

```text
“index unique thật”
```

Không nhầm:

```text
“CI YAML tồn tại”
```

với:

```text
“latest commit có checks xanh”
```

Không nhầm:

```text
“migration chạy không lỗi”
```

với:

```text
“migration đọc đúng collection và exit đúng”
```

Bắt đầu baseline ngay và sửa P0 trước.