# Lỗi Thường Gặp và Cách Xử Lý

## Lỗi MongoDB Connection

### 1. "connectDB is not a function"

**Lỗi:**
```
TypeError: connectDB is not a function
```

**Nguyên nhân:**
Import sai cách. `connectDB` là named export, không phải default export.

**Giải pháp:**

```typescript
// SAI ❌
import connectDB from '@/lib/mongodb'

// ĐÚNG ✅
import { connectDB } from '@/lib/mongodb'
```

Sau khi sửa, dev server sẽ tự reload.

---

### 2. "Invalid scheme, expected connection string to start with mongodb://"

**Lỗi:**
```
MongoParseError: Invalid scheme, expected connection string to start with "mongodb://" or "mongodb+srv://"
```

**Nguyên nhân:**
- `MONGODB_URI` trong `.env.local` có giá trị placeholder như `your-mongodb-uri`
- Hoặc connection string không đúng format

**Giải pháp:**

Mở file `.env.local` và sửa:

```env
# SAI ❌
MONGODB_URI=your-mongodb-uri

# ĐÚNG ✅ (MongoDB local)
MONGODB_URI=mongodb://localhost:27017/tet-connect

# ĐÚNG ✅ (MongoDB Atlas)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tet-connect?retryWrites=true&w=majority
```

**Sau khi sửa:**
1. Lưu file
2. Restart dev server (Ctrl+C rồi `npm run dev` lại)

---

### 2. "ECONNREFUSED 127.0.0.1:27017"

**Lỗi:**
```
MongoServerError: connect ECONNREFUSED 127.0.0.1:27017
```

**Nguyên nhân:**
MongoDB không chạy trên máy

**Giải pháp:**

**Windows:**
```bash
# Start MongoDB service
net start MongoDB

# Kiểm tra
netstat -ano | findstr :27017
```

**Mac:**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
```

---

### 3. "Authentication failed"

**Lỗi:**
```
MongoServerError: Authentication failed
```

**Nguyên nhân:**
- Username/password không đúng
- `authSource` không đúng

**Giải pháp:**

Kiểm tra connection string:

```env
# Có authentication
MONGODB_URI=mongodb://username:password@localhost:27017/tet-connect?authSource=tet-connect

# Không authentication (development)
MONGODB_URI=mongodb://localhost:27017/tet-connect
```

---

### 4. "Database does not exist"

**Nguyên nhân:**
Database chưa được tạo

**Giải pháp:**

MongoDB sẽ tự động tạo database khi có data đầu tiên. Hoặc tạo thủ công:

```bash
mongosh
use tet-connect
db.createCollection("users")
```

---

## Lỗi NextAuth

### 5. "NEXTAUTH_SECRET not set"

**Lỗi:**
```
Error: Please define NEXTAUTH_SECRET environment variable
```

**Giải pháp:**

Tạo secret key:

```bash
# Windows (PowerShell)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Mac/Linux
openssl rand -base64 32
```

Thêm vào `.env.local`:

```env
NEXTAUTH_SECRET=<key-vua-tao>
```

---

### 6. "NEXTAUTH_URL not set"

**Giải pháp:**

Thêm vào `.env.local`:

```env
NEXTAUTH_URL=http://localhost:3000
```

---

## Lỗi Google OAuth

### 7. "redirect_uri_mismatch"

**Lỗi:**
```
Error: redirect_uri_mismatch
```

**Nguyên nhân:**
Redirect URI trong Google Console không khớp

**Giải pháp:**

1. Vào Google Cloud Console
2. Chọn project → Credentials
3. Chọn OAuth client
4. Thêm Authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
5. Save

---

### 8. "Invalid Google OAuth credentials"

**Giải pháp:**

Kiểm tra `.env.local`:

```env
GOOGLE_CLIENT_ID=<client-id-tu-google-console>
GOOGLE_CLIENT_SECRET=<client-secret-tu-google-console>
```

Đảm bảo không có khoảng trắng thừa.

---

## Lỗi Cloudinary

### 9. "Cloudinary upload failed"

**Nguyên nhân:**
- Credentials không đúng
- Vượt quá quota (25GB/tháng free tier)
- File quá lớn (>10MB)

**Giải pháp:**

Kiểm tra `.env.local`:

```env
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>
```

Kiểm tra quota tại: https://cloudinary.com/console

---

## Lỗi MegaLLM AI

### 10. "MegaLLM API rate limit exceeded"

**Lỗi:**
```
Error: Rate limit exceeded
```

**Nguyên nhân:**
Vượt quá giới hạn API calls

**Giải pháp:**
- Đợi và thử lại
- Kiểm tra quota tại: https://megallm.io/dashboard
- Nâng cấp plan nếu cần

---

### 11. "Invalid MegaLLM API key"

**Giải pháp:**

Kiểm tra `.env.local`:

```env
MEGALLM_API_KEY=sk-mega-xxx
MEGALLM_MODEL=qwen/qwen3-next-80b-a3b-instruct
```

Lấy key mới tại: https://megallm.io/api-keys

---

## Lỗi Next.js 15+ Dynamic Routes

### 12. "params is a Promise and must be unwrapped with await"

**Lỗi:**
```
Error: Route "/api/xxx/[id]" used `params.id`. `params` is a Promise and must be unwrapped with `await` or `React.use()` before accessing its properties.
```

**Nguyên nhân:**
Next.js 15+ thay đổi cách xử lý dynamic route params. Params giờ là Promise và phải await.

**Giải pháp:**

```typescript
// SAI ❌ (Next.js 14)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id
}

