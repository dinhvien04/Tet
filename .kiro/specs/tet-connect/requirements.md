# Tài liệu Yêu cầu - Tết Connect

## Giới thiệu

Tết Connect là một web application giúp các gia đình Việt Nam tổ chức và kết nối trong dịp Tết Nguyên Đán. Ứng dụng cung cấp một không gian riêng tư, ấm cúng để gia đình lưu giữ khoảnh khắc, tổ chức gặp mặt, và tạo nội dung Tết độc đáo bằng AI.

## Thuật ngữ

- **Hệ thống**: Tết Connect web application
- **Người dùng**: Thành viên gia đình sử dụng ứng dụng
- **Nhà**: Không gian riêng của một gia đình trên hệ thống
- **Bài đăng**: Nội dung được chia sẻ trên tường nhà (câu đối, lời chúc, v.v.)
- **Sự kiện**: Hoạt động gia đình được lên lịch (cúng tất niên, mùng 1, v.v.)
- **Công việc**: Nhiệm vụ được phân công trong một sự kiện
- **Album**: Bộ sưu tập ảnh của gia đình
- **Video recap**: Video tổng hợp ảnh tự động tạo bởi hệ thống

## Yêu cầu

### Yêu cầu 1: Xác thực và Quản lý Người dùng

**User Story:** Là một người dùng, tôi muốn đăng nhập dễ dàng bằng tài khoản Google, để tôi có thể truy cập ứng dụng nhanh chóng mà không cần tạo tài khoản mới.

#### Tiêu chí chấp nhận

1. WHEN người dùng truy cập trang chủ, THE Hệ thống SHALL hiển thị nút đăng nhập bằng Google
2. WHEN người dùng nhấn nút đăng nhập Google, THE Hệ thống SHALL chuyển hướng đến Google OAuth
3. WHEN Google OAuth thành công, THE Hệ thống SHALL tạo hoặc cập nhật thông tin người dùng trong cơ sở dữ liệu
4. WHEN người dùng đăng nhập lần đầu, THE Hệ thống SHALL lưu trữ email, tên, và avatar từ Google
5. WHEN người dùng đã xác thực, THE Hệ thống SHALL chuyển hướng đến trang dashboard

### Yêu cầu 2: Quản lý Nhà (Family Space)

**User Story:** Là người dùng mới, tôi muốn tạo một "Nhà" cho gia đình mình, để có không gian riêng tư cho các hoạt động Tết.

#### Tiêu chí chấp nhận

1. WHEN người dùng đăng nhập lần đầu và chưa thuộc nhà nào, THE Hệ thống SHALL hiển thị tùy chọn tạo nhà mới hoặc tham gia nhà hiện có
2. WHEN người dùng tạo nhà mới, THE Hệ thống SHALL yêu cầu nhập tên nhà
3. WHEN tên nhà được nhập, THE Hệ thống SHALL tạo nhà với mã mời duy nhất
4. WHEN nhà được tạo, THE Hệ thống SHALL đặt người tạo làm admin của nhà
5. WHEN nhà được tạo, THE Hệ thống SHALL hiển thị mã mời để chia sẻ với thành viên khác

### Yêu cầu 3: Mời và Tham gia Nhà

**User Story:** Là admin của nhà, tôi muốn mời thành viên gia đình tham gia, để mọi người có thể cùng sử dụng không gian chung.

#### Tiêu chí chấp nhận

1. WHEN admin xem trang nhà, THE Hệ thống SHALL hiển thị link mời có chứa mã mời duy nhất
2. WHEN admin nhấn nút sao chép link, THE Hệ thống SHALL sao chép link mời vào clipboard
3. WHEN người dùng truy cập link mời, THE Hệ thống SHALL hiển thị thông tin nhà và nút tham gia
4. WHEN người dùng chưa đăng nhập nhấn tham gia, THE Hệ thống SHALL yêu cầu đăng nhập trước
5. WHEN người dùng đã đăng nhập nhấn tham gia, THE Hệ thống SHALL thêm người dùng vào nhà với vai trò thành viên
6. WHEN người dùng tham gia thành công, THE Hệ thống SHALL chuyển hướng đến trang chủ của nhà

