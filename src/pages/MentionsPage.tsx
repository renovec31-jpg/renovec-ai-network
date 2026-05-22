import { X } from 'lucide-react';

type Props = { onClose: () => void };

export default function MentionsPage({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-6 pt-5 pb-4 flex items-center justify-between border-b border-stone-100">
          <h2 className="text-base font-semibold text-stone-900">Mentions légales</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 transition-colors rounded-lg hover:bg-stone-100"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-7 space-y-8">

          <section>
            <h3 className="text-sm font-semibold text-stone-900 mb-3">RENOVEC — Intermédiaire de mise en relation humaine</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              RENOVEC est une plateforme d'intermédiation qui facilite les mises en relation entre personnes traversant une situation et personnes souhaitant apporter leur aide. RENOVEC n'est pas partie à l'échange, à l'accord, ni au contrat éventuel entre les utilisateurs.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-stone-900 mb-3">Responsabilité des utilisateurs</h3>
            <p className="text-xs text-stone-500 leading-relaxed mb-2">
              Chaque utilisateur est responsable de la qualité, de l'exactitude et de la pertinence des informations qu'il partage sur la plateforme. RENOVEC n'effectue pas de vérification des identités, des titres ou des qualifications des utilisateurs.
            </p>
            <p className="text-xs text-stone-500 leading-relaxed">
              Les utilisateurs sont seuls responsables des échanges qu'ils initient ou auxquels ils participent.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-stone-900 mb-3">Clarification par intelligence artificielle</h3>
            <p className="text-xs text-stone-500 leading-relaxed mb-2">
              La clarification de situation proposée par le coordinateur RENOVEC est indicative. Elle vise à aider l'utilisateur à mieux formuler sa situation et à identifier des pistes de solution, mais ne constitue pas un diagnostic médical, psychologique, juridique ou financier.
            </p>
            <p className="text-xs text-stone-500 leading-relaxed">
              En cas de situation d'urgence médicale, psychiatrique ou de danger immédiat, composez le 15 (SAMU), le 17 (Police) ou le 18 (Pompiers). Pour une détresse psychologique, contactez le 3114 (numéro national de prévention du suicide).
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-stone-900 mb-3">Capital de contribution</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Les points de contribution accumulés sur RENOVEC ne constituent pas une monnaie, un avoir financier, ni un actif patrimonial. Ils ne sont pas convertibles en numéraire. Leur valeur est purement symbolique et sociale, au sein du réseau RENOVEC uniquement.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-stone-900 mb-3">Données personnelles</h3>
            <p className="text-xs text-stone-500 leading-relaxed mb-2">
              RENOVEC collecte et traite les données personnelles de ses utilisateurs dans le strict respect du Règlement Général sur la Protection des Données (RGPD - Règlement UE 2016/679).
            </p>
            <div className="space-y-2 mt-2">
              {[
                'Vos données sont stockées de manière sécurisée via Supabase (hébergement EU).',
                'Vos situations et échanges sont confidentiels et ne sont pas vendus à des tiers.',
                "Vous pouvez demander la suppression de vos données à tout moment depuis la section Paramètres.",
                "Les données de clarification sont utilisées uniquement pour améliorer la mise en relation.",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-stone-300 mt-1.5 flex-shrink-0" />
                  <p className="text-xs text-stone-500 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-stone-900 mb-3">Propriété intellectuelle</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Le nom RENOVEC, le concept de "coordinateur de situations humaines" et l'architecture du réseau sont la propriété de leurs auteurs. Toute reproduction ou utilisation commerciale sans autorisation est interdite.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-stone-900 mb-3">Contact</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Pour toute question relative à ces mentions légales, à vos données personnelles, ou au fonctionnement de la plateforme, contactez-nous via la section Paramètres de votre espace personnel.
            </p>
          </section>

          <p className="text-xs text-stone-300 text-center pt-2">
            RENOVEC · Human Capability Network · 2026
          </p>

          <button
            onClick={onClose}
            className="w-full py-3.5 border border-stone-200 text-stone-600 text-sm font-medium rounded-xl hover:bg-stone-50 transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
