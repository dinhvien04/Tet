# GROK 4.5 — TẾT CONNECT REVIEW ROUND 3 / PRODUCTION HARDENING PROMPT

> Repository: `https://github.com/dinhvien04/Tet`
>
> Commit đã được review: `7e9df9101f0117749fdc605090532b2ec31438b6`
>
> Prompt này nối tiếp:
>
> - `fix.md`
> - `GROK_4_5_TET_REVIEW_ROUND_2_FIX_PROMPT.md`
>
> Không làm lại toàn bộ dự án. Hãy xác minh code hiện tại và sửa chính xác những lỗi còn sót trong vòng review thứ ba.

---

# 0. Mục tiêu vòng 3

Các vòng trước đã bổ sung:

- NextAuth JWT + Mongoose.
- AI authentication/rate limit.
- Service Worker privacy cleanup.
- Invite code bắt buộc.
- MongoDB transaction helper.
- Bầu Cua settlement ledger.
- Sharp image processing.
- CSP/security headers.
- Health endpoints.
- API validation/pagination.
- Soft-delete account.
- CI MongoDB replica set.

Tuy nhiên các phần trên **chưa đủ bằng chứng để gọi production-ready**.

Mục tiêu vòng này:

1. Vá dependency security trước.
2. Sửa các race condition còn sót trong Bầu Cua.
3. Chứng minh transaction bằng integration test thật.
4. Sửa account deletion bị lỗi với credentials user.
5. Bảo đảm last-admin invariant thực sự an toàn khi concurrency.
6. Sửa quota/rate limit ở biên concurrency.
7. Sửa partial failure của upload/Cloudinary/Photo metadata.
8. Kiểm tra NextAuth cookie với middleware trong production.
9. Làm CSP có giá trị bảo vệ thực tế.
10. Biến CI thành quality gate thật, không chỉ có hình thức.

Không ưu tiên thêm tính năng mới.

---

# 1. Vai trò

Bạn là:

- Staff Full-stack Engineer.
- Application Security Engineer.
- MongoDB Reliability Engineer.
- CI/CD Engineer.
- Next.js Production Engineer.

Bạn phải trực tiếp:

- Đọc code.
- Lập kế hoạch.
- Sửa code.
- Viết test.
- Chạy test.
- Sửa lỗi phát sinh.
- Cập nhật tài liệu.

Không chỉ trả lời bằng lời khuyên.

---

# 2. Quy tắc bắt buộc

## 2.1. Baseline trước khi sửa

Chạy:

```bash
git status
git rev-parse HEAD
git log --oneline -15
node --version
npm --version
npm ci --legacy-peer-deps
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run test:property
npm run build
npm audit --audit-level=high
```

Ghi bảng:

| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Commit | | |
| Install | | |
| Lint | | |
| Typecheck | | |
| Unit tests | | |
| Integration tests | | |
| Property tests | | |
| Build | | |
| Audit | | |

Nếu commit hiện tại mới hơn commit baseline, đọc diff trước rồi mới áp dụng yêu cầu.

## 2.2. Không được làm

- Không push trực tiếp `main`.
- Không deploy.
- Không dùng production database.
- Không xóa dữ liệu thật.
- Không commit secret.
- Không tắt lint/typecheck/test.
- Không dùng `@ts-ignore` để che lỗi.
- Không mock transaction trong test được gọi là integration.
- Không tuyên bố “atomic” nếu code có fallback non-transaction.
- Không bỏ qua audit bằng `|| true`.
- Không chuyển lỗi production thành warning.
- Không swallow lỗi rộng bằng `catch {}` nếu lỗi không được phân loại.
- Không thêm feature mới khi P0/P1 chưa pass.
- Không ghi “production-ready” khi CI chưa xanh.

## 2.3. Definition of Done

Một mục chỉ hoàn thành khi:

1. Có code fix.
2. Có regression test.
3. Test đó thất bại với code cũ.
4. Test pass với code mới.
5. Lint/typecheck/build pass.
6. Tài liệu được cập nhật.
7. Không tạo regression ở route/client khác.

---

# 3. P0 — Nâng cấp Next.js ngay

## 3.1. Phát hiện

Repository đang dùng:

```json
"next": "16.1.6",
"eslint-config-next": "16.1.6"
```

Next.js `16.1.6` nằm trong các dải phiên bản bị ảnh hưởng bởi nhiều security advisory năm 2026, trong đó có middleware/auth bypass. Dự án này đang dùng `withAuth` middleware để bảo vệ:

```text
/dashboard
/family
/events
/photos
/posts
/games
/admin
/profile
/ai
```

Vì vậy dependency này là P0, không phải nâng cấp tùy chọn.

## 3.2. Yêu cầu

Nâng:

```text
next
eslint-config-next
```

lên ít nhất bản patch đã vá toàn bộ advisory áp dụng cho nhánh 16.2.

Ưu tiên phiên bản stable mới nhất đã được kiểm tra tại thời điểm thực hiện, nhưng tối thiểu không thấp hơn:

```text
Next.js 16.2.6
```

Tài liệu Next.js hiện có thể mới hơn; không pin mù nếu đã có patch mới.

Sau nâng cấp:

```bash
npm install next@latest eslint-config-next@latest --legacy-peer-deps
npm dedupe
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=high
```

Kiểm tra breaking changes giữa 16.1 và 16.2:

- Middleware/proxy behavior.
- App Router.
- Image optimization.
- React Compiler.
- Route handler params.
- CSP nonce.
- Build output.
- ESLint config.

## 3.3. NextAuth patch

Repository đang dùng:

```json
"next-auth": "^4.24.13"
```

Nâng lên ít nhất:

```text
next-auth 4.24.14
```

hoặc patch stable mới nhất của v4 sau khi đọc release notes.

