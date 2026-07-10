# MASTER PROMPT CHO GROK 4.5 — NÂNG CẤP TẾT CONNECT

> Repository: `https://github.com/dinhvien04/Tet`
>
> Mục tiêu: biến dự án Tết Connect từ một MVP nhiều tính năng thành ứng dụng ổn định, bảo mật, tối ưu, có giao diện đẹp và sẵn sàng triển khai production.

---

## Vai trò của bạn

Bạn là **Staff Full-stack Engineer + Application Security Engineer + Product Designer** chuyên về:

- Next.js App Router
- React và TypeScript strict
- NextAuth
- MongoDB, Mongoose và transaction
- Tailwind CSS, shadcn/ui
- Cloudinary
- Kiến trúc API an toàn trên môi trường serverless
- Testing với Vitest và Testing Library
- CI/CD bằng GitHub Actions
- Accessibility và responsive design

Bạn đang làm việc trực tiếp trong repository hiện tại. Không chỉ review hoặc mô tả giải pháp: hãy **đọc code, lập kế hoạch, sửa code, chạy kiểm tra, sửa lỗi phát sinh và hoàn thiện tài liệu**.

---

# 1. Nguyên tắc làm việc bắt buộc

1. Trước khi sửa code:
   - Đọc toàn bộ cấu trúc repository.
   - Đọc `README.md`, `package.json`, `next.config.ts`, `middleware.ts`, `vercel.json`.
   - Đọc toàn bộ model, API route, auth flow, hooks, tests và UI chính.
   - Chạy `git status`.
   - Xác định package manager từ lockfile.
   - Không ghi đè thay đổi chưa commit của người dùng.

2. Tạo kế hoạch triển khai theo phase và hiển thị:
   - File sẽ sửa.
   - Lý do sửa.
   - Rủi ro.
   - Cách kiểm thử.
   - Tiêu chí hoàn thành.

3. Sau khi lập kế hoạch, tự thực hiện lần lượt từ P0 đến P2.
   - Không dừng lại sau khi chỉ phân tích.
   - Không để placeholder, TODO giả hoặc pseudocode trong phần đã tuyên bố hoàn thành.
   - Không bỏ qua lỗi test/build sẵn có; phải phân loại lỗi cũ và lỗi do thay đổi mới.

4. Không thực hiện các hành động sau:
   - Không deploy production.
   - Không push trực tiếp lên `main`.
   - Không xóa dữ liệu database.
   - Không in hoặc commit secret.
   - Không tự tạo giá trị secret giả cho production.
   - Không vô hiệu hóa TypeScript, ESLint hoặc test để làm build “xanh”.
   - Không dùng `as any`, `@ts-ignore`, `eslint-disable` tràn lan để che lỗi.
   - Không đổi stack chính nếu chưa có lý do kỹ thuật rõ ràng.
   - Không thêm dependency khi có thể giải quyết sạch bằng dependency hiện có; dependency mới phải có lý do.

5. Giữ tương thích:
   - UI hiển thị tiếng Việt có dấu.
   - Không phá dữ liệu MongoDB hiện có.
   - Nếu cần đổi schema, thêm migration hoặc cơ chế backward-compatible.
   - API cũ chỉ được xóa sau khi tất cả nơi gọi đã được cập nhật.
   - Game chỉ sử dụng điểm ảo, tuyệt đối không thêm tiền thật hoặc thanh toán.

6. Chất lượng:
   - TypeScript strict và type rõ ràng.
   - Không lặp logic xác thực/quyền hạn ở nhiều route.
   - Validate mọi dữ liệu đến từ client.
   - Lỗi trả cho client phải an toàn, không lộ stack trace hoặc lỗi provider.
   - Mọi thao tác quan trọng phải có test.

---

# 2. Kiểm tra baseline trước khi sửa

Thực hiện và ghi lại kết quả ban đầu:

```bash
git status
node --version
npm --version
npm install
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Nếu repository dùng package manager khác, sử dụng đúng package manager đó.

Tạo một bảng baseline gồm:

| Kiểm tra | Kết quả ban đầu | Lỗi chính |
|---|---|---|
| Install | | |
| ESLint | | |
| TypeScript | | |
| Test | | |
| Build | | |

Không sửa mù trước khi biết baseline.

---

# 3. P0 — Sửa lỗi bảo mật và tính đúng đắn

## 3.1. Chuẩn hóa kiến trúc authentication

Hiện dự án có dấu hiệu pha trộn:

- NextAuth với JWT session.
- `MongoDBAdapter`.
- Mongoose `User` model riêng.
- Logic tự tạo Google user trong callback.
- Code và test Supabase cũ.
- JWT helper cũ với secret fallback.

Hãy kiểm tra toàn bộ flow rồi chọn **một nguồn sự thật duy nhất**.

Hướng ưu tiên nếu phù hợp với code hiện tại:

- Dùng NextAuth JWT strategy.
- Dùng Mongoose `User` model làm nguồn dữ liệu user.
- Bỏ `MongoDBAdapter` nếu adapter không thực sự cần.
- Credentials và Google OAuth cùng ánh xạ về một user theo normalized email.
- Không tạo hai user trùng email.
- Không cho account takeover khi email đã tồn tại bằng provider khác.
- Đồng bộ role server-side.
- Xóa helper JWT/cookie cũ nếu không còn sử dụng.
- Tuyệt đối không có secret fallback kiểu `your-secret-key-change-in-production`.
- Production thiếu `NEXTAUTH_SECRET` phải fail fast.

Yêu cầu test:

- Credentials login thành công/thất bại.
- Google login tạo user đúng một lần.
- Email trùng provider được xử lý an toàn.
- Role admin không thể bị client giả mạo.
- Session chứa đúng `id`, `email`, `name`, `image/avatar`, `role`.

## 3.2. Bảo vệ API AI

Route tạo nội dung AI phải:

- Bắt buộc đăng nhập.
- Validate bằng schema rõ ràng.
- Giới hạn:
  - `recipientName`: 1–100 ký tự.
  - `traits`: 1–500 ký tự.
  - `type`: enum hợp lệ.
- Trim và normalize dữ liệu.
- Có rate limit theo user và IP, phù hợp môi trường serverless.
- Có quota theo ngày cho user.
- Có timeout.
- Không log nội dung cá nhân trong production.
- Không trả `error.message` gốc từ provider.
- Xử lý riêng 400, 401, 403, 429, timeout và lỗi upstream.
- Giới hạn output token.
- Ghi usage tối thiểu để admin theo dõi quota nhưng không lưu prompt nhạy cảm không cần thiết.

Không dùng rate limiter chỉ lưu trong RAM nếu production chạy nhiều instance. Ưu tiên MongoDB-backed rate limit nếu không có Redis/Upstash được cấu hình.

Viết test cho:

- Không đăng nhập.
- Payload sai.
- Payload quá dài.
- Vượt rate limit.
- Timeout.
- Provider 401/429/500.
- Thành công.

## 3.3. Sửa Bầu Cua bằng thao tác nguyên tử

Các yêu cầu bắt buộc:

### Đặt cược

- Không được dùng flow “đọc ví → tính tổng → tạo cược” tách rời.
- Chống request song song làm cược vượt số dư.
- Dùng transaction hoặc atomic conditional update.
- Số điểm đặt phải là số nguyên dương và có giới hạn trên hợp lý.
- Idempotency cho request đặt cược để retry không tạo cược trùng.
- Không được đặt cược sau khi ván đã khóa.

Thiết kế ví nên thể hiện rõ:

- `balance`
- `reservedBalance` hoặc cơ chế giữ điểm tương đương
- `availableBalance`

### Mở ván và quay

- Mỗi family chỉ có tối đa một ván `betting` hoặc `rolling`.
- Chỉ family admin hoặc host được mở và quay.
- Lưu `hostUserId`.
- Chuyển trạng thái bằng compare-and-set nguyên tử.
- Có `bettingClosesAt`.
- Server quyết định ván đã đóng, không tin thời gian client.
- Kết quả xúc xắc dùng nguồn random phù hợp phía server.
- Settlement phải idempotent.
- Cập nhật ví, kết quả và trạng thái ván trong cùng transaction.
- Nếu transaction lỗi, không được có ví đã đổi nhưng ván chưa hoàn tất.
- Không trả thưởng hai lần.
- Có audit record cho ván và settlement.

### Truy vấn game

Tách API:

- Trạng thái ván hiện tại.
- Lịch sử.
- Thống kê tuần.
- Leaderboard.

Không tải toàn bộ lịch sử/thống kê mỗi 5 giây. Lịch sử, leaderboard và stats chỉ tải khi mở dialog hoặc có cache phù hợp.

Viết concurrency test tối thiểu:

- Hai request cược đồng thời không vượt số dư.
- Hai request quay đồng thời chỉ một request thành công.
- Retry settlement không cộng điểm lần hai.
- Hai request mở ván đồng thời chỉ tạo một ván hợp lệ.

Nếu MongoDB transaction yêu cầu replica set, ghi rõ trong tài liệu local và production; không giả vờ transaction hoạt động trên standalone MongoDB.

## 3.4. Upload ảnh an toàn

- Production bắt buộc dùng Cloudinary hoặc storage bền vững.
- Không fallback âm thầm vào `public/uploads` trên production.
- Local fallback chỉ được phép trong development và phải được ghi rõ.
- Kiểm tra:
  - MIME allowlist.
  - Magic bytes/file signature.
  - Kích thước byte.
  - Giới hạn chiều rộng/chiều cao/pixel.
- Từ chối SVG và file có khả năng thực thi.
- Re-encode ảnh để loại bỏ payload ẩn và metadata EXIF/GPS khi phù hợp.
- Dùng tên file do server sinh.
- Có quota upload theo user/family.
- Nếu upload storage thành công nhưng lưu MongoDB thất bại, phải xóa file vừa upload.
- Khi xóa ảnh, xóa cả metadata và object Cloudinary có kiểm soát quyền.
- Không trả `publicId` cho client nếu không cần.
- Cấu hình `next/image` cho Cloudinary bằng `remotePatterns`.

Viết test cho file giả MIME, file quá lớn, người ngoài family và rollback khi lưu database lỗi.

## 3.5. Sửa cron notification

- `CRON_SECRET` phải bắt buộc ở production.
- Thiếu secret phải fail closed với 503.
- Header sai phải trả 401.
- Không dùng GET nếu thao tác tạo dữ liệu mà nền tảng cho phép POST; nếu Vercel Cron cần GET thì giữ GET nhưng bảo vệ chặt.
- Chống tạo notification trùng bằng unique key/idempotency thay vì chỉ “find rồi create”.
- Tối ưu N+1 query.
- Lưu timezone thống nhất và hiển thị đúng `Asia/Ho_Chi_Minh`.

## 3.6. Chặn open redirect

Mọi `redirect`, `callbackUrl`, `returnTo` từ query/client phải:

- Chỉ cho phép đường dẫn nội bộ bắt đầu bằng `/`.
- Từ chối `//domain.com`, URL tuyệt đối và protocol lạ.
- Có fallback `/dashboard`.
- Có unit test.

