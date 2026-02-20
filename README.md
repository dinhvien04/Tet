# Táº¿t Connect ðŸŽŠ

á»¨ng dá»¥ng web giÃºp cÃ¡c gia Ä‘Ã¬nh Viá»‡t Nam tá»• chá»©c vÃ  káº¿t ná»‘i trong dá»‹p Táº¿t NguyÃªn ÄÃ¡n. Táº¡o khÃ´ng gian riÃªng tÆ°, áº¥m cÃºng Ä‘á»ƒ gia Ä‘Ã¬nh lÆ°u giá»¯ khoáº£nh kháº¯c, tá»• chá»©c gáº·p máº·t, vÃ  táº¡o ná»™i dung Táº¿t Ä‘á»™c Ä‘Ã¡o báº±ng AI.

## âœ¨ TÃ­nh nÄƒng chÃ­nh

### ðŸ¤– AI CÃ¢u Ä‘á»‘i & Thiá»‡p Táº¿t
- Táº¡o cÃ¢u Ä‘á»‘i Táº¿t Ä‘á»™c Ä‘Ã¡o vá»›i AI (Google Gemini)
- Viáº¿t lá»i chÃºc Táº¿t cÃ¡ nhÃ¢n hÃ³a
- Táº¡o thiá»‡p Táº¿t vá»›i ná»™i dung Ã½ nghÄ©a
- ÄÄƒng vÃ  chia sáº» vá»›i gia Ä‘Ã¬nh

### ðŸ“… Lá»‹ch há»p máº·t gia Ä‘Ã¬nh
- Táº¡o vÃ  quáº£n lÃ½ sá»± kiá»‡n Táº¿t (cÃºng táº¥t niÃªn, mÃ¹ng 1, v.v.)
- PhÃ¢n cÃ´ng cÃ´ng viá»‡c cho thÃ nh viÃªn
- Nháº­n thÃ´ng bÃ¡o nháº¯c nhá»Ÿ tá»± Ä‘á»™ng
- Theo dÃµi tiáº¿n Ä‘á»™ hoÃ n thÃ nh cÃ´ng viá»‡c

### ðŸ“¸ Album áº£nh chung
- Upload vÃ  chia sáº» áº£nh Táº¿t
- Xem áº£nh theo timeline (nhÃ³m theo ngÃ y)
- Táº¡o video recap tá»± Ä‘á»™ng tá»« áº£nh
- LÆ°u trá»¯ khoáº£nh kháº¯c Ä‘áº¹p cá»§a gia Ä‘Ã¬nh

### ðŸ’¬ TÆ°Æ¡ng tÃ¡c realtime
- Tháº£ tim, haha cho bÃ i Ä‘Äƒng
- Cáº­p nháº­t tá»©c thá»i khi cÃ³ ná»™i dung má»›i
- ThÃ´ng bÃ¡o realtime cho sá»± kiá»‡n vÃ  cÃ´ng viá»‡c

## 🎮 Bau Cua Online (New)

Feature game mini theo phong cach Tet da duoc them vao du an.

### Route
- `GET /games/bau-cua` (UI cho nguoi dung)

### Core APIs
- `GET /api/games/bau-cua?familyId=...`
  - Lay trang thai van hien tai, vi diem, tong cuoc tung cua, cuoc cua ban, bang xep hang
- `POST /api/games/bau-cua/start`
  - Mo van moi (status: `betting`)
- `POST /api/games/bau-cua/bet`
  - Dat cuoc theo cua (`bau|cua|tom|ca|ga|nai`) voi so diem
- `POST /api/games/bau-cua/roll`
  - Quay 3 xuc xac, tinh ket qua thang/thua va cap nhat vi diem

### Settlement rules (diem ao)
- Neu 1 cua khong xuat hien tren 3 mat xuc xac: mat toan bo diem dat cua do
- Neu 1 cua xuat hien `n` lan: lai `n x amount` cho phan dat cua do
- Vi du:
  - Dat 50 vao `bau`, ket qua ra 2 `bau` -> +100
  - Dat 50 vao `bau`, ket qua khong co `bau` -> -50

