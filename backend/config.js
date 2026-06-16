'use strict';
const path = require('path');

const PORT               = Number(process.env.PORT || 5050);
const ADMIN_SECRET       = process.env.ADMIN_SECRET   || '';
const ADMIN_EMAIL        = (process.env.ADMIN_EMAIL   || '').trim().toLowerCase();
const ADMIN_PASSWORD     = (process.env.ADMIN_PASSWORD || '').trim();
const MYSQL_HOST         = String(process.env.MYSQL_HOST     || '').trim();
const MYSQL_PORT         = Number(process.env.MYSQL_PORT     || 3306);
const MYSQL_USER         = String(process.env.MYSQL_USER     || '').trim();
const MYSQL_PASSWORD     = String(process.env.MYSQL_PASSWORD || '').trim();
const MYSQL_DATABASE     = String(process.env.MYSQL_DATABASE || '').trim();
const SMTP_HOST          = String(process.env.SMTP_HOST      || 'smtp.hostinger.com').trim();
const SMTP_PORT          = Number(process.env.SMTP_PORT      || 465);
const SMTP_SECURE        = String(process.env.SMTP_SECURE    || 'true').trim().toLowerCase() !== 'false';
const SMTP_USER          = String(process.env.SMTP_USER      || '').trim();
const SMTP_PASS          = String(process.env.SMTP_PASS      || '').trim();
const SMTP_FROM          = String(process.env.SMTP_FROM      || process.env.SMTP_USER || '').trim();
const SUPABASE_URL_ENV   = String(process.env.SUPABASE_URL         || '').trim();
const SUPABASE_SERVICE_KEY_ENV = String(process.env.SUPABASE_SERVICE_KEY || '').trim();

const MIN_TRAINING_EXAMPLES = 8;
const OTP_EXPIRY_MINUTES    = 10;
const UPLOADS_ROOT          = path.join(__dirname, 'uploads');
const PROFILE_UPLOADS_DIR   = path.join(UPLOADS_ROOT, 'profiles');
const PUBLIC_DIR            = path.join(__dirname, 'public');

// ── RAG v2 constants ──────────────────────────────────────────────────────────
const _STOPWORDS = new Set([
  'the','a','an','is','are','was','were','be','been','being','have','has',
  'had','do','does','did','will','would','could','should','may','might',
  'shall','can','of','in','on','at','to','for','with','by','from','and',
  'or','but','not','this','that','it','its','as','if','so','than','then',
  'also','source','1','2','3','4','5','6',
]);

const _PRESCRIPTIVE_RX = [
  /\btake\s+\d+\s*(?:mg|ml|tablet|capsule|dose)/i,
  /\bprescribe\s+\w+\s+(?:to|for)\s+(?:you|the\s+patient)/i,
  /\byou\s+should\s+take\b/i,
  /\byour\s+(?:dose|dosage)\s+is\b/i,
  /\badminister\s+\d+\s*mg\b/i,
];

const _SECTION_PATTERNS = {
  abstract:     /\babstract\b/i,
  introduction: /\bintroduction\b/i,
  methods:      /\b(?:methods|methodology|materials and methods)\b/i,
  results:      /\bresults\b/i,
  discussion:   /\bdiscussion\b/i,
  conclusion:   /\b(?:conclusion|conclusions|summary)\b/i,
  references:   /\breferences\b/i,
};

const _MEDICAL_ENTITY_REGEX =
  /\b(?:[A-Z][a-z]+(?:\s+[a-z]+){0,2}\s+(?:syndrome|disease|disorder|deficiency|cancer|tumor|virus|infection|phase|stage))\b/g;

const EMBED_CACHE_MAX = 500;

// ── Domain constants ──────────────────────────────────────────────────────────
const MEDICAL_KEYWORDS = [
  'health','medical','doctor','medicine','symptom','disease','pain','fever',
  'headache','cough','cold','vomit','nausea','diabetes','blood pressure','bp',
  'heart','liver','kidney','infection','allergy','asthma','rash','skin',
  'stomach','pregnancy','tablet','drug','treatment',
];

const COMMON_SYMPTOMS = ['Migraine', 'Gastro (Stomach)'];

const ALLOWED_TOPIC_KEYWORDS = {
  migraine: [
    'migraine','headache','head pain','head ache','sir dard','aura',
    'light sensitivity','photophobia','nausea','throbbing pain',
  ],
  gastro: [
    'gastro','gastroenteritis','gastritis','stomach','abdomen','abdominal pain',
    'acid reflux','gerd','heartburn','ulcer','diarrhea','constipation',
    'bloating','vomiting',
  ],
};

const DIABETES_SCREEN_QUESTIONS = [
  'Do you often feel very thirsty?',
  'Do you urinate more often than usual, especially at night?',
  'Have you noticed unexplained weight loss recently?',
  'Do you feel unusual fatigue most days?',
  'Do you have blurred vision at times?',
  'Do cuts or wounds take longer than usual to heal?',
  'Do you have a parent or sibling with diabetes?',
  'Are you physically inactive most days?',
];

const MIGRAINE_SCREEN_QUESTIONS = [
  'Do you get moderate to severe headaches that can last for hours?',
  'Is the pain usually one-sided or throbbing/pulsating?',
  'Do light or loud sounds make your headache worse?',
  'Do you feel nausea or vomiting during headache episodes?',
  'Do routine activities (walking, climbing stairs) worsen the pain?',
  'Do you sometimes get warning signs (aura), like visual changes, before headache?',
  'Have these episodes happened repeatedly in the last 3 months?',
];

const GASTRO_SCREEN_QUESTIONS = [
  'Do you often have stomach or upper abdominal discomfort?',
  'Do you have frequent acidity, heartburn, or sour reflux?',
  'Do you experience bloating, gas, or indigestion after meals?',
  'Do you have repeated nausea, vomiting, diarrhea, or constipation?',
  'Do spicy, oily, or heavy meals trigger your symptoms?',
  'Have your gastrointestinal symptoms persisted for more than 2 weeks?',
  'Have you noticed warning signs like blood in stool, black stool, or persistent severe pain?',
];

module.exports = {
  PORT, ADMIN_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD,
  MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE,
  SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM,
  SUPABASE_URL_ENV, SUPABASE_SERVICE_KEY_ENV,
  MIN_TRAINING_EXAMPLES, OTP_EXPIRY_MINUTES,
  UPLOADS_ROOT, PROFILE_UPLOADS_DIR, PUBLIC_DIR,
  _STOPWORDS, _PRESCRIPTIVE_RX, _SECTION_PATTERNS, _MEDICAL_ENTITY_REGEX,
  EMBED_CACHE_MAX,
  MEDICAL_KEYWORDS, COMMON_SYMPTOMS, ALLOWED_TOPIC_KEYWORDS,
  DIABETES_SCREEN_QUESTIONS, MIGRAINE_SCREEN_QUESTIONS, GASTRO_SCREEN_QUESTIONS,
};
