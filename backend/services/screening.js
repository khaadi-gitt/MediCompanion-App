'use strict';
const {
  DIABETES_SCREEN_QUESTIONS, MIGRAINE_SCREEN_QUESTIONS, GASTRO_SCREEN_QUESTIONS,
  ALLOWED_TOPIC_KEYWORDS,
} = require('../config');

const diabetesScreenSessions = new Map();
const diabetesOfferSessions  = new Map();
const migraineScreenSessions = new Map();
const migraineOfferSessions  = new Map();
const gastroScreenSessions   = new Map();
const gastroOfferSessions    = new Map();

function getScreeningKey(sessionId, userId) {
  if (sessionId) return `session:${sessionId}`;
  if (userId)    return `user:${userId}`;
  return 'anon:global';
}

function parseYesNo(value) {
  const yes = ['yes', 'y', 'haan', 'han', 'ji', 'yep', 'yeah'];
  const no  = ['no',  'n', 'nah',  'nope'];
  if (yes.includes(value)) return true;
  if (no.includes(value))  return false;
  return null;
}

function isDiabetesTopic(text) {
  const value = String(text || '').toLowerCase();
  const list  = ALLOWED_TOPIC_KEYWORDS.diabetes || [];
  return list.some((k) => value.includes(k));
}

function isMigraineTopic(text) {
  const value = String(text || '').toLowerCase();
  const list  = ALLOWED_TOPIC_KEYWORDS.migraine || [];
  return list.some((k) => value.includes(k));
}

function isGastroTopic(text) {
  const value = String(text || '').toLowerCase();
  const list  = ALLOWED_TOPIC_KEYWORDS.gastro || [];
  return list.some((k) => value.includes(k));
}

function wantsDiabetesScreening(value) {
  const hasDiabetesWord =
    value.includes('diabetes') || value.includes('blood sugar') || value.includes('sugar');
  const hasUncertaintyIntent =
    value.includes('screen')   || value.includes('check')     || value.includes('am i')     ||
    value.includes('do i have')|| value.includes('could this be') || value.includes('can this be') ||
    value.includes('how do i know') || value.includes('how to know') || value.includes('symptom') ||
    value.includes('risk')     || value.includes('lagta')     || value.includes('pata chale') ||
    value.includes('kya mujhe');
  const diabetesSymptomSignals = [
    'thirsty','frequent urination','urinate often','peeing a lot',
    'blurred vision','fatigue','tired','weight loss','slow healing','wound',
  ];
  const symptomHits          = diabetesSymptomSignals.filter((x) => value.includes(x)).length;
  const hasStrongSymptomPattern = symptomHits >= 2;
  return (hasDiabetesWord && hasUncertaintyIntent) || hasStrongSymptomPattern;
}

function buildDiabetesRiskSummary(answers) {
  const yesCount = answers.filter(Boolean).length;
  let risk = 'Low likelihood', next = 'Maintain healthy diet and activity, and monitor symptoms.';
  if (yesCount >= 6) {
    risk = 'High risk';
    next = 'Please arrange blood glucose or HbA1c testing soon and consult a doctor.';
  } else if (yesCount >= 3) {
    risk = 'Possible risk';
    next = 'Consider blood glucose testing and discuss with a healthcare professional.';
  }
  return (
    `Screening result: ${risk} (Yes answers: ${yesCount}/${DIABETES_SCREEN_QUESTIONS.length}).\n` +
    `${next}\n\n` +
    'This information is for educational purposes only and is not a substitute for professional medical advice.'
  );
}

function buildMigraineRiskSummary(answers) {
  const yesCount = answers.filter(Boolean).length;
  let risk = 'Low likelihood of migraine pattern', next = 'Track triggers and monitor headache patterns.';
  if (yesCount >= 5) {
    risk = 'High likelihood of migraine pattern';
    next = 'Please consult a doctor or neurologist for diagnosis and management.';
  } else if (yesCount >= 3) {
    risk = 'Possible migraine pattern';
    next = 'Consider a clinical evaluation if episodes are frequent or disabling.';
  }
  return (
    `Screening result: ${risk} (Yes answers: ${yesCount}/${MIGRAINE_SCREEN_QUESTIONS.length}).\n` +
    `${next}\n\n` +
    'This information is for educational purposes only and is not a substitute for professional medical advice.'
  );
}

