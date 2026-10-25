export const money = (n: number) => `$${n.toFixed(2)}`;

export function clock(fromIso: string, toMs: number): string {
  const secs = Math.max(0, Math.floor((toMs - new Date(fromIso).getTime()) / 1000));
  const h = String(Math.floor(secs / 3600)).padStart(2, "0");
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}
