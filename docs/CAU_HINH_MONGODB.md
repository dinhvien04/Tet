# Cấu Hình MongoDB Atlas Production

## Tổng Quan

Hướng dẫn chi tiết thiết lập MongoDB Atlas cho production.

## Bước 1: Tạo Production Cluster

### 1.1. Đăng Nhập MongoDB Atlas

1. Truy cập https://cloud.mongodb.com
2. Đăng nhập hoặc tạo tài khoản mới
3. Tạo organization mới (nếu cần)

### 1.2. Chọn Cluster Tier

**Khuyến nghị cho Production:**

```
Tier: M10 (Dedicated)
RAM: 2 GB
Storage: 10 GB
vCPUs: 2
Giá: ~$57/tháng
```

**Cho Testing/Staging:**

```
Tier: M0 (Shared)
RAM: 512 MB
Storage: 512 MB
Giá: Miễn phí
```

### 1.3. Chọn Region

Chọn region gần người dùng nhất:

- **Việt Nam**: Singapore (ap-southeast-1)
- **Mỹ**: US East (us-east-1)
- **Châu Âu**: Frankfurt (eu-central-1)

### 1.4. Đặt Tên Cluster

```
Tên: tet-connect-prod
```

### 1.5. Cấu Hình Backup

```
☑ Enable Cloud Backup
Frequency: Continuous
Retention: 7 days
```

### 1.6. Tạo Cluster

Click "Create Cluster" và đợi 5-10 phút.

## Bước 2: Cấu Hình Security

### 2.1. Tạo Database User

1. Vào "Database Access"
2. Click "Add New Database User"
3. Cấu hình:

```
Authentication Method: Password
Username: tet-connect-prod
Password: <tạo mật khẩu mạnh>

Privileges:
- Database: tet-connect-prod
- Role: Read and write
```

**Tạo mật khẩu mạnh:**

```bash
# Dùng OpenSSL
openssl rand -base64 32

# Hoặc dùng Node.js
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
```

**Lưu ý:**
- Dùng mật khẩu khác development
- Lưu mật khẩu an toàn (password manager)
- KHÔNG commit vào Git

### 2.2. Whitelist IP Address

**Cách 1: Allow All (Dễ, ít an toàn hơn)**

1. Vào "Network Access"
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere"
4. IP: `0.0.0.0/0`
5. Comment: "Vercel deployment"

**Cách 2: Whitelist Vercel IPs (An toàn hơn)**

Thêm các IP ranges của Vercel:
```
76.76.21.0/24
76.76.19.0/24
64.252.128.0/24
```

**Lưu ý:** Vercel IPs có thể thay đổi.

## Bước 3: Tạo Database và Collections

### 3.1. Tạo Database

1. Vào "Browse Collections"
2. Click "Add My Own Data"
3. Database name: `tet-connect-prod`
4. Collection name: `users`

### 3.2. Tạo Các Collections

Tạo các collections sau:

```
- users          (người dùng)
- families       (nhà/gia đình)
- posts          (bài viết)
- events         (sự kiện)
- photos         (ảnh)
- notifications  (thông báo)
- sessions       (phiên đăng nhập)
```

### 3.3. Tạo Indexes

Indexes giúp query nhanh hơn.

**Connect qua MongoDB Shell:**

```bash
mongosh "mongodb+srv://cluster.mongodb.net/tet-connect-prod" --username tet-connect-prod
```

**Tạo indexes:**

```javascript
use tet-connect-prod

// Users collection
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ createdAt: -1 })

// Families collection
db.families.createIndex({ inviteCode: 1 }, { unique: true })
db.families.createIndex({ createdBy: 1 })

// Posts collection
db.posts.createIndex({ familyId: 1, createdAt: -1 })
db.posts.createIndex({ userId: 1 })

// Events collection
db.events.createIndex({ familyId: 1, date: 1 })
db.events.createIndex({ date: 1 })

// Photos collection
db.photos.createIndex({ familyId: 1, uploadedAt: -1 })
db.photos.createIndex({ userId: 1 })

// Notifications collection
db.notifications.createIndex({ userId: 1, read: 1 })
db.notifications.createIndex({ createdAt: -1 })
```

## Bước 4: Lấy Connection String

### 4.1. Get Connection String

1. Vào "Database" → Click "Connect"
2. Chọn "Connect your application"
3. Driver: Node.js
4. Version: 5.5 or later
5. Copy connection string

### 4.2. Format Connection String

```
mongodb+srv://tet-connect-prod:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
```

### 4.3. Thêm Database Name

```
mongodb+srv://tet-connect-prod:<password>@cluster.mongodb.net/tet-connect-prod?retryWrites=true&w=majority
```

Thay `<password>` bằng mật khẩu thực.

## Bước 5: Backup Strategy

### 5.1. Enable Cloud Backup

1. Vào "Backup" tab
2. Enable "Cloud Backup"
3. Cấu hình:

```
Snapshot Frequency: Every 6 hours
Retention: 
  - Hourly: 24 hours
  - Daily: 7 days
  - Weekly: 4 weeks
  - Monthly: 12 months
```

### 5.2. Test Restore

**Quan trọng:** Test restore trước khi cần!

1. Vào "Backup" tab
2. Chọn snapshot
3. Click "Restore"
4. Chọn "Restore to new cluster"
5. Verify data

### 5.3. Automated Backup Verification

Tạo script kiểm tra backup:

```javascript
// scripts/verify-backup.js
const { MongoClient } = require('mongodb');

async function verifyBackup() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('tet-connect-prod');
    
    // Kiểm tra collections
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    // Đếm documents
    const userCount = await db.collection('users').countDocuments();
    const familyCount = await db.collection('families').countDocuments();
    
    console.log('Users:', userCount);
    console.log('Families:', familyCount);
    
  } finally {
    await client.close();
  }
}

verifyBackup();
```

## Bước 6: Performance Optimization

### 6.1. Connection Pooling

Cấu hình trong code:

```typescript
// lib/mongodb.ts
const options = {
  maxPoolSize: 10,      // Tối đa 10 connections
  minPoolSize: 5,       // Tối thiểu 5 connections
  maxIdleTimeMS: 30000, // Đóng connection idle sau 30s
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};
```

### 6.2. Query Optimization

**Tốt:**
```javascript
// Dùng index
db.users.find({ email: 'user@example.com' })

// Dùng projection (chỉ lấy field cần thiết)
db.users.find({}, { name: 1, email: 1 })

// Dùng limit
db.posts.find().sort({ createdAt: -1 }).limit(20)
```

**Không tốt:**
```javascript
// Full collection scan
db.users.find({ name: /john/i })

// Lấy tất cả fields
db.users.find({})

// Không limit
db.posts.find().sort({ createdAt: -1 })
```

### 6.3. Enable Profiler

1. Vào "Performance Advisor"
2. Review slow queries
3. Tạo indexes được suggest
4. Monitor query performance

## Bước 7: Monitoring

### 7.1. Atlas Monitoring

Monitor các metrics:

1. Vào "Metrics" tab
2. Theo dõi:
   - **Operations**: Queries, inserts, updates
   - **Connections**: Active connections
   - **Network**: Bytes in/out
   - **Memory**: Memory usage
   - **Disk**: Disk IOPS, space

### 7.2. Thiết Lập Alerts

1. Vào "Alerts" → "Alert Settings"
2. Tạo alerts:

```
☑ Connections > 80% of max
☑ Disk space > 80%
☑ Memory usage > 80%
☑ Query execution time > 1000ms
```

### 7.3. Real-Time Monitoring

1. Vào "Real-Time" tab
2. Xem:
   - Current operations
   - Slow queries
   - Connection stats

## Xử Lý Lỗi

### Lỗi: "bad auth"

**Giải pháp:**
- Kiểm tra username và password
- Kiểm tra database user privileges
- Kiểm tra database name trong connection string

### Lỗi: "connection timeout"

**Giải pháp:**
- Kiểm tra IP whitelist
- Kiểm tra network connectivity
- Kiểm tra firewall

### Lỗi: "too many connections"

**Giải pháp:**
- Tăng connection pool size
- Đóng unused connections
- Upgrade cluster tier

### Lỗi: "slow queries"

**Giải pháp:**
- Tạo indexes
- Optimize query patterns
- Dùng projection
- Implement pagination

## Best Practices

1. **Mật khẩu mạnh**: 32+ ký tự
2. **Least Privilege**: Chỉ cấp quyền cần thiết
3. **IP Whitelist**: Hạn chế IP nếu có thể
4. **Enable Backup**: Luôn enable backup
5. **Test Restore**: Test restore định kỳ
6. **Monitor**: Theo dõi metrics thường xuyên
7. **Indexes**: Tạo indexes cho queries thường dùng
8. **Connection Pooling**: Reuse connections
9. **Separate Environments**: Dev/staging/prod riêng
10. **Update Regularly**: Cập nhật MongoDB version

## Checklist Bảo Trì

### Hàng Ngày
- [ ] Kiểm tra cluster health
- [ ] Review error logs
- [ ] Kiểm tra connection count
- [ ] Kiểm tra disk space

### Hàng Tuần
- [ ] Review slow queries
- [ ] Kiểm tra backup status
- [ ] Review performance metrics
- [ ] Update indexes nếu cần

### Hàng Tháng
- [ ] Test backup restore
- [ ] Security audit
- [ ] Performance review
- [ ] Capacity planning

## Tài Liệu Tham Khảo

- MongoDB Atlas Docs: https://docs.atlas.mongodb.com
- MongoDB University: https://university.mongodb.com
- Community Forums: https://community.mongodb.com

---

**MongoDB production của bạn đã sẵn sàng! 🎉**
