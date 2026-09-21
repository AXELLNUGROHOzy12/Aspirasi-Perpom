/**
 * Moderasi berbasis skor (bukan sekadar blacklist).
 * - Kata kasar dinormalisasi (leetspeak, huruf berulang, penyamaran dengan tanda baca)
 * - Konteks laporan ("melaporkan", "korban", kutipan) menurunkan skor
 * - Pengecualian frasa wajar ("anjing liar", "daging babi")
 * - Ujaran kebencian = kata target (etnis/agama/dll) berdekatan dengan kata hinaan
 * - Ancaman dan topik keselamatan tidak pernah ditolak otomatis, selalu ke NEEDS_REVIEW
 * Skor >= 0.9 -> REJECTED, >= 0.35 -> NEEDS_REVIEW, selain itu APPROVED.
 */
export type ModerationDecision = 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED';
export interface ModerationResult {
  decision: ModerationDecision;
  score: number;
  reasons: string[];
  safety: boolean;
}

const collapse = (s: string) => s.replace(/(.)\1+/g, '$1');
const set = (list: string[]) => new Set(list.map(collapse));

const SEVERE = set(['anjing', 'bangsat', 'bajingan', 'kontol', 'memek', 'ngentot', 'jancok', 'jancuk', 'asu', 'babi', 'kampret', 'keparat', 'brengsek', 'sialan', 'pukimak', 'tai', 'jembut']);
const MILD = set(['tolol', 'goblok', 'bodoh', 'bego', 'dungu', 'idiot', 'gila', 'setan', 'iblis', 'laknat', 'bedebah']);
const HATE_TARGETS = set(['cina', 'kafir', 'papua', 'jawa', 'batak', 'madura', 'sunda', 'arab', 'yahudi', 'islam', 'kristen', 'katolik', 'hindu', 'budha', 'buddha', 'cacat', 'autis', 'gay', 'lesbi', 'banci', 'homo']);
const PRONOUNS = set(['kamu', 'kau', 'lu', 'lo', 'loe', 'elu', 'anda', 'kalian', 'situ']);
const LONG_SEVERE_RAW = ['bangsat', 'bajingan', 'kontol', 'ngentot', 'jancok', 'jancuk', 'brengsek', 'pukimak'];
const EVASION = LONG_SEVERE_RAW.map((w) => new RegExp(w.split('').join('[.\\-_*]{0,2}'), 'g'));

const EXCEPTIONS =
  /\b(anjing (liar|penjaga|pelacak|berkeliaran|jalanan)|(seekor|beberapa|banyak|ada|kotoran|memelihara) anjing|daging babi|babi hutan|tai kucing)\b/g;

const REPORT_CONTEXT =
  /\b(melaporkan|dilaporkan|laporan|melapor|menyaksikan|mengalami|dialami|korban|perlakuan|dikatakan|mengatakan|berkata|memanggil|dipanggil|diejek|mengejek|dibully|bullying|perundungan|merundung|ucapan|ujaran|kata kata|menggunakan kata|mengucapkan|katanya)\b/;

const THREATS: RegExp[] = [
  /\b(akan|mau|bakal|pengen|ingin|nanti)\s+(gue|gua|aku|saya|kami|kita)?\s*(bunuh|habisi|hajar|pukul|bakar|tusuk|bacok|tembak|ledakkan|hancurkan)\s+(kamu|lu|lo|kau|kalian|guru|kepala sekolah|sekolah|dia|mereka)/,
  /\b(gue|gua|aku|saya)\s+(akan\s+|bakal\s+|mau\s+)?(bunuh|habisi|hajar|bakar|tusuk|bacok|tembak)\b/,
  /\bawas\s+(lu|lo|kamu|kau|kalian)\b/,
  /\b(bom|bakar|ledakkan)\s+sekolah\b/,
  /\bsekolah\s+(ini\s+)?(akan\s+)?(dibom|dibakar|diledakkan)\b/,
];
const SELF_HARM: RegExp[] = [/\bbunuh\s+diri\b/, /\b(mengakhiri|akhiri)\s+hidup\b/, /\bmenyakiti\s+diri\b/, /\b(pengen|ingin|mau)\s+mati\b/];

const SPAM_PHRASES = ['gacor', 'togel', 'maxwin', 'judi online', 'slot online', 'situs judi', 'pinjol', 'casino', 'kasino', 'link alternatif', 'bonus deposit', 'klik link', 'wa.me', 't.me', 'bit.ly'];
const URL_RE = /(https?:\/\/\S+|www\.\S+|\b[a-z0-9-]+\.(?:com|net|org|xyz|top|site|online|link|shop|club|vip|cc)\b)/gi;
const PHONE_RE = /(\+?62|\b0)8\d{8,11}\b/;
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };

const SUFFIXES = ['nya', 'mu', 'ku', 'lah', 'kah', 'an', 'e'];
function stem(t: string) {
  for (const s of SUFFIXES) if (t.endsWith(s) && t.length > s.length + 2) return t.slice(0, -s.length);
  return t;
}
const noisyOr = (parts: number[]) => 1 - parts.reduce((acc, p) => acc * (1 - Math.min(Math.max(p, 0), 1)), 1);

