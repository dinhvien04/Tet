# Manual Testing Checklist - Tết Connect

## Mục đích
Tài liệu này cung cấp checklist chi tiết để kiểm tra thủ công tất cả tính năng của Tết Connect trên các trình duyệt và thiết bị khác nhau.

## Môi trường Test

### Desktop Browsers
- [ ] Chrome (phiên bản mới nhất)
- [ ] Safari (phiên bản mới nhất)
- [ ] Firefox (phiên bản mới nhất)

### Mobile Devices
- [ ] iOS (Safari mobile)
- [ ] Android (Chrome mobile)

## Test Cases

---

## 1. Authentication & User Management (Yêu cầu 1)

### 1.1 Đăng nhập Google OAuth
**Browsers: Chrome, Safari, Firefox, iOS, Android**

- [ ] Truy cập trang chủ, nút "Đăng nhập bằng Google" hiển thị rõ ràng
- [ ] Click nút đăng nhập, chuyển hướng đến Google OAuth
- [ ] Chọn tài khoản Google, xác thực thành công
- [ ] Sau khi xác thực, redirect về dashboard
- [ ] Thông tin người dùng (email, tên, avatar) hiển thị đúng
- [ ] Refresh trang, session vẫn được giữ (không bị logout)
- [ ] Đăng xuất, session bị xóa và redirect về trang login

**Edge Cases:**
- [ ] Hủy OAuth flow ở giữa chừng → Không bị crash, có thể thử lại
- [ ] Đăng nhập với tài khoản đã tồn tại → Cập nhật thông tin, không tạo duplicate
- [ ] Đăng nhập khi đã có session → Không bị lỗi

---

## 2. Family Management (Yêu cầu 2, 3)

### 2.1 Tạo Nhà mới
**Browsers: Chrome, Safari, Firefox, iOS, Android**

- [ ] Người dùng mới đăng nhập lần đầu → Hiển thị tùy chọn tạo nhà hoặc tham gia
- [ ] Form tạo nhà hiển thị đúng với field "Tên nhà"
- [ ] Nhập tên nhà và submit → Nhà được tạo thành công
- [ ] Mã mời (invite code) được tạo và hiển thị
- [ ] Người tạo tự động là admin của nhà
- [ ] Sau khi tạo, redirect đến dashboard của nhà

**Edge Cases:**
- [ ] Tên nhà rỗng → Hiển thị validation error
- [ ] Tên nhà quá dài (>100 ký tự) → Validation hoặc truncate
- [ ] Tạo nhiều nhà liên tiếp → Mỗi nhà có mã mời unique

### 2.2 Mời và Tham gia Nhà
**Browsers: Chrome, Safari, Firefox, iOS, Android**

- [ ] Admin xem trang nhà → Link mời hiển thị rõ ràng
- [ ] Click nút "Sao chép link" → Link được copy vào clipboard
- [ ] Toast notification "Đã sao chép" xuất hiện
- [ ] Truy cập link mời (chưa đăng nhập) → Yêu cầu đăng nhập trước
- [ ] Truy cập link mời (đã đăng nhập) → Hiển thị thông tin nhà và nút "Tham gia"
- [ ] Click "Tham gia" → Thêm vào nhà với vai trò "member"
- [ ] Sau khi tham gia → Redirect đến dashboard của nhà

**Edge Cases:**
- [ ] Link mời không hợp lệ → Hiển thị error "Mã mời không tồn tại"
- [ ] Tham gia nhà đã là thành viên → Không tạo duplicate, redirect đến nhà
- [ ] Copy link trên mobile → Clipboard hoạt động đúng

---

## 3. AI Content Generation (Yêu cầu 4)

### 3.1 Tạo Câu đối và Lời chúc
**Browsers: Chrome, Safari, Firefox, iOS, Android**

- [ ] Truy cập tính năng tạo nội dung AI → Form hiển thị đầy đủ
- [ ] Form có các field: Tên người nhận, Đặc điểm, Loại nội dung
- [ ] Chọn loại nội dung: Câu đối, Lời chúc, Thiệp Tết
- [ ] Nhập thông tin và click "Tạo" → Loading state hiển thị
- [ ] Sau vài giây → Nội dung AI được tạo và hiển thị
- [ ] Nội dung có chứa tên người nhận và phù hợp với đặc điểm
- [ ] Click "Đăng lên tường" → Bài đăng được tạo thành công