Không nâng thẳng lên Auth.js v5 trong vòng này vì đó là migration lớn, trừ khi có lý do bảo mật bắt buộc và có test đầy đủ.

## 3.4. Dependency cleanup

Rà dependency thực sự được import.

Ví dụ cần xác minh:

```text
@google/generative-ai
```

Nếu app hiện chỉ dùng MegaLLM và package không còn import runtime:

- Xóa dependency.
- Cập nhật lockfile.
- Cập nhật docs.
- Chạy build.

Rà thêm dependency trùng chức năng hoặc legacy Supabase.

## 3.5. Test bảo vệ route

Thêm E2E test ở production build:

```bash
npm run build
npm run start
```

Test anonymous user không truy cập được các protected route.

Tối thiểu:

- `/dashboard`
- `/family`
- `/admin`
- `/profile`
- `/games/bau-cua`

Test thêm các request đặc biệt:

- Next.js prefetch headers.
- RSC headers.
- URL có encoded segment.
- URL có double slash.
- Dynamic route.
- Query string bất thường.

Không tự tái tạo exploit nguy hiểm trên public target; chỉ test local application.

## 3.6. Tiêu chí nghiệm thu

- [ ] Next.js đã ở bản không thuộc advisory range.
- [ ] `eslint-config-next` khớp version.
- [ ] NextAuth patch mới.
- [ ] Audit không còn high/critical chưa xử lý.
- [ ] Protected-route E2E pass trên production build.
- [ ] Build production pass.

Nguồn chính thức cần đọc:

```text
https://github.com/vercel/next.js/security/advisories
https://nextjs.org/docs/app/guides/upgrading/version-16
https://github.com/nextauthjs/next-auth/releases
```

---

# 4. P0 — Bầu Cua vẫn còn race giữa BET và ROLL

## 4.1. Phát hiện

`bet/route.ts` hiện chạy transaction:

```text
read round(status=betting)
→ reserve wallet
→ create bet
→ commit
```

`roll/route.ts` cũng chạy transaction:

```text
change round betting→rolling
→ read bets
→ update wallets
→ create settlement
→ complete round
→ commit
```

Tuy nhiên bet transaction chỉ **đọc** round. Nó không update/version-lock cùng document với roll.

Tình huống:

```text
T1 BET đọc round=betting
T2 ROLL update round=rolling
T2 ROLL đọc danh sách bet chưa có bet của T1
T2 ROLL settle và commit
T1 BET reserve + insert bet rồi commit
```

Kết quả có thể là:

- Bet tồn tại sau settlement.
- Reserved balance bị orphan.
- Bet không được tính.
- Family state đã idle nhưng wallet còn reserved.

Transaction không tự giải quyết race nếu hai transaction không tạo write conflict trên cùng invariant document.

## 4.2. Thiết kế lock/version chung

Mọi thao tác sau phải ghi/CAS cùng một document lock:

```text
BauCuaFamilyState
```

hoặc cùng `BauCuaRound.version`.

### BET transaction

Trong transaction:

1. Đọc `BauCuaFamilyState`.
2. Xác minh:
   - `status=betting`
   - `activeRoundId=roundId`
   - version hiện tại.
3. Update/CAS state hoặc round để tạo write conflict hợp lệ.
4. Reserve wallet.
5. Insert bet.
6. Commit.

Không tăng version tùy tiện làm client poll quá nhiều; có thể dùng field:

```text
betRevision
```

hoặc no-op-safe lock strategy được MongoDB hỗ trợ.

### ROLL transaction

Trong transaction:

1. CAS cùng state/round từ betting sang rolling.
2. Vì BET cũng write/CAS cùng invariant document, BET đang chạy phải:
   - commit trước và được đọc trong snapshot hợp lệ;
   - hoặc conflict/retry rồi thấy round không còn betting.
3. Chỉ sau đó đọc bets và settle.

Viết test chứng minh không tồn tại bet/reserved orphan.

## 4.3. Không tiếp tục transaction sau duplicate-key abort

`bet/route.ts` hiện bắt `E11000` bên trong transaction rồi tiếp tục query/update trong cùng callback.

MongoDB transaction có thể đã bị abort sau write error. Không dựa vào việc tiếp tục operation trong session đó.

Thiết kế lại:

### Cách an toàn

- Để transaction throw.
- Transaction rollback toàn bộ reserve.
- Bên ngoài transaction:
  - Nếu lỗi duplicate idempotency key, query bet đã tồn tại.
  - Trả idempotent response.
- Không manual decrement trong transaction đã lỗi.

Hoặc:

- Claim idempotency record trước bằng thiết kế không gây abort.
- Sau đó chạy transaction theo claim.

## 4.4. Start round CAS

`start/route.ts` hiện:

- Đọc state.
- Nếu idle thì tạo round.
- Update state.

Hai request đồng thời vẫn có thể cùng đọc idle.

Sửa bằng CAS rõ:

```text
findOneAndUpdate(
  {
    familyId,
    status: "idle",
    version: expectedVersion
  },
  {
    $set: { status: "starting" },
    $inc: { version: 1 }
  }
)
```

Sau đó tạo round và gắn `activeRoundId` trong cùng transaction.

Nếu CAS thất bại:

- Đọc active round.
- Trả existing round idempotently.
- Không trả 500.

Không dùng:

```ts
catch {
  // concurrent create
}
```

cho mọi loại lỗi. Chỉ bắt duplicate-key cụ thể.

## 4.5. Settlement invariant

Không sửa drift bằng:

```ts
if (reservedBalance < 0) {
  reservedBalance = 0
}
```

Đây là che lỗi dữ liệu.

Thay bằng conditional update:

```text
reservedBalance >= reservedExpected
```

Nếu không đúng:

- Throw invariant error.
- Rollback toàn transaction.
- Ghi diagnostic/reconciliation record.
- Không mark settlement completed.

Settlement ledger phải lưu:

- roundId unique.
- userId.
- bet total.
- reserved before.
- net delta.
- balance before/after.
- timestamp.
- state version.

## 4.6. Existing settlement recovery

Nếu settlement đã tồn tại nhưng round/family state chưa đồng bộ:

- Không chỉ trả idempotent response.
- Repair state trong transaction hoặc chạy recovery routine.
- Round phải về terminal state.
- Family state phải idle.
- Response `myNet` phải lấy từ settlement entry của user, không trả cứng `0`.

## 4.7. Transaction fallback

`withMongoTransaction()` hiện có khả năng chạy:

```ts
operation(undefined)
```

trên standalone MongoDB trong development.

Đối với các operation bắt buộc consistency:

```text
Bầu Cua start
Bầu Cua bet
Bầu Cua roll
Last-admin changes
Account deletion
Join approval
```

phải gọi:

```ts
withMongoTransaction(operation, { requireReplicaSet: true })
```

ở mọi môi trường, kể cả test/dev.

Không cho game chạy nontransactionally chỉ vì `NODE_ENV !== production`.

Local developer thiếu replica set phải nhận lỗi cấu hình rõ ràng.

## 4.8. Integration tests thật

Tạo suite chạy với single-node replica set thật.

Không mock Mongoose transaction.

Test:

1. 20 BET song song với tổng lớn hơn balance.
2. BET và ROLL đồng thời 100 lần.
3. Không có bet tạo sau settlement.
4. Không có reservedBalance orphan.
5. Hai ROLL chỉ một settlement.
6. Retry ROLL trả đúng `myNet`.
7. Hai START chỉ một active round.
8. Duplicate idempotency key không reserve hai lần.
9. Duplicate-key rollback không tiếp tục dùng aborted transaction.
10. Invariant drift làm rollback, không clamp.
11. Transaction unsupported trả 503.
12. Settlement recovery sửa round/state lệch.
13. Process simulation throw giữa wallet và settlement làm rollback toàn bộ.

Sau test, assert:

```text
active rounds <= 1 per family
settlement count <= 1 per round
reservedBalance >= 0
settled round has settlement
idle family has no activeRoundId
every bet in settled round is represented in settlement
```

---

# 5. P0 — Account deletion đang có bug với credentials account

## 5.1. Phát hiện

Deletion code hiện:

```ts
user.status = 'deleted'
user.password = undefined
await user.save()
```

Nhưng User schema vẫn quy định:

```ts
password.required = provider === 'credentials'
```

Với user đăng ký email/password, `save()` có thể fail validation vì password bị xóa trong khi provider vẫn là `credentials`.

Unit test mock model không đủ để phát hiện lỗi schema thật này.

## 5.2. Sửa schema/deletion policy

Chọn một policy nhất quán.

### Phương án đề xuất

Password chỉ required khi:

```text
provider=credentials AND status=active
```

Ví dụ required function phải xét `this.status`.

Hoặc khi soft-delete:

- Chuyển provider sang trạng thái phù hợp không dùng đăng nhập.
- Nhưng không đưa giá trị ngoài enum hiện tại nếu chưa migration.

Tốt hơn:

```ts
required() {
  return this.provider === 'credentials' && this.status === 'active'
}
```

Đồng thời:

- Unset password hash.
- Bump sessionVersion.
- Đảm bảo email anonymized không xung đột.
- Không cho OAuth sign-in tạo lại account trên email anonymized.

## 5.3. Account deletion phải transaction-safe

Hiện deletion có nhiều bước không transaction:

```text
check system admin count
check family admin count
check game
transfer family
save anonymized user
delete memberships/content
delete photos
```

Nếu lỗi giữa chừng, dữ liệu bị partial.

Tách thành:

### Transaction database

Trong một transaction:

1. Lock user.
2. Lock system-admin invariant.
3. Lock từng family-admin invariant.
4. Kiểm tra active game.
5. Transfer ownership.
6. Reassign/anonymize event/task references.
7. Soft-delete user.
8. Delete/anonymize DB records.
9. Create storage cleanup jobs.
10. Commit.

### Storage cleanup ngoài transaction

Dùng outbox/job:

```text
StorageCleanupJob
- type
- publicId
- userId
- attempts
- status
- lastError
- nextRetryAt
```

Sau commit:

- Xóa Cloudinary objects.
- Mark cleanup complete.
- Retry idempotently nếu lỗi.

Không xóa `Photo` metadata trước khi giữ lại `publicId` để cleanup.

## 5.4. Dangling references

Rà tất cả model có user reference:

- Family.createdBy.
- Event.createdBy.
- EventTask.assignedTo.
- Post.userId.
- Comment.userId.
- Reaction.userId.
- Photo.userId.
- RSVP.userId.
- Notification.userId.
- FamilyJoinRequest.userId/reviewedBy.
- BauCua host/bet/wallet/settlement entries.
- Audit logs.

Chọn rõ:

- Transfer.
- Anonymize.
- Keep reference to soft-deleted user.
- Delete.

Không để populate trả null rồi API gọi `creator._id`.

## 5.5. Cloudinary

Account deletion hiện không được phép chỉ:

```ts
Photo.deleteMany()
```

Phải:

1. Lấy toàn bộ `publicId`.
2. Tạo cleanup outbox.
3. Xóa DB metadata theo policy.
4. Worker/route xử lý Cloudinary.
5. Retry.
6. Có audit.

## 5.6. Idempotency

Deletion lặp lại phải trả kết quả ổn định.

Nếu lần đầu commit DB nhưng Cloudinary chưa cleanup:

- Lần sau không báo hoàn tất giả.
- Trả trạng thái:
  - deleted.
  - cleanupPending.
- Không tạo duplicate cleanup job.

## 5.7. Tests

Integration tests thật:

- Credentials user xóa thành công.
- Google user xóa thành công.
- Password validation không chặn deleted user.
- JWT cũ bị vô hiệu.
- Sole system admin bị chặn.
- Sole family admin bị chặn.
- Hai admin xóa đồng thời không để 0 admin.
- Family ownership transfer đúng.
- Event/task không dangling.
- Cloudinary cleanup job được tạo.
- Cleanup retry idempotent.
- Active bet/reserved/host bị chặn.
- Failure giữa transaction rollback toàn DB.

---

# 6. P0 — Last-admin invariant vẫn chưa concurrency-safe

## 6.1. Phát hiện

Family member route hiện dùng transaction:

```text
count admin
→ update/delete target admin
```

Nhưng hai transaction có thể:

```text
T1 thấy adminCount=2
T2 thấy adminCount=2
T1 hạ admin A
T2 hạ admin B
```

Vì hai transaction cập nhật hai membership document khác nhau, có thể không có write conflict trên cùng document.

System admin route vẫn dùng:

```text
countDocuments()
→ targetUser.save()
```

không transaction.

Profile deletion cũng count-then-act ngoài transaction.

## 6.2. Central invariant lock

Tạo document được mọi thao tác admin cùng write.

### Family

Có thể mở rộng Family hoặc tạo:

```text
FamilyAdminState
- familyId unique
- version
- adminCount
```

Mọi thao tác:

- Promote admin.
- Demote admin.
- Delete admin.
- Account deletion.
- Join/leave nếu liên quan admin.

phải:

1. CAS state/version.
2. Xác minh `adminCount`.
3. Update membership.
4. Update count/version.
5. Commit.

### System

Tạo:

```text
SystemAdminState
- key unique: "system-admin"
- version
- adminCount
```

Hoặc update một lock document chung trong transaction.

Mọi system role change/account deletion phải write cùng lock.

Không dựa chỉ vào snapshot count.

## 6.3. Reconciliation

Tạo script kiểm tra:

```text
actual admin count
vs
state adminCount
```

Dry-run mặc định.

Có apply mode rõ để sửa state, không tự sửa membership tùy tiện.

## 6.4. Tests

- Hai family admins bị demote đồng thời.
- Hai family admins bị delete đồng thời.
- Role change đồng thời account deletion.
- Hai system admins bị demote đồng thời.
- System admin env override.
- Retry transaction.
- State count không lệch actual count.

Invariant cuối:

```text
family admin count >= 1
system admin count >= 1
```

---

# 7. P0 — AI quota vẫn vượt giới hạn ở biên concurrency

## 7.1. Phát hiện

AI route hiện:

1. Đọc success quota hiện tại.
2. Nếu dưới limit thì gọi provider.
3. Sau provider success mới `$inc` quota.
4. Không kiểm tra `daily.allowed` sau increment.

Tình huống quota còn 1:

```text
10 request cùng đọc count=49
10 request gọi provider
10 request increment
9 request vượt limit
tất cả vẫn trả content
```

Quota trở thành 59 dù limit là 50.

## 7.2. Reservation token

Thiết kế quota thành reservation.

### Trước provider

Atomic reserve:

```text
findOneAndUpdate(
  count < limit,
  $inc: { count: 1 }
)
```

Trả về:

```text
reservationId
bucketKey
windowStart
expiresAt
```

Nếu không reserve được → 429 và không gọi provider.

### Provider thất bại

Release đúng reservation:

- Dùng exact `bucketKey`, không tính lại bucket từ `Date.now()`.
- Release idempotent theo `reservationId`.
- Không decrement request khác.

### Provider thành công

Commit reservation thành usage:

- Mark reservation consumed.
- Không cần increment lần hai.
- Retry response không consume thêm.

Model đề xuất:

```text
AiQuotaBucket
AiQuotaReservation
```

hoặc một thiết kế gọn hơn nhưng phải có exact token/idempotency.

## 7.3. Retry/idempotency

Client gửi `requestId`.

Unique theo:

```text
userId + requestId
```

Retry:

- Nếu completed → trả cached result hoặc metadata an toàn.
- Nếu pending → 409/202 tùy policy.
- Không gọi provider hai lần.

Không lưu traits/prompt nhạy cảm không cần thiết.

## 7.4. Tests

- Quota còn 1, 20 request đồng thời: chỉ 1 provider call được phép.
- Provider timeout release reservation.
- Provider 429 release reservation.
- Response invalid release reservation.
- Request qua UTC/day boundary release đúng bucket cũ.
- Release hai lần không decrement hai lần.
- Retry requestId không consume thêm.
- `daily.allowed=false` không trả content.

---

# 8. P1 — Rate limiter bucket race và secret handling

## 8.1. Concurrent upsert E11000

Bucket rate limiter dùng:

```text
findOneAndUpdate({ key }, {$inc}, { upsert:true })
```

Hai request đầu bucket có thể cạnh tranh upsert unique key.

Bắt duplicate-key:

1. Nếu E11000:
   - Retry một update không-upsert hoặc retry bounded.
2. Không trả 500.
3. Có jitter nhỏ nếu cần.
4. Có concurrency test 100 requests.

## 8.2. Exact bucket release

`releaseRateLimit()` hiện tính bucket lại bằng thời gian hiện tại.

Nếu request vượt qua boundary:

- Reservation nằm bucket cũ.
- Release bucket mới.
- Quota cũ không được trả.
- Bucket mới có thể bị decrement sai.

Mọi reserve phải trả:

```ts
{
  bucketKey,
  reservationId?,
  ...
}
```

Release dùng exact key/token.

## 8.3. Không lưu raw invite code trong rate-limit key

Join route đang dùng:

```text
join:code:<RAW_INVITE_CODE>
```

Dù không log, code vẫn được lưu trong MongoDB.

Hash bằng HMAC hoặc SHA-256 với namespace:

```text
join:code:<hash>
```

Không dùng raw secret.

