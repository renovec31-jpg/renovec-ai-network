import { MapPin } from 'lucide-react';

type Props = {
  onAccept: () => void;
  onRefuse: () => void;
};

export default function GeolocationConsentModal({ onAccept, onRefuse }: Props) {
  return (
    <div className="fixed inset-0 z-[8000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onRefuse} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="geo-dialog-title"
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-6">
          <div className="w-12 h-12 bg-[#F26522]/10 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <MapPin size={22} className="text-[#F26522]" aria-hidden="true" />
          </div>

          <h2 id="geo-dialog-title" className="text-base font-semibold text-stone-900 text-center mb-2">
            Utilisation de votre position
          </h2>

          <p className="text-sm text-stone-500 leading-relaxed text-center mb-4">
            Pour afficher les membres proches de vous, nous allons demander votre position <strong>approximative</strong> (arrondie à environ 10 km).
          </p>

          <div className="bg-stone-50 rounded-xl p-3 mb-4 space-y-2">
            {[
              { label: 'Données collectées', value: 'Position approximative (~10 km)' },
              { label: 'Finalité', value: 'Afficher les membres proches' },
              { label: 'Stockage', value: 'Durée de la session uniquement' },
              { label: 'Transmission', value: 'Non transmise à des tiers' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-2">
                <span className="text-[11px] font-semibold text-stone-600 flex-shrink-0">{label} :</span>
                <span className="text-[11px] text-stone-500">{value}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-stone-400 text-center mb-4">
            Vous pouvez refuser sans impact sur l'utilisation du service.{' '}
            <a href="/politique-de-confidentialite" className="text-[#F26522] hover:underline">
              Politique de confidentialité
            </a>
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={onAccept}
              className="w-full py-3 bg-[#F26522] text-white text-sm font-semibold rounded-xl hover:bg-[#e05510] transition-colors"
            >
              Autoriser ma position
            </button>
            <button
              onClick={onRefuse}
              className="w-full py-2.5 border border-stone-200 text-stone-600 text-sm font-medium rounded-xl hover:bg-stone-50 transition-colors"
            >
              Refuser
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