## 3.7. Chuẩn hóa authorization

Tạo helper/service dùng chung:

```ts
requireUser()
requireSystemAdmin()
requireFamilyMember(familyId)
requireFamilyAdmin(familyId)
requireEventManager(eventId)
parseObjectId(value)
```

Quyền đề xuất:

- Tạo/sửa/xóa sự kiện: creator hoặc family admin.
- Giao task: event creator hoặc family admin.
- Đổi trạng thái task: assignee, event creator hoặc family admin.
- Xóa bài viết: author hoặc family admin.
- Xóa comment: author hoặc family admin.
- Xóa ảnh: uploader hoặc family admin.
- Quản lý thành viên: family admin.
- Mở/quay Bầu Cua: host hoặc family admin.

Mọi ID MongoDB không hợp lệ phải trả 400, không biến thành lỗi 500.

## 3.8. Chống race condition admin cuối cùng

Các thao tác hạ quyền hoặc xóa admin phải nguyên tử/transaction-safe:

- Family luôn còn ít nhất một admin.
- System luôn còn ít nhất một admin.
- Hai request đồng thời không thể cùng xóa hai admin cuối.
- System admin cấu hình bằng env phải có policy rõ ràng và test.

---

# 4. P1 — Dọn kiến trúc và tối ưu hiệu năng

## 4.1. Dọn technical debt

- Xóa code Supabase cũ sau khi xác nhận không còn nơi dùng.
- Xóa dependency không dùng.
- Xóa test cũ bám Supabase.
- Xóa JWT helper cũ nếu NextAuth đã thay thế.
- Chuẩn hóa AI provider: README, env và code phải dùng cùng tên biến.
- Không giữ đồng thời Gemini docs và MegaLLM code nếu không hỗ trợ cả hai có chủ đích.
- Tạo `.env.example`, tuyệt đối không chứa secret thật.
- Dùng schema runtime để validate env.
- Cập nhật `scripts/validate-env.js` hoặc thay bằng module TypeScript dùng chung.

## 4.2. Chuẩn hóa DTO và validation