## 8.4. Tránh burn shared code bucket

Join route hiện increment user/IP/code counters song song.

Attacker có thể làm code bucket cạn và chặn thành viên thật.

Flow tốt hơn:

1. Check user/IP attempt limiter.
2. Validate invite format.
3. Lookup invite.
4. Apply per-family abuse limiter theo policy hợp lý.
5. Không cho một user/IP duy nhất burn shared family bucket quá dễ.

Hoặc shared limiter phải có threshold/risk model khác.

## 8.5. Retry-After

Route đang tính `retry` nhưng không trả header.

Luôn trả:

```text
Retry-After
```

và có thể trả `retryAfterSeconds`.

---

# 9. P1 — Upload có partial failure sau Photo.create

## 9.1. Phát hiện

Upload flow:

```text
upload Cloudinary
→ Photo.create
→ photo.populate
→ build response
```

Catch sau `Photo.create` hiện cleanup Cloudinary/local file, nhưng không xóa Photo document đã tạo.

Nếu:

- `Photo.create` thành công.
- `populate` lỗi.
- Response serialization lỗi.

thì:

- Cloudinary object bị xóa.
- Photo document còn URL trỏ tới object không tồn tại.
- Quota được release.
- Metadata bị hỏng.

## 9.2. Sửa flow

Tách rõ các trạng thái:

```text
storage uploaded
metadata persisted
response formatted
```

Nếu lỗi sau Photo.create:

- Xóa Photo document trong cleanup.
- Xóa storage object.
- Nếu một cleanup lỗi, tạo outbox.
- Không release quota nếu policy coi metadata đã persisted; tốt hơn rollback cả hai.

Có thể dùng compensating transaction/outbox:

```text
UploadOperation
- id
- userId
- familyId
- publicId
- photoId
- status
```

## 9.3. Cloudinary cleanup không được swallow

`destroyCloudinary()` hiện chỉ log và bỏ qua.

Tạo cleanup job khi:

- destroy lỗi.
- timeout.
- Cloudinary unavailable.

Admin diagnostics hiển thị cleanup pending count.

## 9.4. Output size

Sharp re-encode có thể tạo output lớn hơn input, đặc biệt PNG.

Sau processing:

```text
processed.buffer.length <= MAX_PROCESSED_BYTES
```

Nếu lớn:

- Resize/compress.
- Hoặc reject rõ.

## 9.5. Privacy DTO

Upload response không cần trả uploader email nếu UI chỉ hiển thị tên/avatar.

Xóa email khỏi:

- Photo upload response.
- Post feed.
- Event response.
- Family members response nếu member không cần xem email.

Nếu email thực sự là feature, ghi rõ privacy policy và quyền.

## 9.6. Tests

- Cloudinary success + Photo.create fail.
- Photo.create success + populate fail.
- Photo.create success + response formatting fail nếu tách helper test được.
- Cloudinary destroy fail tạo cleanup job.
- Output re-encoded quá lớn.
- Quota boundary crossing.
- Email không xuất hiện trong public family DTO.

---

# 10. P1 — NextAuth cookie và middleware production test

## 10.1. Phát hiện cần xác minh

Auth config tự đặt cookie:

```text
next-auth.session-token
secure=true ở production
```

NextAuth mặc định có thể dùng secure cookie prefix trên HTTPS.

Custom cookie là cấu hình nâng cao và có thể làm middleware/token lookup không đồng bộ nếu các phần không dùng cùng cookie name.

Không khẳng định bug chỉ dựa vào đọc code. Phải chứng minh bằng E2E production.

## 10.2. Lựa chọn ưu tiên

Nếu không có lý do bắt buộc:

- Xóa custom `cookies.sessionToken`.
- Dùng default secure cookie behavior của NextAuth.

Nếu phải custom:

- Dùng `__Secure-` prefix production.
- Đồng bộ cookieName với middleware/getToken theo tài liệu.
- Cấu hình đầy đủ options.
- Test HTTP local và HTTPS-like production proxy.

## 10.3. E2E

Production build:

1. Login credentials.
2. Nhận session cookie.
3. Truy cập `/dashboard`.
4. Truy cập API auth-required.
5. Middleware nhận đúng token.
6. Logout.
7. Route protected bị chặn.
8. Bump sessionVersion.
9. Cookie cũ bị chặn.

Test Google OAuth callback bằng mock provider hoặc route-level integration phù hợp; không cần gọi Google thật trong CI.

---

# 11. P1 — CSP production vẫn quá yếu

## 11.1. Phát hiện

Production CSP hiện có:

```text
script-src 'self' 'unsafe-inline' 'unsafe-eval'
```

`unsafe-eval` không cần cho Next.js/React production theo tài liệu Next.js.

CSP này có header nhưng chưa cung cấp mức bảo vệ XSS mong muốn.

## 11.2. Sửa tối thiểu ngay

Chỉ thêm `unsafe-eval` ở development:

```ts
const scriptSrc = production
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
```

## 11.3. Strict CSP

Sau khi nâng Next.js, đánh giá:

### Nonce CSP

- Generate nonce mỗi request.
- `script-src 'nonce-...' 'strict-dynamic'`.
- Gửi nonce vào request header và response CSP.
- Exclude API/static/image/prefetch matcher.
- Chấp nhận dynamic rendering cho route dùng nonce.

### Hoặc SRI

Nếu muốn giữ static landing:

- Đánh giá experimental SRI.
- Không bật production mù.
- Test build/runtime.

Có thể triển khai theo phase:

1. Bỏ `unsafe-eval` production ngay.
2. CSP Report-Only strict nonce.
3. Theo dõi violation.
4. Enforce sau khi test.

## 11.4. Middleware matcher

Không cần chạy CSP/protected middleware trên mọi API/static asset.

Theo tài liệu Next.js, loại trừ:

- `api` nếu API có security headers riêng.
- `_next/static`.
- `_next/image`.
- favicon.
- prefetch requests.

Nhưng auth API authorization vẫn phải được enforce trong route helper; middleware không phải lớp duy nhất.

## 11.5. Tests

- Production CSP không có `unsafe-eval`.
- Development CSP có thể có `unsafe-eval`.
- Protected pages load không CSP violation nghiêm trọng.
- Cloudinary/Google avatar load.
- Landing page render đúng.
- API response không bị nonce logic làm hỏng.
- Report-only/enforce mode rõ ràng.

Nguồn chính thức:

```text
https://nextjs.org/docs/app/guides/content-security-policy
```

---

# 12. P1 — CI hiện dựng replica set nhưng không chạy integration tests

## 12.1. Phát hiện

Workflow đã chạy MongoDB replica set, nhưng step test chỉ gọi:

```bash
npm run test:ci
```

Trong package:

```json
"test:ci": "npm run test:unit"
```

Vitest default lại exclude:

```text
integration
property
TSX component suites
```

Vì vậy replica set được dựng nhưng transaction integration suite không được chạy.

`tests/mongo-transaction-unit.test.ts` còn mock Mongoose và chỉ test fallback standalone; nó không chứng minh transaction thật.

## 12.2. Script mới

Thiết kế:

```json
{
  "test:unit": "vitest run --config vitest.unit.config.ts",
  "test:integration": "vitest run --config vitest.integration.config.ts",
  "test:security": "vitest run --config vitest.security.config.ts",
  "test:property": "vitest run --config vitest.property.config.ts",
  "test:e2e": "playwright test",
  "test:ci": "npm run test:unit && npm run test:security && npm run test:integration",
  "deploy:check": "npm run lint && npm run typecheck && npm run test:ci && npm run build && npm run validate:env"
}
```

Không cần đúng tên config trên nếu có cấu trúc sạch tương đương.

## 12.3. Integration config

- Không mock `mongoose`.
- Dùng database riêng theo worker.
- Fail nếu URI chứa Atlas/public production host.
- Drop test database sau suite.
- Serial hoặc isolation phù hợp transaction tests.
- Index được tạo trước test.
- Replica set PRIMARY ready thật.

## 12.4. CI split jobs

Có thể tách:

```text
quality:
- lint
- typecheck
- unit

integration:
- Mongo replica set
- integration/security

build:
- production build

audit:
- npm audit
```

Ưu điểm:

- Log rõ.
- Không mất thời gian dựng Mongo cho lint.
- Required checks riêng.

## 12.5. Audit không được luôn xanh

Xóa:

```bash
npm audit --audit-level=high || true
```

Chọn:

- Fail high/critical.
- Hoặc allowlist vulnerability có:
  - advisory ID.
  - lý do.
  - owner.
  - expiry date.

Không allowlist vô thời hạn.

## 12.6. CI status

Sau khi push branch/PR:

- Xác nhận workflow thực sự chạy.
- Không chỉ dựa vào file YAML.
- Đọc log.
- Đính kèm kết quả trong báo cáo cuối.

---

# 13. P1 — API migration chưa hoàn tất

## 13.1. Legacy DTO

Posts/events vẫn trả cả:

```text
familyId
family_id
userId
user_id
createdAt
created_at
```

Và còn trả email.

Hoàn tất migration:

1. Tìm toàn bộ client đang đọc snake_case.
2. Chuyển client sang camelCase.
3. Thêm test contract.
4. Xóa legacy aliases.
5. Cập nhật docs.

Nếu cần deprecation period:

- Tạo API version.
- Không giữ alias vô thời hạn.
- Ghi deadline.

## 13.2. Cursor validation

`decodeCursor()` hiện validate date nhưng không validate cursor `id` là Mongo ObjectId.

Sửa:

- Validate exact cursor schema.
- Validate ObjectId.
- Giới hạn decoded payload size.
- Invalid cursor trả 400 thay vì silently trở thành first page.
- Có version field nếu cursor format có thể đổi.
- Có optional HMAC nếu không muốn client sửa cursor.

Test:

- Invalid base64.
- JSON quá lớn.
- Invalid date.
- Invalid ObjectId.
- Extra fields.
- Same timestamp stable ordering.
- Asc/desc pagination không duplicate/miss.

## 13.3. Email privacy

Mặc định DTO family content chỉ trả:

```text
id
name
avatar
```

Email chỉ trả ở:

- Profile của chính user.
- Admin endpoint có quyền.
- Family contact feature nếu explicit và có privacy setting.

Rà:

- Posts.
- Events.
- Photos.
- Members.
- Comments.
- RSVP.
- Join requests.

## 13.4. Delete consistency

Xóa event phải xử lý:

- Tasks.
- RSVP.
- Notifications.
- Invite/calendar references.

Xóa post phải xử lý:

- Comments.
- Reactions.
- Notifications nếu có.

Dùng transaction hoặc soft-delete + cleanup outbox.

---

# 14. P1 — Health diagnostics secret separation

## 14.1. Phát hiện

Diagnostics token hiện fallback sang:

```text
CRON_SECRET
```

Điều này tái sử dụng secret cho hai quyền:

- Trigger cron.
- Đọc internal diagnostics.

Tách:

```text
HEALTH_DIAGNOSTICS_TOKEN
CRON_SECRET
```

Không fallback chéo production.

Nếu thiếu diagnostics token:

- Diagnostics fail closed.
- Cron vẫn hoạt động với cron secret riêng.

## 14.2. Replica detection

Diagnostics dùng `replSetGetStatus`, có thể bị từ chối quyền trên managed MongoDB dù transaction vẫn được hỗ trợ.

Dùng `hello`:

```text
setName
msg === "isdbgrid"
logicalSessionTimeoutMinutes
```

hoặc thử transaction capability an toàn.

