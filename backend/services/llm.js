'use strict';

async function chatWithOpenAI(runtimeCfg, messages, ragContext) {
  const apiKey = String(runtimeCfg.openai_api_key || '').trim();
  if (!apiKey) throw new Error('OpenAI key missing in app_config table.');

  let finalMessages = messages;
  if (ragContext) {
    const contextBlock =
      '\n\nThe following verified medical reference excerpts are provided to ground your answer.\n\n' +
      'INSTRUCTIONS:\n' +
      '1. Answer the question using information from these excerpts.\n' +
      '2. Medical concepts often appear under different but equivalent terms ' +
         '(e.g. "prodrome" = "premonitory phase", "aura" = "visual disturbance"). ' +
         'If the exact phrase is not present but the concept is covered, explain the connection and answer.\n' +
      '3. Synthesise across multiple excerpts when needed.\n' +
      '4. ONLY state that the information is unavailable if the excerpts are completely unrelated to the question.\n' +
      '5. Cite the source title when relevant.\n\n' +
      ragContext + '\n\n---\n';
    const idx = finalMessages.findIndex((m) => m.role === 'system');
    if (idx >= 0) {
      finalMessages = finalMessages.map((m, i) =>
        i === idx ? { ...m, content: m.content + contextBlock } : m
      );
    } else {
      finalMessages = [{ role: 'system', content: contextBlock }, ...finalMessages];
    }
  }

  const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: runtimeCfg.openai_model || 'gpt-4o-mini', temperature: 0.2, messages: finalMessages }),
  });

  if (!openaiResp.ok) {
    const errText = await openaiResp.text();
    throw new Error(`OpenAI request failed: ${errText}`);
  }

  const data = await openaiResp.json();
  return String(data?.choices?.[0]?.message?.content || '').trim();
}

async function chatWithLocalModel(runtimeCfg, messages, ragContext) {
  const localUrl    = String(runtimeCfg.local_api_url || '').trim() || 'http://127.0.0.1:11434';
  const localModel  = String(runtimeCfg.openai_model  || '').trim() || 'llama3.1:8b';
  const localApiKey = String(runtimeCfg.local_api_key || '').trim();

  let finalMessages = messages;
  if (ragContext) {
    const contextBlock =
      '\n\nThe following verified medical reference excerpts are provided to ground your answer.\n\n' +
      'INSTRUCTIONS:\n' +
      '1. Answer the question using information from these excerpts.\n' +
      '2. Medical concepts often appear under different but equivalent terms ' +
         '(e.g. "prodrome" = "premonitory phase", "aura" = "visual disturbance"). ' +
         'If the exact phrase is not present but the concept is covered, explain the connection and answer.\n' +
      '3. Synthesise across multiple excerpts when needed.\n' +
      '4. ONLY state that the information is unavailable if the excerpts are completely unrelated to the question.\n' +
      '5. Cite the source title when relevant.\n\n' +
      ragContext + '\n\n---\n';
    const idx = finalMessages.findIndex((m) => m.role === 'system');
    if (idx >= 0) {
      finalMessages = finalMessages.map((m, i) =>
        i === idx ? { ...m, content: m.content + contextBlock } : m
      );
    } else {
      finalMessages = [{ role: 'system', content: contextBlock }, ...finalMessages];
    }
  }

  const headers = { 'Content-Type': 'application/json' };
  if (localApiKey) headers.Authorization = `Bearer ${localApiKey}`;

  const resp = await fetch(`${localUrl.replace(/\/+$/, '')}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: localModel, stream: false, messages: finalMessages, options: { temperature: 0.2 } }),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`Local model request failed (${resp.status}): ${detail}`);
  }

  const data = await resp.json();
  return String(data?.message?.content || '').trim();
}

async function llmCall(runtimeCfg, provider, userPrompt, systemPrompt) {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: userPrompt });
  try {
    return provider === 'local'
      ? await chatWithLocalModel(runtimeCfg, messages, null)
      : await chatWithOpenAI(runtimeCfg, messages, null);
  } catch (err) {
    console.error('[RAG llmCall]', err.message);
    return '';
  }
}

module.exports = { chatWithOpenAI, chatWithLocalModel, llmCall };
