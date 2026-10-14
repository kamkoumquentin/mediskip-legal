import * as WebBrowser from 'expo-web-browser';

export const TERMS_OF_SERVICE_URL =
  'https://kamkoumquentin.github.io/mediskip-legal/conditions.html';
export const PRIVACY_POLICY_URL =
  'https://kamkoumquentin.github.io/mediskip-legal/confidentialite.html';

export function openLegalDocument(url: string) {
  return WebBrowser.openBrowserAsync(url);
}