Không báo unsupported chỉ vì user không có quyền admin command.

## 14.3. HTTP status

Diagnostics DB degraded nên cân nhắc 503 thay vì 200, tùy monitoring contract.

Ghi rõ:

- `/health`: liveness.
- `/health/ready`: readiness.
- `/health/diagnostics`: protected detail.

---

# 15. P2 — Code quality và vận hành

## 15.1. Structured audit log

Không chỉ:

```ts
console.log('[audit]', ...)
```

Tạo model/service:

```text
AuditEvent
- actorId
- familyId?
- action
- targetType
- targetId
- metadata safe
- createdAt
- requestId
```

Không lưu:

- Invite code.
- Password.
- AI prompt/traits.
- Tokens.
- Cloudinary secret.

Audit các hành động:

- Role change.
- Account deletion.
- Invite regenerate.
- Join approve/reject.
- Game start/settlement/cancel.
- Cleanup failure.
- Admin action.

## 15.2. Correlation ID

Middleware/route helper tạo request ID.

Trả:

```text
X-Request-Id
```

Log lỗi theo ID.

Không trả stack/raw DB error.

## 15.3. Error classification

Thay catch rộng bằng error types:

- ValidationError.
- AuthError.
- ConflictError.
- TransactionNotSupportedError.
- InvariantViolation.
- ExternalServiceError.
- CleanupPendingError.

Không swallow mọi lỗi trong “concurrent create”.

## 15.4. Observability

Theo dõi:

- AI provider latency/error.
- Game settlement failures.
- Transactions retry.
- Cleanup pending.
- Cron results.
- Upload processing time.
- Rate-limit rejection.
- Readiness failures.

Không log PII thừa.

---

# 16. Migration/audit script vòng 3

Tạo:

```bash
npm run migration:round3:audit
npm run migration:round3:apply
```

Audit mặc định read-only.

Kiểm tra:

- User deleted nhưng còn password.
- Credentials deleted user vi phạm schema policy.
- Photo metadata có URL/publicId thiếu.
- Cloudinary cleanup pending.
- Round settled nhưng không có settlement.
- Settlement nhưng round chưa terminal.
- Family state idle nhưng activeRoundId còn.
- Family state active nhưng round không tồn tại.
- Reserved balance âm.
- Reserved balance >0 ở settled round.
- Bet không nằm trong settlement.
- Family có 0 admin.
- System có 0 admin.
- Admin state count lệch actual.
- User dangling references.
- Raw invite code trong RateLimit key.
- Rate-limit bucket count âm.
- Duplicate active round.
- Legacy snake_case client dependency nếu có thể static scan.

Apply mode:

- Có confirmation flag.
- Idempotent.
- Backup instructions.
- Không tự settle game bằng random mới.
- Không xóa Cloudinary không xác minh ownership.
- Ghi audit output.

---

# 17. Test matrix bắt buộc

## 17.1. Dependency/security

- Next upgraded.
- Middleware protected routes.
- Prefetch/RSC route checks.
- CSP production.
- Cookie production.

## 17.2. Bầu Cua

- Start concurrency.
- Bet concurrency.
- Bet-vs-roll race.
- Roll concurrency.
- Settlement replay.
- Crash rollback.
- Invariant drift.
- Unsupported transaction.
- Recovery.

## 17.3. Account deletion

- Credentials.
- Google.
- JWT invalidation.
- Last admin.
- Ownership transfer.
- Cloudinary cleanup.
- Idempotency.
- Partial failure rollback.

## 17.4. Quota/rate limit

- Bucket initial upsert race.
- Boundary rollover.
- Exact release.
- AI quota last slot concurrency.
- Invite abuse.
- Raw secret not stored.

## 17.5. Upload

- Pixel bomb.
- Multi-frame.
- MIME mismatch.
- Output oversized.
- DB partial failure.
- Populate failure.
- Cleanup retry.
- Quota exact release.

## 17.6. API

- Cursor malformed.
- CamelCase contract.
- No unnecessary email.
- Pagination stable.
- Delete cascade.

## 17.7. CI

- Unit job.
- Integration job.
- Build job.
- Audit job.
- No ignored high advisory.
- Latest commit status green.

---

# 18. Lệnh kiểm tra cuối

Bắt buộc chạy:

```bash
npm ci --legacy-peer-deps
npm run lint
npm run typecheck
npm run test:unit
npm run test:security
npm run test:integration
npm run test:property
npm run test:e2e
npm test
npm run build
npm run validate:env
npm run migration:round3:audit
npm audit --audit-level=high
```

Nếu một script chưa tồn tại, tạo script đúng thay vì bỏ qua.

Nếu E2E không chạy được trong môi trường hiện tại:

- Viết test.
- Cấu hình CI.
- Ghi rõ chưa có bằng chứng run.
- Không đánh dấu pass giả.

---

# 19. Checklist production gate

## Dependency

- [ ] Next.js không còn trong advisory range.
- [ ] NextAuth patch hiện hành.
- [ ] Audit high/critical sạch hoặc allowlist có expiry.
- [ ] Dependency thừa được xóa.

## Auth

- [ ] Middleware production E2E pass.
- [ ] Cookie name/default behavior thống nhất.
- [ ] SessionVersion invalidation pass.
- [ ] Protected routes không phụ thuộc duy nhất vào middleware; API vẫn auth server-side.

## Game

- [ ] Bet và roll write-conflict trên cùng invariant lock/version.
- [ ] Không có bet sau settlement.
- [ ] Không reserved orphan.
- [ ] Start CAS idempotent.
- [ ] Duplicate idempotency không tiếp tục aborted transaction.
- [ ] Settlement replay trả đúng myNet.
- [ ] Negative reserved không bị clamp che lỗi.
- [ ] Real replica-set concurrency tests pass.

## Account deletion

