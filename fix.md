# GROK 4.5 — TẾT CONNECT REVIEW ROUND 2 FIX PROMPT

> Repository: `https://github.com/dinhvien04/Tet`
>
> Baseline đã được review: commit `7a20782a9790991ca4d4eb47b18417ae9607ebb3`
>
> Đây là prompt sửa lỗi vòng 2, dùng sau `fix.md` hoặc master prompt trước đó.
>
> Không lặp lại việc “thêm thật nhiều tính năng”. Mục tiêu lần này là **sửa sâu tính đúng đắn, bảo mật, dữ liệu và CI** của phần code đã được tạo.

---

# 1. Vai trò và mục tiêu

Bạn là Staff Full-stack Engineer, Application Security Engineer và Database Reliability Engineer.

Nhiệm vụ:

1. Đọc trạng thái repository hiện tại.
2. Xác minh từng phát hiện trong tài liệu này bằng code thật.
3. Sửa trực tiếp các lỗi còn tồn tại.
4. Viết integration test và concurrency test thật.
5. Chạy toàn bộ lint, typecheck, test và build.
6. Không tuyên bố production-ready nếu còn lỗi P0 hoặc chưa có bằng chứng test.

Ưu tiên:

```text
Tính đúng đắn dữ liệu
→ Bảo mật
→ Khả năng phục hồi
→ Test/CI
→ Chuẩn hóa kiến trúc
→ Hiệu năng
→ UI nhỏ
```

Không ưu tiên thêm feature mới trong vòng này.

---

# 2. Quy tắc bắt buộc

## 2.1. Trước khi sửa

Chạy:

```bash
git status
git log --oneline -15
node --version
npm --version
npm install --legacy-peer-deps
npm run lint
npm run typecheck
npm test
npm run build
```

Ghi lại baseline:

| Lệnh | Kết quả | Lỗi |
|---|---|---|
| `git status` | | |
| `npm run lint` | | |
| `npm run typecheck` | | |
| `npm test` | | |
| `npm run build` | | |

Kiểm tra commit hiện tại có đúng hoặc mới hơn:

```text
7a20782a9790991ca4d4eb47b18417ae9607ebb3
```

Nếu code đã thay đổi sau commit trên, đánh giá lại thay vì áp dụng sửa đổi mù.

## 2.2. Trong khi sửa

- Không push thẳng vào `main`.
- Không deploy.
- Không xóa dữ liệu thật.
- Không tắt TypeScript/ESLint/test.
- Không dùng `as any`, `@ts-ignore` hoặc mock quá mức để làm test xanh.
- Không đổi behavior public mà không cập nhật client và tài liệu.
- Không thêm tính năng P3 mới.
- Mỗi nhóm sửa phải có test trước khi chuyển nhóm tiếp theo.
- Mọi migration/index mới phải có tài liệu rollback.
- Không cache dữ liệu authenticated trong Service Worker hoặc public cache.
- Không gọi logic nhiều-document “atomic” nếu chưa thực sự transaction-safe.

## 2.3. Định nghĩa hoàn thành

Một mục chỉ được đánh dấu hoàn thành khi:

1. Code đã sửa.
2. Test có thể thất bại với code cũ.
3. Test pass với code mới.
4. Lint và typecheck pass.
5. Tài liệu liên quan được cập nhật.

---

# 3. P0 — Service Worker đang cache dữ liệu riêng tư

## 3.1. Vấn đề cần xác minh

Đọc:

```text
public/sw.js
components/ServiceWorkerRegistration.tsx
lib/service-worker.ts
app/layout.tsx
```

Service Worker hiện có khả năng:

- Precache `/dashboard`.
- Cache response `/api/*`.
- Trả cached API response khi offline.
- Cache page authenticated bằng cache-first.
- Không phân vùng cache theo user.
- Không xóa cache chắc chắn khi logout.

Điều này có thể khiến dữ liệu của user trước xuất hiện với user sau trên máy dùng chung.

## 3.2. Sửa ngay theo lựa chọn an toàn

### Giai đoạn A — ưu tiên an toàn

Tạm ngừng đăng ký Service Worker production cho đến khi cache strategy mới có test đầy đủ.

Có thể:

- Xóa `ServiceWorkerRegistration` khỏi root layout.
- Hoặc gate bằng feature flag mặc định `false`.
- Khi disable, chủ động unregister Service Worker cũ và xóa cache cũ.

Phải xử lý user đã từng cài Service Worker:

```ts
const registrations = await navigator.serviceWorker.getRegistrations()
await Promise.all(registrations.map((registration) => registration.unregister()))

const names = await caches.keys()
await Promise.all(
  names
    .filter((name) => name.startsWith('tet-connect'))
    .map((name) => caches.delete(name))
)
```

Không chỉ ngừng đăng ký mới vì Service Worker cũ vẫn có thể tiếp tục điều khiển trang.

### Giai đoạn B — nếu vẫn muốn giữ offline

Chỉ cache allowlist tài nguyên công khai bất biến:

```text
/_next/static/*
/icons/*
/offline
/manifest.webmanifest
```

