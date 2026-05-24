import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const CONSENT_KEY = 'renovec_cookie_consent';

type ConsentState = 'accepted' | 'refused' | 'custom' | null;

interface ConsentPrefs {
  analytics: boolean;
  state: ConsentState;
}

function loadConsent(): ConsentPrefs | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveConsent(prefs: ConsentPrefs) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [analyticsChecked, setAnalyticsChecked] = useState(false);

  useEffect(() => {
    const existing = loadConsent();
    if (!existing) {
      // Delay slightly to avoid flash on first paint
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  function acceptAll() {
    saveConsent({ analytics: true, state: 'accepted' });
    setVisible(false);
  }

  function refuseAll() {
    saveConsent({ analytics: false, state: 'refused' });
    setVisible(false);
  }

  function saveCustom() {
    saveConsent({ analytics: analyticsChecked, state: 'custom' });
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-banner-title"
      className="fixed bottom-0 left-0 right-0 z-[9000] p-4 sm:p-6"
    >
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl border border-stone-100 overflow-hidden">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 id="cookie-banner-title" className="text-sm font-semibold text-stone-900">
              Gestion des cookies
            </h2>
            <button
              onClick={refuseAll}
              className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors flex-shrink-0"
              aria-label="Refuser tous les cookies et fermer"
            >
              <X size={14} />
            </button>
          </div>

          <p className="text-xs text-stone-500 leading-relaxed mb-4">
            RENOVEC utilise des cookies strictement nécessaires au fonctionnement du service (authentification, préférences). Avec votre accord, nous utilisons également des cookies analytiques anonymisés pour améliorer l'expérience.
            {' '}<a href="/politique-de-confidentialite" className="text-[#F26522] hover:underline">En savoir plus</a>
          </p>

          {showDetail && (
            <div className="mb-4 p-3 bg-stone-50 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-stone-800">Cookies nécessaires</p>
                  <p className="text-[11px] text-stone-500">Authentification, session — toujours actifs</p>
                </div>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Toujours actif</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="analytics-toggle" className="text-xs font-semibold text-stone-800 cursor-pointer">Cookies analytiques</label>
                  <p className="text-[11px] text-stone-500">Mesure d'audience anonymisée</p>
                </div>
                <button
                  id="analytics-toggle"
                  role="switch"
                  aria-checked={analyticsChecked}
                  onClick={() => setAnalyticsChecked(c => !c)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${analyticsChecked ? 'bg-[#F26522]' : 'bg-stone-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${analyticsChecked ? 'translate-x-4' : 'translate-x-0'}`} />
                  <span className="sr-only">{analyticsChecked ? 'Désactiver' : 'Activer'} les cookies analytiques</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={acceptAll}
              className="flex-1 min-w-[120px] py-2.5 bg-[#F26522] text-white text-xs font-semibold rounded-xl hover:bg-[#e05510] transition-colors"
            >
              Accepter tout
            </button>
            <button
              onClick={refuseAll}
              className="flex-1 min-w-[120px] py-2.5 border border-stone-200 text-stone-700 text-xs font-semibold rounded-xl hover:bg-stone-50 transition-colors"
            >
              Refuser tout
            </button>
            {showDetail ? (
              <button
                onClick={saveCustom}
                className="w-full py-2 text-xs text-stone-500 hover:text-stone-800 transition-colors underline"
              >
                Enregistrer mes choix
              </button>
            ) : (
              <button
                onClick={() => setShowDetail(true)}
                className="w-full py-2 text-xs text-stone-400 hover:text-stone-700 transition-colors"
              >
                Personnaliser
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
