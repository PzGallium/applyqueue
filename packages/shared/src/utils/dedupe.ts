/**
 * Generates a deduplication hash for a job posting.
 * Uses Web Crypto API (available in both browser and Node 20+).
 */
export async function generateDedupeHash(
  title: string,
  company: string,
  location: string,
): Promise<string> {
  const normalized = [title, company, location]
    .map((s) => s.toLowerCase().trim().replace(/\s+/g, ' '))
    .join('|');

  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