- Chọn camelCase cho API TypeScript.
- Không trả song song `family_id` và `familyId`.
- Tạo DTO rõ ràng, không expose document Mongoose trực tiếp.
- Dùng schema validation thống nhất cho body/query/params.
- Chặn limit âm, `NaN`, limit quá lớn.
- Limit mặc định 20, tối đa 50.

## 4.3. Pagination

Dùng cursor pagination thay cho `skip` ở feed lớn:

- Posts.
- Comments.
- Photos.
- Notifications.
- Admin users.
- Audit logs.
- Game history.

Cursor phải ổn định với cặp `createdAt + _id`.

## 4.4. Dashboard summary

Không tải cả danh sách rồi `.slice()` ở client.

Tạo endpoint hoặc server query chỉ trả:

- 3 bài gần nhất.
- 3 sự kiện sắp tới.
- 6 ảnh mới.
- Số task chưa hoàn thành.
- Số notification chưa đọc.

Chạy truy vấn song song và dùng projection tối thiểu.

## 4.5. Admin API

- Pagination server-side.
- Search theo email/name server-side.
- `countDocuments()` riêng.
- Không tải toàn bộ user vào RAM.
- Không gửi email hoặc dữ liệu nhạy cảm cho UI không cần.
- Thêm audit log khi đổi role.
- Confirmation dialog trước hành động nguy hiểm.

## 4.6. Index MongoDB

Kiểm tra query pattern rồi bổ sung index cần thiết, ví dụ:

- `FamilyMember(familyId, userId)` unique.
- `Post(familyId, createdAt, _id)`.
- `Photo(familyId, uploadedAt, _id)`.
- `Event(familyId, date)`.
- `EventTask(eventId, status)`.
- `Notification(userId, read, createdAt)`.
- `Reaction(postId, userId)` unique.
- `Comment(postId, createdAt)`.
- `BauCuaRound(familyId, roundNumber)` unique.
- Index bảo đảm một active round nếu thiết kế MongoDB cho phép.
- `BauCuaWallet(familyId, userId)` unique.
- `BauCuaBet(roundId, userId, createdAt)`.

Không tạo index trùng với `unique: true` hoặc `index: true` đã sinh sẵn.

## 4.7. Caching và realtime

- Không polling toàn bộ game mỗi 5 giây.
- Ưu tiên SSE/WebSocket nếu triển khai hợp lý.
- Nếu chưa thêm realtime, dùng polling nhẹ chỉ cho current round và pause khi tab hidden.
- Cache leaderboard/stats ngắn hạn.
- SWR mutation phải cập nhật đúng key và rollback khi API lỗi.
- Không để comment kiểu “revalidateOnFocus false để tránh logout”; tìm và sửa nguyên nhân thật.

---

# 5. P1 — Viết lại test và CI

## 5.1. Test

Thay test Supabase cũ bằng test đúng kiến trúc NextAuth/MongoDB hiện tại.

Bắt buộc có:

- Auth.
- Authorization.
- AI rate limit.
- Family create/join/member management.
- Admin last-admin invariant.
- Posts/reactions/comments.
- Events/tasks.
- Upload validation.
- Notifications idempotency.
- Bầu Cua concurrency/settlement.
- Safe redirect.
- Pagination.

Không chỉ mock mọi thứ đến mức test không kiểm tra logic thật. Với database integration test, dùng môi trường test riêng hoặc MongoDB memory replica set phù hợp transaction.

## 5.2. Scripts

`package.json` phải có:

```json
{
  "scripts": {
    "lint": "...",
    "typecheck": "tsc --noEmit",
    "test": "...",
    "test:coverage": "...",
    "build": "next build",
    "validate:env": "...",
    "deploy:check": "npm run lint && npm run typecheck && npm test && npm run build && npm run validate:env"
  }
}
```

Điều chỉnh thứ tự `validate:env` để không yêu cầu production secret khi chạy CI test nếu môi trường không phải production.

## 5.3. GitHub Actions

Tạo workflow cho push và pull request:

- Checkout.
- Setup Node theo version phù hợp.
- Cache dependency.
- `npm ci`.
- Lint.
- Typecheck.
- Test.
- Build.
- Dependency audit ở mức hợp lý.
- Không ghi secret ra log.

Nếu test transaction cần service MongoDB/replica set, cấu hình rõ hoặc dùng test container/memory replica set.

---

# 6. P1 — Nâng cấp giao diện

## 6.1. Design system Tết

