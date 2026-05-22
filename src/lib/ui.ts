const AVATAR_PALETTE = ['#b45309', '#c2410c', '#0369a1', '#15803d', '#be185d', '#0e7490', '#7c2d12'];

export function avatarBg(name: string): string {
  const s = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[s % AVATAR_PALETTE.length];
}

export function initials(name: string): string {
  return (name || '?').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export function relTime(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60)    return 'à l\'instant';
  if (d < 3600)  return `il y a ${Math.floor(d / 60)} min`;
  if (d < 86400) return `il y a ${Math.floor(d / 3600)}h`;
  const days = Math.floor(d / 86400);
  return days === 1 ? 'hier' : `il y a ${days} j`;
}