**Edge Cases:**
- [ ] Field bắt buộc bỏ trống → Validation error
- [ ] API timeout (>30s) → Hiển thị error và nút "Thử lại"
- [ ] Rate limit (429) → Hiển thị "Vượt quá giới hạn, thử lại sau"
- [ ] Tạo nhiều nội dung liên tiếp → Không bị block
- [ ] Đặc điểm có ký tự đặc biệt → Không bị lỗi

---

## 4. Posts & Reactions (Yêu cầu 5, 6, 13)

### 4.1 Đăng và Hiển thị Bài đăng
**Browsers: Chrome, Safari, Firefox, iOS, Android**

- [ ] Tường nhà hiển thị danh sách bài đăng
- [ ] Bài đăng mới nhất ở trên cùng (thứ tự giảm dần)
- [ ] Mỗi bài đăng hiển thị: Avatar, tên, thời gian, nội dung
- [ ] Chỉ bài đăng của nhà hiện tại được hiển thị
- [ ] Scroll xuống → Infinite scroll load thêm bài đăng (nếu có)

**Edge Cases:**
- [ ] Nhà chưa có bài đăng → Hiển thị empty state
- [ ] Bài đăng có nội dung dài → Hiển thị đúng, không bị overflow
- [ ] Bài đăng có ký tự đặc biệt/emoji → Hiển thị đúng

### 4.2 Reactions
**Browsers: Chrome, Safari, Firefox, iOS, Android**

- [ ] Mỗi bài đăng có nút reaction: Tim, Haha
- [ ] Click reaction lần đầu → Reaction được thêm, nút highlight
- [ ] Số lượng reaction tăng lên 1
- [ ] Click lại cùng reaction → Reaction bị xóa, nút không highlight
- [ ] Số lượng reaction giảm xuống 0
- [ ] Click reaction khác → Đổi sang loại mới, số lượng cập nhật đúng
- [ ] Mỗi user chỉ có tối đa 1 reaction trên mỗi bài đăng

**Edge Cases:**
- [ ] Click reaction nhanh liên tiếp → Không bị duplicate
- [ ] Nhiều user react cùng lúc → Số lượng cập nhật đúng

### 4.3 Realtime Updates
**Browsers: Chrome, Safari, Firefox**

- [ ] Mở 2 tab/browser khác nhau, cùng xem tường nhà
- [ ] Tab 1 tạo bài đăng mới → Tab 2 thấy bài đăng xuất hiện tự động (không refresh)
- [ ] Tab 1 thêm reaction → Tab 2 thấy số lượng reaction cập nhật tự động
- [ ] Đóng tab → Unsubscribe realtime channel (không leak memory)

**Edge Cases:**
- [ ] Mất kết nối internet → Fallback sang polling mode
- [ ] Kết nối lại → Realtime hoạt động trở lại

---

## 5. Events & Tasks (Yêu cầu 7, 8)

### 5.1 Tạo và Quản lý Sự kiện
**Browsers: Chrome, Safari, Firefox, iOS, Android**

- [ ] Truy cập trang lịch → Danh sách sự kiện hiển thị
- [ ] Click "Tạo sự kiện" → Form hiển thị
- [ ] Form có field: Tiêu đề, Ngày, Địa điểm
- [ ] Nhập thông tin và submit → Sự kiện được tạo
- [ ] Sự kiện hiển thị trong danh sách theo thứ tự thời gian
- [ ] Click vào sự kiện → Trang chi tiết hiển thị đầy đủ thông tin

**Edge Cases:**
- [ ] Ngày trong quá khứ → Vẫn cho phép tạo (hoặc warning)
- [ ] Tiêu đề rỗng → Validation error
- [ ] Địa điểm rỗng → Cho phép (optional field)

### 5.2 Phân công Công việc
**Browsers: Chrome, Safari, Firefox, iOS, Android**

