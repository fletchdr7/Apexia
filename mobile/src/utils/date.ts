export function todayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function isSameDay(iso: string, ref: Date = new Date()): boolean {
  return iso.slice(0, 10) === todayKey(ref);
}

export function greeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function relativeDay(iso: string): string {
  const now = new Date();
  const then = new Date(iso);
  const diffDays = Math.floor((now.getTime() - then.getTime()) / 86_400_000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return then.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
