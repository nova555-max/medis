# Media Office

سیستەمی زیرەڕێخستنی ئامادەبوونی کارمەندان — کوردی (سۆرانی)

## Stack

- **Admin:** Next.js (`apps/admin`)
- **Employee app:** Expo (`apps/mobile`)
- **Backend:** Supabase (Auth, Postgres RLS, Storage, Edge Functions)

## Setup

```bash
cp .env.example .env.local
# fill Supabase keys, also copy into apps/admin and apps/mobile as needed

npm install
npm run dev:admin
npm run dev:mobile
```

## Docs

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md).