Không cache:

```text
/api/*
/dashboard/*
/family/*
/admin/*
/profile/*
/events/*
/photos/*
/posts/*
/games/*
/join/*
```

Các nguyên tắc:

- Không cache request có `Authorization`.
- Không cache response có `Set-Cookie`.
- Không cache response có `Cache-Control: no-store`.
- Không cache non-GET request.
- Không cache API JSON authenticated.
- Không cache page authenticated.
- Không preload `/dashboard`.
- Không dùng cache-first cho HTML application pages.
- Clear cache khi logout.
- Version cache theo release.
- Có test để chứng minh dữ liệu user A không được trả cho user B.

## 3.3. Header dữ liệu riêng tư

Tạo helper dùng chung cho authenticated response khi phù hợp:

```text
Cache-Control: private, no-store, max-age=0
Pragma: no-cache
```

Không áp dụng mù cho static asset.

## 3.4. Test bắt buộc

Viết test cho:

- `/api/profile` không bị Service Worker cache.
- `/api/notifications` không bị cache.
- `/dashboard` không nằm trong precache.
- Request authenticated không được ghi vào Cache Storage.
- Logout xóa cache cũ.
- Service Worker cũ được unregister khi feature bị disable.
- User B không nhận response cached của user A.

Nếu khó test Service Worker bằng Vitest, tạo Playwright test hoặc test logic routing/caching được tách thành pure function.

## 3.5. Tiêu chí nghiệm thu

- [ ] Không còn cache authenticated API.
- [ ] Không precache `/dashboard`.
- [ ] Cache cũ được dọn.
- [ ] Có regression test.
- [ ] Tài liệu PWA không tuyên bố offline cho dữ liệu riêng tư nếu chưa hỗ trợ.

---

# 4. P0 — Viết lại Bầu Cua bằng transaction thật

## 4.1. Vấn đề hiện tại

Đọc:

```text
app/api/games/bau-cua/start/route.ts
app/api/games/bau-cua/bet/route.ts
app/api/games/bau-cua/roll/route.ts
lib/models/BauCuaRound.ts
lib/models/BauCuaBet.ts
lib/models/BauCuaWallet.ts
lib/mongodb.ts
```

Các lỗi cần sửa:

1. Reserve điểm và tạo bet chưa nằm trong cùng transaction.
2. Roll cập nhật wallet trước khi đánh dấu round hoàn tất.
3. Process crash có thể để round kẹt `rolling`.
4. Người không có quyền có thể CAS round sang `rolling` rồi mới bị từ chối.
5. Mỗi family chưa được database bảo đảm chỉ có một active round.
6. Chưa có settlement ledger.
7. Chưa có recovery mechanism.
8. Test hiện chưa chứng minh concurrency thật.

## 4.2. Transaction infrastructure

Tạo helper transaction dùng Mongoose:

```ts
export async function withMongoTransaction<T>(
  operation: (session: ClientSession) => Promise<T>
): Promise<T>
```

Yêu cầu:

- Dùng `mongoose.connection.transaction()` hoặc `session.withTransaction()`.
- Truyền `session` vào mọi query/write bên trong transaction.
- Retry transient transaction errors theo behavior driver.
- Không chạy các operation phụ thuộc thứ tự bằng `Promise.all()` trong transaction.
- Không gọi external service trong transaction.
- Log transaction ID/correlation ID nhưng không log secret.
- Local integration test phải dùng MongoDB replica set.

Không fallback âm thầm sang non-transactional mode trong production.

Nếu database không hỗ trợ transaction:

- Health/deployment validation phải báo rõ.
- Route game quan trọng phải fail closed với lỗi cấu hình phù hợp.
- Không tiếp tục settlement kiểu nửa vời.

## 4.3. Thiết kế model

### BauCuaRound

Bổ sung/chuẩn hóa:

```text
status:
- betting
- locked
- settling
- settled
- cancelled

hostUserId
bettingClosesAt
lockedAt
settlementId
settledAt
result
version
```

Không cần giữ đúng tên trên nếu có thiết kế tốt hơn, nhưng state machine phải rõ.

### Active round lock

Chọn một trong hai thiết kế đáng tin cậy:

#### Phương án A — lock document riêng

```text
BauCuaFamilyGameState
- familyId unique
- activeRoundId
- status
- version
```

Tạo round và cập nhật state trong cùng transaction.

#### Phương án B — partial unique index

Nếu MongoDB/index schema hỗ trợ thiết kế phù hợp, dùng partial unique index bảo đảm chỉ một active round.

Không chỉ dựa vào:

```text
find active
→ create round
```

### Settlement ledger

Tạo model:

```text
BauCuaSettlement
- roundId unique
- familyId
- result
- entries[]
- status
- createdAt
- completedAt
```

Mỗi entry nên chứa:

```text
userId
reservedAmount
netDelta
balanceBefore
balanceAfter
```

Không phụ thuộc duy nhất vào log console.

## 4.4. Transaction đặt cược

Trong một transaction:

1. Đọc round theo `_id/familyId/status`.
2. Xác minh `bettingClosesAt > serverNow`.
3. Kiểm tra idempotency key.
4. Reserve balance bằng conditional update.
5. Tạo bet.
6. Commit.

Idempotency key:

- Bắt buộc cho client.
- Unique theo `roundId + userId + idempotencyKey`.
- Retry trả cùng kết quả.
- Không reserve hai lần.
- Không rollback reserve của request thành công khác.

Không dùng flow:

```text
reserve
→ query round ngoài transaction
→ create bet
→ rollback thủ công
```

## 4.5. Transaction khóa và settlement

### Quyền

Xác minh host/admin trước khi đổi trạng thái.

CAS phải bao gồm điều kiện hợp lệ:

```text
round id
family id
host/admin authorization context
status=betting
bettingClosesAt <= now hoặc explicit host close rule
```

### Settlement

Trong cùng transaction:

1. Chuyển round `locked → settling` nếu chưa settling.
2. Tạo hoặc đọc settlement ledger theo unique roundId.
3. Đọc toàn bộ bet của round.
4. Tính kết quả từ server random.
5. Cập nhật wallet.
6. Xóa/giảm reservedBalance chính xác.
7. Ghi ledger.
8. Đánh dấu round `settled`.
9. Commit.

Nếu crash trước commit: không thay đổi nào tồn tại.

Nếu retry sau commit: trả settlement đã có, không cộng lại.

Không dùng:

```text
bulkWrite wallet
→ sau đó mới set settlementCompleted
```

## 4.6. Recovery

Tạo cơ chế phục hồi:

- Round `settling` quá thời gian có thể retry an toàn.
- Round `betting` hết hạn có thể được host/admin khóa.
- Không tự roll không kiểm soát.
- Có admin diagnostic endpoint hoặc script chỉ đọc để tìm round kẹt.
- Có audit log cho start, bet, lock, settle, cancel.

## 4.7. Concurrency test bắt buộc

Dùng MongoDB replica-set integration test.

Test:

1. 20 request cược đồng thời không vượt `availableBalance`.
2. Hai request cùng idempotency key chỉ tạo một bet.
3. Hai request khác key vẫn giữ đúng tổng.
4. Bet và roll đồng thời không tạo reserved orphan.
5. Hai request roll chỉ một settlement.
6. Retry settlement không cộng tiền lần hai.
7. Crash simulation giữa các bước không để partial wallet update.
8. Hai request start chỉ tạo một active round.
9. User thường spam roll không thay đổi state.
10. Reserved balance về đúng 0 sau settlement.
11. Không có wallet âm ngoài rule được định nghĩa.
12. Transaction fail thì round/bet/wallet đều rollback.

## 4.8. Tiêu chí nghiệm thu

- [ ] README không gọi “atomic” sai sự thật.
- [ ] Mọi multi-document game write nằm trong transaction.
- [ ] Có settlement ledger unique.
- [ ] Có integration concurrency tests.
- [ ] CI chạy MongoDB replica set.
- [ ] Không có manual rollback dễ race.
- [ ] Không còn round kẹt không thể phục hồi.

---

# 5. P0 — Thiết kế lại xóa tài khoản

## 5.1. Vấn đề cần xử lý

Đọc:

```text
app/api/profile/route.ts
app/api/profile/export/route.ts
lib/models/User.ts
lib/models/Family.ts
lib/models/Event.ts
lib/models/EventTask.ts
lib/models/Photo.ts
lib/models/BauCua*.ts
```

Route hiện có thể xóa User nhưng để lại:

- Family `createdBy`.
- Event `createdBy`.
- Task `assignedTo`.
- Join request.
- Audit/log data.
- Cloudinary object.
- Một số dữ liệu game.
- JWT/session còn sống.

## 5.2. Chọn deletion policy rõ ràng

Ưu tiên mô hình hai bước:

```text
active
→ deletion_pending
→ anonymized/deleted
```

Thêm vào User nếu phù hợp:

```text
status
deletedAt
sessionVersion
```

Không cần hard-delete ngay trong request HTTP dài.

### Phương án đề xuất

1. User xác nhận.
2. Kiểm tra last-admin.
3. Kiểm tra active game/bet.
4. Chuyển/gỡ quyền sở hữu.
5. Tăng `sessionVersion`.
6. Anonymize dữ liệu cần giữ.
7. Xóa dữ liệu cá nhân.
8. Xóa Cloudinary assets cần xóa.
9. Đánh dấu deleted hoặc hard-delete cuối cùng.
10. Logout client và vô hiệu hóa token cũ.

## 5.3. Session invalidation

JWT phải chứa `sessionVersion` hoặc equivalent.

Mỗi lần resolve session:

- User không tồn tại → xóa `token.id`, role về user, session không authenticated.
- User deleted/disabled → từ chối session.
- `sessionVersion` không khớp → từ chối session.

Sửa callback hiện tại để token không giữ ID cũ khi DB user đã bị xóa.

Test:

- Xóa account rồi request API với JWT cũ phải nhận 401.
- User bị disable không dùng session cũ.
- Đổi password có thể tùy policy tăng sessionVersion để logout thiết bị khác.

