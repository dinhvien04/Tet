# Quick Manual Testing Guide - Tết Connect

## Hướng dẫn Test Nhanh

Tài liệu này cung cấp các test scenarios quan trọng nhất để kiểm tra nhanh trước khi release.

---

## 🚀 Critical Path Testing (15 phút)

### Scenario 1: Happy Path - User Journey Hoàn chỉnh
**Time: ~5 phút**

1. **Login**
   - Truy cập app
   - Click "Đăng nhập bằng Google"
   - Chọn tài khoản → Đăng nhập thành công

2. **Tạo Nhà**
   - Click "Tạo nhà mới"
   - Nhập tên: "Gia đình Test"
   - Submit → Nhà được tạo, mã mời hiển thị

3. **Tạo Nội dung AI**
   - Click "Tạo câu đối"
   - Nhập: Tên "Bố", Đặc điểm "hiền lành", Loại "Câu đối"
   - Click "Tạo" → Nội dung AI xuất hiện
   - Click "Đăng lên tường" → Bài đăng xuất hiện trên feed

4. **Reaction**
   - Click icon tim trên bài đăng → Số lượng tăng lên 1
   - Click lại → Số lượng giảm về 0

5. **Tạo Sự kiện**
   - Click "Lịch" → "Tạo sự kiện"
   - Nhập: Tiêu đề "Cúng tất niên", Ngày (ngày mai), Địa điểm "Nhà"
   - Submit → Sự kiện xuất hiện trong danh sách

6. **Upload Ảnh**
   - Click "Album" → "Upload ảnh"
   - Chọn 1 ảnh → Upload thành công
   - Ảnh xuất hiện trong album

✅ **Pass Criteria:** Tất cả 6 bước hoàn thành không lỗi

---

### Scenario 2: Multi-User Collaboration
**Time: ~5 phút** (Cần 2 browsers/devices)

1. **User A: Tạo nhà và mời**
   - Đăng nhập, tạo nhà "Test Family"
   - Copy invite link

2. **User B: Tham gia nhà**
   - Paste invite link vào browser
   - Đăng nhập → Click "Tham gia"
   - Thành công, thấy dashboard của nhà

3. **User A: Tạo bài đăng**
   - Tạo bài đăng mới "Hello from User A"

4. **User B: Thấy realtime update**
   - Không refresh, bài đăng của A xuất hiện tự động

5. **User B: React**
   - Click tim trên bài đăng của A

6. **User A: Thấy reaction update**
   - Số lượng tim tăng lên tự động

✅ **Pass Criteria:** Realtime updates hoạt động, không cần refresh

---

### Scenario 3: Mobile Experience
**Time: ~5 phút** (Test trên điện thoại)

1. **Responsive Layout**
   - Mở app trên mobile
   - Hamburger menu hiển thị (không có sidebar)
   - Click hamburger → Menu slide in

2. **Touch Interactions**
   - Tap các buttons → Responsive, không delay
   - Scroll feed → Mượt mà

3. **Camera Upload**
   - Click "Upload ảnh" → "Chụp ảnh"
   - Camera mở → Chụp ảnh
   - Ảnh upload thành công

4. **Photo Viewer Gestures**
   - Click vào ảnh → Lightbox mở
   - Swipe left → Ảnh tiếp theo
   - Swipe right → Ảnh trước đó
   - Pinch to zoom → Zoom in/out

✅ **Pass Criteria:** Mobile UX tốt, touch gestures hoạt động

---

## 🔥 Edge Cases Testing (10 phút)

### Test 1: Error Handling
**Time: ~3 phút**

1. **Network Error**
   - Tắt wifi/data
   - Thử tạo bài đăng → Error "Không có kết nối"
   - Bật lại wifi → Retry thành công

2. **Invalid Input**
   - Tạo nhà với tên rỗng → Validation error
   - Upload file .pdf → Error "Định dạng không hợp lệ"
   - Upload file >10MB → Error "File quá lớn"

3. **Session Expiry**
   - Xóa cookies/session storage
   - Refresh trang → Redirect về login

✅ **Pass Criteria:** Errors được handle gracefully, có thể recover

---

### Test 2: Concurrent Actions
**Time: ~3 phút**

1. **Rapid Clicks**
   - Click reaction button nhanh 10 lần liên tiếp
   - Kết quả: Không bị duplicate, toggle đúng

2. **Multiple Uploads**
   - Chọn 5 ảnh cùng lúc upload
   - Kết quả: Tất cả upload thành công

3. **Simultaneous Edits** (2 users)
   - User A và B cùng react vào 1 bài đăng
   - Kết quả: Cả 2 reactions đều được lưu

✅ **Pass Criteria:** Không có race conditions, data consistent

---