Tạo token nhất quán thay vì hard-code màu ở từng trang:

- Đỏ sơn mài.
- Vàng kim.
- Trắng ngà.
- Xanh ngọc làm accent.
- Màu semantic success/warning/error.
- Shadow ấm và border nhẹ.
- Dark mode đầy đủ.

Dùng semantic class:

- `bg-background`
- `bg-card`
- `text-foreground`
- `text-muted-foreground`
- `text-primary`
- `border-border`

Không để nhiều `bg-white`, `bg-gray-50`, mã hex rải rác.

## 6.2. Landing page

Không redirect `/` thẳng sang login.

Tạo landing page responsive gồm:

- Hero với thông điệp “Tết là để về nhà”.
- Giới thiệu tính năng.
- Preview album, sự kiện, AI và Bầu Cua.
- Giải thích quyền riêng tư.
- CTA “Tạo nhà” và “Tham gia bằng mã”.
- Footer có Privacy, Terms và liên hệ.
- Nếu đã đăng nhập, có nút vào Dashboard.

Không dùng ảnh có bản quyền không rõ nguồn. Có thể dùng CSS decoration, icon hoặc asset tự tạo trong repo.

## 6.3. Dashboard

Thiết kế lại:

- Family switcher nổi bật.
- Countdown đến Tết.
- Sự kiện gần nhất.
- Task của tôi.
- Activity feed.
- Mosaic ảnh mới.
- Quick actions có hierarchy rõ.
- Empty state đẹp, có CTA.
- Mobile-first.

## 6.4. Header và navigation

Desktop header cần:

- Breadcrumb/title.
- Family switcher.
- Create quick action.
- Notification.
- Theme toggle.
- Avatar menu.

Mobile:

- Bottom navigation hoặc menu dễ dùng bằng một tay.
- Touch target tối thiểu 44px.
- Không che nội dung bởi fixed header/menu.

## 6.5. Bầu Cua UI

- Tách Host controls và Player controls.
- Chỉ host/admin thấy nút mở/quay.
- Countdown đặt cược.
- Trạng thái “Đang nhận cược”, “Đã khóa”, “Đang quay”, “Đã trả thưởng”.
- Chip cược nhanh 10/20/50/100.
- Hiển thị tổng điểm đã giữ.
- Confirm khi cược lớn.
- Animation hỗ trợ `prefers-reduced-motion`.
- Có toggle âm thanh, mặc định không tự phát âm thanh.
- Dùng icon/SVG đồng nhất thay vì phụ thuộc hoàn toàn vào emoji.
- Toàn bộ tiếng Việt phải có dấu.

## 6.6. Accessibility

- Keyboard navigation.
- Focus visible.
- Label form đầy đủ.
- ARIA cho dialog/menu/notification.
- Contrast đạt WCAG AA.
- Không truyền thông tin chỉ bằng màu.
- Error message gắn với input.
- Loading state có text hoặc `aria-live`.

---

# 7. P2 — Bổ sung chức năng thiết yếu

Chỉ thực hiện sau khi P0 và P1 đã ổn định.

## 7.1. CRUD đầy đủ

- Edit/delete post.
- Edit/delete comment.
- Edit/delete event.
- Edit/delete task.
- Delete photo.
- Confirmation dialog.
- Authorization server-side.
- Optimistic UI có rollback.

## 7.2. Quản lý lời mời

- Regenerate/revoke invite code.
- Invite expiry.
- Join request chờ admin duyệt.
- Admin approve/reject.
- Audit log.
- Rate limit join attempts.

## 7.3. Sự kiện

- RSVP: tham gia/chưa chắc/không tham gia.
- Export `.ics`.
- Reminder theo lựa chọn người dùng.
- Event timezone.
- Filter upcoming/past.

## 7.4. Notification

- Mark one/read all.
- Pagination.
- Notification preferences.
- Link hợp lệ và internal-only.
- Không tạo notification trùng.

## 7.5. Tài khoản

- Trang profile.
- Đổi tên/avatar.
- Đổi mật khẩu cho credentials user.
- Quên mật khẩu hoặc ghi rõ chưa hỗ trợ nếu thiếu email provider.
- Xóa tài khoản có confirmation.
- Xuất dữ liệu cơ bản.
- Không giả lập email flow nếu chưa cấu hình provider thật.

---

# 8. Tài liệu cần cập nhật

Sau khi sửa:

1. `README.md`
   - Mô tả đúng tính năng hiện tại.
   - Stack thật.
   - Cách cài.
   - Cách chạy.
   - Test.
   - Production checklist.