- [ ] Trang chi tiết sự kiện hiển thị danh sách công việc
- [ ] Click "Thêm công việc" → Form hiển thị
- [ ] Form có field: Mô tả công việc, Người phụ trách
- [ ] Dropdown người phụ trách hiển thị danh sách thành viên
- [ ] Chọn người và submit → Công việc được tạo với status "pending"
- [ ] Công việc hiển thị trong danh sách
- [ ] Người được phân công thấy công việc của mình được highlight
- [ ] Click checkbox "Hoàn thành" → Status chuyển sang "completed"
- [ ] Click lại checkbox → Status chuyển về "pending"

**Edge Cases:**
- [ ] Mô tả công việc rỗng → Validation error
- [ ] Không chọn người phụ trách → Validation error
- [ ] Xóa thành viên đã được phân công → Công việc vẫn hiển thị (hoặc unassign)

---

## 6. Notifications (Yêu cầu 9)

### 6.1 Thông báo Nhắc nhở
**Browsers: Chrome, Safari, Firefox, iOS, Android**

- [ ] Icon chuông hiển thị ở header
- [ ] Có thông báo chưa đọc → Badge số lượng hiển thị
- [ ] Click chuông → Dropdown danh sách thông báo hiển thị
- [ ] Mỗi thông báo hiển thị: Tiêu đề, Nội dung, Thời gian
- [ ] Thông báo chưa đọc có background khác biệt
- [ ] Click vào thông báo → Đánh dấu đã đọc, redirect đến trang liên quan
- [ ] Badge số lượng giảm xuống

**Edge Cases:**
- [ ] Không có thông báo → Dropdown hiển thị empty state
- [ ] Nhiều thông báo (>10) → Scroll được trong dropdown
- [ ] Click ngoài dropdown → Dropdown đóng lại

### 6.2 Tự động Tạo Thông báo (Cron Job)
**Note: Cần setup sự kiện test trong 24h tới**

- [ ] Tạo sự kiện sắp diễn ra trong 24h
- [ ] Chờ cron job chạy (hoặc trigger manually)
- [ ] Tất cả thành viên nhận thông báo nhắc nhở sự kiện
- [ ] Người có công việc pending nhận thông báo riêng về công việc

---

## 7. Photo Album (Yêu cầu 10, 11)

### 7.1 Upload Ảnh
**Browsers: Chrome, Safari, Firefox, iOS, Android**

- [ ] Truy cập trang album → Nút "Upload ảnh" hiển thị
- [ ] Click upload → Dialog chọn file mở
- [ ] Chọn file ảnh hợp lệ (jpg, png, heic) → Upload bắt đầu
- [ ] Progress bar hiển thị tiến trình upload
- [ ] Upload thành công → Ảnh xuất hiện trong album
- [ ] Ảnh hiển thị đúng với thumbnail

**Mobile Specific:**
- [ ] iOS/Android: Nút "Chụp ảnh" hiển thị
- [ ] Click "Chụp ảnh" → Camera mở
- [ ] Chụp ảnh → Ảnh được upload thành công

**Edge Cases:**
- [ ] File không phải ảnh (pdf, txt) → Error "Định dạng không hợp lệ"
- [ ] File quá lớn (>10MB) → Error "File quá lớn"
- [ ] Upload nhiều ảnh cùng lúc → Tất cả upload thành công
- [ ] Mất kết nối giữa chừng → Error và có thể retry

### 7.2 Hiển thị Album
**Browsers: Chrome, Safari, Firefox, iOS, Android**

- [ ] Album hiển thị ảnh theo thứ tự thời gian giảm dần (mới nhất trước)
- [ ] Ảnh được nhóm theo ngày upload
- [ ] Header mỗi nhóm hiển thị ngày (VD: "20/01/2024")
- [ ] Grid layout responsive (desktop: 4 cột, tablet: 3 cột, mobile: 2 cột)
- [ ] Lazy loading: Ảnh chỉ load khi scroll đến
- [ ] Click vào ảnh → Lightbox mở với ảnh full size

**Edge Cases:**
- [ ] Album trống → Empty state "Chưa có ảnh nào"
- [ ] Nhiều ảnh (>100) → Performance vẫn tốt, không lag

### 7.3 Photo Viewer (Lightbox)
**Browsers: Chrome, Safari, Firefox, iOS, Android**

