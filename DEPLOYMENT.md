# Deployment Guide - PrivatePay

## Prerequisites

- GitHub account
- Vercel account (free)
- PostgreSQL database (Vercel Postgres or Neon.tech)

## Deployment Steps

### 1. Create PostgreSQL Database

**Option A: Vercel Postgres (Recommended)**
- Go to https://vercel.com/dashboard
- Click "Storage" → "Create Database" → "Postgres"
- Copy the `POSTGRES_URL_NON_POOLING` connection string

**Option B: Neon.tech**
- Go to https://neon.tech
- Create project and copy connection string

### 2. Update Environment Variables

Before deploying, update your `.env.local`:

```env
# Database - Replace with your PostgreSQL connection string
DATABASE_URL="postgresql://user:password@host:5432/database"

# ZeroID B2B API Configuration
ZEROID_API_KEY=b2b_5_fze8NFsQ339PG1x1IFt_4afcpTYGUdQeYEi1XcmIs
ZEROID_BASE_URL=https://app.zeroid.cc/api/b2b

# App Configuration
NEXT_PUBLIC_APP_NAME=PrivatePay

# JWT Secret (CHANGE THIS!)
JWT_SECRET=generate-a-random-secure-key-here

# Admin credentials (CHANGE THESE!)
ADMIN_EMAIL=your-admin@email.com
ADMIN_PASSWORD=change-to-secure-password
```

### 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/privatepay.git
git push -u origin main
```

### 4. Deploy to Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. In "Environment Variables", add all from `.env.local`:
   - `DATABASE_URL` (PostgreSQL connection string)
   - `ZEROID_API_KEY`
   - `ZEROID_BASE_URL`
   - `NEXT_PUBLIC_APP_NAME`
   - `JWT_SECRET`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`

4. Click "Deploy"

### 5. Run Database Migration

After deployment, run migration in Vercel:

```bash
npm run build
npx prisma migrate deploy
```

Or run Prisma Studio to verify:

```bash
npx prisma studio
```

## Environment Variables Needed in Vercel

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | PostgreSQL connection string | Use `POSTGRES_URL_NON_POOLING` for Vercel Postgres |
| `ZEROID_API_KEY` | Your B2B API key | From ZeroID dashboard |
| `ZEROID_BASE_URL` | https://app.zeroid.cc/api/b2b | Don't change |
| `NEXT_PUBLIC_APP_NAME` | PrivatePay | Visible in frontend |
| `JWT_SECRET` | Generate random string | Use `openssl rand -base64 32` |
| `ADMIN_EMAIL` | Your email | For admin login |
| `ADMIN_PASSWORD` | Secure password | Change after first login |

## Domain Setup (Optional)

1. In Vercel dashboard → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration steps

## Post-Deployment Checklist

- [ ] Database is connected and migrated
- [ ] Environment variables set in Vercel
- [ ] Can access app at https://your-app.vercel.app
- [ ] Can login with admin credentials
- [ ] Can create cards (after ZeroID funding)
- [ ] Solana payments work correctly
- [ ] Check server logs for errors

## Troubleshooting

**Database Connection Error**
- Verify `DATABASE_URL` format: `postgresql://...`
- Check Vercel Postgres settings if using that
- Run `npx prisma migrate deploy` after fix

**Build Fails**
- Clear `.next` folder: `rm -rf .next`
- Run `npm install` again
- Check Node.js version compatibility

**Solana Transactions Not Working**
- Verify `NEXT_PUBLIC_APP_URL` environment variable
- Check Helius API key in code
- Verify wallet address in `lib/solana.ts`

## Support

For issues:
1. Check Vercel deployment logs
2. Run `npx prisma studio` to verify data
3. Check browser console for errors
