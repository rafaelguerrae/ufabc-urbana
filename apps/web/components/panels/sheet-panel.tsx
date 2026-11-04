"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

type Snap = "peek" | "half" | "full";

const ORDER: Snap[] = ["peek", "half", "full"];
const SNAP_CLASS: Record<Snap, string> = {
  peek: "mobile:h-[148px] mobile:rounded-t-2xl mobile:rounded-b-none",
  half: "mobile:h-[55dvh] mobile:rounded-t-2xl mobile:rounded-b-none",
  full: "mobile:z-7 mobile:h-dvh mobile:rounded-none", // above the top bar
};
const HANDLE_CLASS: Record<Snap, string> = {
  peek: "",
  half: "",
  full: "mobile:box-content mobile:pt-[env(safe-area-inset-top)]",
};
const SIDE_CLASS = { left: "left-3 w-[400px]", right: "right-3 w-[420px]" } as const;
const HIDDEN_TRANSFORM = {
  left: "[transform:translateX(-24px)_scale(0.98)]",
  right: "[transform:translateX(24px)_scale(0.98)]",
} as const;
const TRANSITION_SHOWN =
  "[transition:transform_0.32s_cubic-bezier(0.22,1,0.36,1),opacity_0.24s_ease,height_0.3s_cubic-bezier(0.22,1,0.36,1),visibility_0s_linear_0s]";
const TRANSITION_HIDDEN =
  "[transition:transform_0.28s_cubic-bezier(0.64,0,0.78,0),opacity_0.2s_ease,height_0.3s_cubic-bezier(0.22,1,0.36,1),visibility_0s_linear_0.28s]";
const PEEK_PX = 148;
const HALF_RATIO = 0.55;
const TAP_SLOP = 6; // px of movement that still counts as a tap
const FLING_MS = 150; // how far ahead the release velocity is projected

const snapHeights = (): Record<Snap, number> => ({
  peek: PEEK_PX,
  half: Math.round(window.innerHeight * HALF_RATIO),
  full: window.innerHeight,
});

/** Nearest of closed / peek / half / full to where the sheet is heading when released. */
function resolveSnap(height: number, velocity: number): Snap | "close" {
  const projected = height - velocity * FLING_MS;
  const heights = snapHeights();
  let best: Snap | "close" = "close";
  let bestDistance = Math.abs(projected);
  for (const s of ORDER) {
    const distance = Math.abs(projected - heights[s]);
    if (distance < bestDistance) {
      best = s;
      bestDistance = distance;
    }
  }
  return best;
}

const clampHeight = (h: number) => Math.min(window.innerHeight, Math.max(0, h));
const isMobile = () => window.matchMedia("(max-width: 700px)").matches;

interface DragState {
  startY: number;
  startHeight: number;
  lastY: number;
  lastTime: number;
  velocity: number; // px/ms, positive = moving down
  moved: boolean;
}

interface SheetPanelProps {
  side: "left" | "right";
  id: string;
  label: string;
  open: boolean;
  /** Called when the sheet is swiped down past its smallest height (mobile only). */
  onClose: () => void;
  children: ReactNode;
}

/**
 * Side panel on desktop; on mobile a bottom sheet with a drag handle that snaps between a
 * peek, half-screen and full-screen height, and closes when swiped down far enough.
 */
