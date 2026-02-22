"use client";

import { useCallback, useEffect, useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";
const SCRIPT_ID = "recaptcha-v3-script";

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export function useRecaptcha() {
  const readyRef = useRef(false);

  useEffect(() => {
    if (!SITE_KEY || document.getElementById(SCRIPT_ID)) {
      readyRef.current = !!window.grecaptcha;
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    script.async = true;
    script.onload = () => {
      window.grecaptcha.ready(() => {
        readyRef.current = true;
      });
    };
    document.head.appendChild(script);
  }, []);

  const executeRecaptcha = useCallback(async (action: string): Promise<string | null> => {
    if (!SITE_KEY) return null;

    // 스크립트 로드 대기 (최대 5초)
    if (!readyRef.current) {
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (window.grecaptcha) {
            window.grecaptcha.ready(() => {
              readyRef.current = true;
              clearInterval(check);
              resolve();
            });
          }
        }, 100);
        setTimeout(() => { clearInterval(check); resolve(); }, 5000);
      });
    }

    if (!window.grecaptcha) return null;

    try {
      return await window.grecaptcha.execute(SITE_KEY, { action });
    } catch {
      console.error("reCAPTCHA execute failed");
      return null;
    }
  }, []);

  return { executeRecaptcha };
}
