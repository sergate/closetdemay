/** Logo circular de El Closet de May. Siempre va junto al nombre en texto, por eso no lleva alt. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="" width={size} height={size} className="shrink-0 rounded-full" />
  );
}
