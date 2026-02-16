# Authentication Components

## LoginButton

Component hiển thị nút đăng nhập bằng Google OAuth.

### Features
- Google OAuth integration với Supabase Auth
- Loading state khi đang xử lý
- Google logo và styling
- Error handling với alert messages

### Usage
```tsx
import { LoginButton } from '@/components/auth/LoginButton'

<LoginButton />
```

### Flow
1. User clicks button
2. Redirects to Google OAuth
3. After successful auth, redirects to `/auth/callback`
4. Callback route creates/updates user in database
5. Redirects to `/dashboard`

## Routes

### `/login`
Trang đăng nhập chính với LoginButton component.

### `/auth/callback`
Route xử lý OAuth redirect từ Google.
- Exchanges code for session
- Creates/updates user record in database
- Redirects to dashboard

## Requirements Validated
- ✅ 1.1: Hiển thị nút đăng nhập bằng Google
- ✅ 1.2: Chuyển hướng đến Google OAuth
- ✅ 1.5: Chuyển hướng đến dashboard sau khi xác thực
