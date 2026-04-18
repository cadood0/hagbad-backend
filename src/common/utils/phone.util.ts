export function normalizePhone(phone: string): string {
  return phone.replace('+', '').replace(/\s/g, '').trim();
}