### Mongo models added
- `lib/models/BauCuaRound.ts`
- `lib/models/BauCuaBet.ts`
- `lib/models/BauCuaWallet.ts`

### UI / Navigation
- Them menu `Bau cua` tren Sidebar va Mobile menu
- Layout ban choi 2x3 theo chieu bau cua truyen thong:
  - Hang 1: `nai - bau - ga`
  - Hang 2: `ca - cua - tom`

### Quick play
1. Vao `Games > Bau cua`
2. Bam `Mo van moi`
3. Nhap diem va bam `Dat` tren cac cua
4. Bam `Quay`
5. Xem ket qua va so du vi

## ðŸ›  Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, Shadcn/ui
- **Database**: MongoDB Atlas
- **Authentication**: NextAuth.js (Google OAuth)
- **Storage**: Cloudinary (áº£nh, video)
- **AI**: Google Gemini API
- **Realtime**: Polling-based updates
- **Deployment**: Vercel

## ðŸš€ Quick Start

### Prerequisites

- Node.js 18+ vÃ  npm
- TÃ i khoáº£n MongoDB Atlas (free tier)
- TÃ i khoáº£n Google Cloud (cho OAuth)
- TÃ i khoáº£n Cloudinary (free tier)
- Gemini API key (free tier)

### 1. Clone repository

```bash
git clone <repository-url>
cd tet-connect
```

### 2. CÃ i Ä‘áº·t dependencies

```bash
npm install
```

### 3. Cáº¥u hÃ¬nh Environment Variables

Táº¡o file `.env.local` tá»« template:

```bash
cp .env.local.example .env.local
```