## 5.4. Ownership transfer

### Family

Nếu user là creator/admin:

- Bắt buộc chọn admin kế nhiệm.
- Hoặc tự chọn admin lâu năm nhất theo policy rõ ràng.
- Không để `createdBy` trỏ tới user không tồn tại.

### Event

Chọn một trong:

- Transfer `createdBy` sang family admin.
- Hoặc anonymize creator nhưng model/DTO phải chịu được null.
- Hoặc cascade delete event theo lựa chọn rõ ràng.

### Task

- Reassign task.
- Hoặc set `assignedTo=null` và trạng thái `unassigned`.
- Không để required ObjectId dangling.

## 5.5. Photos và Cloudinary

Trước khi xóa Photo metadata:

- Thu thập `publicId`.
- Xóa Cloudinary.
- Ghi trạng thái cleanup.
- Nếu Cloudinary lỗi, retry bằng background cleanup record/job.
- Không xóa metadata trước rồi mất khả năng tìm object.

## 5.6. Game safety

Không cho xóa account khi:

- Có bet trong active round.
- Có reservedBalance > 0.
- Là host của active round.

Hoặc phải có quy trình cancel/settle/transfer an toàn trong transaction.

## 5.7. Data export

Export phải:

- Có pagination/stream hoặc archive nếu dữ liệu lớn.
- Không âm thầm cắt ở 500/200 mà không báo.
- Ghi `truncated`, `nextCursor` hoặc xuất đầy đủ.
- Bao gồm dữ liệu người dùng hợp lý như task, game history, join request nếu policy yêu cầu.
- Không chứa secret/password hash.

## 5.8. Test bắt buộc

- Sole system admin không xóa được.
- Sole family admin không xóa được nếu chưa transfer.
- Family/event/task không dangling reference.
- Cloudinary cleanup được gọi.
- Cleanup lỗi tạo retry record.
- Active bet chặn deletion.
- JWT cũ bị vô hiệu.
- Google và credentials account đều xử lý đúng.
- Request deletion lặp lại phải idempotent.
- Export không âm thầm truncate.

---

# 6. P0 — Bắt buộc invite secret khi join family

## 6.1. Lỗi hiện tại

Route join có thể dùng Family ObjectId để tìm family. Nếu client không gửi invite code, family không yêu cầu duyệt có thể cho join trực tiếp.

ObjectId không phải secret.

## 6.2. Contract mới

Route public join chỉ nhận:

```json
{
  "inviteCode": "..."
}
```

Hoặc signed invite token:

```text
familyId
inviteVersion
expiresAt
signature
```

Không cho join chỉ bằng family ObjectId.

Family ID có thể dùng để xác định context sau khi user đã là member, nhưng không thay thế invite credential.

## 6.3. Invite version

Thêm:

```text
inviteVersion
inviteCodeHash hoặc inviteCode
inviteExpiresAt
```

Regenerate/revoke phải làm token cũ mất hiệu lực.

Nếu lưu raw invite code, không log nó. Tốt hơn có thể lưu hash tùy UX.

## 6.4. Rate limit

Giới hạn theo:

- User ID.
- IP.
- Invite/family.
- Thất bại liên tiếp.

Không để attacker thử invite code không giới hạn bằng nhiều account.

## 6.5. Join approval transaction

Approve request phải transaction-safe:

```text
pending request
→ create membership
→ mark approved
```

Nếu membership tạo thành công nhưng request save lỗi, không được để trạng thái mâu thuẫn.

Hai admin approve đồng thời phải:

- Chỉ tạo một membership.
- Cùng nhận kết quả idempotent hợp lý.
- Không trả 500 do duplicate key không xử lý.

## 6.6. Test bắt buộc

- ObjectId không đủ để join.
- Invite code sai bị từ chối.
- Invite hết hạn bị từ chối.
- Invite revoke bị từ chối.
- Hai request join đồng thời chỉ một membership/request.
- Hai admin approve đồng thời không tạo duplicate.
- Rate limit theo IP và user.
- Không log invite code.

---

# 7. P1 — Sửa rate limiter và quota AI

## 7.1. Lỗi fixed-window hiện tại

Implementation đang đọc record trước rồi quyết định `$set count=1` hoặc `$inc`.

Khi nhiều request đầu cửa sổ đến đồng thời, nhiều request có thể cùng reset count về 1.

## 7.2. Yêu cầu rate limiter mới

Dùng một trong:

### Phương án A — MongoDB atomic pipeline update

Một `findOneAndUpdate` bằng aggregation pipeline để:

- Nếu window cũ: reset và count=1.
- Nếu cùng window: count+1.
- Trả count sau update.
- Không có read-before-write race.

### Phương án B — bucket document

Key gồm bucket:

```text
<scope>:<identity>:<windowStart>
```

Dùng atomic `$inc` + upsert trên unique key.

Ví dụ:

```text
ai:user:<id>:2026-07-10T12:30
```

TTL cleanup record sau expiry.

Phương án bucket đơn giản và dễ chứng minh concurrency hơn.

## 7.3. Quota AI

