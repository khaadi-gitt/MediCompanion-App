## OpenAI + Admin Control Setup (DB Driven)

Aapki requirement ke mutabiq API key code/env se direct use nahi hogi. Key aur toggle Supabase DB me rahenge.

### 1) Supabase table banayein
Supabase SQL Editor me file `backend/sql/app_config.sql` ka SQL run karein.

### 2) Backend env set karein
`backend/.env.example` ko copy karke `backend/.env` banayein:

```env
PORT=5050
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=PASTE_SUPABASE_SERVICE_ROLE_KEY_HERE
ADMIN_SECRET=SET_ANY_STRONG_SECRET_FOR_ADMIN_ENDPOINTS
```

Important:
- `SUPABASE_SERVICE_ROLE_KEY` sirf backend me rakhein.
- Is key ko mobile app me kabhi expose na karein.

### 3) Admin se OpenAI key save + ON/OFF

#### 3.1 Current config dekhna
```bash
curl -H "x-admin-secret: YOUR_ADMIN_SECRET" http://localhost:5050/admin/config
```

#### 3.2 OpenAI key save karna + ON karna
```bash
curl -X POST http://localhost:5050/admin/config \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -d '{"openai_api_key":"sk-...","openai_enabled":true,"openai_model":"gpt-4o-mini"}'
```

#### 3.3 Chat OFF karna (billing stop)
```bash
curl -X POST http://localhost:5050/admin/config \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -d '{"openai_enabled":false}'
```

### 4) App behavior
- `openai_enabled=false` -> chat blocked message aayega.
- `openai_enabled=true` + valid key -> chat normal chalegi.
- Is se aap remotely ON/OFF control kar sakte hain.

### 5) Fine-tuned model ko chat ke saath use karna
Jab fine-tuning complete ho jaye aur aapko model id mile (example: `ft:gpt-4o-mini-2024-07-18:org:medicompanion:abc123`), to us model ko config me save karein:

```bash
curl -X POST http://localhost:5050/admin/config \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -d '{"openai_model":"ft:gpt-4o-mini-2024-07-18:org:medicompanion:abc123","openai_enabled":true}'
```

Is ke baad mobile chat automatically is new model se response lena start kar dega.

### 6) Chat history save karna (Supabase)
SQL Editor me `backend/sql/chat_history.sql` run karein, phir edge function redeploy karein:

```bash
supabase functions deploy medical-chat --no-verify-jwt
```

History screen ab `chat_messages` table se user-wise data read karegi.

### 7) OpenAI ke bajaye apna local model (Ollama) use karna
1. PC par Ollama install/run karein aur model pull karein:

```bash
ollama pull llama3.1:8b
ollama serve
```

2. Supabase SQL Editor me updated `backend/sql/app_config.sql` run karein (new columns add hongi).
3. Admin config me provider local set karein:

```bash
curl -X POST http://localhost:5050/admin/config \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -d '{"ai_provider":"local","openai_enabled":true,"openai_model":"llama3.1:8b","local_api_url":"http://127.0.0.1:11434"}'
```

4. Mobile app `.env` me backend base URL set karein:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_PC_LAN_IP:5050
```

Ab chat request backend `/api/chat` ko jayegi aur OpenAI ki bajaye local model use hoga.
