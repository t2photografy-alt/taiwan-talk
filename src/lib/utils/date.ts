export function nowIso() {
  return new Date().toISOString();
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(value));
}