### Yêu cầu 4: Tạo Câu đối và Lời chúc Tết bằng AI

**User Story:** Là người dùng, tôi muốn tạo câu đối và lời chúc Tết độc đáo bằng AI, để có nội dung ý nghĩa chia sẻ với gia đình.

#### Tiêu chí chấp nhận

1. WHEN người dùng truy cập tính năng tạo câu đối, THE Hệ thống SHALL hiển thị form nhập thông tin tùy chỉnh
2. WHEN người dùng nhập tên người nhận và đặc điểm, THE Hệ thống SHALL cho phép chọn loại nội dung (câu đối, lời chúc, thiệp Tết)
3. WHEN người dùng nhấn tạo, THE Hệ thống SHALL gửi yêu cầu đến Gemini API với prompt phù hợp
4. WHEN Gemini API trả về kết quả, THE Hệ thống SHALL hiển thị nội dung được tạo
5. WHEN người dùng hài lòng với nội dung, THE Hệ thống SHALL cho phép đăng lên tường nhà
6. IF Gemini API trả về lỗi, THEN THE Hệ thống SHALL hiển thị thông báo lỗi và cho phép thử lại

### Yêu cầu 5: Đăng và Hiển thị Bài đăng

**User Story:** Là người dùng, tôi muốn đăng câu đối và lời chúc lên tường nhà, để chia sẻ với mọi người trong gia đình.

#### Tiêu chí chấp nhận

1. WHEN người dùng chọn đăng nội dung AI, THE Hệ thống SHALL tạo bài đăng mới trong cơ sở dữ liệu
2. WHEN bài đăng được tạo, THE Hệ thống SHALL lưu trữ nội dung, loại bài đăng, và thông tin người đăng
3. WHEN bài đăng được tạo, THE Hệ thống SHALL hiển thị bài đăng trên tường nhà theo thứ tự thời gian
4. WHEN người dùng xem tường nhà, THE Hệ thống SHALL hiển thị tất cả bài đăng của nhà đó
5. WHEN hiển thị bài đăng, THE Hệ thống SHALL hiển thị tên người đăng, avatar, thời gian, và nội dung

### Yêu cầu 6: Tương tác với Bài đăng (Reactions)

**User Story:** Là người dùng, tôi muốn thả tim hoặc haha cho bài đăng, để thể hiện cảm xúc với nội dung.

#### Tiêu chí chấp nhận

1. WHEN người dùng xem bài đăng, THE Hệ thống SHALL hiển thị các nút reaction (tim, haha)
2. WHEN người dùng nhấn nút reaction, THE Hệ thống SHALL lưu reaction vào cơ sở dữ liệu
3. WHEN người dùng đã reaction và nhấn lại cùng loại, THE Hệ thống SHALL xóa reaction đó
4. WHEN người dùng đã reaction và nhấn loại khác, THE Hệ thống SHALL thay đổi sang loại reaction mới
5. WHEN bài đăng có reactions, THE Hệ thống SHALL hiển thị số lượng từng loại reaction
6. WHEN người dùng xem bài đăng, THE Hệ thống SHALL làm nổi bật reaction mà người dùng đã chọn

### Yêu cầu 7: Tạo và Quản lý Sự kiện

**User Story:** Là người dùng, tôi muốn tạo sự kiện Tết (cúng tất niên, mùng 1), để tổ chức các hoạt động gia đình.

#### Tiêu chí chấp nhận

1. WHEN người dùng truy cập trang lịch, THE Hệ thống SHALL hiển thị danh sách sự kiện của nhà
2. WHEN người dùng nhấn tạo sự kiện, THE Hệ thống SHALL hiển thị form nhập thông tin sự kiện
3. WHEN người dùng nhập tiêu đề, ngày, và địa điểm, THE Hệ thống SHALL cho phép lưu sự kiện
4. WHEN sự kiện được lưu, THE Hệ thống SHALL tạo sự kiện mới trong cơ sở dữ liệu
5. WHEN sự kiện được tạo, THE Hệ thống SHALL hiển thị sự kiện trong danh sách theo thứ tự thời gian
6. WHEN người dùng xem chi tiết sự kiện, THE Hệ thống SHALL hiển thị đầy đủ thông tin sự kiện

