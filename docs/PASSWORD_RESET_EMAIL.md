# Password Reset via 6-digit OTP (Resend + Supabase)

The admin app uses a custom OTP flow (not Supabase Auth reset links).

## Required env (`apps/admin/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

NEXT_PUBLIC_APP_URL=http://localhost:3000

# Resend — https://resend.com/api-keys
RESEND_API_KEY=re_xxxxxxxx
# Verified sender (use onboarding@resend.dev for testing)
RESEND_FROM_EMAIL=Media Office <onboarding@resend.dev>

# Optional extra pepper for OTP hashing (defaults to service role key)
OTP_PEPPER=long-random-secret
```

## Flow

1. `/forgot-password` — enter email  
2. Server generates 6-digit OTP, stores **SHA-256 hash** in `password_reset_otps`, emails code via Resend  
3. `/verify-otp` — enter code (10 min countdown, max 5 attempts, resend)  
4. On success → httpOnly cookie `mo_pwd_reset` → `/reset-password`  
5. New password → `auth.admin.updateUserById` → delete OTP → `/reset-password/success` → login  

## Security

| Rule | Implementation |
|------|----------------|
| OTP hashed at rest | `hashOtp(code, email)` with pepper |
| 10 minute expiry | `expires_at` |
| One-time use | code invalidated after verify; row deleted after password set |
| Max 5 attempts | `attempts` / `max_attempts` |
| Rate limit send | `request_password_reset_allowed` RPC |
| No email enumeration | Always redirect to verify; email only if staff account exists |
| Audit log | `activity_logs` actions `auth.password_otp_*` |

## Resend setup

1. Create API key at [resend.com](https://resend.com)  
2. For production, verify your domain and set `RESEND_FROM_EMAIL`  
3. Test with `onboarding@resend.dev` (can only send to your Resend account email)

## DB

Migration: `supabase/migrations/00020_password_reset_otp.sql`  
Table: `public.password_reset_otps` (service-role only; RLS on, no policies)
