/**
 * Create a magic-link URL for profiles.
 * Example:
 *   buildProfileMagicLink('https://site.com', 'uuid-token')
 */
export function buildProfileMagicLink(baseUrl: string, accessToken: string): string {
  const safeBase = baseUrl.replace(/\/+$/, '');
  const safeToken = encodeURIComponent(accessToken.trim());
  return `${safeBase}/profile/${safeToken}`;
}