Tách hai khái niệm:

### Attempt rate limit

Đếm mọi attempt để chống spam.

### Successful usage quota

Chỉ tăng sau khi provider trả response hợp lệ.

Flow:

```text
auth
→ validate
→ attempt rate limit
→ kiểm tra quota hiện tại
→ gọi provider
→ validate output
→ atomic increment successful usage
→ trả response
```

Nếu quota success increment bị race:

- Dùng reservation token có expiry.
- Hoặc atomic conditional increment trước call rồi rollback đáng tin cậy.
- Hoặc chấp nhận tối đa chênh lệch được thiết kế rõ, nhưng phải giải thích.

Không trừ quota success khi:

- Thiếu API key/model.
- Provider 401.
- Provider 429.
- Provider 500.
- Timeout.
- Response JSON lỗi.
- Không có content.

## 7.4. AI response validation

- Giới hạn output length.
- Kiểm tra content là string không rỗng.
- Không trả raw provider response.
- Không log prompt/traits.
- Usage log có retention policy hoặc structured audit.
- IP extraction chỉ tin trusted proxy environment; ghi chú rõ.

## 7.5. Test bắt buộc

- 50 request đồng thời không vượt configured limit.
- Request đầu window không làm count bị mất.
- Sang window mới reset đúng.
- TTL index hoạt động ở integration level.
- Provider failure không trừ success quota.
- Timeout không trừ success quota.
- Success tăng quota đúng một.
- Hai success đồng thời không vượt quota.
- Output rỗng bị xử lý an toàn.

---

# 8. P1 — Chuẩn hóa toàn bộ API cũ

## 8.1. Phạm vi

Rà toàn bộ:

```text
app/api/**/route.ts
```

Đặc biệt:

```text
app/api/posts/route.ts
app/api/events/route.ts
app/api/comments/route.ts
app/api/reactions/route.ts
app/api/tasks/route.ts
```

## 8.2. Validation

Mọi route phải validate:

- Params.
- Query.
- Body.
- Enum.
- String length.
- Date.
- Integer.
- Mongo ObjectId.
- Pagination.

Không được để:

```ts
body.content.trim()
new Date(body.date)
Model.find({ familyId: rawValue })
```

trước validation.

Mongo ObjectId sai phải trả 400, không trả 500.

Ngày invalid phải trả 400.

JSON malformed phải trả 400.

## 8.3. DTO

Chọn camelCase duy nhất:

```text
familyId
userId
createdAt
createdBy
```

Không trả đồng thời hoặc tiếp tục tạo API mới với:

```text
family_id
user_id
created_at
created_by
```

Nếu cần backward compatibility:

1. Tạo versioned migration period.
2. Client chuyển hoàn toàn sang camelCase.
3. Ghi deprecated fields.
4. Xóa legacy sau khi test.

Không lộ email thành viên trong response feed/event nếu UI không cần.

## 8.4. Pagination

Bổ sung cursor pagination cho:

- Events.
- Comments.
- Join requests.
- Admin audit.
- Game history.
- Data export nếu cần.

Không tải toàn bộ events của family không giới hạn.

## 8.5. Count aggregation

Feed không nên tải toàn bộ comment chỉ để đếm.

Dùng:

- Aggregation `$group`.
- Counter field được cập nhật an toàn.
- Hoặc query count theo tập post bằng aggregation.

Đánh giá data size trước khi chọn.

## 8.6. Cascade consistency

Xóa post/event và dữ liệu phụ phải:

- Transaction nếu cần all-or-nothing.
- Hoặc soft-delete + cleanup job idempotent.
- Không dùng `Promise.all(deleteMany, deleteOne)` rồi coi là atomic.

Khi xóa event, xử lý:

- Tasks.
- RSVPs.
- Notifications liên quan.
- Calendar/related references.

Khi xóa post, xử lý:

- Comments.
- Reactions.
- Notification liên quan nếu có.

## 8.7. Test bắt buộc

Cho mỗi nhóm route:

- Invalid ObjectId.
- Invalid date.
- Object thay string.
- Oversized string.
- Unauthorized.
- Non-member.
- Creator/admin rules.
- DTO không chứa email không cần.
- Cursor ổn định khi cùng timestamp.
- Delete rollback/cleanup consistency.

---

# 9. P1 — Upload ảnh đúng số pixel

## 9.1. Lỗi hiện tại

`buffer.length` là byte, không phải số pixel.

Không được dùng byte length để so với `MAX_PIXELS`.

## 9.2. Sửa

Dùng thư viện xử lý ảnh phù hợp, ưu tiên `sharp` nếu tương thích deployment.

Flow:

1. Giới hạn request body/file byte trước.
2. Đọc magic bytes.
3. Decode metadata.
4. Kiểm tra:
   - width.
   - height.
   - width × height.
   - page/frame count nếu ảnh động.
5. Từ chối decompression bomb.
6. Auto-rotate.
7. Strip metadata.
8. Re-encode JPEG/WebP/AVIF theo policy.
9. Upload Cloudinary.
10. Save DB.
11. Rollback storage nếu DB lỗi.