- [ ] Lightbox hiển thị ảnh full size
- [ ] Hiển thị tên người upload và thời gian
- [ ] Nút "Trước" và "Sau" để navigate
- [ ] Click "Sau" → Chuyển sang ảnh tiếp theo
- [ ] Click "Trước" → Chuyển về ảnh trước đó
- [ ] Ảnh đầu tiên: Nút "Trước" disabled
- [ ] Ảnh cuối cùng: Nút "Sau" disabled
- [ ] Click ngoài ảnh hoặc nút X → Lightbox đóng

**Mobile Specific:**
- [ ] Swipe left → Ảnh tiếp theo
- [ ] Swipe right → Ảnh trước đó
- [ ] Pinch to zoom → Zoom in/out ảnh

---

## 8. Video Recap (Yêu cầu 12)

### 8.1 Tạo Video
**Browsers: Chrome, Safari, Firefox** (Note: Không test trên mobile vì có thể không support)

- [ ] Trang album có nút "Tạo video recap"
- [ ] Click nút → Modal chọn ảnh hiển thị
- [ ] Chọn nhiều ảnh (3-10 ảnh)
- [ ] Click "Tạo video" → Processing bắt đầu
- [ ] Status hiển thị "Đang xử lý..."
- [ ] Sau vài giây → Status "Hoàn thành!"
- [ ] Video preview hiển thị
- [ ] Click play → Video phát với transitions và nhạc nền
- [ ] Nút "Tải xuống" hiển thị
- [ ] Click tải xuống → File .mp4 được download

**Edge Cases:**
- [ ] Chọn quá nhiều ảnh (>50) → Warning "Tối đa 50 ảnh"
- [ ] Browser không support MediaRecorder → Error "Trình duyệt không hỗ trợ"
- [ ] Processing fail → Error và nút "Thử lại"
- [ ] Chọn 0 ảnh → Validation "Vui lòng chọn ít nhất 1 ảnh"

---

## 9. Responsive Design (Yêu cầu 14)

### 9.1 Mobile Layout
**Devices: iOS, Android**

- [ ] Màn hình <768px → Layout mobile-friendly
- [ ] Sidebar ẩn, hamburger menu hiển thị
- [ ] Click hamburger → Menu slide in từ bên trái
- [ ] Click overlay hoặc X → Menu đóng
- [ ] Tất cả buttons đủ lớn để touch (min 44x44px)
- [ ] Text đọc được, không bị nhỏ quá
- [ ] Ảnh và cards scale đúng, không bị overflow
- [ ] Form inputs đủ lớn để nhập trên mobile

### 9.2 Tablet Layout
**Devices: iPad, Android Tablet**

- [ ] Màn hình 768px-1024px → Layout tablet
- [ ] Sidebar có thể hiển thị hoặc ẩn tùy design
- [ ] Grid layout điều chỉnh (3 cột thay vì 4)
- [ ] Touch interactions hoạt động tốt

### 9.3 Desktop Layout
**Browsers: Chrome, Safari, Firefox**

- [ ] Màn hình >1024px → Layout desktop đầy đủ
- [ ] Sidebar hiển thị cố định
- [ ] Grid layout 4 cột
- [ ] Hover effects hoạt động

---

## 10. Performance (Yêu cầu 15)

### 10.1 Loading Performance
**Browsers: Chrome, Safari, Firefox, iOS, Android**

- [ ] Trang chủ load trong <2 giây (3G connection)
- [ ] Skeleton loaders hiển thị khi đang load data
- [ ] Không có flash of unstyled content (FOUC)
- [ ] Images load progressively (blur-up effect)

### 10.2 Runtime Performance
**Browsers: Chrome, Safari, Firefox, iOS, Android**

- [ ] Scroll mượt mà, không lag (60fps)
- [ ] Click/tap responsive, không delay
- [ ] Animations mượt mà
- [ ] Không có memory leaks (test bằng DevTools)

### 10.3 Caching
**Browsers: Chrome, Safari, Firefox**

- [ ] Lần truy cập thứ 2 nhanh hơn (assets được cache)
- [ ] Offline: Hiển thị indicator "Không có kết nối"
- [ ] Online lại: Tự động sync data

---

## 11. Error Handling & Edge Cases

### 11.1 Network Errors
**Browsers: Chrome, Safari, Firefox, iOS, Android**