export function moderate(title: string, body: string): ModerationResult {
  const raw = `${title}\n${body}`;
  const reasons: string[] = [];
  const parts: number[] = [];
  let safety = false;

  const lowered = raw.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(EXCEPTIONS, ' ');
  const leet = lowered
    .split(/\s+/)
    .map((c) => (/[a-z]/.test(c) && /[0-9@$]/.test(c) ? c.replace(/[013457@$]/g, (m) => LEET[m]) : c))
    .join(' ');
  const spaced = leet.replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = collapse(spaced).split(' ').filter(Boolean);
  const reporting = REPORT_CONTEXT.test(spaced);

  // --- Kata kasar ---
  let severe = 0;
  let mild = 0;
  const hitIdx: number[] = [];
  tokens.forEach((t, i) => {
    const forms = [t, stem(t)];
    if (forms.some((f) => SEVERE.has(f))) { severe++; hitIdx.push(i); }
    else if (forms.some((f) => MILD.has(f))) { mild++; hitIdx.push(i); }
  });
  for (const re of EVASION) {
    const m = leet.match(re);
    if (m && /[^a-z]/.test(m[0])) { severe++; reasons.push('Kata kasar yang disamarkan dengan tanda baca'); }
  }
  let profanity = 0;
  if (severe > 0) profanity = Math.min(0.95, 0.55 + 0.15 * (severe - 1));
  if (mild > 0) profanity = noisyOr([profanity, Math.min(0.5, 0.25 + 0.1 * (mild - 1))]);
  const direct = hitIdx.some((i) => tokens.slice(Math.max(0, i - 3), i + 4).some((t) => PRONOUNS.has(t)));
  if (profanity > 0 && direct) profanity = noisyOr([profanity, 0.2]);
  if (profanity > 0) {
    reasons.push(`Kata kasar terdeteksi (${severe + mild})${direct ? ', tertuju langsung ke seseorang' : ''}`);
    if (reporting) {
      profanity *= 0.4;
      reasons.push('Ada konteks laporan/kutipan, skor diturunkan');
    }
    parts.push(profanity);
  }

  // --- Ujaran kebencian: kata target dekat kata hinaan ---
  const nearInsult = tokens.some((t, i) => HATE_TARGETS.has(t) && hitIdx.some((h) => Math.abs(h - i) <= 4));
  if (nearInsult) {
    parts.push(reporting ? 0.3 : 0.75);
    reasons.push('Kemungkinan ujaran kebencian terhadap kelompok tertentu');
  }

  // --- Ancaman & keselamatan (selalu ditinjau admin, tidak pernah ditolak otomatis) ---
  if (THREATS.some((re) => re.test(spaced))) {
    parts.push(0.7); safety = true;
    reasons.push('PRIORITAS: ada indikasi ancaman');
  }
  if (SELF_HARM.some((re) => re.test(spaced))) {
    parts.push(0.6); safety = true;
    reasons.push('PRIORITAS: menyangkut keselamatan siswa, mohon segera ditindaklanjuti');
  }

  // --- Spam ---
  const urls = (lowered.match(URL_RE) ?? []).length;
  if (urls >= 3) { parts.push(0.7); reasons.push(`Banyak tautan (${urls})`); }
  else if (urls > 0) parts.push(0.25);
  const promo = SPAM_PHRASES.filter((p) => lowered.includes(p)).length;
  if (promo > 0) { parts.push(Math.min(0.9, 0.5 + 0.2 * (promo - 1))); reasons.push('Berisi kata promosi/judi'); }
  if (PHONE_RE.test(raw.replace(/[\s.-]/g, ''))) { parts.push(0.3); reasons.push('Mengandung nomor telepon'); }
  if (/(.)\1{9,}/.test(raw)) { parts.push(0.3); reasons.push('Karakter berulang berlebihan'); }

  const letters = raw.replace(/[^a-zA-Z]/g, '');
  if (letters.length >= 30 && letters.replace(/[^A-Z]/g, '').length / letters.length > 0.7) {
    parts.push(0.15); reasons.push('Hampir seluruhnya huruf kapital');
  }
  if (raw.length > 0 && letters.length / raw.replace(/\s/g, '').length < 0.5) { parts.push(0.35); reasons.push('Sedikit huruf, banyak simbol/angka'); }

  const words = spaced.split(' ').filter(Boolean);
  if (words.length >= 10 && new Set(words).size / words.length <= 0.3) { parts.push(0.45); reasons.push('Kata yang sama diulang-ulang'); }
  const noVowel = words.filter((w) => w.length >= 6 && !/[aiueo]/.test(w)).length;
  if (noVowel >= 2 || /(asdf|qwer|zxcv|hjkl|sdfg|dfgh|lorem ipsum)/.test(spaced)) { parts.push(0.4); reasons.push('Terlihat seperti ketikan acak'); }

  let score = noisyOr(parts);
  if (safety) score = Math.max(score, 0.6);
  const decision: ModerationDecision = safety ? 'NEEDS_REVIEW' : score >= 0.9 ? 'REJECTED' : score >= 0.35 ? 'NEEDS_REVIEW' : 'APPROVED';

  return { decision, score: Math.round(score * 100) / 100, reasons, safety };
}
