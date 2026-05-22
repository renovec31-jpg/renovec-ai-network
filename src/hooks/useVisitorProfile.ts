import { useState, useEffect, useCallback, useRef } from 'react';
import type { SessionSignals, VisitorProfile, DeviceType } from '../services/welcome/types';

function detectDeviceType(): DeviceType {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function detectOS(): string {
  const ua = navigator.userAgent;
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS/.test(ua)) return 'macOS';
  if (/Android/.test(ua)) return 'Android';
  if (/iPhone|iPad/.test(ua)) return 'iOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'unknown';
}

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'unknown';
}

function getUtmParam(name: string): string | null {
  try {
    return new URL(window.location.href).searchParams.get(name);
  } catch { return null; }
}

function guessRegionFromTimezone(tz: string): string | null {
  if (/Europe\/Paris|Europe\/Toulouse/.test(tz)) return 'France métropolitaine';
  if (/Europe\//.test(tz)) return 'Europe';
  if (/America\//.test(tz)) return 'Amérique';
  if (/Africa\//.test(tz)) return 'Afrique';
  if (/Asia\//.test(tz)) return 'Asie';
  return null;
}

function generateSessionId(): string {
  return `vs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useVisitorProfile() {
  const startTime = useRef(Date.now());
  const [profile, setProfile] = useState<VisitorProfile | null>(null);
  const interactionCountRef = useRef(0);
  const textInputsRef = useRef<string[]>([]);
  const pagesViewedRef = useRef(1);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const signals: SessionSignals = {
      language: navigator.language || 'fr',
      timezone: tz,
      deviceType: detectDeviceType(),
      os: detectOS(),
      browser: detectBrowser(),
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      referrer: document.referrer || '',
      utmSource: getUtmParam('utm_source'),
      utmMedium: getUtmParam('utm_medium'),
      utmCampaign: getUtmParam('utm_campaign'),
      approximateRegion: guessRegionFromTimezone(tz),
      pagesViewed: 1,
      timeOnSiteMs: 0,
      interactionCount: 0,
      textInputs: [],
    };

    setProfile({
      sessionId: generateSessionId(),
      signals,
      hypotheses: {
        probableIntent: 'discovery',
        intentConfidence: 0.3,
        urgencyLevel: 0,
        territorialNeed: signals.approximateRegion,
        needVsOffer: 0.5,
        explorationLikelihood: 0.7,
        hesitationSignals: 0,
      },
      conversationTurns: 0,
      enrichedFields: [],
      createdAt: Date.now(),
    });
  }, []);

  const recordInteraction = useCallback(() => {
    interactionCountRef.current++;
    setProfile(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        signals: {
          ...prev.signals,
          interactionCount: interactionCountRef.current,
          timeOnSiteMs: Date.now() - startTime.current,
        },
      };
    });
  }, []);

  const recordTextInput = useCallback((text: string) => {
    textInputsRef.current = [...textInputsRef.current.slice(-9), text];
    setProfile(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        signals: {
          ...prev.signals,
          textInputs: textInputsRef.current,
          timeOnSiteMs: Date.now() - startTime.current,
        },
        conversationTurns: prev.conversationTurns + 1,
      };
    });
  }, []);

  const recordPageView = useCallback(() => {
    pagesViewedRef.current++;
    setProfile(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        signals: { ...prev.signals, pagesViewed: pagesViewedRef.current },
      };
    });
  }, []);

  const enrichField = useCallback((field: string) => {
    setProfile(prev => {
      if (!prev) return prev;
      if (prev.enrichedFields.includes(field)) return prev;
      return { ...prev, enrichedFields: [...prev.enrichedFields, field] };
    });
  }, []);

  return {
    profile,
    recordInteraction,
    recordTextInput,
    recordPageView,
    enrichField,
  };
}