- [ ] Mất kết nối internet → Toast "Không có kết nối"
- [ ] API timeout → Error message và nút retry
- [ ] 500 error → "Có lỗi xảy ra, vui lòng thử lại"
- [ ] Retry thành công → Hoạt động bình thường

### 11.2 Authentication Errors
**Browsers: Chrome, Safari, Firefox, iOS, Android**

- [ ] Session hết hạn → Auto redirect về login
- [ ] Truy cập protected route khi chưa login → Redirect về login
- [ ] Login fail → Error message rõ ràng

### 11.3 Validation Errors
**Browsers: Chrome, Safari, Firefox, iOS, Android**

- [ ] Form validation hiển thị error inline
- [ ] Error message rõ ràng, bằng tiếng Việt
- [ ] Focus vào field lỗi đầu tiên
- [ ] Sửa lỗi → Error message biến mất

### 11.4 Empty States
**Browsers: Chrome, Safari, Firefox, iOS, Android**

- [ ] Nhà chưa có bài đăng → "Chưa có bài đăng nào"
- [ ] Chưa có sự kiện → "Chưa có sự kiện nào"
- [ ] Album trống → "Chưa có ảnh nào"
- [ ] Không có thông báo → "Không có thông báo mới"

---

## 12. Cross-Browser Compatibility

### 12.1 Chrome
- [ ] Tất cả tính năng hoạt động
- [ ] UI render đúng
- [ ] Performance tốt

### 12.2 Safari (Desktop)
- [ ] Tất cả tính năng hoạt động
- [ ] UI render đúng (đặc biệt chú ý flexbox, grid)
- [ ] Date picker hoạt động
- [ ] File upload hoạt động

### 12.3 Firefox
- [ ] Tất cả tính năng hoạt động
- [ ] UI render đúng
- [ ] Scrollbar style (nếu có custom)

### 12.4 Safari iOS
- [ ] Tất cả tính năng mobile hoạt động
- [ ] Camera access hoạt động
- [ ] Touch gestures hoạt động
- [ ] Không có layout issues (safe area)

### 12.5 Chrome Android
- [ ] Tất cả tính năng mobile hoạt động
- [ ] Camera access hoạt động
- [ ] Touch gestures hoạt động
- [ ] Back button hoạt động đúng

---

## 13. Security & Privacy

### 13.1 Row Level Security
**Browsers: Chrome, Safari, Firefox**

- [ ] User chỉ thấy data của nhà mình
- [ ] Không thể truy cập data của nhà khác (test bằng cách sửa URL)
- [ ] Không thể tạo/sửa/xóa data của nhà khác

### 13.2 Authentication
**Browsers: Chrome, Safari, Firefox**

- [ ] Không thể truy cập protected routes khi chưa login
- [ ] Session được lưu an toàn (httpOnly cookies)
- [ ] Logout xóa sạch session

---

## Test Execution Log

### Chrome Desktop
- Tester: ___________
- Date: ___________
- Version: ___________
- Pass/Fail: ___________
- Notes: ___________

### Safari Desktop
- Tester: ___________
- Date: ___________
- Version: ___________
- Pass/Fail: ___________
- Notes: ___________

### Firefox Desktop
- Tester: ___________
- Date: ___________
- Version: ___________
- Pass/Fail: ___________
- Notes: ___________

### iOS Safari
- Tester: ___________
- Date: ___________
- Device: ___________
- iOS Version: ___________
- Pass/Fail: ___________
- Notes: ___________

### Android Chrome
- Tester: ___________
- Date: ___________
- Device: ___________
- Android Version: ___________
- Pass/Fail: ___________
- Notes: ___________

---

## Bug Report Template

Khi phát hiện bug, ghi lại theo format:

```
**Bug ID:** #___
**Severity:** Critical / High / Medium / Low
**Browser/Device:** ___________
**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:** ___________
**Actual Result:** ___________
**Screenshots:** (nếu có)
**Notes:** ___________
```

---

## Kết luận

Sau khi hoàn thành tất cả test cases trên tất cả browsers/devices:

- [ ] Tất cả critical features hoạt động
- [ ] Không có critical/high bugs
- [ ] Performance chấp nhận được
- [ ] UI/UX consistent across platforms
- [ ] Sẵn sàng cho production deployment

**Signed off by:** ___________
**Date:** ___________
