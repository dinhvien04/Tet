# Kết Nối MongoDB Local (Máy Chính)

## Tổng Quan

Hướng dẫn này giúp bạn kết nối ứng dụng Tết Connect với MongoDB đang chạy trên máy local của bạn.

## Yêu Cầu

- MongoDB đã cài đặt trên máy
- MongoDB đang chạy (port 27017)
- MongoDB Compass (tùy chọn, để quản lý database)

## Cách 1: Kết Nối MongoDB Local Không Authentication

### Bước 1: Kiểm Tra MongoDB Đang Chạy

**Windows:**
```bash
# Kiểm tra MongoDB service
net start | findstr MongoDB

# Hoặc kiểm tra port
netstat -ano | findstr :27017
```

**Mac/Linux:**
```bash
# Kiểm tra MongoDB process
ps aux | grep mongod

# Hoặc kiểm tra port
lsof -i :27017
```

### Bước 2: Cấu Hình Connection String

Mở file `.env.local` và thêm:

```env
# MongoDB Local (Không authentication)
MONGODB_URI=mongodb://localhost:27017/tet-connect

# Hoặc dùng 127.0.0.1
MONGODB_URI=mongodb://127.0.0.1:27017/tet-connect
```

### Bước 3: Test Kết Nối

```bash
npm run dev
```

Nếu thấy log:
```
✓ Connected to MongoDB
```

Là thành công!

## Cách 2: Kết Nối MongoDB Local Có Authentication

### Bước 1: Tạo User Trong MongoDB

Mở MongoDB Shell (mongosh):

```bash
mongosh
```

Chạy các lệnh sau:

```javascript
// Chuyển sang admin database
use admin

// Tạo admin user
db.createUser({
  user: "admin",
  pwd: "admin123",
  roles: [{ role: "userAdminAnyDatabase", db: "admin" }]
})

// Chuyển sang database tet-connect
use tet-connect

// Tạo user cho database tet-connect
db.createUser({
  user: "tetconnect",
  pwd: "tetconnect123",
  roles: [{ role: "readWrite", db: "tet-connect" }]
})
```

### Bước 2: Enable Authentication

**Windows:**

1. Mở file `mongod.cfg` (thường ở `C:\Program Files\MongoDB\Server\7.0\bin\mongod.cfg`)
2. Thêm/sửa:

```yaml
security:
  authorization: enabled
```

3. Restart MongoDB service:
```bash
net stop MongoDB
net start MongoDB
```

**Mac/Linux:**

1. Mở file `/etc/mongod.conf` hoặc `/usr/local/etc/mongod.conf`
2. Thêm/sửa:

```yaml
security:
  authorization: enabled
```

3. Restart MongoDB:
```bash
# Mac
brew services restart mongodb-community

# Linux
sudo systemctl restart mongod
```

### Bước 3: Cấu Hình Connection String

Mở file `.env.local`:

```env
# MongoDB Local với authentication
MONGODB_URI=mongodb://tetconnect:tetconnect123@localhost:27017/tet-connect?authSource=tet-connect

# Hoặc
MONGODB_URI=mongodb://tetconnect:tetconnect123@127.0.0.1:27017/tet-connect?authSource=tet-connect
```

## Cách 3: Kết Nối Qua MongoDB Compass

### Bước 1: Mở MongoDB Compass

Bạn đã có MongoDB Compass rồi (theo screenshot).

### Bước 2: Tạo Connection

**Không authentication:**
```
mongodb://localhost:27017
```

**Có authentication:**
```
mongodb://tetconnect:tetconnect123@localhost:27017/?authSource=tet-connect
```

### Bước 3: Lấy Connection String

1. Click vào connection đã tạo
2. Click "..." → "Copy Connection String"
3. Paste vào `.env.local`

## Cấu Trúc Database

### Tạo Database và Collections

Kết nối vào MongoDB và chạy:

```javascript
// Chuyển sang database tet-connect
use tet-connect

// Tạo collections
db.createCollection("users")
db.createCollection("families")
db.createCollection("posts")
db.createCollection("events")
db.createCollection("photos")
db.createCollection("notifications")
db.createCollection("sessions")

// Tạo indexes
db.users.createIndex({ email: 1 }, { unique: true })
db.families.createIndex({ inviteCode: 1 }, { unique: true })
db.posts.createIndex({ familyId: 1, createdAt: -1 })
db.events.createIndex({ familyId: 1, date: 1 })
db.photos.createIndex({ familyId: 1, uploadedAt: -1 })
db.notifications.createIndex({ userId: 1, read: 1 })
```

