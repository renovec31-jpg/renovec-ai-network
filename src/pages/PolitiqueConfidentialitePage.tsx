import { X, ArrowLeft } from 'lucide-react';

type Props = {
  onClose?: () => void;
  standalone?: boolean;
};

export default function PolitiqueConfidentialitePage({ onClose, standalone }: Props) {
  const content = (
    <div className="px-6 py-7 space-y-8 text-stone-800">

      <section>
        <h2 className="text-base font-semibold text-stone-900 mb-3">1. Responsable du traitement</h2>
        <p className="text-sm text-stone-600 leading-relaxed">
          RENOVEC — Human Capability Network<br />
          Contact : <a href="mailto:privacy@renovec.fr" className="text-[#F26522] hover:underline">privacy@renovec.fr</a>
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-stone-900 mb-3">2. Données collectées et finalités</h2>
        <div className="space-y-3">
          {[
            { cat: 'Données de profil', data: 'Prénom, nom affiché, photo, compétences, description', base: 'Exécution du contrat (inscription)', duree: '3 ans après dernière activité' },
            { cat: 'Données de localisation', data: 'Position approximative (~10 km), ville', base: 'Consentement explicite', duree: 'Durée de la session uniquement' },
            { cat: 'Situations exprimées', data: 'Texte libre décrivant un besoin ou une capacité', base: 'Exécution du contrat', duree: '2 ans' },
            { cat: 'Données techniques', data: 'Adresse IP, logs de connexion, type de navigateur', base: 'Intérêt légitime (sécurité)', duree: '12 mois' },
            { cat: 'Cookies analytiques', data: 'Comportement de navigation anonymisé', base: 'Consentement', duree: '13 mois' },
          ].map(({ cat, data, base, duree }) => (
            <div key={cat} className="border border-stone-100 rounded-xl p-3">
              <p className="text-sm font-semibold text-stone-800 mb-1">{cat}</p>
              <p className="text-xs text-stone-500"><span className="font-medium">Données :</span> {data}</p>
              <p className="text-xs text-stone-500"><span className="font-medium">Base légale :</span> {base}</p>
              <p className="text-xs text-stone-500"><span className="font-medium">Conservation :</span> {duree}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-stone-900 mb-3">3. Destinataires des données</h2>
        <p className="text-sm text-stone-600 leading-relaxed mb-2">
          Vos données sont hébergées chez <strong>Supabase Inc.</strong> (infrastructure EU) et ne sont jamais vendues à des tiers.
          Aucun transfert hors Union Européenne pour les données personnelles identifiantes.
        </p>
        <p className="text-sm text-stone-600 leading-relaxed">
          Les membres du réseau voient uniquement les informations de votre profil public (prénom affiché, compétences, ville, photo de profil si vous l'avez fournie).
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-stone-900 mb-3">4. Géolocalisation</h2>
        <p className="text-sm text-stone-600 leading-relaxed">
          Si vous autorisez la géolocalisation, votre position est arrondie à environ 10 km. Elle est utilisée uniquement pour afficher les membres proches de vous. Elle n'est pas stockée sur nos serveurs de façon permanente et n'est pas partagée avec des tiers.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-stone-900 mb-3">5. Vos droits</h2>
        <p className="text-sm text-stone-600 leading-relaxed mb-3">
          Conformément au RGPD, vous disposez des droits suivants :
        </p>
        <ul className="space-y-2">
          {[
            { droit: 'Accès', desc: 'Obtenir une copie de vos données personnelles' },
            { droit: 'Rectification', desc: 'Corriger des données inexactes' },
            { droit: 'Effacement', desc: 'Supprimer votre compte et vos données' },
            { droit: 'Portabilité', desc: 'Recevoir vos données dans un format structuré' },
            { droit: 'Opposition', desc: 'Vous opposer au traitement basé sur l\'intérêt légitime' },
            { droit: 'Limitation', desc: 'Limiter temporairement l\'utilisation de vos données' },
            { droit: 'Retrait du consentement', desc: 'Retirer votre consentement à tout moment' },
          ].map(({ droit, desc }) => (
            <li key={droit} className="flex gap-2 text-sm text-stone-600">
              <span className="font-semibold text-stone-800 flex-shrink-0">{droit} :</span>
              <span>{desc}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-stone-600 mt-3">
          Pour exercer vos droits : <a href="mailto:privacy@renovec.fr" className="text-[#F26522] hover:underline">privacy@renovec.fr</a>
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-stone-900 mb-3">6. Cookies</h2>
        <p className="text-sm text-stone-600 leading-relaxed">
          Nous utilisons des cookies strictement nécessaires au fonctionnement du service (authentification, préférences) et, avec votre consentement, des cookies analytiques anonymisés. Vous pouvez gérer vos préférences via la bannière de consentement.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-stone-900 mb-3">7. Réclamation</h2>
        <p className="text-sm text-stone-600 leading-relaxed">
          Vous avez le droit d'introduire une réclamation auprès de la{' '}
          <strong>Commission Nationale de l'Informatique et des Libertés (CNIL)</strong>{' '}
          — <a href="https://www.cnil.fr" className="text-[#F26522] hover:underline" target="_blank" rel="noopener noreferrer">cnil.fr</a>
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
            <h1 className="text-sm font-semibold tracking-tight text-stone-900">Politique de confidentialité</h1>
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
          <h2 className="text-base font-semibold text-stone-900">Politique de confidentialité</h2>
          <button onClick={onClose} className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors" aria-label="Fermer">
            <X size={15} />
          </button>
        </div>
        {content}
      </div>
    </div>
  );
}
