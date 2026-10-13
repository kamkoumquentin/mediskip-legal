export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  if (!path) return path;

  if (path.includes('auth/callback')) {
    return '/';
  }

  return path;
}