HEIC:

- Xác minh runtime thực sự decode được.
- Nếu không chắc, từ chối HEIC thay vì allow magic bytes nhưng fail bất ngờ.
- Có test fixture hợp lệ.

## 9.3. Quota upload atomic

Không dùng:

```text
countDocuments
→ upload
→ create photo
```

để làm quota duy nhất.

Dùng atomic usage bucket theo ngày/user hoặc reservation.

Nếu upload fail, release reservation.

## 9.4. Test

- 100×100 ảnh hợp lệ.
- File 10MB nhưng pixel hợp lệ.
- File nhỏ byte nhưng pixel cực lớn.
- MIME giả.
- Polyglot nếu có fixture.
- Animated image quá nhiều frame.
- HEIC supported/unsupported.
- Metadata EXIF bị strip.
- Quota concurrency.
- Cloudinary success + DB fail cleanup.
- Cloudinary fail không tạo DB record.

---

# 10. P1 — CI và integration environment

## 10.1. Không chạy subset thủ công làm quality gate duy nhất

Hiện `test:ci` liệt kê thủ công nhiều file.

Sửa:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "...",
    "test:integration": "...",
    "test:e2e": "...",
    "test:ci": "npm run test:unit && npm run test:integration"
  }
}
```

CI quality gate phải chạy toàn bộ test thuộc category, không dựa vào danh sách file dễ bị quên.

## 10.2. MongoDB replica set cho CI

Tạo integration environment hỗ trợ transaction.

Có thể dùng một trong:

- MongoDB service/container được cấu hình thành single-node replica set.
- Testcontainers.
- `mongodb-memory-server` replica set nếu tương thích.
- Docker Compose script riêng cho local CI.

Không chỉ đặt `MONGODB_URI` trỏ localhost khi không có MongoDB server.

## 10.3. Test separation

- Unit test: nhanh, mock external provider.
- Integration test: database thật/ephemeral replica set.
- E2E: login, family, post, event, upload mock, game core.

Mỗi test database phải:

- Có database name riêng.
- Reset giữa test suite.
- Không chạm production/staging.
- Fail nếu URI trông giống production.

## 10.4. Audit dependency

Không dùng:

```bash
npm audit --audit-level=high || true
```

làm step có vẻ kiểm tra nhưng luôn pass.

Chọn policy:

- Fail với critical/high có bản vá khả dụng.
- Hoặc tạo allowlist có expiry và lý do.
- Upload audit report artifact.

## 10.5. Workflow permissions

Thêm tối thiểu:

```yaml
permissions:
  contents: read
