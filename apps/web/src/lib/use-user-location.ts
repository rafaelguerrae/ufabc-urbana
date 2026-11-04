"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UserPosition {
  lng: number;
  lat: number;
  /** Radius in meters reported by the device. */
  accuracy: number;
}

/** idle: never asked; asking: waiting for the browser; active: dot is live; denied / unavailable: no position. */
export type LocationStatus = "idle" | "asking" | "active" | "denied" | "unavailable";

const OPTIONS: PositionOptions = { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 };

/**
 * Follows the device position once `start` is called (the browser asks for permission then, not on load).
 * The position only lives in this component's state; it is never sent or stored.
 */
export function useUserLocation() {
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const watchId = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(
    (onFirstFix?: (position: UserPosition) => void) => {
      if (!("geolocation" in navigator)) {
        setStatus("unavailable");
        return;
      }
      if (watchId.current !== null) return;
      setStatus("asking");
      let first = true;
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          const next = { lng: pos.coords.longitude, lat: pos.coords.latitude, accuracy: pos.coords.accuracy };
          setPosition(next);
          setStatus("active");
          if (first) {
            first = false;
            onFirstFix?.(next);
          }
        },
        (err) => {
          // After a first fix, timeouts and lost signal are transient: keep following.
          if (err.code !== err.PERMISSION_DENIED && !first) return;
          stop();
          setPosition(null);
          setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
        },
        OPTIONS,
      );
    },
    [stop],
  );

  return { position, status, start };
}
