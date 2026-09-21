/** Membersihkan teks dari karakter kontrol, karakter tak terlihat, dan tag HTML. */
export function sanitizeText(input: string, opts: { multiline?: boolean } = {}): string {
  let s = input.normalize('NFKC');
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  s = s.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '');
  s = s.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
  if (opts.multiline) {
    s = s.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n');
  } else {
    s = s.replace(/\s+/g, ' ');
  }
  return s.trim();
}