Cáº­p nháº­t cÃ¡c giÃ¡ trá»‹ trong `.env.local`:

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tet-connect

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Cron (optional for development)
CRON_SECRET=your-cron-secret
```

**HÆ°á»›ng dáº«n láº¥y credentials:**

- **MongoDB**: Xem [MongoDB Production Setup](docs/MONGODB_PRODUCTION_SETUP.md)
- **Google OAuth**: Xem [Quick Setup Guide](docs/QUICK_SETUP_GUIDE.md)
- **Cloudinary**: ÄÄƒng kÃ½ táº¡i [cloudinary.com](https://cloudinary.com)
- **Gemini API**: Láº¥y key táº¡i [Google AI Studio](https://makersuite.google.com/app/apikey)

### 4. Cháº¡y Development Server

```bash
npm run dev
```

Má»Ÿ [http://localhost:3000](http://localhost:3000) trong browser.

### 5. Táº¡o tÃ i khoáº£n vÃ  báº¯t Ä‘áº§u sá»­ dá»¥ng

1. Click "ÄÄƒng nháº­p báº±ng Google"
2. Táº¡o "NhÃ " má»›i cho gia Ä‘Ã¬nh
3. Chia sáº» link má»i vá»›i thÃ nh viÃªn
4. Báº¯t Ä‘áº§u táº¡o ná»™i dung Táº¿t! ðŸŽŠ

## ðŸ§ª Testing

Táº¿t Connect sá»­ dá»¥ng dual testing approach vá»›i unit tests vÃ  property-based tests.

### Cháº¡y táº¥t cáº£ tests

```bash
npm test
```

### Cháº¡y property-based tests

```bash
npm test -- tests/*.property.test.ts
```

### Cháº¡y unit tests

```bash
npm test -- --grep -v "property"
```

### Test coverage

```bash
npm run test:coverage
```

### Test structure

- **Unit tests**: Kiá»ƒm tra cÃ¡c trÆ°á»ng há»£p cá»¥ thá»ƒ vÃ  edge cases
- **Property tests**: Kiá»ƒm tra tÃ­nh Ä‘Ãºng Ä‘áº¯n tá»•ng quÃ¡t vá»›i 100+ iterations
- **Integration tests**: Kiá»ƒm tra luá»“ng hoÃ n chá»‰nh end-to-end

Xem thÃªm: [Property Tests Summary](docs/PROPERTY_TESTS_SUMMARY.md)

## ðŸ“ Cáº¥u trÃºc Project

```
tet-connect/
â”œâ”€â”€ app/                    # Next.js App Router
â”‚   â”œâ”€â”€ api/               # API routes
â”‚   â”‚   â”œâ”€â”€ ai/           # AI generation endpoints
â”‚   â”‚   â”œâ”€â”€ auth/         # Authentication
â”‚   â”‚   â”œâ”€â”€ cron/         # Background jobs
â”‚   â”‚   â”œâ”€â”€ events/       # Events & tasks
â”‚   â”‚   â”œâ”€â”€ families/     # Family management
â”‚   â”‚   â”œâ”€â”€ notifications/# Notifications
â”‚   â”‚   â”œâ”€â”€ photos/       # Photo upload
â”‚   â”‚   â”œâ”€â”€ posts/        # Posts & reactions
â”‚   â”‚   â””â”€â”€ videos/       # Video creation
â”‚   â”œâ”€â”€ dashboard/         # Dashboard page
â”‚   â”œâ”€â”€ events/            # Events pages
â”‚   â”œâ”€â”€ join/              # Join family page
â”‚   â”œâ”€â”€ login/             # Login page
â”‚   â”œâ”€â”€ photos/            # Photos page
â”‚   â”œâ”€â”€ posts/             # Posts page
â”‚   â””â”€â”€ register/          # Register page
â”œâ”€â”€ components/            # React components
â”‚   â”œâ”€â”€ ai/               # AI content generation
â”‚   â”œâ”€â”€ auth/             # Authentication components
â”‚   â”œâ”€â”€ errors/           # Error handling
â”‚   â”œâ”€â”€ events/           # Events & tasks
â”‚   â”œâ”€â”€ family/           # Family management
â”‚   â”œâ”€â”€ layout/           # Layout components
â”‚   â”œâ”€â”€ notifications/    # Notifications
â”‚   â”œâ”€â”€ photos/           # Photo album
â”‚   â”œâ”€â”€ posts/            # Posts & reactions
â”‚   â”œâ”€â”€ ui/               # UI components (Shadcn)
â”‚   â””â”€â”€ videos/           # Video recap
â”œâ”€â”€ lib/                   # Utility functions
â”‚   â”œâ”€â”€ cache/            # Caching strategies
â”‚   â”œâ”€â”€ errors/           # Error handling
â”‚   â”œâ”€â”€ hooks/            # Custom React hooks
â”‚   â”œâ”€â”€ models/           # MongoDB models
â”‚   â”œâ”€â”€ auth.ts           # NextAuth configuration
â”‚   â”œâ”€â”€ cloudinary.ts     # Cloudinary client
â”‚   â”œâ”€â”€ mongodb.ts        # MongoDB connection
â”‚   â””â”€â”€ notifications.ts  # Notification helpers
â”œâ”€â”€ docs/                  # Documentation
â”œâ”€â”€ tests/                 # Test files
â”‚   â”œâ”€â”€ *.test.ts(x)      # Unit tests
â”‚   â””â”€â”€ *.property.test.ts# Property-based tests
â”œâ”€â”€ types/                 # TypeScript types
â””â”€â”€ public/                # Static assets
```

## ðŸš¢ Deployment

### Quick Deployment to Vercel

1. Push code lÃªn GitHub
2. Import project vÃ o [Vercel](https://vercel.com)
3. Configure environment variables (xem `.env.production.example`)
4. Deploy!

### Detailed Guides

- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Complete deployment process
- **[Vercel Setup](docs/VERCEL_SETUP.md)** - Step-by-step Vercel configuration
- **[MongoDB Production Setup](docs/MONGODB_PRODUCTION_SETUP.md)** - MongoDB Atlas setup
- **[Deployment Checklist](docs/DEPLOYMENT_CHECKLIST.md)** - Pre/post-deployment checklist

### Required Environment Variables

```env
# Database
MONGODB_URI=mongodb+srv://...

# Authentication
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<generate-secure-secret>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Storage
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# AI
GEMINI_API_KEY=...

# Cron Jobs
CRON_SECRET=<generate-secure-token>
```

**Generate secrets:**
```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# CRON_SECRET
openssl rand -hex 32
```

## ðŸ“š Documentation

### Setup & Configuration
- **[Quick Setup Guide](docs/QUICK_SETUP_GUIDE.md)** - HÆ°á»›ng dáº«n setup nhanh
- **[Setup Guide](docs/SETUP.md)** - HÆ°á»›ng dáº«n setup chi tiáº¿t
- **[Quick Start MongoDB](docs/QUICK_START_MONGODB.md)** - MongoDB setup
- **[User Guide](docs/USER_GUIDE.md)** - HÆ°á»›ng dáº«n sá»­ dá»¥ng cho ngÆ°á»i dÃ¹ng cuá»‘i â­
- **[API Documentation](docs/API_DOCUMENTATION.md)** - REST API reference â­

### Architecture & Design
- **[Architecture](docs/ARCHITECTURE.md)** - Kiáº¿n trÃºc há»‡ thá»‘ng
- **[Caching Strategy](docs/CACHING.md)** - Chiáº¿n lÆ°á»£c caching
- **[Error Handling](components/errors/README.md)** - Xá»­ lÃ½ lá»—i

### Features
- **[Toast Notifications](docs/TOAST_NOTIFICATIONS.md)** - Há»‡ thá»‘ng thÃ´ng bÃ¡o
- **[Lazy Loading](docs/LAZY_LOADING.md)** - Tá»‘i Æ°u táº£i trang
- **[Loading States](docs/LOADING_STATES.md)** - Tráº¡ng thÃ¡i loading
- **[Mobile Optimizations](docs/MOBILE_OPTIMIZATIONS.md)** - Tá»‘i Æ°u mobile

### Testing
- **[Property Tests Summary](docs/PROPERTY_TESTS_SUMMARY.md)** - Property-based testing
- **[Integration Testing](docs/TASK_19.3_INTEGRATION_TESTING.md)** - Integration tests
- **[Manual Testing Guide](docs/MANUAL_TESTING_QUICK_GUIDE.md)** - Manual testing
- **[Browser Compatibility](docs/BROWSER_COMPATIBILITY_MATRIX.md)** - Browser support

### Deployment
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Complete deployment guide
- **[Vercel Setup](docs/VERCEL_SETUP.md)** - Vercel configuration
- **[Deployment Checklist](docs/DEPLOYMENT_CHECKLIST.md)** - Deployment checklist

### Component Documentation
- **[Photos Module](components/photos/README.md)** - Photo album components
- **[Videos Module](components/videos/README.md)** - Video recap components
- **[Notifications](components/notifications/README.md)** - Notification components
- **[Family Management](components/family/README.md)** - Family components
- **[Layout Components](components/layout/README.md)** - Layout components

## ðŸ”§ Troubleshooting

### Lá»—i "MongooseError: Operation buffering timed out"

**NguyÃªn nhÃ¢n**: KhÃ´ng káº¿t ná»‘i Ä‘Æ°á»£c MongoDB

**Giáº£i phÃ¡p**:
1. Kiá»ƒm tra `MONGODB_URI` trong `.env.local`
2. Äáº£m báº£o IP address Ä‘Æ°á»£c whitelist trong MongoDB Atlas
3. Kiá»ƒm tra network connection

### Lá»—i "Invalid Google OAuth credentials"

**NguyÃªn nhÃ¢n**: Google OAuth chÆ°a Ä‘Æ°á»£c cáº¥u hÃ¬nh Ä‘Ãºng

**Giáº£i phÃ¡p**:
1. Kiá»ƒm tra `GOOGLE_CLIENT_ID` vÃ  `GOOGLE_CLIENT_SECRET`
2. Äáº£m báº£o redirect URI Ä‘Æ°á»£c thÃªm trong Google Console: `http://localhost:3000/api/auth/callback/google`
3. Restart dev server sau khi thay Ä‘á»•i env variables

### Lá»—i "Cloudinary upload failed"

**NguyÃªn nhÃ¢n**: Cloudinary credentials khÃ´ng Ä‘Ãºng hoáº·c quota Ä‘Ã£ háº¿t

**Giáº£i phÃ¡p**:
1. Kiá»ƒm tra credentials trong `.env.local`
2. Kiá»ƒm tra quota trong Cloudinary dashboard
3. Äáº£m báº£o file size < 10MB

### Lá»—i "Gemini API rate limit exceeded"

**NguyÃªn nhÃ¢n**: ÄÃ£ vÆ°á»£t quÃ¡ giá»›i háº¡n free tier

**Giáº£i phÃ¡p**:
1. Äá»£i 1 phÃºt vÃ  thá»­ láº¡i
2. NÃ¢ng cáº¥p lÃªn paid tier náº¿u cáº§n
3. Implement caching cho AI responses

### Tests fail

**Giáº£i phÃ¡p**:
1. Cháº¡y `npm install` Ä‘á»ƒ Ä‘áº£m báº£o dependencies Ä‘áº§y Ä‘á»§
2. Kiá»ƒm tra MongoDB connection cho integration tests
3. Xem logs chi tiáº¿t: `npm test -- --reporter=verbose`

### Development server khÃ´ng start

**Giáº£i phÃ¡p**:
1. XÃ³a `.next` folder: `rm -rf .next`
2. XÃ³a `node_modules` vÃ  reinstall: `rm -rf node_modules && npm install`
3. Kiá»ƒm tra port 3000 cÃ³ bá»‹ chiáº¿m: `lsof -i :3000`

Xem thÃªm: [Manual Testing Quick Guide](docs/MANUAL_TESTING_QUICK_GUIDE.md)

## ðŸ¤ Contributing

ChÃºng tÃ´i hoan nghÃªnh má»i Ä‘Ã³ng gÃ³p! Äá»ƒ contribute:

1. Fork repository
2. Táº¡o feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Má»Ÿ Pull Request

### Development Guidelines

- Viáº¿t tests cho táº¥t cáº£ features má»›i
- Follow existing code style (Prettier + ESLint)
- Update documentation khi cáº§n
- Äáº£m báº£o táº¥t cáº£ tests pass trÆ°á»›c khi submit PR

### Code Style

```bash
# Format code
npm run format

# Lint code
npm run lint

# Type check
npm run type-check
```

## ðŸ“„ License

MIT License - xem file [LICENSE](LICENSE) Ä‘á»ƒ biáº¿t thÃªm chi tiáº¿t.

## ðŸ’¬ Support

Náº¿u cÃ³ váº¥n Ä‘á» hoáº·c cÃ¢u há»i:

- ðŸ“– Xem [Documentation](docs/)
- ðŸ› Táº¡o [Issue](https://github.com/your-repo/issues) trÃªn GitHub
- ðŸ’¡ Äá»c [Troubleshooting](#-troubleshooting)

## ðŸ™ Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [MongoDB](https://www.mongodb.com/) - Database
- [Cloudinary](https://cloudinary.com/) - Media storage
- [Google Gemini](https://ai.google.dev/) - AI generation
- [Shadcn/ui](https://ui.shadcn.com/) - UI components
- [Vercel](https://vercel.com/) - Hosting platform

---

**ChÃºc má»«ng nÄƒm má»›i! ðŸŽŠðŸ§§**

Made with â¤ï¸ for Vietnamese families
