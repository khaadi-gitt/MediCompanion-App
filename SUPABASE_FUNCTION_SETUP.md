## Simple Setup (No Local Backend)

This setup uses Supabase Edge Function.
Your OpenAI key stays in `app_config` table (online), and admin ON/OFF works from DB.

### 1) Keep `app_config` table
You already created it with:
- `openai_enabled`
- `openai_model`
- `openai_api_key`

### 2) Deploy function
From project root:

```bash
supabase login
supabase link --project-ref znaljohzjwszilmxpwei
supabase functions deploy medical-chat --no-verify-jwt
```

### 3) Set function secrets
```bash
supabase secrets set MC_SUPABASE_URL=https://znaljohzjwszilmxpwei.supabase.co
supabase secrets set MC_SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

### 4) App env
Root `.env` should contain:

```env
EXPO_PUBLIC_SUPABASE_URL=https://znaljohzjwszilmxpwei.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_KEY
```

No `EXPO_PUBLIC_API_BASE_URL` needed for chat now.

### 5) Run app
```bash
npx expo start -c --lan
```

### Admin ON/OFF
In Supabase table `public.app_config`:
- `openai_enabled = true` -> chat ON
- `openai_enabled = false` -> chat OFF