function buildGastroRiskSummary(answers) {
  const yesCount = answers.filter(Boolean).length;
  let risk = 'Low likelihood of persistent gastro condition', next = 'Use diet and hydration precautions and monitor symptoms.';
  if (yesCount >= 5) {
    risk = 'High risk of significant gastrointestinal issue';
    next = 'Please seek medical evaluation soon, especially if warning signs are present.';
  } else if (yesCount >= 3) {
    risk = 'Possible gastrointestinal issue';
    next = 'Consider medical consultation and symptom-based evaluation.';
  }
  return (
    `Screening result: ${risk} (Yes answers: ${yesCount}/${GASTRO_SCREEN_QUESTIONS.length}).\n` +
    `${next}\n\n` +
    'This information is for educational purposes only and is not a substitute for professional medical advice.'
  );
}

// Screening handlers 
function handleDiabetesScreening({ sessionId, userId, message }) {
  const key          = getScreeningKey(sessionId, userId);
  const text         = String(message || '').trim();
  const value        = text.toLowerCase();
  const active       = diabetesScreenSessions.get(key);
  const waitingOffer = Boolean(diabetesOfferSessions.get(key));

  if (waitingOffer) {
    const answer = parseYesNo(value);
    if (answer === true) {
      diabetesOfferSessions.delete(key);
      diabetesScreenSessions.set(key, { index: 0, answers: [] });
      return (
        'Great. Diabetes screening started. Please answer in Yes or No.\n' +
        `Question 1/${DIABETES_SCREEN_QUESTIONS.length}: ${DIABETES_SCREEN_QUESTIONS[0]} (Yes/No)`
      );
    }
    if (answer === false) { diabetesOfferSessions.delete(key); return null; }
    diabetesOfferSessions.delete(key);
  }

  if (active) {
    if (['stop', 'cancel', 'exit'].includes(value)) {
      diabetesScreenSessions.delete(key);
      return 'Diabetes screening stopped. You can ask about Diabetes, Migraine, or Gastro topics anytime.';
    }
    const answer = parseYesNo(value);
    if (answer === null) return 'Please answer with Yes or No. You can also type "stop" to end screening.';
    active.answers.push(answer);
    active.index += 1;
    if (active.index < DIABETES_SCREEN_QUESTIONS.length) {
      const qNo = active.index + 1;
      return `Question ${qNo}/${DIABETES_SCREEN_QUESTIONS.length}: ${DIABETES_SCREEN_QUESTIONS[active.index]} (Yes/No)`;
    }
    diabetesScreenSessions.delete(key);
    return buildDiabetesRiskSummary(active.answers);
  }

  if (wantsDiabetesScreening(value)) {
    diabetesScreenSessions.set(key, { index: 0, answers: [] });
    return (
      'Diabetes screening started. Please answer in Yes or No.\n' +
      `Question 1/${DIABETES_SCREEN_QUESTIONS.length}: ${DIABETES_SCREEN_QUESTIONS[0]} (Yes/No)`
    );
  }

  return null;
}

function handleMigraineScreening({ sessionId, userId, message }) {
  const key          = getScreeningKey(sessionId, userId);
  const value        = String(message || '').trim().toLowerCase();
  const active       = migraineScreenSessions.get(key);
  const waitingOffer = Boolean(migraineOfferSessions.get(key));

  if (waitingOffer) {
    const answer = parseYesNo(value);
    if (answer === true) {
      migraineOfferSessions.delete(key);
      migraineScreenSessions.set(key, { index: 0, answers: [] });
      return (
        'Great. Migraine screening started. Please answer in Yes or No.\n' +
        `Question 1/${MIGRAINE_SCREEN_QUESTIONS.length}: ${MIGRAINE_SCREEN_QUESTIONS[0]} (Yes/No)`
      );
    }
    if (answer === false) { migraineOfferSessions.delete(key); return null; }
    migraineOfferSessions.delete(key);
  }

  if (!active) return null;

  if (['stop', 'cancel', 'exit'].includes(value)) {
    migraineScreenSessions.delete(key);
    return 'Migraine screening stopped. You can ask about Migraine or Gastro topics anytime.';
  }

  const answer = parseYesNo(value);
  if (answer === null) return 'Please answer with Yes or No. You can also type "stop" to end screening.';

  active.answers.push(answer);
  active.index += 1;
  if (active.index < MIGRAINE_SCREEN_QUESTIONS.length) {
    const qNo = active.index + 1;
    return `Question ${qNo}/${MIGRAINE_SCREEN_QUESTIONS.length}: ${MIGRAINE_SCREEN_QUESTIONS[active.index]} (Yes/No)`;
  }

  migraineScreenSessions.delete(key);
  return buildMigraineRiskSummary(active.answers);
}

