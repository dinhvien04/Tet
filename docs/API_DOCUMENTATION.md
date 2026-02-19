# API Documentation - Tết Connect

This document describes the REST API endpoints available in Tết Connect.

## Table of Contents

1. [Authentication](#authentication)
2. [Families](#families)
3. [Posts](#posts)
4. [Reactions](#reactions)
5. [Events](#events)
6. [Tasks](#tasks)
7. [Photos](#photos)
8. [Videos](#videos)
9. [Notifications](#notifications)
10. [AI Generation](#ai-generation)

---

## Authentication

Authentication is handled by NextAuth.js with Google OAuth provider.

### Login

**Endpoint**: `/api/auth/signin`  
**Method**: GET  
**Description**: Redirects to Google OAuth login page

### Callback

**Endpoint**: `/api/auth/callback/google`  
**Method**: GET  
**Description**: Handles OAuth callback from Google

### Get Session

**Endpoint**: `/api/auth/session`  
**Method**: GET  
**Description**: Returns current user session

**Response**:
```json
{
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "image": "avatar_url"
  },
  "expires": "2024-12-31T23:59:59.999Z"
}
```

### Logout

**Endpoint**: `/api/auth/signout`  
**Method**: POST  
**Description**: Signs out the current user

---

## Families

### Create Family

**Endpoint**: `/api/families`  
**Method**: POST  
**Authentication**: Required

**Request Body**:
```json
{
  "name": "Gia đình Nguyễn"
}
```

**Response**:
```json
{
  "id": "family_id",
  "name": "Gia đình Nguyễn",
  "inviteCode": "ABC12345",
  "createdBy": "user_id",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes**:
- `201`: Family created successfully
- `400`: Invalid request body
- `401`: Unauthorized
- `500`: Server error

### Get Family

**Endpoint**: `/api/families/:id`  
**Method**: GET  
**Authentication**: Required

**Response**:
```json
{
  "id": "family_id",
  "name": "Gia đình Nguyễn",
  "inviteCode": "ABC12345",
  "members": [
    {
      "id": "user_id",
      "name": "User Name",
      "email": "user@example.com",
      "role": "admin",
      "joinedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Join Family

**Endpoint**: `/api/families/:id/join`  
**Method**: POST  
**Authentication**: Required

**Request Body**:
```json
{
  "inviteCode": "ABC12345"
}
```

**Response**:
```json
{
  "success": true,
  "familyId": "family_id"
}
```

**Status Codes**:
- `200`: Joined successfully
- `400`: Invalid invite code
- `401`: Unauthorized
- `409`: Already a member
- `500`: Server error

### Get Family Members

**Endpoint**: `/api/families/:id/members`  
**Method**: GET  
**Authentication**: Required

**Response**:
```json
{
  "members": [
    {
      "id": "user_id",
      "name": "User Name",
      "email": "user@example.com",
      "image": "avatar_url",
      "role": "admin",
      "joinedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## Posts

### Create Post

**Endpoint**: `/api/posts`  
**Method**: POST  
**Authentication**: Required

**Request Body**:
```json
{
  "familyId": "family_id",
  "content": "Chúc mừng năm mới!",
  "type": "loi-chuc"
}
```

**Valid types**: `cau-doi`, `loi-chuc`, `thiep-tet`

**Response**:
```json
{
  "id": "post_id",
  "familyId": "family_id",
  "userId": "user_id",
  "content": "Chúc mừng năm mới!",
  "type": "loi-chuc",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "user": {
    "name": "User Name",
    "image": "avatar_url"
  }
}
```

### Get Posts

**Endpoint**: `/api/posts?familyId=:familyId`  
**Method**: GET  
**Authentication**: Required

**Query Parameters**:
- `familyId` (required): Family ID
- `limit` (optional): Number of posts to return (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response**:
```json
{
  "posts": [
    {
      "id": "post_id",
      "familyId": "family_id",
      "userId": "user_id",
      "content": "Chúc mừng năm mới!",
      "type": "loi-chuc",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "user": {
        "name": "User Name",
        "image": "avatar_url"
      },
      "reactions": {
        "heart": 5,
        "haha": 2
      }
    }
  ],
  "total": 50,
  "hasMore": true
}
```

---

## Reactions

### Toggle Reaction

**Endpoint**: `/api/posts/:id/reactions`  
**Method**: POST  
**Authentication**: Required

**Request Body**:
```json
{
  "type": "heart"
}
```

**Valid types**: `heart`, `haha`

**Response**:
```json
{
  "action": "added",
  "reaction": {
    "id": "reaction_id",
    "postId": "post_id",
    "userId": "user_id",
    "type": "heart",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Actions**: `added`, `removed`, `changed`

---

## Events

### Create Event

**Endpoint**: `/api/events`  
**Method**: POST  
**Authentication**: Required

**Request Body**:
```json
{
  "familyId": "family_id",
  "title": "Cúng tất niên",
  "date": "2024-02-09T18:00:00.000Z",
  "location": "Nhà ông bà nội",
  "description": "Cúng tất niên năm 2024"
}
```

**Response**:
```json
{
  "id": "event_id",
  "familyId": "family_id",
  "title": "Cúng tất niên",
  "date": "2024-02-09T18:00:00.000Z",
  "location": "Nhà ông bà nội",
  "description": "Cúng tất niên năm 2024",
  "createdBy": "user_id",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Get Events

**Endpoint**: `/api/events?familyId=:familyId`  
**Method**: GET  
**Authentication**: Required

**Query Parameters**:
- `familyId` (required): Family ID
- `upcoming` (optional): Filter upcoming events only (true/false)

**Response**:
```json
{
  "events": [
    {
      "id": "event_id",
      "familyId": "family_id",
      "title": "Cúng tất niên",
      "date": "2024-02-09T18:00:00.000Z",
      "location": "Nhà ông bà nội",
      "description": "Cúng tất niên năm 2024",
      "tasks": [
        {
          "id": "task_id",
          "task": "Mua hoa quả",
          "assignedTo": "user_id",
          "status": "pending"
        }
      ]
    }
  ]
}
```

### Get Event Details

**Endpoint**: `/api/events/:id`  
**Method**: GET  
**Authentication**: Required

**Response**:
```json
{
  "id": "event_id",
  "familyId": "family_id",
  "title": "Cúng tất niên",
  "date": "2024-02-09T18:00:00.000Z",
  "location": "Nhà ông bà nội",
  "description": "Cúng tất niên năm 2024",
  "createdBy": "user_id",
  "tasks": [
    {
      "id": "task_id",
      "task": "Mua hoa quả",
      "assignedTo": "user_id",
      "assignedToUser": {
        "name": "User Name",
        "image": "avatar_url"
      },
      "status": "pending",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## Tasks

### Add Task to Event

**Endpoint**: `/api/events/:id/tasks`  
**Method**: POST  
**Authentication**: Required

**Request Body**:
```json
{
  "task": "Mua hoa quả",
  "assignedTo": "user_id"
}
```

**Response**:
```json
{
  "id": "task_id",
  "eventId": "event_id",
  "task": "Mua hoa quả",
  "assignedTo": "user_id",
  "status": "pending",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Update Task Status

**Endpoint**: `/api/tasks/:id`  
**Method**: PATCH  
**Authentication**: Required

**Request Body**:
```json
{
  "status": "completed"
}
```

**Valid statuses**: `pending`, `completed`

**Response**:
```json
{
  "id": "task_id",
  "status": "completed",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Photos

### Upload Photo

**Endpoint**: `/api/photos/upload`  
**Method**: POST  
**Authentication**: Required  
**Content-Type**: `multipart/form-data`

**Request Body**:
- `file`: Image file (JPG, PNG, HEIC)
- `familyId`: Family ID

**Response**:
```json
{
  "id": "photo_id",
  "familyId": "family_id",
  "userId": "user_id",
  "url": "https://cloudinary.com/...",
  "uploadedAt": "2024-01-01T00:00:00.000Z",
  "user": {
    "name": "User Name",
    "image": "avatar_url"
  }
}
```

**Status Codes**:
- `201`: Photo uploaded successfully
- `400`: Invalid file type or size
- `401`: Unauthorized
- `413`: File too large (max 10MB)
- `500`: Server error

### Get Photos

**Endpoint**: `/api/photos?familyId=:familyId`  
**Method**: GET  
**Authentication**: Required

**Query Parameters**:
- `familyId` (required): Family ID
- `limit` (optional): Number of photos to return (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response**:
```json
{
  "photos": [
    {
      "id": "photo_id",
      "familyId": "family_id",
      "userId": "user_id",
      "url": "https://cloudinary.com/...",
      "uploadedAt": "2024-01-01T00:00:00.000Z",
      "user": {
        "name": "User Name",
        "image": "avatar_url"
      }
    }
  ],
  "total": 100,
  "hasMore": true
}
```

---

## Videos

### Create Video Recap

**Endpoint**: `/api/videos/create`  
**Method**: POST  
**Authentication**: Required

**Request Body**:
```json
{
  "familyId": "family_id",
  "photoIds": ["photo_id_1", "photo_id_2", "photo_id_3"]
}
```

**Response**:
```json
{
  "id": "video_id",
  "familyId": "family_id",
  "userId": "user_id",
  "url": "https://cloudinary.com/...",
  "status": "processing",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Status values**: `processing`, `completed`, `failed`

**Status Codes**:
- `202`: Video processing started
- `400`: Invalid photo IDs or too many photos (max 50)
- `401`: Unauthorized
- `500`: Server error

### Get Video Status

**Endpoint**: `/api/videos/:id`  
**Method**: GET  
**Authentication**: Required

**Response**:
```json
{
  "id": "video_id",
  "familyId": "family_id",
  "userId": "user_id",
  "url": "https://cloudinary.com/...",
  "status": "completed",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "completedAt": "2024-01-01T00:02:00.000Z"
}
```

---

## Notifications

### Get Notifications

**Endpoint**: `/api/notifications`  
**Method**: GET  
**Authentication**: Required

**Query Parameters**:
- `unreadOnly` (optional): Filter unread notifications only (true/false)
- `limit` (optional): Number of notifications to return (default: 20)

**Response**:
```json
{
  "notifications": [
    {
      "id": "notification_id",
      "userId": "user_id",
      "type": "event_reminder",
      "title": "Sự kiện sắp diễn ra",
      "content": "Cúng tất niên sẽ diễn ra vào 18:00 ngày 09/02",
      "link": "/events/event_id",
      "read": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "unreadCount": 5
}
```

**Notification types**: `event_reminder`, `task_reminder`

### Mark Notification as Read

**Endpoint**: `/api/notifications/:id/read`  
**Method**: PATCH  
**Authentication**: Required

**Response**:
```json
{
  "id": "notification_id",
  "read": true,
  "readAt": "2024-01-01T00:00:00.000Z"
}
```

---

## AI Generation

### Generate AI Content

**Endpoint**: `/api/ai/generate`  
**Method**: POST  
**Authentication**: Required

**Request Body**:
```json
{
  "type": "cau-doi",
  "recipientName": "Bố",
  "traits": "hiền lành, yêu thương gia đình"
}
```

**Valid types**: `cau-doi`, `loi-chuc`, `thiep-tet`

**Response**:
```json
{
  "content": "Xuân về đất nước muôn hoa nở\nTết đến gia đình nghìn phúc lành",
  "type": "cau-doi"
}
```

**Status Codes**:
- `200`: Content generated successfully
- `400`: Invalid request body
- `401`: Unauthorized
- `429`: Rate limit exceeded (retry after 60 seconds)
- `500`: AI service error
- `504`: Request timeout (30 seconds)

---

## Error Responses

All endpoints may return the following error format:

```json
{
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

### Common Error Codes

- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User doesn't have permission
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid request data
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SERVER_ERROR`: Internal server error

---

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **General endpoints**: 100 requests per minute per user
- **AI generation**: 10 requests per minute per user
- **File uploads**: 20 requests per minute per user

When rate limit is exceeded, the API returns:
- Status: `429 Too Many Requests`
- Header: `Retry-After: 60` (seconds)

---

## Webhooks (Future)

Webhook support for realtime events will be added in future versions:

- `post.created`
- `reaction.added`
- `event.created`
- `task.completed`
- `photo.uploaded`

---

## Authentication Headers

All authenticated requests must include:

```
Cookie: next-auth.session-token=<session_token>
```

Or for API clients:

```
Authorization: Bearer <access_token>
```

---

## Pagination

Endpoints that return lists support pagination:

**Query Parameters**:
- `limit`: Number of items per page (default: 20, max: 100)
- `offset`: Number of items to skip (default: 0)

**Response includes**:
- `total`: Total number of items
- `hasMore`: Boolean indicating if more items exist

---

## Filtering & Sorting

Some endpoints support filtering and sorting:

**Query Parameters**:
- `sort`: Field to sort by (e.g., `createdAt`, `date`)
- `order`: Sort order (`asc` or `desc`)
- `filter`: JSON object with filter criteria

Example:
```
GET /api/posts?familyId=123&sort=createdAt&order=desc&limit=10
```

---

## CORS

CORS is enabled for the following origins:
- `http://localhost:3000` (development)
- `https://your-domain.com` (production)

---

## API Versioning

Current API version: `v1`

Future versions will be accessible via:
```
/api/v2/...
```

---

For more information or support, please contact: support@tetconnect.com