- [ ] Credentials deletion pass với schema thật.
- [ ] Google deletion pass.
- [ ] DB deletion transaction-safe.
- [ ] Cloudinary cleanup outbox.
- [ ] Không dangling reference.
- [ ] Last-admin invariant concurrency-safe.
- [ ] JWT cũ bị chặn.

## Quota

- [ ] AI last-slot concurrency đúng.
- [ ] Exact reservation/release.
- [ ] Rate-limit first-upsert không 500.
- [ ] Invite code không lưu raw.
- [ ] Shared limiter không dễ bị burn.

## Upload

- [ ] Photo.create partial failure cleanup đủ DB + storage.
- [ ] Cleanup retry.
- [ ] Processed output size limit.
- [ ] No unnecessary email.
- [ ] Pixel/frame tests pass.

## CSP/Health

- [ ] Production không có unsafe-eval.
- [ ] Strict CSP rollout có test.
- [ ] Middleware matcher hợp lý.
- [ ] Diagnostics không dùng CRON_SECRET.
- [ ] Replica detection không phụ thuộc privileged command.

## CI

- [ ] CI thực sự chạy integration tests.
- [ ] Replica set được dùng bởi tests.
- [ ] Audit không `|| true`.
- [ ] Workflow run latest commit green.
- [ ] Build production green.

---

# 20. Format báo cáo cuối của Grok

## A. Baseline

| Hạng mục | Kết quả |
|---|---|
| Commit | |
| Node/npm | |
| Install | |
| Lint | |
| Typecheck | |
| Unit | |
| Integration | |
| Property | |
| E2E | |
| Build | |
| Audit | |

## B. Findings verification

| ID | Phát hiện | Đúng/Sai/Một phần | Bằng chứng |
|---|---|---|---|

## C. Dependency security

| Package | Trước | Sau | Advisory/Reason |
|---|---:|---:|---|

## D. File changed

| File | Thay đổi | Test |
|---|---|---|

## E. Database consistency

- Transaction boundaries.
- Shared invariant locks.
- Indexes.
- Migration.
- Recovery.
- Rollback.

## F. Concurrency evidence

| Scenario | Số request | Expected | Actual |
|---|---:|---|---|

## G. Security evidence

- Auth middleware.
- Cookie.
- CSP.
- Invite.
- Quota.
- Health secrets.
- Upload privacy.

## H. CI evidence

- Workflow URL/run ID.
- Jobs.
- Failed/retried steps.
- Final status.

## I. Commands

| Command | Result |
|---|---|
| `npm run lint` | |
| `npm run typecheck` | |
| `npm run test:unit` | |
| `npm run test:security` | |
| `npm run test:integration` | |
| `npm run test:property` | |
| `npm run test:e2e` | |
| `npm run build` | |
| `npm audit --audit-level=high` | |

## J. Remaining risks

Mỗi risk phải có:

- Severity.
- File/module.
- Impact.
- Why not fixed.
- Owner/next action.
- Deadline.

Không ghi “production-ready” nếu bất kỳ P0 nào còn mở.

---

# 21. Thứ tự thực hiện ngay

Thực hiện đúng thứ tự:

1. Baseline và audit.
2. Nâng Next.js/NextAuth.
3. Chạy build/test sau dependency upgrade.
4. Sửa Bầu Cua BET-vs-ROLL lock/version.
5. Sửa duplicate transaction handling.
6. Viết real concurrency tests.
7. Sửa credentials account deletion.
8. Thiết kế deletion transaction + cleanup outbox.
9. Sửa family/system last-admin invariant.
10. Sửa AI quota reservation.
11. Sửa rate-limit exact bucket/retry/hash.
12. Sửa upload partial failure.
13. E2E NextAuth cookie/middleware.
14. Bỏ unsafe-eval production và cải thiện CSP.
15. Hoàn tất camelCase/privacy/cursor validation.
16. Tách diagnostics secret.
17. Sửa CI chạy integration/audit thật.
18. Migration audit.
19. Chạy toàn bộ production gate.
20. Báo cáo theo mục 20.

Không dừng sau phân tích. Hãy trực tiếp sửa repository.

---

# 22. Tài liệu chính thức cần đối chiếu

```text
Next.js security advisories
https://github.com/vercel/next.js/security/advisories

Next.js CSP guide
https://nextjs.org/docs/app/guides/content-security-policy

Next.js version 16 upgrade guide
https://nextjs.org/docs/app/guides/upgrading/version-16

Mongoose transactions
https://mongoosejs.com/docs/transactions.html

MongoDB transaction production considerations
https://www.mongodb.com/docs/manual/core/transactions-production-consideration/

NextAuth options/cookies
https://next-auth.js.org/configuration/options

NextAuth releases
https://github.com/nextauthjs/next-auth/releases

GitHub Actions service containers
https://docs.github.com/en/actions/tutorials/use-containerized-services/use-docker-service-containers

OWASP File Upload Cheat Sheet
https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
```

Ưu tiên:

1. Behavior được integration test.
2. Tài liệu chính thức.
3. Source code framework/package.
4. Không dựa vào suy đoán hoặc commit message.

---

# 23. Lời nhắc cuối

Các commit trước đã bổ sung nhiều lớp bảo vệ, nhưng file tồn tại không đồng nghĩa behavior đã đúng.

Đặc biệt không được nhầm:

```text
“có transaction helper”
```

với:

```text
“đã chứng minh transaction correctness dưới concurrency”
```

Không được nhầm:

```text
“có CI YAML”
```

với:

```text
“latest commit đã chạy và pass CI”
```

Không được nhầm:

```text
“có CSP header”
```

với:

```text
“CSP đủ mạnh để giảm XSS”
```

Không được nhầm:

```text
“soft-delete”
```

với:

```text
“account deletion không partial và không rò storage”
```

Bắt đầu chạy baseline ngay, sau đó sửa P0 trước.