```

Pin action version hợp lý.

Không truyền production secrets vào PR từ fork.

## 10.6. Branch protection

Tài liệu yêu cầu:

- CI required trước merge.
- Không push trực tiếp main.
- Review ít nhất một người nếu repo có cộng tác.
- Secret scanning/Dependabot nếu khả dụng.

## 10.7. Test bắt buộc trong CI

- Service Worker privacy.
- Bầu Cua concurrency.
- Account deletion.
- Invite bypass.
- Rate limit concurrency.
- API validation.
- Upload pixel validation.
- Last-admin concurrency.
- Full build.

---

# 11. P1 — Security headers và health endpoint

## 11.1. CSP

Thêm Content Security Policy phù hợp Next.js.

Không copy một CSP quá rộng.

Phải xét:

- Next.js script nonce nếu dùng strict CSP.
- Cloudinary images.
- Google OAuth.
- MegaLLM chỉ gọi server-side, không cần browser connect-src.
- Development có thể cần policy riêng.
- `object-src 'none'`.
- `base-uri 'self'`.
- `frame-ancestors 'none'`.
- `form-action 'self'`.
- `upgrade-insecure-requests` production nếu phù hợp.

Bắt đầu bằng `Content-Security-Policy-Report-Only` nếu cần đo vi phạm, sau đó enforce.

## 11.2. Header khác

Production HTTPS:

```text
Strict-Transport-Security
Permissions-Policy
X-Content-Type-Options
Referrer-Policy
```

`X-XSS-Protection` đã lỗi thời; không coi nó là biện pháp chính.

## 11.3. Health endpoint

Public health endpoint chỉ trả tối thiểu:

```json
{
  "status": "ok"
}
```

Không trả public:

- `NODE_ENV`.
- Uptime chi tiết.
- Raw database error.
- Connection string.
- Stack trace.
- Internal latency nếu không cần.

Có thể tách:

```text
/health/live
/health/ready
```

Readiness kiểm DB nhưng response public vẫn generic.

Detailed diagnostics phải bảo vệ bằng admin/internal token.

## 11.4. Test

- CSP header xuất hiện production.
- CSP không phá Cloudinary image.
- Health DB failure không lộ error message.
- HSTS chỉ production/HTTPS.
- Admin diagnostic không public.

---

# 12. P1 — Root rendering và avatar domains

## 12.1. Không force-dynamic toàn app

Không đặt `dynamic = 'force-dynamic'` ở root layout nếu landing page có thể static.

Tách:

```text
app/layout.tsx                 public/static capable
app/(authenticated)/layout.tsx dynamic/authenticated
```

Hoặc cấu trúc tương đương.

Đo:

- Landing build output.
- Cache behavior.
- Không làm auth layout static nhầm.

## 12.2. Avatar

Profile hiện cho phép mọi URL HTTP/HTTPS nhưng `next/image` chỉ allow Cloudinary.

Chọn policy nhất quán:

### Policy A

Chỉ cho avatar từ:

- Cloudinary.
- Google trusted domain được cấu hình chính xác.

### Policy B

Không cho user nhập arbitrary remote URL; bắt buộc upload qua endpoint an toàn.

Ưu tiên Policy B.

Nếu vẫn render Google avatar, cấu hình exact `remotePatterns`, không wildcard mọi hostname.

Ngăn:

- SSRF qua image optimization.
- Arbitrary tracking URL.
- HTTP không mã hóa.
- URL cực dài/invalid.

---

# 13. P2 — Notification correctness

## 13.1. Dedupe key

Không dùng ngày cron chạy làm phần chính của reminder idempotency nếu có thể khiến một sự kiện nhận reminder hai lần qua mốc UTC.

Dùng semantic key:

```text
event:<eventId>:user:<userId>:window:24h
task:<taskId>:user:<userId>:window:24h
```

Hoặc reminder schedule record rõ ràng.

## 13.2. Timezone

Mọi khái niệm “ngày” theo người dùng/family cần:

- Lưu instant UTC.
- Có timezone field hoặc policy rõ.
- Hiển thị `Asia/Ho_Chi_Minh`.
- Dedupe theo reminder window, không ngẫu nhiên theo UTC date.

## 13.3. Test

- Cron chạy hai lần cùng giờ không duplicate.
- Cron chạy trước/sau UTC midnight không duplicate.
- Event đổi giờ cập nhật reminder đúng.
- Event xóa loại bỏ notification stale hoặc link vẫn an toàn.
- Preference off không tạo reminder.

---

# 14. P2 — Last-admin invariant bằng transaction

Rà:

```text
app/api/admin/users/route.ts
app/api/families/[id]/members/route.ts
app/api/profile/route.ts
```

Flow:

```text
count admins
→ update/delete
```

vẫn có race nếu hai request cùng chạy.

Sửa bằng:

- Transaction với lock/state document.
- Hoặc admin invariant document/version.
- Hoặc atomic policy khác có bằng chứng.

Test:

- Hai admin cùng tự/hạ quyền đồng thời.
- Hai request xóa hai admin cuối.
- System admin env policy.
- Account deletion đồng thời với role change.

---

# 15. Dọn tài liệu và tuyên bố sai

Rà:

```text
README.md
CHANGELOG.md
docs/ARCHITECTURE.md
docs/SECURITY.md
docs/MONGODB_INDEXES.md
docs/DEPLOYMENT_GUIDE.md
fix.md
```

Sửa các tuyên bố chưa đúng:

- Không gọi Bầu Cua “atomic settlement” nếu chưa transaction.
- Không gọi PWA “offline support” cho authenticated data nếu đã disable.
- Ghi rõ MongoDB replica set bắt buộc cho transaction.
- Ghi đúng CI hiện chạy test gì.
- Ghi account deletion policy thật.
- Ghi upload format thật.
- Ghi cache/privacy behavior.
- Ghi migration/index commands và rollback.

Thêm:

```text
docs/DATA_DELETION.md
docs/GAME_CONSISTENCY.md
docs/CACHING_SECURITY.md
```

nếu cần.

---

# 16. Migration và rollout

## 16.1. Database migration

Tạo script idempotent để:

- Thêm field mới.
- Tạo index mới.
- Backfill state.
- Tìm dangling references.
- Tìm active round trùng.
- Tìm wallet reserved âm.
- Tìm round kẹt rolling.
- Tìm Photo metadata nhưng Cloudinary object không xác định.
- Tìm Event/User dangling relation.

Script mặc định dry-run:

```bash
npm run migration:round2:audit
```

Chỉ thay đổi khi có flag rõ:

```bash
npm run migration:round2:apply
```

Không tự chạy migration destructive trong app startup.

## 16.2. Rollout

Thứ tự:

1. Disable Service Worker/cache nguy hiểm.
2. Deploy session invalidation compatibility.
3. Deploy schema/index migration.
4. Deploy Bầu Cua transaction.
5. Deploy account deletion mới.
6. Deploy invite join fix.
7. Deploy API normalization.
8. Enable CSP report-only.
9. Enforce CSP sau khi hết violation cần thiết.

## 16.3. Rollback

Ghi rõ:

- Feature flag cho game.
- Feature flag cho Service Worker.
- Cách rollback index.
- Cách recover round.
- Cách xử lý deployment giữa schema cũ/mới.
- Không rollback làm mất settlement ledger.

---

# 17. Lệnh kiểm tra cuối

Bắt buộc chạy:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:e2e
npm test
npm run build
npm run validate:env
npm audit --audit-level=high
```

