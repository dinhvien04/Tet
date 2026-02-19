# MongoDB Production Setup Guide

Complete guide for setting up MongoDB Atlas for production deployment of Tết Connect.

## Table of Contents

1. [Create Production Cluster](#create-production-cluster)
2. [Security Configuration](#security-configuration)
3. [Database Setup](#database-setup)
4. [Backup Strategy](#backup-strategy)
5. [Performance Optimization](#performance-optimization)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)

---

## Create Production Cluster

### 1. Sign Up / Log In

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Sign up or log in to your account
3. Create new organization (if needed)

### 2. Create New Cluster

1. Click "Build a Database"
2. Choose deployment option:
   - **Shared** (M0): Free tier, good for testing
   - **Dedicated** (M10+): Recommended for production
   - **Serverless**: Pay-per-use, good for variable workloads

**Recommended for Production: M10 or higher**

### 3. Configure Cluster

#### Cloud Provider & Region

```
Provider: AWS / Google Cloud / Azure
Region: Choose closest to your users
  - Asia Pacific (Singapore) for Asian users
  - US East (N. Virginia) for US users
  - Europe (Frankfurt) for European users
```

#### Cluster Tier

For production, recommended minimum:
```
Tier: M10
RAM: 2 GB
Storage: 10 GB
vCPUs: 2
```

#### Cluster Name

```
Name: tet-connect-prod
```

### 4. Additional Settings

#### MongoDB Version
```
Version: 7.0 (latest stable)
```

#### Backup
```
☑ Enable Cloud Backup
Backup frequency: Continuous (recommended)
```

#### Advanced Configuration (Optional)
```
☑ Enable BI Connector (if needed for analytics)
☐ Enable Encryption at Rest (Pro tier)
```

### 5. Create Cluster

Click "Create Cluster" and wait for provisioning (5-10 minutes)

---

## Security Configuration

### 1. Database Access (Users)

#### Create Database User

1. Go to "Database Access" in left sidebar
2. Click "Add New Database User"
3. Configure:

```
Authentication Method: Password
Username: tet-connect-prod
Password: <generate-strong-password>

Database User Privileges:
  ☑ Read and write to any database
  
Or specific privileges:
  Database: tet-connect-prod
  Role: readWrite
```

**Generate Strong Password:**
```bash
# Use password generator or:
openssl rand -base64 32
```

**Important:**
- Use different credentials than development
- Store password securely (password manager)
- Never commit password to Git

#### Built-in Role (Recommended)
```
Role: Atlas admin (for full access)
Or
Role: Read and write to any database
```

### 2. Network Access (IP Whitelist)

#### Option A: Allow All IPs (Easier, Less Secure)

1. Go to "Network Access"
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere"
4. IP Address: `0.0.0.0/0`
5. Comment: "Vercel deployment"

**Note:** This allows connections from any IP. Ensure strong authentication.

#### Option B: Whitelist Vercel IPs (More Secure)

Vercel uses dynamic IPs, so you need to whitelist IP ranges:

1. Get Vercel IP ranges from: https://vercel.com/docs/concepts/edge-network/regions
2. Add each IP range:
   ```
   76.76.21.0/24
   76.76.19.0/24
   64.252.128.0/24
   ```

**Note:** Vercel IPs may change. Monitor for connection issues.

#### Option C: VPC Peering (Most Secure, Requires Atlas Pro)

Set up VPC peering between Vercel and MongoDB Atlas.

### 3. Enable Encryption

#### Encryption at Rest (Atlas Pro)

1. Go to Security → Encryption at Rest
2. Enable encryption
3. Choose key management:
   - Atlas-managed keys (easier)
   - Customer-managed keys (more control)

#### Encryption in Transit (Always Enabled)

MongoDB Atlas enforces TLS/SSL for all connections.

---

## Database Setup

### 1. Create Database

1. Go to "Browse Collections"
2. Click "Add My Own Data"
3. Database name: `tet-connect-prod`
4. Collection name: `users` (first collection)

### 2. Create Collections

Create all required collections:

```javascript
// Collections to create:
- users
- families
- posts
- events
- photos
- notifications
- sessions (for NextAuth)
```

### 3. Create Indexes

Indexes improve query performance. Create these indexes:

#### Users Collection
```javascript
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ createdAt: -1 })
```

#### Families Collection
```javascript
db.families.createIndex({ inviteCode: 1 }, { unique: true })
db.families.createIndex({ createdBy: 1 })
```

#### Posts Collection
```javascript
db.posts.createIndex({ familyId: 1, createdAt: -1 })
db.posts.createIndex({ userId: 1 })
```

#### Events Collection
```javascript
db.events.createIndex({ familyId: 1, date: 1 })
db.events.createIndex({ date: 1 })
```

#### Photos Collection
```javascript
db.photos.createIndex({ familyId: 1, uploadedAt: -1 })
db.photos.createIndex({ userId: 1 })
```

#### Notifications Collection
```javascript
db.notifications.createIndex({ userId: 1, read: 1 })
db.notifications.createIndex({ createdAt: -1 })
```

**Create Indexes via MongoDB Shell:**

```bash
# Connect to your cluster
mongosh "mongodb+srv://cluster.mongodb.net/tet-connect-prod" --username tet-connect-prod

# Create indexes
use tet-connect-prod

db.users.createIndex({ email: 1 }, { unique: true })
db.families.createIndex({ inviteCode: 1 }, { unique: true })
db.posts.createIndex({ familyId: 1, createdAt: -1 })
db.events.createIndex({ familyId: 1, date: 1 })
db.photos.createIndex({ familyId: 1, uploadedAt: -1 })
db.notifications.createIndex({ userId: 1, read: 1 })
```

### 4. Get Connection String

1. Go to "Database" → Click "Connect"
2. Choose "Connect your application"
3. Driver: Node.js
4. Version: 5.5 or later
5. Copy connection string:

```
mongodb+srv://tet-connect-prod:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
```

6. Replace `<password>` with your actual password
7. Add database name:

```
mongodb+srv://tet-connect-prod:<password>@cluster.mongodb.net/tet-connect-prod?retryWrites=true&w=majority
```

---

## Backup Strategy

### 1. Enable Cloud Backup

1. Go to "Backup" tab
2. Enable "Cloud Backup" (if not already enabled)
3. Configure backup policy:

```
Backup Frequency: Continuous
Snapshot Frequency: Every 6 hours
Retention: 7 days (adjust based on needs)
```

### 2. Configure Backup Schedule

Recommended schedule:
```
Hourly snapshots: Keep for 24 hours
Daily snapshots: Keep for 7 days
Weekly snapshots: Keep for 4 weeks
Monthly snapshots: Keep for 12 months
```

### 3. Test Restore Procedure

**Important:** Test restore before you need it!

1. Go to "Backup" tab
2. Select a snapshot
3. Click "Restore"
4. Choose restore option:
   - Restore to new cluster (recommended for testing)
   - Download snapshot
5. Verify data integrity

### 4. Automated Backup Verification

Create a script to verify backups:

```javascript
// scripts/verify-backup.js
const { MongoClient } = require('mongodb');

async function verifyBackup() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('tet-connect-prod');
    
    // Check collections exist
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    // Check document counts
    const userCount = await db.collection('users').countDocuments();
    const familyCount = await db.collection('families').countDocuments();
    
    console.log('Users:', userCount);
    console.log('Families:', familyCount);
    
    // Verify indexes
    const indexes = await db.collection('users').indexes();
    console.log('User indexes:', indexes);
    
  } finally {
    await client.close();
  }
}

verifyBackup();
```

### 5. Disaster Recovery Plan

Document your recovery procedure:

1. **Identify Issue**: Determine what needs to be restored
2. **Select Snapshot**: Choose appropriate backup point
3. **Restore**: Follow restore procedure
4. **Verify**: Check data integrity
5. **Update Connection**: Point application to restored database
6. **Monitor**: Watch for issues

---

## Performance Optimization

### 1. Connection Pooling

Configure connection pool in your application:

```typescript
// lib/mongodb.ts
import { MongoClient } from 'mongodb';

const options = {
  maxPoolSize: 10, // Maximum connections
  minPoolSize: 5,  // Minimum connections
  maxIdleTimeMS: 30000, // Close idle connections after 30s
  serverSelectionTimeoutMS: 5000, // Timeout for server selection
  socketTimeoutMS: 45000, // Socket timeout
};

const client = new MongoClient(process.env.MONGODB_URI!, options);
```

### 2. Query Optimization

**Use Indexes:**
```javascript
// Good: Uses index
db.users.find({ email: 'user@example.com' })

// Bad: Full collection scan
db.users.find({ name: /john/i })
```

**Use Projection:**
```javascript
// Good: Only fetch needed fields
db.users.find({}, { name: 1, email: 1 })

// Bad: Fetch all fields
db.users.find({})
```

**Use Limit:**
```javascript
// Good: Limit results
db.posts.find().sort({ createdAt: -1 }).limit(20)

// Bad: Fetch all documents
db.posts.find().sort({ createdAt: -1 })
```

### 3. Enable Profiler

Monitor slow queries:

1. Go to "Performance Advisor"
2. Review slow queries
3. Create suggested indexes
4. Monitor query performance

### 4. Optimize Schema

**Embed vs Reference:**

```javascript
// Embed for frequently accessed data
{
  _id: ObjectId(),
  name: "John",
  address: {
    street: "123 Main St",
    city: "Hanoi"
  }
}

// Reference for large or rarely accessed data
{
  _id: ObjectId(),
  name: "John",
  addressId: ObjectId("...")
}
```

---

## Monitoring

### 1. Atlas Monitoring

Monitor key metrics:

1. Go to "Metrics" tab
2. Monitor:
   - **Operations**: Queries, inserts, updates, deletes
   - **Connections**: Active connections, available connections
   - **Network**: Bytes in/out
   - **Memory**: Resident memory, virtual memory
   - **Disk**: Disk IOPS, disk space

### 2. Set Up Alerts

Configure alerts for:

1. Go to "Alerts" → "Alert Settings"
2. Create alerts for:

```
☑ Connections > 80% of max
☑ Disk space > 80% used
☑ Memory usage > 80%
☑ Replication lag > 10 seconds
☑ Query execution time > 1000ms
```

### 3. Real-Time Performance Panel

Monitor in real-time:

1. Go to "Real-Time" tab
2. View:
   - Current operations
   - Slow queries
   - Connection stats
   - Server stats

### 4. Application Monitoring

Add monitoring to your application:

```typescript
// lib/mongodb-monitor.ts
import { MongoClient } from 'mongodb';

export async function getDbStats() {
  const client = new MongoClient(process.env.MONGODB_URI!);
  
  try {
    await client.connect();
    const db = client.db('tet-connect-prod');
    
    const stats = await db.stats();
    
    return {
      collections: stats.collections,
      dataSize: stats.dataSize,
      indexSize: stats.indexSize,
      storageSize: stats.storageSize,
    };
  } finally {
    await client.close();
  }
}
```

---

## Troubleshooting

### Connection Issues

**Error: "MongoServerError: bad auth"**

Solution:
1. Verify username and password
2. Check database user privileges
3. Ensure user has access to correct database

**Error: "MongoServerError: connection timeout"**

Solution:
1. Check IP whitelist
2. Verify network connectivity
3. Check firewall settings
4. Verify connection string

**Error: "MongoServerError: too many connections"**

Solution:
1. Increase connection pool size
2. Close unused connections
3. Upgrade cluster tier
4. Implement connection pooling

### Performance Issues

**Slow Queries**

Solution:
1. Check Performance Advisor
2. Create missing indexes
3. Optimize query patterns
4. Use projection to limit fields

**High Memory Usage**

Solution:
1. Review working set size
2. Optimize indexes
3. Implement pagination
4. Upgrade cluster tier

**Disk Space Issues**

Solution:
1. Review data growth
2. Implement data retention policy
3. Archive old data
4. Upgrade storage

### Data Issues

**Duplicate Key Error**

Solution:
1. Check unique indexes
2. Verify data before insert
3. Use upsert operations

**Document Too Large**

Solution:
1. MongoDB document limit: 16MB
2. Split large documents
3. Use GridFS for large files
4. Store files in Cloudinary instead

---

## Security Best Practices

1. **Strong Passwords**: Use 32+ character passwords
2. **Principle of Least Privilege**: Grant minimum required permissions
3. **IP Whitelist**: Restrict access to known IPs
4. **Enable Audit Logs**: Track database access (Atlas Pro)
5. **Regular Updates**: Keep MongoDB version updated
6. **Encryption**: Enable encryption at rest and in transit
7. **Monitor Access**: Review access logs regularly
8. **Backup Verification**: Test restore procedures
9. **Separate Environments**: Use different clusters for dev/staging/prod
10. **Rotate Credentials**: Change passwords periodically

---

## Maintenance Checklist

### Daily
- [ ] Check cluster health
- [ ] Review error logs
- [ ] Monitor connection count
- [ ] Check disk space

### Weekly
- [ ] Review slow queries
- [ ] Check backup status
- [ ] Review performance metrics
- [ ] Update indexes if needed

### Monthly
- [ ] Test backup restore
- [ ] Review security settings
- [ ] Check for MongoDB updates
- [ ] Review and optimize queries
- [ ] Analyze data growth trends

### Quarterly
- [ ] Security audit
- [ ] Performance review
- [ ] Capacity planning
- [ ] Update documentation

---

## Cost Optimization

### 1. Choose Right Tier

```
Development: M0 (Free)
Staging: M2 ($9/month)
Production: M10+ ($57+/month)
```

### 2. Monitor Usage

1. Go to "Billing"
2. Review:
   - Data transfer
   - Storage usage
   - Backup storage
   - Compute hours

### 3. Optimize Costs

- Use appropriate cluster tier
- Implement data retention policies
- Archive old data
- Optimize indexes to reduce storage
- Use compression
- Monitor and reduce data transfer

---

## Resources

- **MongoDB Atlas Documentation**: https://docs.atlas.mongodb.com
- **MongoDB University**: https://university.mongodb.com
- **Community Forums**: https://community.mongodb.com
- **Support**: https://support.mongodb.com

---

## Quick Reference

### Connection String Format
```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

### Common Commands
```bash
# Connect to cluster
mongosh "mongodb+srv://cluster.mongodb.net/tet-connect-prod" --username <user>

# Show databases
show dbs

# Use database
use tet-connect-prod

# Show collections
show collections

# Count documents
db.users.countDocuments()

# Create index
db.users.createIndex({ email: 1 }, { unique: true })

# View indexes
db.users.getIndexes()

# Database stats
db.stats()

# Collection stats
db.users.stats()
```

---

**Your MongoDB production database is ready! 🎉**