### Test 3: Boundary Values
**Time: ~4 phút**

1. **Long Content**
   - Tạo bài đăng với nội dung 1000 ký tự
   - Kết quả: Hiển thị đúng, không overflow

2. **Many Items**
   - Tạo 50 bài đăng
   - Scroll feed → Lazy loading hoạt động, không lag

3. **Empty States**
   - Nhà mới (chưa có gì) → Empty states hiển thị đúng
   - Album trống → "Chưa có ảnh nào"

✅ **Pass Criteria:** Handle extreme cases tốt

---

## 🌐 Cross-Browser Testing (20 phút)

### Quick Test trên mỗi browser:

**Chrome:**
- [ ] Login → Tạo nhà → Đăng bài → React → Upload ảnh
- [ ] Time: ~3 phút

**Safari:**
- [ ] Login → Tạo nhà → Đăng bài → React → Upload ảnh
- [ ] Chú ý: Date picker, file upload
- [ ] Time: ~3 phút

**Firefox:**
- [ ] Login → Tạo nhà → Đăng bài → React → Upload ảnh
- [ ] Time: ~3 phút

**iOS Safari:**
- [ ] Login → Tạo nhà → Đăng bài → Camera upload
- [ ] Chú ý: Safe area, touch gestures
- [ ] Time: ~5 phút

**Android Chrome:**
- [ ] Login → Tạo nhà → Đăng bài → Camera upload
- [ ] Chú ý: Back button, touch gestures
- [ ] Time: ~5 phút

✅ **Pass Criteria:** Core features hoạt động trên tất cả browsers

---

## 📊 Performance Quick Check

### Desktop (Chrome DevTools)

1. **Lighthouse Audit**
   ```
   - Performance: >80
   - Accessibility: >90
   - Best Practices: >90
   - SEO: >80
   ```

2. **Network Tab**
   - Initial load: <2s (3G)
   - Images: Lazy loaded
   - API calls: <500ms

3. **Memory Tab**
   - Không có memory leaks
   - Heap size stable sau 5 phút sử dụng

### Mobile (Chrome DevTools Mobile Emulation)

1. **Performance**
   - FPS: >50 khi scroll
   - Touch response: <100ms

2. **Network**
   - Initial load: <3s (3G)

✅ **Pass Criteria:** Performance metrics đạt targets

---

## 🔒 Security Quick Check

### Test 1: Authorization
1. User A tạo nhà, copy family ID từ URL
2. User B (không phải member) thử truy cập:
   - `/families/{family_id}` → Không thấy data
   - Thử tạo post cho family đó → 403 Forbidden

### Test 2: XSS Prevention
1. Tạo bài đăng với content: `<script>alert('XSS')</script>`
2. Kết quả: Script không chạy, hiển thị as text

### Test 3: SQL Injection
1. Tạo nhà với tên: `'; DROP TABLE families; --`
2. Kết quả: Tên được lưu as text, không execute SQL

✅ **Pass Criteria:** Không có security vulnerabilities

---

## 📝 Test Execution Checklist

### Pre-Testing Setup
- [ ] App deployed và accessible
- [ ] Test accounts prepared (2-3 Google accounts)
- [ ] Test data prepared (ảnh, text samples)
- [ ] Browsers installed và updated
- [ ] Mobile devices charged và ready

### During Testing
- [ ] Record bugs với screenshots
- [ ] Note performance issues
- [ ] Check console for errors
- [ ] Test on different network speeds

### Post-Testing
- [ ] Compile bug list
- [ ] Prioritize bugs (Critical/High/Medium/Low)
- [ ] Create bug tickets
- [ ] Sign off on test completion

---

## 🐛 Common Issues to Watch For

### UI Issues
- [ ] Text overflow/truncation
- [ ] Broken layouts on small screens
- [ ] Missing loading states
- [ ] Inconsistent spacing/alignment

### Functional Issues
- [ ] Buttons not clickable
- [ ] Forms not submitting
- [ ] Data not saving
- [ ] Realtime not updating

### Performance Issues
- [ ] Slow page loads
- [ ] Laggy scrolling
- [ ] Memory leaks
- [ ] Large bundle sizes

### Mobile-Specific Issues
- [ ] Touch targets too small
- [ ] Keyboard covering inputs
- [ ] Camera not working
- [ ] Gestures not working

---

## ✅ Sign-Off Criteria

App is ready for production when:

- [ ] All critical path scenarios pass
- [ ] No critical/high severity bugs
- [ ] Performance meets targets
- [ ] Works on Chrome, Safari, Firefox
- [ ] Works on iOS and Android
- [ ] Security checks pass
- [ ] Accessibility basics covered

**Tested by:** ___________  
**Date:** ___________  
**Approved by:** ___________  
**Date:** ___________