// ĐÚNG ✅ (Next.js 15+)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // Giờ có thể dùng id
}
```

**Lưu ý:** Chỉ áp dụng cho API routes và server components. Client components dùng `useParams()` không bị ảnh hưởng.

---

## Lỗi 403 Forbidden

### 13. "Bạn không phải thành viên của nhà này"

**Lỗi:**
```
GET /api/families/[id]/members 403 (Forbidden)
```

**Nguyên nhân:**
User chưa tham gia nhà (family) nên không có quyền truy cập.

**Giải pháp:**

1. Lấy mã mời (invite code) từ admin nhà
2. Truy cập: `http://localhost:3000/join/[INVITE_CODE]`
3. Đăng nhập (nếu chưa)
4. Bấm "Tham gia nhà"
5. Sau khi tham gia thành công, bạn sẽ có quyền truy cập

**Ví dụ:**
```
http://localhost:3000/join/9YKML9PP
```

**Kiểm tra xem đã tham gia chưa:**
- Vào trang `/family`
- Nếu thấy thông tin nhà → đã tham gia
- Nếu thấy "Chưa có nhà" → chưa tham gia

---

## Lỗi 500 Photo Upload

### 14. "POST /api/photos/upload 500 (Internal Server Error)"

**Nguyên nhân có thể:**
1. Chưa cấu hình Cloudinary credentials
2. User chưa tham gia nhà nào
3. File quá lớn (>10MB)
4. Định dạng file không được hỗ trợ

**Giải pháp:**

**Bước 1: Kiểm tra Cloudinary config**

Trong `.env.local`:
```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Lấy credentials từ: https://cloudinary.com/console

**Bước 2: Đảm bảo đã tham gia nhà**

Truy cập `/join/[INVITE_CODE]` để tham gia nhà trước khi upload ảnh.

**Bước 3: Kiểm tra file**

- Kích thước: tối đa 10MB
- Định dạng: JPG, PNG, HEIC, WEBP

**Bước 4: Xem chi tiết lỗi trong terminal**

Mở terminal đang chạy `npm run dev` và xem error message chi tiết.

---

## Lỗi Hydration Mismatch

### 15. "A tree hydrated but some attributes didn't match"

**Lỗi:**
```
Warning: A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.
```

**Nguyên nhân:**
- Sử dụng `navigator.onLine`, `localStorage`, `Date.now()` trước khi component mount
- Browser extension can thiệp vào HTML (VD: Demoway, Grammarly)
- SSR/CSR mismatch

**Giải pháp:**

**Đã được fix trong code:**
```typescript
// Thêm mounted state check
const [mounted, setMounted] = useState(false)

useEffect(() => {
  setMounted(true)
}, [])

if (!mounted) {
  return null // hoặc skeleton
}

