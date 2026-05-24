import { X, ArrowLeft } from 'lucide-react';

type Props = {
  onClose?: () => void;
  standalone?: boolean;
};

export default function ConditionsGeneralesPage({ onClose, standalone }: Props) {
  const content = (
    <div className="px-6 py-7 space-y-8 text-stone-800">

      <section>
        <h2 className="text-base font-semibold text-stone-900 mb-3">1. Objet</h2>
        <p className="text-sm text-stone-600 leading-relaxed">
          Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme RENOVEC, réseau humain orchestré par intelligence artificielle, accessible sur renovec.fr. En vous inscrivant, vous acceptez sans réserve les présentes CGU.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-stone-900 mb-3">2. Description du service</h2>
        <p className="text-sm text-stone-600 leading-relaxed">
          RENOVEC est une plateforme d'intermédiation permettant à ses membres de partager leurs capacités (compétences, ressources, disponibilités) et d'exprimer des situations nécessitant de l'aide. Une intelligence artificielle analyse les situations et coordonne les mises en relation.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-stone-900 mb-3">3. Conditions d'accès</h2>
        <ul className="space-y-2">
          {[
            'Être âgé d\'au moins 18 ans',
            'Fournir une adresse email valide',
            'Créer un profil honnête et sincère',
            'Ne pas utiliser le service à des fins commerciales non autorisées',
          ].map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-stone-600">
              <span className="w-1 h-1 rounded-full bg-stone-400 mt-2 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-stone-900 mb-3">4. Obligations des membres</h2>
        <p className="text-sm text-stone-600 leading-relaxed mb-2">Les membres s'engagent à :</p>
        <ul className="space-y-2">
          {[
            'Fournir des informations exactes sur leurs capacités et disponibilités',
            'Respecter les autres membres et s\'abstenir de tout comportement abusif ou discriminatoire',
            'Ne pas diffuser de contenu illicite, offensant, trompeur ou portant atteinte aux droits de tiers',
            'Ne pas utiliser RENOVEC pour démarcher commercialement sans accord préalable',
            'Honorer les engagements pris lors des mises en relation',
          ].map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-stone-600">
              <span className="w-1 h-1 rounded-full bg-stone-400 mt-2 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-stone-900 mb-3">5. Contenus interdits</h2>
        <p className="text-sm text-stone-600 leading-relaxed">
          Sont strictement interdits les contenus à caractère haineux, sexuel, violent, diffamatoire, ou portant atteinte à la vie privée d'autrui. RENOVEC se réserve le droit de supprimer tout contenu non conforme et de suspendre le compte de l'auteur.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-stone-900 mb-3">6. Utilisation de l'IA</h2>
        <p className="text-sm text-stone-600 leading-relaxed">
          Les analyses et mises en relation effectuées par le coordinateur IA sont indicatives et non garanties. RENOVEC ne garantit pas la pertinence ou l'exactitude des suggestions de l'IA. Les situations exprimées peuvent être utilisées pour améliorer le service, dans le respect de l'anonymisation.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-stone-900 mb-3">7. Propriété intellectuelle</h2>
        <p className="text-sm text-stone-600 leading-relaxed">
          Le contenu que vous soumettez sur RENOVEC vous appartient. Vous accordez à RENOVEC une licence non exclusive pour l'afficher aux membres pertinents dans le cadre du service. RENOVEC conserve tous les droits sur la marque, le design et la technologie de la plateforme.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-stone-900 mb-3">8. Suspension et clôture de compte</h2>
        <p className="text-sm text-stone-600 leading-relaxed">
          Vous pouvez supprimer votre compte à tout moment depuis vos paramètres. RENOVEC se réserve le droit de suspendre ou supprimer tout compte en violation des présentes CGU, sans préavis ni indemnité.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-stone-900 mb-3">9. Limitation de responsabilité</h2>
        <p className="text-sm text-stone-600 leading-relaxed">
          RENOVEC est une plateforme d'intermédiation. Elle n'est pas partie aux échanges entre membres et ne saurait être tenue responsable des actions, omissions, ou manquements des membres entre eux. L'utilisation du service est aux risques et périls de l'utilisateur.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-stone-900 mb-3">10. Droit applicable et juridiction</h2>
        <p className="text-sm text-stone-600 leading-relaxed">
          Les présentes CGU sont soumises au droit français. En cas de litige, les tribunaux compétents sont ceux du ressort de Paris, sauf disposition légale impérative contraire.
        </p>
      </section>

      <p className="text-xs text-stone-300 text-center pt-2">
        Dernière mise à jour : 24 mai 2026 · RENOVEC
      </p>
    </div>
  );

  if (standalone) {
    return (
      <div className="min-h-screen bg-white">
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-stone-100 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#F26522] rounded-lg flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-sm bg-white/90" />
            </div>
            <h1 className="text-sm font-semibold tracking-tight text-stone-900">Conditions Générales d'Utilisation</h1>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors" aria-label="Retour">
              <ArrowLeft size={15} />
            </button>
          )}
        </div>
        <div className="max-w-2xl mx-auto">{content}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-6 pt-5 pb-4 flex items-center justify-between border-b border-stone-100">
          <h2 className="text-base font-semibold text-stone-900">Conditions Générales d'Utilisation</h2>
          <button onClick={onClose} className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors" aria-label="Fermer">
            <X size={15} />
          </button>
        </div>
        {content}
      </div>
    </div>
  );
}
