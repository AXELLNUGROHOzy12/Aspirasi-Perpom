export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'ERROR',
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export const unauthorized = (message = 'Silakan login terlebih dahulu.') => new HttpError(401, message, 'UNAUTHORIZED');
export const forbidden = (message = 'Kamu tidak punya akses untuk tindakan ini.') => new HttpError(403, message, 'FORBIDDEN');
export const notFound = (message = 'Data tidak ditemukan.') => new HttpError(404, message, 'NOT_FOUND');
export const invalid = (field: string, message: string) =>
  new HttpError(422, 'Data yang kamu masukkan belum lengkap. Silakan periksa kembali form.', 'VALIDATION', { [field]: [message] });
