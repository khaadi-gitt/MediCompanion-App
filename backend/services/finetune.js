'use strict';
const { getMysqlPool } = require('../db/pool');

async function getTrainingExamples() {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `select system_prompt, user_input, assistant_output
     from training_examples
     where enabled = 1
     order by id asc`
  );
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((x) => x && String(x.user_input || '').trim() && String(x.assistant_output || '').trim())
    .map((x) => ({
      system_prompt:     String(x.system_prompt     || '').trim(),
      user_input:        String(x.user_input        || '').trim(),
      assistant_output:  String(x.assistant_output  || '').trim(),
    }));
}

function buildJsonl(examples) {
  const lines = examples.map((item) => {
    const systemPrompt =
      item.system_prompt ||
      'You are MediCompanion, a medical education assistant. Keep answers short and safe. No diagnosis certainty and no dosage.';
    const record = {
      messages: [
        { role: 'system',    content: systemPrompt },
        { role: 'user',      content: item.user_input },
        { role: 'assistant', content: item.assistant_output },
      ],
    };
    return JSON.stringify(record);
  });
  return `${lines.join('\n')}\n`;
}

async function uploadTrainingFile(apiKey, fileName, content) {
  const boundary = `----mc-boundary-${Date.now()}`;
  const body = [
    `--${boundary}\r\n` +
      'Content-Disposition: form-data; name="purpose"\r\n\r\n' +
      'fine-tune\r\n',
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
      'Content-Type: application/jsonl\r\n\r\n' +
      content +
      '\r\n',
    `--${boundary}--\r\n`,
  ].join('');

  const resp = await fetch('https://api.openai.com/v1/files', {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`Training file upload failed (${resp.status}): ${detail}`);
  }
  return resp.json();
}

async function createFineTuningJob({ apiKey, baseModel, trainingFileId, suffix, n_epochs }) {
  const payload = { model: baseModel, training_file: trainingFileId, suffix };
  if (n_epochs) payload.hyperparameters = { n_epochs };

  const resp = await fetch('https://api.openai.com/v1/fine_tuning/jobs', {
    method:  'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`Fine-tuning job creation failed (${resp.status}): ${detail}`);
  }
  return resp.json();
}

async function getFineTuningJob(apiKey, jobId) {
  const resp = await fetch(`https://api.openai.com/v1/fine_tuning/jobs/${encodeURIComponent(jobId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`Fine-tuning status failed (${resp.status}): ${detail}`);
  }
  return resp.json();
}

async function cancelFineTuningJob(apiKey, jobId) {
  const resp = await fetch(`https://api.openai.com/v1/fine_tuning/jobs/${encodeURIComponent(jobId)}/cancel`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`Fine-tuning cancel failed (${resp.status}): ${detail}`);
  }
  return resp.json();
}

module.exports = {
  getTrainingExamples, buildJsonl,
  uploadTrainingFile, createFineTuningJob, getFineTuningJob, cancelFineTuningJob,
};
