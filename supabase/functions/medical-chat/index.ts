// Supabase Edge Function: medical-chat
// Deploy with: supabase functions deploy medical-chat --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MEDICAL_KEYWORDS = [
  'health',
  'medical',
  'doctor',
  'medicine',
  'symptom',
  'disease',
  'pain',
  'fever',
  'headache',
  'cough',
  'cold',
  'vomit',
  'nausea',
  'diabetes',
  'blood pressure',
  'bp',
  'heart',
  'liver',
  'kidney',
  'infection',
  'allergy',
  'asthma',
  'rash',
  'skin',
  'stomach',
  'pregnancy',
  'tablet',
  'drug',
  'treatment',
  // Roman Urdu / Urdu-style common medical words
  'dard',
  'sir dard',
  'bukhar',
  'zukam',
  'khansi',
  'gala dard',
  'tabiyat',
  'bechaini',
  'sehat',
  'bimari',
  'bimaar',
  'marz',
  'dawa',
  'ilaj',
  'pressure',
  'sugar',
  'ultee',
  'matli',
  'pet dard',
  'jild',
  'kharish',
  'saans',
  'asthma',
  'allergy',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const message = String(body?.message || '').trim();
    const history = Array.isArray(body?.history) ? body.history : [];
    const sessionId = sanitizeUuid(body?.session_id);
    const userId = sanitizeUuid(body?.user_id);

    if (!message) {
      return json({ error: 'Message is required.' }, 400);
    }

    // First pass: keyword-based fast check.
    // If no keyword match, do a tiny AI intent-check to avoid false blocking.
    let isMedical = looksMedical(message);
    if (!isMedical) {
      isMedical = await isMedicalIntent(message);
    }

    if (!isMedical) {
      return json({
        blocked: true,
        reply: 'I can only assist with medical and health questions. Please ask a medical question.',
      });
    }

    const supabaseUrl = Deno.env.get('MC_SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('MC_SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Missing MC_SUPABASE_URL or MC_SUPABASE_SERVICE_ROLE_KEY in function secrets.' }, 500);
    }

    const sb = createClient(supabaseUrl, serviceRoleKey);
    const { data: config, error: cfgError } = await sb
      .from('app_config')
      .select('openai_enabled, openai_model, openai_api_key')
      .eq('id', 1)
      .single();

    if (cfgError || !config) {
      return json({ error: 'app_config row not found or inaccessible.' }, 500);
    }

    if (!config.openai_enabled) {
      return json({ blocked: true, reply: 'Chat is temporarily disabled by admin.' });
    }

    const openaiKey = String(config.openai_api_key || '').trim();
    if (!openaiKey) {
      return json({ error: 'OpenAI API key is empty in app_config.' }, 500);
    }

    const model = String(config.openai_model || 'gpt-4o-mini').trim() || 'gpt-4o-mini';

    const messages = [
      {
        role: 'system',
        content:
          'You are MediCompanion, a medical education assistant. Only answer medical/health topics. Reply in English only. Keep answers simple, clear, and short. Never provide diagnosis certainty or prescription dosage. If urgent red flags appear, advise immediate doctor/ER visit. Always end with this exact disclaimer in English: "This information is for educational purposes only and is not a substitute for professional medical advice."',
      },
      ...history
        .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
        .slice(-6)
        .map((m: any) => ({ role: m.role, content: m.text })),
      { role: 'user', content: message },
    ];

    const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages,
      }),
    });

    if (!openaiResp.ok) {
      const detail = await openaiResp.text();
      return json({ error: 'OpenAI request failed.', detail }, 502);
    }

    const data = await openaiResp.json();
    const rawReply = data?.choices?.[0]?.message?.content?.trim();
    if (!rawReply) {
      return json({ error: 'No response text from model.' }, 502);
    }

    const reply = forceEnglishOutput(rawReply);
    if (sessionId) {
      await saveChatMessages(sb, {
        sessionId,
        userId,
        userMessage: message,
        assistantReply: reply,
      });
    }

    return json({ blocked: false, reply });
  } catch (error) {
    return json({ error: error?.message || 'Unexpected error.' }, 500);
  }
});

function looksMedical(text: string) {
  const value = text.toLowerCase();
  return MEDICAL_KEYWORDS.some((k) => value.includes(k));
}

async function isMedicalIntent(text: string): Promise<boolean> {
  // This lightweight intent check helps when users ask in mixed language
  // and no direct keyword is present.
  const openaiApiKey = String((await getConfigForIntent()).openai_api_key || '').trim();
  const model = String((await getConfigForIntent()).openai_model || 'gpt-4o-mini').trim();

  if (!openaiApiKey) return false;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 3,
      messages: [
        {
          role: 'system',
          content:
            'Classify user intent. Reply only YES if query is about medical/health/symptoms/disease/medicine. Otherwise reply NO.',
        },
        { role: 'user', content: text },
      ],
    }),
  });

  if (!resp.ok) return false;
  const data = await resp.json();
  const out = String(data?.choices?.[0]?.message?.content || '')
    .trim()
    .toUpperCase();
  return out.startsWith('YES');
}

let _configCache: { at: number; value: any } | null = null;
async function getConfigForIntent() {
  const now = Date.now();
  if (_configCache && now - _configCache.at < 20_000) {
    return _configCache.value;
  }

  const supabaseUrl = Deno.env.get('MC_SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('MC_SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !serviceRoleKey) return { openai_api_key: '', openai_model: 'gpt-4o-mini' };

  const sb = createClient(supabaseUrl, serviceRoleKey);
  const { data } = await sb
    .from('app_config')
    .select('openai_model, openai_api_key')
    .eq('id', 1)
    .single();

  const value = data || { openai_api_key: '', openai_model: 'gpt-4o-mini' };
  _configCache = { at: now, value };
  return value;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function forceEnglishOutput(text: string) {
  const englishDisclaimer =
    'This information is for educational purposes only and is not a substitute for professional medical advice.';

  const noUrduScript = String(text || '').replace(/[\u0600-\u06FF]/g, '').trim();
  const cleaned = noUrduScript
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.toLowerCase().includes('educational purposes only'))
    .join('\n');

  const body = cleaned || 'Please ask a medical question in clear terms.';
  return `${body}\n\n${englishDisclaimer}`;
}

function sanitizeUuid(value: unknown): string | null {
  const s = String(value || '').trim();
  if (!s) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) {
    return null;
  }
  return s;
}

async function saveChatMessages(
  sb: ReturnType<typeof createClient>,
  payload: { sessionId: string; userId: string | null; userMessage: string; assistantReply: string },
) {
  const rows = [
    {
      session_id: payload.sessionId,
      user_id: payload.userId,
      role: 'user',
      content: payload.userMessage,
    },
    {
      session_id: payload.sessionId,
      user_id: payload.userId,
      role: 'assistant',
      content: payload.assistantReply,
    },
  ];

  const { error } = await sb.from('chat_messages').insert(rows);
  if (error) {
    console.error('chat_messages insert error', error.message);
  }
}
