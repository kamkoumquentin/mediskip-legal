/**
 * Échappe les caractères HTML spéciaux pour éviter l'injection XSS.
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Valide et nettoie les URL d'images/liens pour éviter les schémas malveillants.
 */
export function sanitizeUrl(url?: string | null, fallback: string = 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=400'): string {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('file://')
  ) {
    return trimmed.replace(/"/g, '%22').replace(/'/g, '%27');
  }
  return fallback;
}
