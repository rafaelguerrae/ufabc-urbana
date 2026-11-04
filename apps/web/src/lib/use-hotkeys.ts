"use client";

import { useEffect, useRef } from "react";

export interface Hotkey {
  /** `KeyboardEvent.key` value, compared case-insensitively. */
  key: string;
  /** Requires Ctrl (or Cmd on macOS). Without it the key only fires with no modifier held. */
  ctrl?: boolean;
  /** Fires even while typing in a field. Single keys are ignored there by default. */
  allowInInput?: boolean;
  handler: (e: KeyboardEvent) => void;
}

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")
  );
}

/** One window keydown listener for all hotkeys; the latest bindings are read on each key press. */
export function useHotkeys(hotkeys: Hotkey[]) {
  const latest = useRef(hotkeys);
  latest.current = hotkeys;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.altKey) return;
      const withCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const hotkey = latest.current.find((h) => h.key.toLowerCase() === key && !!h.ctrl === withCtrl);
      if (!hotkey || (isTyping(e.target) && !hotkey.allowInInput)) return;
      e.preventDefault();
      hotkey.handler(e);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