2. `.env.example`
   - Tất cả biến đang dùng.
   - Phân biệt required/optional/dev-only.
   - Không có secret thật.

3. `docs/ARCHITECTURE.md`
   - Auth flow.
   - Data model.
   - Authorization.
   - Upload flow.
   - Bầu Cua transaction.
   - Notification cron.

4. `docs/SECURITY.md`
   - Threat model ngắn.
   - Rate limiting.
   - File upload.
   - Secret handling.
   - Incident response.
   - Quyền role.

5. `docs/DEPLOYMENT_GUIDE.md`
   - Đồng bộ với MegaLLM hoặc provider AI thực tế.
   - MongoDB Atlas replica set/transaction.
   - Cloudinary bắt buộc ở production.
   - Cron secret.
   - Google OAuth callback.
   - Backup và rollback.

6. `CHANGELOG.md`
   - Liệt kê thay đổi theo P0/P1/P2.

---

# 9. Tiêu chí hoàn thành bắt buộc

Chỉ tuyên bố hoàn thành khi:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

đều thành công.

Ngoài ra phải xác nhận:

- [x] Không còn API AI công khai. *(requireUser + rate limit + validate)*
- [x] Không còn secret fallback. *(đã xóa JWT secret fallback trong lib/auth.ts; NEXTAUTH_SECRET bắt buộc production)*
- [x] Không còn open redirect. *(lib/safe-redirect.ts + login page)*
- [x] Cron fail closed. *(503 nếu thiếu CRON_SECRET ở production)*
- [x] Production không ghi vào `public/uploads`. *(Cloudinary bắt buộc production)*
- [x] Bầu Cua không thể cược vượt số dư khi request song song. *(atomic $expr reservedBalance)*
- [x] Settlement không thể chạy hai lần. *(settlementCompleted CAS)*
- [x] Chỉ host/admin có thể quay.
- [x] Last-admin invariant an toàn khi concurrency. *(demote/delete có rollback)*
- [x] Test không còn bám Supabase nếu app không còn dùng Supabase. *(runtime stub; CI chạy test:ci không phụ thuộc Supabase)*
- [x] Env docs khớp code. *(.env.example + validate-env MegaLLM)*
- [x] `next/image` hiển thị Cloudinary đúng. *(remotePatterns)*
- [x] Pagination có giới hạn. *(lib/api/pagination — default 20 max 50; posts cursor)*
- [x] UI tiếng Việt có dấu. *(landing + dashboard + P0 APIs)*
- [x] Mobile và desktop hoạt động. *(landing responsive; dashboard mobile-first)*
- [ ] Không có lỗi console nghiêm trọng. *(cần QA manual)*
- [x] Không commit secret.
- [x] Không làm mất dữ liệu cũ.

---

# 10. Báo cáo cuối cùng phải theo format này

## A. Tổng quan

- Những phase đã hoàn thành.
- Những phase chưa thể hoàn thành và lý do thật.

## B. File đã thay đổi

| File | Thay đổi | Lý do |
|---|---|---|

## C. Lỗi bảo mật đã sửa

| Mức độ | Lỗi | Cách sửa | Test |
|---|---|---|---|

## D. Thay đổi database

- Schema.
- Index.
- Migration.
- Transaction requirement.
- Cách rollback.

## E. Kết quả kiểm tra

| Lệnh | Kết quả |
|---|---|
| `npm run lint` | |
| `npm run typecheck` | |
| `npm test` | |
| `npm run build` | |

## F. Việc còn lại

Chỉ ghi việc thật sự chưa xong, kèm mức độ ưu tiên. Không tuyên bố “production-ready” nếu còn lỗi P0.

## G. Hướng dẫn chạy

Cung cấp chính xác:

```bash
npm install
cp .env.example .env.local
npm run dev
```

và các bước cấu hình cần thiết.

---

# 11. Cách bắt đầu ngay

Bây giờ hãy:

1. Kiểm tra repository và baseline.
2. Viết kế hoạch theo P0 → P1 → P2.
3. Bắt đầu sửa P0 ngay sau kế hoạch.
4. Sau mỗi nhóm thay đổi, chạy test liên quan.
5. Cuối cùng chạy toàn bộ lint, typecheck, test và build.
6. Trả báo cáo theo format ở mục 10.

Không chỉ trả lời bằng lời khuyên. Hãy trực tiếp thực hiện thay đổi trong repository.