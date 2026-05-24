export type PublicExclusiveView = 'ccm' | 'mentions' | 'privacy' | 'cgu';

const EXCLUSIVE_PATHS: Record<string, PublicExclusiveView> = {
  '/comment-ca-marche': 'ccm',
  '/mentions-legales': 'mentions',
  '/politique-de-confidentialite': 'privacy',
  '/conditions-generales': 'cgu',
};

export function normalizePath(pathname: string): string {
  return pathname.replace(/\/$/, '') || '/';
}

export function publicExclusiveFromPath(pathname: string): PublicExclusiveView | null {
  return EXCLUSIVE_PATHS[normalizePath(pathname)] ?? null;
}

export function isPublicExclusivePath(pathname: string): boolean {
  return publicExclusiveFromPath(pathname) !== null;
}