Nếu chưa có E2E trước đó, tạo bộ smoke E2E tối thiểu hoặc ghi chính xác lý do không thể chạy; không được giả vờ pass.

Chạy thêm audit migration:

```bash
npm run migration:round2:audit
```

Không chạy apply trên production data.

---

# 18. Checklist nghiệm thu cuối

## P0

- [ ] Service Worker không cache dữ liệu authenticated.
- [ ] Service Worker cũ được unregister/clear.
- [ ] Bầu Cua bet dùng transaction.
- [ ] Bầu Cua settlement dùng transaction.
- [ ] Settlement ledger unique.
- [ ] Không thể tạo hai active rounds.
- [ ] User thường không thể thay đổi round state bằng roll spam.
- [ ] Account deletion không tạo dangling reference.
- [ ] Cloudinary được cleanup/retry.
- [ ] JWT cũ bị vô hiệu khi account bị xóa.
- [ ] Không join family chỉ bằng ObjectId.
- [ ] Join approval transaction-safe.

## P1

- [ ] Rate limiter không race đầu window.
- [ ] AI failure không trừ success quota.
- [ ] API cũ validate đầy đủ.
- [ ] DTO mới camelCase.
- [ ] Không lộ email không cần thiết.
- [ ] Event/comments có pagination.
- [ ] Upload kiểm pixel thật.
- [ ] Upload quota atomic.
- [ ] CI có MongoDB replica set.
- [ ] CI chạy toàn bộ test category.
- [ ] Audit không luôn pass.
- [ ] CSP/HSTS/Permissions-Policy hợp lý.
- [ ] Health endpoint không lộ lỗi nội bộ.
- [ ] Landing page không bị force-dynamic không cần thiết.
- [ ] Avatar policy khớp Next Image.

## P2

- [ ] Notification không duplicate qua UTC midnight.
- [ ] Last-admin invariant an toàn khi concurrency.
- [ ] Migration dry-run tồn tại.
- [ ] Tài liệu không tuyên bố sai.

---

# 19. Format báo cáo cuối của Grok

## A. Baseline

| Kiểm tra | Trước khi sửa |
|---|---|
| Commit | |
| Lint | |
| Typecheck | |
| Unit test | |
| Integration test | |
| Build | |

## B. Phát hiện đã xác minh

| ID | Phát hiện | Đúng/Sai/Một phần | Bằng chứng file |
|---|---|---|---|

## C. File thay đổi

| File | Thay đổi | Lý do | Test |
|---|---|---|---|

## D. Database

- Schema mới.
- Index mới.
- Migration.
- Transaction requirement.
- Rollback.
- Audit result.

## E. Security

- Service Worker/cache.
- Auth/session invalidation.
- Invite.
- CSP/headers.
- Health endpoint.
- Upload.

## F. Game consistency

- State machine.
- Transaction boundary.
- Idempotency.
- Settlement ledger.
- Recovery.
- Concurrency test result.

## G. Kết quả cuối

| Lệnh | Kết quả |
|---|---|
| `npm run lint` | |
| `npm run typecheck` | |
| `npm run test:unit` | |
| `npm run test:integration` | |
| `npm test` | |
| `npm run build` | |
| `npm audit --audit-level=high` | |

## H. Việc chưa hoàn thành

Mỗi việc phải có:

- Severity.
- Lý do thật.
- Rủi ro.
- Bước tiếp theo.

Không ghi “production-ready” nếu:

- Transaction test chưa chạy.
- CI chưa xanh.
- Service Worker vẫn cache auth.
- Account deletion vẫn dangling.
- Invite ObjectId bypass còn tồn tại.
- Lỗi high/critical chưa được xử lý hoặc chấp thuận rõ.

---

# 20. Cách bắt đầu

Bây giờ hãy thực hiện:

1. Chạy baseline.
2. Xác minh Service Worker trước.
3. Sửa P0 cache/privacy và test.
4. Sửa Bầu Cua bằng transaction thật.
5. Tạo MongoDB replica-set integration tests.
6. Sửa account deletion và session invalidation.
7. Sửa invite bypass.
8. Sửa rate limiter và AI quota.
9. Chuẩn hóa API cũ.
10. Sửa upload, CI, headers và health.
11. Chạy toàn bộ quality gate.
12. Báo cáo đúng format mục 19.

Không chỉ review hoặc đề xuất. Hãy trực tiếp sửa repository và cung cấp bằng chứng test.

---

# 21. Tài liệu kỹ thuật chính thức cần đối chiếu

- MongoDB production considerations for transactions:  
  `https://www.mongodb.com/docs/manual/core/transactions-production-consideration/`

- MongoDB transactions require a replica set or sharded cluster for multi-document work; standalone deployments do not support them.

- MDN Cache-Control reference:  
  `https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control`

- Next.js Content Security Policy guide:  
  `https://nextjs.org/docs/app/guides/content-security-policy`

- GitHub Actions Docker service containers:  
  `https://docs.github.com/en/actions/tutorials/use-containerized-services/use-docker-service-containers`

Khi tài liệu và suy đoán xung đột, ưu tiên tài liệu chính thức và behavior được test.