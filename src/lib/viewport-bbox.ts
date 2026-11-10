export type ViewportBboxSize = { width: number; height: number };

export const defaultViewportBboxSize: ViewportBboxSize = { width: 75, height: 75 };
export const minViewportBboxSize = 10;
export const maxViewportBboxSize = 96;

export function clampViewportBboxSize(percent: number) {
  return Math.min(maxViewportBboxSize, Math.max(minViewportBboxSize, percent));
}