// Giờ có thể dùng browser APIs
const isOnline = navigator.onLine
```

**Nếu vẫn thấy warning:**
- Tắt browser extensions để test
- Kiểm tra xem có dùng `Math.random()` hay `Date.now()` trong render không
- Đảm bảo HTML từ server và client giống nhau

---

## Lỗi Build/Compile

### 16. "Module not found"

**Lỗi:**
```
Error: Cannot find module 'xxx'
```

**Giải pháp:**

```bash
# Xóa node_modules và reinstall
rm -rf node_modules
npm install

# Hoặc Windows
rmdir /s /q node_modules
npm install
```

---

### 17. "Port 3000 already in use"

**Lỗi:**
```
Error: Port 3000 is already in use
```

**Giải pháp:**

**Windows:**
```bash
# Tìm process đang dùng port 3000
netstat -ano | findstr :3000

# Kill process (thay <PID> bằng số process ID)
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
# Tìm và kill process
lsof -ti:3000 | xargs kill -9
```

Hoặc dùng port khác:

```bash
npm run dev -- -p 3001
```

---

## Lỗi TypeScript

### 18. "Type error: Property 'xxx' does not exist"

**Giải pháp:**

```bash
# Restart TypeScript server trong VS Code
Ctrl+Shift+P → "TypeScript: Restart TS Server"

# Hoặc rebuild
npm run build
```

---

## Lỗi Environment Variables

### 19. "Environment variable not loaded"

**Nguyên nhân:**
- File `.env.local` không được đọc
- Chưa restart server sau khi thay đổi

**Giải pháp:**

1. Đảm bảo file tên đúng: `.env.local` (không phải `.env.local.txt`)
2. Restart dev server:
   ```bash
   # Ctrl+C để stop
   npm run dev
   ```
3. Kiểm tra file có trong root folder (cùng cấp với `package.json`)

---

## Lỗi Tests

### 20. "Tests failing"

**Giải pháp:**

```bash
# Reinstall dependencies
npm install

# Clear cache
npm run test -- --clearCache

# Run tests
npm test
```

---

## Lỗi Git

### 21. "Accidentally committed .env.local"

**Giải pháp:**

```bash
# Remove from Git (nhưng giữ file local)
git rm --cached .env.local

# Commit
git commit -m "Remove .env.local from Git"

# Đảm bảo .gitignore có:
echo ".env.local" >> .gitignore
```

---

## Checklist Khi Gặp Lỗi

Khi gặp lỗi, hãy kiểm tra theo thứ tự:

1. [ ] MongoDB đang chạy chưa?
2. [ ] File `.env.local` có đúng không?
3. [ ] Đã restart dev server chưa?
4. [ ] Connection string đúng format chưa?
5. [ ] Credentials có đúng không?
6. [ ] Port 3000 có bị chiếm không?
7. [ ] `node_modules` có đầy đủ không?
8. [ ] Internet có kết nối không? (cho Atlas, OAuth, Cloudinary)

---

## Cách Debug

### Kiểm tra Environment Variables

Tạo file `scripts/check-env.js`:

```javascript
console.log('Environment Variables:')
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✓ Set' : '✗ Not set')
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✓ Set' : '✗ Not set')
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✓ Set' : '✗ Not set')
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✓ Set' : '✗ Not set')
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✓ Set' : '✗ Not set')
```

Chạy:
```bash
node scripts/check-env.js
```

### Kiểm tra MongoDB Connection

Tạo file `scripts/test-mongodb.js`:

```javascript
const { MongoClient } = require('mongodb');

async function testConnection() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tet-connect';
  console.log('Testing connection to:', uri);
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
  } finally {
    await client.close();
  }
}

testConnection();
```

Chạy:
```bash
node scripts/test-mongodb.js
```

---

## Liên Hệ Hỗ Trợ

Nếu vẫn gặp vấn đề:

1. Kiểm tra logs chi tiết trong terminal
2. Tạo issue trên GitHub với:
   - Mô tả lỗi
   - Error message đầy đủ
   - Các bước đã thử
   - Screenshot (nếu có)
3. Tham khảo documentation:
   - [MongoDB Docs](https://docs.mongodb.com)
   - [Next.js Docs](https://nextjs.org/docs)
   - [NextAuth Docs](https://next-auth.js.org)

---

**Chúc bạn fix lỗi thành công! 🎉**
