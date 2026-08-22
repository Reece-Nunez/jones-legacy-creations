"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { X, Share, PlusSquare, Download } from "lucide-react";
import { useStoredValue, writeStoredValue } from "@/lib/hooks/useBrowserStore";

const DISMISSED_KEY = "pwa-banner-dismissed";

/** Never changes after load, so nothing to subscribe to. */
const noSubscription = () => () => {};

/**
 * Which install flow applies, or null when the banner has no business showing:
 * already running standalone, or on a platform we can't install to.
 *
 * Returns a primitive so it is safe as a useSyncExternalStore snapshot — an
 * object would be a fresh reference each call and loop forever.
 */
function detectPlatform(): "ios" | "android" | null {
  if (window.matchMedia("(display-mode: standalone)").matches) return null;
  if ((window.navigator as { standalone?: boolean }).standalone === true) return null;

  const ua = navigator.userAgent.toLowerCase();
  const isIos =
    /iphone|ipad|ipod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIos) return "ios";
  if (/android/.test(ua)) return "android";
  return null;
}

/**
 * Shows a one-time install banner for PWA.
 * - iOS/iPadOS: instructs user to tap Share → Add to Home Screen
 * - Android/Chrome: uses the native beforeinstallprompt event
 * - Hides if already installed (standalone mode) or previously dismissed
 */
export function PwaInstallBanner() {
  // Environment detection is a read of the browser, not React state, so it is
  // a store snapshot rather than something an effect assigns after mount.
  const platform = useSyncExternalStore(noSubscription, detectPlatform, () => null);
  const dismissed = useStoredValue(DISMISSED_KEY) !== null;
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  // The effect now only subscribes, which is what effects are for. Android
  // waits for this event before showing anything; iOS has no equivalent and
  // shows immediately.
  useEffect(() => {
    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  const show =
    !dismissed &&
    (platform === "ios" || (platform === "android" && deferredPrompt !== null));

  const dismiss = useCallback(() => {
    writeStoredValue(DISMISSED_KEY, "1");
  }, []);

  const installAndroid = useCallback(async () => {
    if (!deferredPrompt) return;
    // @ts-expect-error - beforeinstallprompt type
    await deferredPrompt.prompt();
    dismiss();
  }, [deferredPrompt, dismiss]);

  if (!show) return null;

  return (
    <div className="fixed bottom-16 left-2 right-2 z-50 sm:bottom-20 sm:left-4 sm:right-4 lg:bottom-4 lg:left-auto lg:right-4 lg:max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900 text-white rounded-xl shadow-2xl p-4 relative">
        <button
          onClick={dismiss}
          className="absolute top-2 right-2 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="pr-8">
          <p className="font-semibold text-sm mb-1">Install JLC Admin</p>

          {platform === "ios" ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-300 leading-relaxed">
                Add this app to your home screen for quick access — no app store needed.
              </p>
              <div className="flex items-start gap-3 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="bg-slate-700 rounded p-1"><Share className="w-3.5 h-3.5 text-blue-400" /></span>
                  <span className="font-medium text-white">1.</span>
                </div>
                <span>Tap the <strong className="text-white">Share</strong> button in Safari</span>
              </div>
              <div className="flex items-start gap-3 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="bg-slate-700 rounded p-1"><PlusSquare className="w-3.5 h-3.5 text-blue-400" /></span>
                  <span className="font-medium text-white">2.</span>
                </div>
                <span>Scroll down and tap <strong className="text-white">Add to Home Screen</strong></span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-300 leading-relaxed">
                Install this app for quick access from your home screen.
              </p>
              <button
                onClick={installAndroid}
                className="flex items-center gap-2 bg-white text-slate-900 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-slate-100 active:scale-95 transition-all min-h-[44px] w-full justify-center"
              >
                <Download className="w-4 h-4" />
                Install App
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
