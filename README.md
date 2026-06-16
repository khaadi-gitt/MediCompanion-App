# MediCompanionApp

MediCompanion is a mobile-first medical chatbot app with:

- Local model support via Ollama
- Topic restriction to 3 domains: Diabetes, Migraine, Gastro (stomach)
- Session-based chat history (multiple chat sessions)
- MySQL-based signup/login via backend API
- Email OTP verification for signup and password reset

## Tech Stack

- Expo + React Native
- Node.js backend (`backend/server.js`)
- MySQL (user auth)
- MySQL (runtime AI config + chat history)
- Ollama (local LLM runtime)

## 1) Prerequisites

Install on a new PC:

- Node.js 20+ (recommended)
- npm
- Git
- Ollama (Windows): https://ollama.com/download/windows
- Expo Go app on your Android/iOS phone

## 2) Clone and Install

```bash
git clone https://github.com/Sheikh4142/MediCompanionApp.git
cd MediCompanionApp
npm install
```

## 3) Environment Setup

### Root `.env`

Create `./.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_PC_LAN_IP:5050
```

Notes:

- `YOUR_PC_LAN_IP` should be your computer IP on the same Wi-Fi as phone.
- Example: `http://192.168.10.17:5050`

### Backend `.env`

Create `./backend/.env`:

```env
PORT=5050
ADMIN_SECRET=YOUR_STRONG_ADMIN_SECRET
MYSQL_HOST=YOUR_MYSQL_HOST
MYSQL_PORT=3306
MYSQL_USER=YOUR_MYSQL_USER
MYSQL_PASSWORD=YOUR_MYSQL_PASSWORD
MYSQL_DATABASE=YOUR_MYSQL_DATABASE
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=YOUR_BUSINESS_EMAIL
SMTP_PASS=YOUR_APP_PASSWORD
SMTP_FROM=YOUR_BUSINESS_EMAIL
```

## 4) SQL Setup (MySQL)

Run this SQL in your MySQL database:

1. `backend/sql/mysql_auth.sql`
2. `backend/sql/mysql_runtime.sql`

This creates:

- `users` table
- `otp_codes` table for signup/reset OTP verification
- `app_config` table for runtime model/provider settings
- `chat_messages` table
- `training_examples` table

## 5) Start Ollama and Download Model

In terminal:

```bash
ollama --version
ollama pull phi3:mini
```

Keep Ollama service running (usually auto-runs on Windows after install).

Quick test:

```bash
ollama run phi3:mini
```

## 6) Start Backend API

```bash
npm run api:start
```

Health check:

```bash
curl http://localhost:5050/health
```

Expected:

```json
{"ok":true,"service":"medicompanion-api"}
```

## 7) Configure Chat Provider (Admin)

Set local provider to Ollama:

```bash
curl -X POST http://localhost:5050/admin/config ^
  -H "Content-Type: application/json" ^
  -H "x-admin-secret: YOUR_ADMIN_SECRET" ^
  -d "{\"ai_provider\":\"local\",\"openai_enabled\":true,\"openai_model\":\"phi3:mini\",\"local_api_url\":\"http://127.0.0.1:11434\"}"
```

Read config:

```bash
curl -H "x-admin-secret: YOUR_ADMIN_SECRET" http://localhost:5050/admin/config
```

## 8) Start Mobile App (Expo)

```bash
npx expo start --lan -c
```

Then:

- Open Expo Go on phone
- Scan QR or paste `exp://...` URL
- Ensure phone and PC are on same Wi-Fi

## 9) Chat Behavior Implemented

- Supports only:
  - Migraine
  - Gastro
- Outside these topics, bot returns allowed-topic message.
- Each topic can trigger optional screening flow (`Yes/No` questions).
- Session-based history:
  - Chat button -> creates a new chat session
  - History tap -> opens that specific saved session

## 10) Dataset Preparation Scripts

Already included:

- `scripts/prepare_diabetes_data.py`
- `scripts/prepare_migraine_data.py`
- `scripts/prepare_gastro_data.py`

Run:

```bash
python scripts/prepare_diabetes_data.py
python scripts/prepare_migraine_data.py
python scripts/prepare_gastro_data.py
```

Output files are generated in:

- `data/processed/*.jsonl`

## 11) Troubleshooting

### `ngrok tunnel took too long to connect`

Use LAN mode instead of tunnel:

```bash
npx expo start --lan -c
```

### App opens but chat stays on `Typing...`

Check:

- Ollama model exists: `ollama list`
- Backend running on port 5050
- `.env` has correct `EXPO_PUBLIC_API_BASE_URL`

### Backend says `app_config row not found`

Run `backend/sql/mysql_runtime.sql` in MySQL database.

### History not visible

Run `backend/sql/mysql_runtime.sql`, then send new messages.

## 12) Security Notes

- Keep backend secrets only in `backend/.env`.
- If any secret was shared accidentally, rotate it immediately.
