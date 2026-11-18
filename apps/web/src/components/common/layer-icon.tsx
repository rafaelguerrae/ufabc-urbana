import type { ViewMode } from "#lib/indicators";

const PATHS: Record<ViewMode, React.ReactNode> = {
  // Thermometer
  lst_c: (
    <>
      <path d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0Z" />
      <path d="M12 9v8" />
    </>
  ),
  // Tree
  ndvi: (
    <>
      <path d="M12 21v-6" />
      <path d="M12 3a5 5 0 0 0-4.2 7.7A4.5 4.5 0 0 0 8.5 19h7a4.5 4.5 0 0 0 .7-8.3A5 5 0 0 0 12 3Z" />
    </>
  ),
};

export function LayerIcon({ view, size = 24 }: { view: ViewMode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      {PATHS[view]}
    </svg>
  );
}
