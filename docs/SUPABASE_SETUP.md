# Supabase Setup — Media Office

**گرنگ:** پڕۆژەیەکی **نوێی** Supabase دروست بکە.  
MCPی ئێستا بەستراوە بە پڕۆژەی CMSی تر — migrationەکانی Media Office مەخەرە سەر ئەو داتابەیسە.

## هەنگاوەکان

1. لە [supabase.com](https://supabase.com) پڕۆژەیەکی نوێ دروست بکە: `media-office`
2. Authentication → Providers → Email چالاک بێت  
   - بۆ گەشەپێدان: **Confirm email** ناکارا بکە (یان ئیمەیڵ پشتڕاست بکەرەوە)
3. SQL Editor یان CLI:
   ```bash
   supabase link --project-ref YOUR_REF
   supabase db push
   ```
   یان ناوەڕۆکی ئەم فایلانە جێبەجێ بکە:
   - `supabase/migrations/00001_init_schema.sql`
   - `supabase/migrations/00002_storage_policies.sql`
4. Project Settings → API → URL و anon key و service_role بکۆپی بکە
5. فایلەکانی env:

```bash
# apps/admin/.env.local
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# apps/mobile/.env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

6. دوو بەڕێوەبەری سەربەخۆ تاقی بکەرەوە لە `/register` — هەر یەکێک کۆمپانیای خۆی دەبینێت.