### Yêu cầu 8: Phân công Công việc trong Sự kiện

**User Story:** Là người dùng, tôi muốn phân công công việc cho thành viên trong sự kiện, để mọi người biết trách nhiệm của mình.

#### Tiêu chí chấp nhận

1. WHEN người dùng xem chi tiết sự kiện, THE Hệ thống SHALL hiển thị danh sách công việc
2. WHEN người dùng nhấn thêm công việc, THE Hệ thống SHALL hiển thị form nhập mô tả công việc và chọn người phụ trách
3. WHEN người dùng chọn người phụ trách, THE Hệ thống SHALL hiển thị danh sách thành viên trong nhà
4. WHEN công việc được lưu, THE Hệ thống SHALL tạo công việc mới liên kết với sự kiện
5. WHEN công việc được tạo, THE Hệ thống SHALL hiển thị công việc trong danh sách với trạng thái "chưa hoàn thành"
6. WHEN người được phân công xem sự kiện, THE Hệ thống SHALL làm nổi bật công việc của họ
7. WHEN người dùng nhấn đánh dấu hoàn thành, THE Hệ thống SHALL cập nhật trạng thái công việc thành "đã hoàn thành"

### Yêu cầu 9: Thông báo Nhắc nhở Sự kiện

**User Story:** Là người dùng, tôi muốn nhận thông báo nhắc nhở về sự kiện và công việc, để không bỏ lỡ hoạt động quan trọng.

#### Tiêu chí chấp nhận

1. WHEN sự kiện sắp diễn ra trong 24 giờ, THE Hệ thống SHALL tạo thông báo cho tất cả thành viên trong nhà
2. WHEN người dùng có công việc chưa hoàn thành trong sự kiện sắp diễn ra, THE Hệ thống SHALL tạo thông báo riêng cho người đó
3. WHEN thông báo được tạo, THE Hệ thống SHALL lưu trữ thông báo trong cơ sở dữ liệu
4. WHEN người dùng đăng nhập, THE Hệ thống SHALL hiển thị số lượng thông báo chưa đọc
5. WHEN người dùng nhấn vào thông báo, THE Hệ thống SHALL đánh dấu thông báo là đã đọc và chuyển đến trang sự kiện

### Yêu cầu 10: Upload và Quản lý Ảnh

**User Story:** Là người dùng, tôi muốn upload ảnh Tết lên album chung, để lưu giữ khoảnh khắc với gia đình.

#### Tiêu chí chấp nhận

1. WHEN người dùng truy cập trang album, THE Hệ thống SHALL hiển thị nút upload ảnh
2. WHEN người dùng nhấn upload, THE Hệ thống SHALL mở dialog chọn file
3. WHEN người dùng chọn file ảnh, THE Hệ thống SHALL kiểm tra định dạng file (jpg, png, heic)
4. WHEN file hợp lệ, THE Hệ thống SHALL upload ảnh lên Supabase Storage
5. WHEN upload thành công, THE Hệ thống SHALL lưu URL ảnh vào cơ sở dữ liệu
6. WHEN ảnh được lưu, THE Hệ thống SHALL hiển thị ảnh trong album theo thứ tự thời gian upload
7. IF file không hợp lệ hoặc quá lớn (>10MB), THEN THE Hệ thống SHALL hiển thị thông báo lỗi

### Yêu cầu 11: Hiển thị Album theo Timeline

**User Story:** Là người dùng, tôi muốn xem ảnh theo dòng thời gian, để dễ dàng tìm lại khoảnh khắc theo ngày.

#### Tiêu chí chấp nhận