function handleGastroScreening({ sessionId, userId, message }) {
  const key          = getScreeningKey(sessionId, userId);
  const value        = String(message || '').trim().toLowerCase();
  const active       = gastroScreenSessions.get(key);
  const waitingOffer = Boolean(gastroOfferSessions.get(key));

  if (waitingOffer) {
    const answer = parseYesNo(value);
    if (answer === true) {
      gastroOfferSessions.delete(key);
      gastroScreenSessions.set(key, { index: 0, answers: [] });
      return (
        'Great. Gastro screening started. Please answer in Yes or No.\n' +
        `Question 1/${GASTRO_SCREEN_QUESTIONS.length}: ${GASTRO_SCREEN_QUESTIONS[0]} (Yes/No)`
      );
    }
    if (answer === false) { gastroOfferSessions.delete(key); return null; }
    gastroOfferSessions.delete(key);
  }

  if (!active) return null;

  if (['stop', 'cancel', 'exit'].includes(value)) {
    gastroScreenSessions.delete(key);
    return 'Gastro screening stopped. You can ask about Migraine or Gastro topics anytime.';
  }

  const answer = parseYesNo(value);
  if (answer === null) return 'Please answer with Yes or No. You can also type "stop" to end screening.';

  active.answers.push(answer);
  active.index += 1;
  if (active.index < GASTRO_SCREEN_QUESTIONS.length) {
    const qNo = active.index + 1;
    return `Question ${qNo}/${GASTRO_SCREEN_QUESTIONS.length}: ${GASTRO_SCREEN_QUESTIONS[active.index]} (Yes/No)`;
  }

  gastroScreenSessions.delete(key);
  return buildGastroRiskSummary(active.answers);
}

//Screening offer hooks
function addDiabetesScreeningOffer({ reply, message, sessionId, userId }) {
  const key = getScreeningKey(sessionId, userId);
  if (diabetesScreenSessions.get(key)) return reply;
  if (!isDiabetesTopic(message)) return reply;
  diabetesOfferSessions.set(key, true);
  return `${reply}\n\nDo you want a quick diabetes symptom screening to estimate risk? Reply Yes to start.`;
}

function addMigraineScreeningOffer({ reply, message, sessionId, userId }) {
  const key = getScreeningKey(sessionId, userId);
  if (migraineScreenSessions.get(key)) return reply;
  if (!isMigraineTopic(message)) return reply;
  migraineOfferSessions.set(key, true);
  return `${reply}\n\nDo you want a quick migraine symptom screening to estimate risk? Reply Yes to start.`;
}

function addGastroScreeningOffer({ reply, message, sessionId, userId }) {
  const key = getScreeningKey(sessionId, userId);
  if (gastroScreenSessions.get(key)) return reply;
  if (!isGastroTopic(message)) return reply;
  gastroOfferSessions.set(key, true);
  return `${reply}\n\nDo you want a quick gastro symptom screening to estimate risk? Reply Yes to start.`;
}

function clearUserScreeningState(userId) {
  const key = getScreeningKey(null, userId);
  diabetesScreenSessions.delete(key);
  diabetesOfferSessions.delete(key);
  migraineScreenSessions.delete(key);
  migraineOfferSessions.delete(key);
  gastroScreenSessions.delete(key);
  gastroOfferSessions.delete(key);
}

module.exports = {
  handleDiabetesScreening, handleMigraineScreening, handleGastroScreening,
  addDiabetesScreeningOffer, addMigraineScreeningOffer, addGastroScreeningOffer,
  clearUserScreeningState, getScreeningKey,
};