export function SheetPanel({ side, id, label, open, onClose, children }: SheetPanelProps) {
  const [snap, setSnap] = useState<Snap>("half");
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const ref = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  const snapRef = useRef(snap);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    snapRef.current = snap;
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (open) setSnap("half");
  }, [open]);

  // Publish the open sheet's height (used by the floating map buttons in MapView) and flag an open
  // sheet on mobile so those buttons can hide instead of floating over its content.
  useEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    if (!open || !el) {
      root.style.setProperty("--sheet-height", "0px");
      root.removeAttribute("data-sheet-open");
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      const h = entry?.borderBoxSize?.[0]?.blockSize ?? el.getBoundingClientRect().height;
      root.style.setProperty("--sheet-height", `${h}px`);
    });
    root.toggleAttribute("data-sheet-open", isMobile());
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.setProperty("--sheet-height", "0px");
      root.removeAttribute("data-sheet-open");
    };
  }, [open]);

  // Nested scrolling on mobile: swiping the content up grows the sheet before it scrolls, and swiping
  // down while the content is at the top shrinks it. Otherwise the content scrolls normally.
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    type Touch = DragState & { mode: "pending" | "sheet" | "scroll" };
    let t: Touch | null = null;

    const start = (e: TouchEvent) => {
      if (e.touches.length !== 1 || !isMobile()) {
        t = null;
        return;
      }
      const y = e.touches[0]!.clientY;
      t = {
        startY: y,
        startHeight: ref.current?.getBoundingClientRect().height ?? 0,
        lastY: y,
        lastTime: e.timeStamp,
        velocity: 0,
        moved: false,
        mode: "pending",
      };
    };

    const move = (e: TouchEvent) => {
      if (!t) return;
      const y = e.touches[0]!.clientY;
      const dy = y - t.startY;
      if (t.mode === "pending") {
        if (Math.abs(dy) <= TAP_SLOP) return;
        const up = dy < 0;
        const sheetMoves = up ? snapRef.current !== "full" : body.scrollTop <= 0;
        t.mode = sheetMoves ? "sheet" : "scroll";
      }
      if (t.mode !== "sheet") return;
      e.preventDefault(); // keep the content from scrolling while the sheet moves
      const dt = e.timeStamp - t.lastTime;
      if (dt > 0) t.velocity = (y - t.lastY) / dt;
      t.lastY = y;
      t.lastTime = e.timeStamp;
      setDragHeight(clampHeight(t.startHeight - dy));
    };

    const end = (e: TouchEvent) => {
      const s = t;
      t = null;
      if (!s || s.mode !== "sheet") return;
      const y = e.changedTouches[0]?.clientY ?? s.lastY;
      finishDrag(clampHeight(s.startHeight - (y - s.startY)), s.velocity);
    };

    body.addEventListener("touchstart", start, { passive: true });
    body.addEventListener("touchmove", move, { passive: false });
    body.addEventListener("touchend", end);
    body.addEventListener("touchcancel", end);
    return () => {
      body.removeEventListener("touchstart", start);
      body.removeEventListener("touchmove", move);
      body.removeEventListener("touchend", end);
      body.removeEventListener("touchcancel", end);
    };
    // finishDrag only uses stable setters and refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cycle = () => setSnap((s) => (s === "half" ? "full" : s === "full" ? "half" : "half"));

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      startY: e.clientY,
      startHeight: ref.current?.getBoundingClientRect().height ?? 0,
      lastY: e.clientY,
      lastTime: e.timeStamp,
      velocity: 0,
      moved: false,
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > TAP_SLOP) d.moved = true;
    if (!d.moved) return;
    const dt = e.timeStamp - d.lastTime;
    if (dt > 0) d.velocity = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastTime = e.timeStamp;
    setDragHeight(clampHeight(d.startHeight - dy));
  };

  const finishDrag = (height: number, velocity: number) => {
    const result = resolveSnap(height, velocity);
    setDragHeight(null);
    if (result === "close") onCloseRef.current();
    else setSnap(result);
  };

  const endDrag = (e: PointerEvent<HTMLButtonElement>, cancelled: boolean) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      setDragHeight(null);
      if (!cancelled) cycle();
      return;
    }
    finishDrag(clampHeight(d.startHeight - (e.clientY - d.startY)), d.velocity);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = ORDER.indexOf(snap);
    if (e.key === "ArrowUp" && i < ORDER.length - 1) setSnap(ORDER[i + 1]!);
    else if (e.key === "ArrowDown") {
      if (i > 0) setSnap(ORDER[i - 1]!);
      else onClose();
    } else return;
    e.preventDefault();
  };

  // While dragging, the height follows the finger, so it must not animate.
  const transition = dragHeight !== null ? "[transition:none]" : open ? TRANSITION_SHOWN : TRANSITION_HIDDEN;
  const className = [
    "absolute top-[72px] bottom-3 z-5 flex flex-col gap-4 overflow-y-auto rounded-2xl border border-border bg-panel p-5 text-foreground shadow-panel backdrop-blur-sm",
    "mobile:inset-x-0 mobile:top-auto mobile:bottom-0 mobile:w-auto mobile:gap-0 mobile:overflow-hidden mobile:border-b-0 mobile:p-0",
    SIDE_CLASS[side],
    transition,
    "motion-reduce:[transition:none]",
    open ? "" : `pointer-events-none invisible opacity-0 ${HIDDEN_TRANSFORM[side]} mobile:[transform:translateY(40px)]`,
    SNAP_CLASS[snap],
  ].join(" ");

  return (
    <aside
      ref={ref}
      id={id}
      className={className}
      style={dragHeight !== null ? { height: dragHeight } : undefined}
      aria-label={label}
      aria-hidden={!open}
    >
      <button
        type="button"
        className={`hidden h-8 w-full flex-none cursor-grab touch-none items-center justify-center border-0 bg-none mobile:flex focus-visible:rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent ${HANDLE_CLASS[snap]}`}
        aria-label="Ajustar a altura do painel. Deslize para cima ou para baixo."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endDrag(e, false)}
        onPointerCancel={(e) => endDrag(e, true)}
        onKeyDown={onKeyDown}
      >
        <span className="h-[5px] w-10 rounded-[3px] bg-muted opacity-50" aria-hidden />
      </button>
      <div ref={bodyRef} className="contents mobile:flex mobile:min-h-0 mobile:flex-1 mobile:flex-col mobile:gap-4 mobile:overflow-y-auto mobile:overscroll-contain mobile:px-5 mobile:pt-0 mobile:pb-[calc(20px+env(safe-area-inset-bottom))]">
        {children}
      </div>
    </aside>
  );
}