1. WHEN người dùng xem album, THE Hệ thống SHALL hiển thị ảnh theo thứ tự thời gian giảm dần
2. WHEN hiển thị ảnh, THE Hệ thống SHALL nhóm ảnh theo ngày upload
3. WHEN người dùng nhấn vào ảnh, THE Hệ thống SHALL hiển thị ảnh ở chế độ xem đầy đủ
4. WHEN xem ảnh đầy đủ, THE Hệ thống SHALL hiển thị tên người upload và thời gian
5. WHEN xem ảnh đầy đủ, THE Hệ thống SHALL cho phép chuyển sang ảnh trước/sau

### Yêu cầu 12: Tạo Video Recap Tự động

**User Story:** Là người dùng, tôi muốn tạo video tổng hợp ảnh Tết với nhạc nền, để có kỷ niệm đẹp về dịp Tết.

#### Tiêu chí chấp nhận

1. WHEN người dùng xem album, THE Hệ thống SHALL hiển thị nút tạo video recap
2. WHEN người dùng nhấn tạo video, THE Hệ thống SHALL cho phép chọn ảnh để đưa vào video
3. WHEN người dùng chọn ảnh và xác nhận, THE Hệ thống SHALL bắt đầu xử lý tạo video
4. WHEN xử lý video, THE Hệ thống SHALL sử dụng ffmpeg hoặc canvas để ghép ảnh với hiệu ứng chuyển cảnh
5. WHEN xử lý video, THE Hệ thống SHALL thêm nhạc nền Tết mặc định
6. WHEN video hoàn thành, THE Hệ thống SHALL lưu video vào Supabase Storage
7. WHEN video được lưu, THE Hệ thống SHALL cho phép người dùng xem và tải xuống video
8. IF xử lý video thất bại, THEN THE Hệ thống SHALL hiển thị thông báo lỗi và cho phép thử lại

### Yêu cầu 13: Realtime Updates

**User Story:** Là người dùng, tôi muốn thấy cập nhật ngay lập tức khi có bài đăng mới hoặc reaction, để trải nghiệm tương tác mượt mà.

#### Tiêu chí chấp nhận

1. WHEN người dùng đang xem tường nhà, THE Hệ thống SHALL subscribe đến Supabase Realtime channel của nhà đó
2. WHEN có bài đăng mới được tạo, THE Hệ thống SHALL hiển thị bài đăng mới mà không cần refresh trang
3. WHEN có reaction mới trên bài đăng, THE Hệ thống SHALL cập nhật số lượng reaction ngay lập tức
4. WHEN người dùng rời khỏi trang, THE Hệ thống SHALL unsubscribe khỏi Realtime channel

### Yêu cầu 14: Responsive Design

**User Story:** Là người dùng, tôi muốn sử dụng ứng dụng trên điện thoại, để tiện truy cập mọi lúc mọi nơi.

#### Tiêu chí chấp nhận

1. WHEN người dùng truy cập trên màn hình nhỏ (<768px), THE Hệ thống SHALL hiển thị giao diện mobile-friendly
2. WHEN hiển thị trên mobile, THE Hệ thống SHALL ẩn sidebar và hiển thị menu hamburger
3. WHEN hiển thị trên mobile, THE Hệ thống SHALL điều chỉnh kích thước ảnh và bài đăng cho phù hợp
4. WHEN người dùng upload ảnh trên mobile, THE Hệ thống SHALL cho phép chụp ảnh trực tiếp từ camera

### Yêu cầu 15: Performance và Tối ưu

**User Story:** Là người dùng, tôi muốn ứng dụng tải nhanh và mượt mà, để có trải nghiệm tốt nhất.

#### Tiêu chí chấp nhận

1. WHEN người dùng tải trang, THE Hệ thống SHALL hiển thị nội dung chính trong vòng 2 giây
2. WHEN hiển thị danh sách ảnh, THE Hệ thống SHALL sử dụng lazy loading để tải ảnh theo yêu cầu
3. WHEN hiển thị ảnh, THE Hệ thống SHALL sử dụng thumbnail thay vì ảnh gốc trong danh sách
4. WHEN người dùng thực hiện thao tác, THE Hệ thống SHALL hiển thị loading state để người dùng biết hệ thống đang xử lý