## File .env.local Hoàn Chỉnh

```env
# =============================================================================
# MongoDB Local Configuration
# =============================================================================
# Không authentication
MONGODB_URI=mongodb://localhost:27017/tet-connect

# Hoặc có authentication
# MONGODB_URI=mongodb://tetconnect:tetconnect123@localhost:27017/tet-connect?authSource=tet-connect

# =============================================================================
# NextAuth Configuration
# =============================================================================
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-generate-with-openssl-rand-base64-32

# =============================================================================
# Google OAuth Configuration
# =============================================================================
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# =============================================================================
# Cloudinary Configuration
# =============================================================================
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# =============================================================================
# Gemini AI Configuration
# =============================================================================
GEMINI_API_KEY=your-gemini-api-key
```

## Xử Lý Lỗi

### Lỗi: "ECONNREFUSED 127.0.0.1:27017"

**Nguyên nhân:** MongoDB không chạy

**Giải pháp:**

**Windows:**
```bash
net start MongoDB
```

**Mac:**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
```

### Lỗi: "Authentication failed"

**Nguyên nhân:** Username/password không đúng

**Giải pháp:**
1. Kiểm tra username và password
2. Kiểm tra `authSource` trong connection string
3. Thử kết nối qua MongoDB Compass để verify

### Lỗi: "Database does not exist"

**Nguyên nhân:** Database chưa được tạo

**Giải pháp:**
- MongoDB sẽ tự động tạo database khi có data đầu tiên
- Hoặc tạo thủ công bằng lệnh `use tet-connect`

### Lỗi: "Connection timeout"

**Nguyên nhân:** MongoDB không listen trên 0.0.0.0

**Giải pháp:**

Sửa file config MongoDB:

```yaml
net:
  port: 27017
  bindIp: 127.0.0.1,0.0.0.0
```

Restart MongoDB.

## So Sánh: Local vs Atlas

### MongoDB Local (Máy chính)

**Ưu điểm:**
- ✅ Miễn phí hoàn toàn
- ✅ Không cần internet
- ✅ Tốc độ nhanh (local)
- ✅ Không giới hạn storage
- ✅ Full control

**Nhược điểm:**
- ❌ Phải tự quản lý
- ❌ Không có backup tự động
- ❌ Không scale được
- ❌ Chỉ dùng cho development

### MongoDB Atlas (Cloud)

**Ưu điểm:**
- ✅ Backup tự động
- ✅ Scale dễ dàng
- ✅ Monitoring built-in
- ✅ Dùng cho production
- ✅ Không cần quản lý

**Nhược điểm:**
- ❌ Cần internet
- ❌ Có giới hạn (free tier)
- ❌ Tốc độ phụ thuộc mạng
- ❌ Tốn tiền (production)

## Khuyến Nghị

### Cho Development (Máy local)
```env
MONGODB_URI=mongodb://localhost:27017/tet-connect
```

### Cho Production (Atlas)
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/tet-connect-prod?retryWrites=true&w=majority
```

## Script Hữu Ích

### Tạo Sample Data

```javascript
// scripts/seed-local-db.js
const { MongoClient } = require('mongodb');

async function seedDatabase() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('tet-connect');
    
    // Tạo sample user
    await db.collection('users').insertOne({
      name: 'Nguyễn Văn A',
      email: 'test@example.com',
      createdAt: new Date(),
    });
    
    console.log('✓ Sample data created');
  } finally {
    await client.close();
  }
}

seedDatabase();
```

Chạy:
```bash
node scripts/seed-local-db.js
```

### Backup Local Database

```bash
# Backup
mongodump --db tet-connect --out ./backup

# Restore
mongorestore --db tet-connect ./backup/tet-connect
```

## Kiểm Tra Kết Nối

Tạo file test:

```javascript
// scripts/test-connection.js
const { MongoClient } = require('mongodb');

async function testConnection() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tet-connect';
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
node scripts/test-connection.js
```

## Tài Liệu Tham Khảo

- [MongoDB Installation](https://www.mongodb.com/docs/manual/installation/)
- [MongoDB Compass](https://www.mongodb.com/products/compass)
- [Connection String Format](https://www.mongodb.com/docs/manual/reference/connection-string/)

---

**Bạn đã sẵn sàng dùng MongoDB local! 🎉**

Nếu gặp vấn đề, hãy kiểm tra:
1. MongoDB đang chạy chưa
2. Port 27017 có bị chiếm không
3. Connection string đúng format chưa
4. Firewall có block không
