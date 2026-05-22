/*
  # Seed capability_profiles + Fix RLS situation_graph & coordinator_signals

  ## 1. Seed 50 capability_profiles
  Insère des profils de capacités synthétiques réalistes attachés à l'unique
  utilisateur existant en base. Ces profils permettent au matching interne de
  retourner des résultats pour toute situation exprimée.

  ## 2. Fix RLS situation_graph : OR → AND
  Empêche un utilisateur de voir les liens dont il n'est qu'une extrémité.

  ## 3. Fix RLS coordinator_signals INSERT
  Vérifie que user_id dans la ligne = auth.uid() et que le need appartient
  bien à cet utilisateur.
*/

DO $$
DECLARE
  seed_user_id uuid;
BEGIN
  -- Prend le premier user existant dans auth.users comme propriétaire seed
  SELECT id INTO seed_user_id FROM auth.users ORDER BY created_at LIMIT 1;

  IF seed_user_id IS NULL THEN
    RAISE NOTICE 'No auth user found — skipping capability_profiles seed';
    RETURN;
  END IF;

  INSERT INTO capability_profiles (
    id, user_id, title, tagline, summary,
    explicit_capabilities, implicit_capabilities, success_contexts,
    relational_style, help_formats, availability, is_published
  ) VALUES
  -- Technique & numérique
  ('11000001-0000-0000-0000-000000000001', seed_user_id,
   'Développeur web fullstack', 'Du back-end API au front-end React, bout en bout.',
   'Je développe des applications web modernes de A à Z. API REST, bases de données, interfaces React. Disponible pour des missions courtes ou longues.',
   ARRAY['développement web','React','Node.js','API REST','bases de données'],
   ARRAY['architecture technique','résolution de problèmes','documentation'],
   ARRAY['startup','PME','prototype à lancer rapidement'],
   'pragmatique', ARRAY['mission courte','mission longue','conseil'], 'available', true),

  ('11000001-0000-0000-0000-000000000002', seed_user_id,
   'Administrateur systèmes Linux', 'Serveurs, Docker, Kubernetes, CI/CD.',
   'Gestion de serveurs Linux, conteneurisation Docker/Kubernetes, pipelines CI/CD. Intervention sur incidents critiques et migrations cloud.',
   ARRAY['Linux','Docker','Kubernetes','CI/CD','cloud'],
   ARRAY['diagnostic systèmes','optimisation performance','sécurité infra'],
   ARRAY['startup tech','équipe devops','migration cloud'],
   'direct', ARRAY['intervention urgence','audit','formation'], 'available', true),

  ('11000001-0000-0000-0000-000000000003', seed_user_id,
   'Designer UX/UI', 'Interfaces centrées utilisateur, wireframes et prototypes Figma.',
   'Je conçois des interfaces qui fonctionnent pour de vraies personnes. Recherche utilisateur, wireframes, prototypes Figma haute fidélité, tests utilisateurs.',
   ARRAY['UX design','UI design','Figma','wireframes','tests utilisateurs'],
   ARRAY['empathie utilisateur','storytelling visuel','accessibilité'],
   ARRAY['refonte produit','nouveau produit','amélioration conversion'],
   'collaboratif', ARRAY['atelier','design sprint','accompagnement'], 'available', true),

  ('11000001-0000-0000-0000-000000000004', seed_user_id,
   'Expert cybersécurité', 'Audit sécurité, pentest, RGPD et ISO 27001.',
   'Audit de sécurité, tests de pénétration, mise en conformité RGPD et ISO 27001. Accompagnement PME et startups.',
   ARRAY['audit sécurité','pentest','RGPD','ISO 27001','gestion des risques'],
   ARRAY['cartographie des menaces','sensibilisation équipes','documentation sécurité'],
   ARRAY['avant lancement produit','après incident','mise en conformité'],
   'rigoureux', ARRAY['audit','formation','conseil'], 'soon', true),

  ('11000001-0000-0000-0000-000000000005', seed_user_id,
   'Data scientist & Machine Learning', 'Modèles prédictifs, NLP, Python et PyTorch.',
   'Je construis des modèles prédictifs et d analyse de données. NLP, classification, régression. Python, Pandas, scikit-learn, PyTorch.',
   ARRAY['data science','machine learning','NLP','Python','PyTorch'],
   ARRAY['structuration de problème','interprétation métier','visualisation données'],
   ARRAY['startup IA','données inexploitées','recherche appliquée'],
   'analytique', ARRAY['mission','conseil','formation'], 'available', true),

  -- Juridique & administratif
  ('11000001-0000-0000-0000-000000000006', seed_user_id,
   'Juriste droit des sociétés', 'Statuts, pactes associés, cessions. Conseil fondateurs.',
   'Création d entreprise, rédaction de statuts, pactes d associés, cessions de parts. Je travaille principalement avec des fondateurs.',
   ARRAY['droit des sociétés','création entreprise','statuts','pacte associés','cession'],
   ARRAY['anticipation des conflits','conseil stratégique','rédaction précise'],
   ARRAY['création de société','levée de fonds','réorganisation capitalistique'],
   'précis', ARRAY['consultation','rédaction','accompagnement'], 'available', true),

  ('11000001-0000-0000-0000-000000000007', seed_user_id,
   'Expert-comptable indépendant', 'Bilan, fiscalité, TVA, accompagnement levée de fonds.',
   'Bilan, liasses fiscales, déclarations TVA, accompagnement dans les phases de levée de fonds. TPE et PME.',
   ARRAY['comptabilité','fiscalité','TVA','bilan','levée de fonds'],
   ARRAY['lecture financière','optimisation fiscale','accompagnement décisionnel'],
   ARRAY['création entreprise','croissance','cession'],
   'rigoureux', ARRAY['suivi mensuel','conseil ponctuel','audit'], 'available', true),

  ('11000001-0000-0000-0000-000000000008', seed_user_id,
   'Médiatrice professionnelle certifiée', 'Conflits associés, litiges commerciaux, médiation.',
   'Résolution de conflits entre associés, litiges commerciaux, médiation dans les situations relationnelles d entreprise qui se bloquent.',
   ARRAY['médiation','résolution de conflits','négociation','communication non-violente'],
   ARRAY['écoute active','reformulation','création d espace de dialogue'],
   ARRAY['conflit d associés','litige fournisseur','tension d équipe'],
   'neutre', ARRAY['médiation','accompagnement','atelier'], 'available', true),

  ('11000001-0000-0000-0000-000000000009', seed_user_id,
   'Conseiller en droit du travail', 'Contrats, ruptures, prud hommes, représentation.',
   'Contrats de travail, ruptures conventionnelles, contentieux prud homal, représentation syndicale. Salarié comme employeur.',
   ARRAY['droit du travail','contrats','rupture conventionnelle','prud hommes'],
   ARRAY['analyse de situation','rédaction juridique','représentation'],
   ARRAY['conflit employeur-salarié','négociation de départ','restructuration RH'],
   'direct', ARRAY['consultation','accompagnement','représentation'], 'soon', true),

  ('11000001-0000-0000-0000-000000000010', seed_user_id,
   'Assistante administrative polyvalente', 'Courrier, agendas, secrétariat, rédaction officielle.',
   'Gestion de courrier, organisation d agendas complexes, secrétariat juridique, rédaction de courriers officiels. Très fiable.',
   ARRAY['secrétariat','gestion administrative','rédaction','organisation'],
   ARRAY['fiabilité','précision','anticipation'],
   ARRAY['surcharge administrative','lancement activité','absence temporaire'],
   'organisé', ARRAY['mission régulière','ponctuelle','formation'], 'available', true),

  -- Santé & bien-être
  ('11000001-0000-0000-0000-000000000011', seed_user_id,
   'Psychologue clinicienne', 'Anxiété, burnout, transitions de vie. Cabinet et distance.',
   'Accompagnement thérapeutique adultes et adolescents. Spécialisation en anxiété, épuisement professionnel et grandes transitions de vie.',
   ARRAY['psychologie clinique','thérapie','anxiété','burnout','transitions'],
   ARRAY['écoute profonde','cadre sécurisant','accompagnement sur la durée'],
   ARRAY['après un burnout','période de transition','anxiété chronique'],
   'chaleureux', ARRAY['suivi thérapeutique','consultation ponctuelle'], 'available', true),

  ('11000001-0000-0000-0000-000000000012', seed_user_id,
   'Coach transition professionnelle', 'Reconversion, création d activité, retrouver du sens.',
   'J accompagne les personnes qui veulent changer de métier, créer leur activité ou retrouver du sens dans leur travail.',
   ARRAY['coaching','transition professionnelle','reconversion','entrepreneuriat'],
   ARRAY['clarification de projet','décision','remobilisation'],
   ARRAY['après un licenciement','envie de reconversion','perte de sens'],
   'bienveillant', ARRAY['accompagnement individuel','atelier groupe'], 'available', true),

  ('11000001-0000-0000-0000-000000000013', seed_user_id,
   'Kinésithérapeute', 'Rééducation post-op, douleurs chroniques, sport.',
   'Rééducation post-opératoire, douleurs chroniques, sport. Prise en charge à domicile possible pour personnes à mobilité réduite.',
   ARRAY['kinésithérapie','rééducation','douleurs chroniques','sport'],
   ARRAY['diagnostic fonctionnel','accompagnement longue durée','éducation patient'],
   ARRAY['après une opération','douleurs chroniques','accident sportif'],
   'pragmatique', ARRAY['suivi','prise en charge','conseil'], 'available', true),

  ('11000001-0000-0000-0000-000000000014', seed_user_id,
   'Nutritionniste diététicienne', 'Rééquilibrage alimentaire, maladies chroniques, TCA.',
   'Conseils personnalisés, rééquilibrage alimentaire, soutien dans les maladies chroniques et les troubles du comportement alimentaire.',
   ARRAY['nutrition','diététique','rééquilibrage alimentaire','maladies chroniques','TCA'],
   ARRAY['écoute sans jugement','plan alimentaire adapté','suivi régulier'],
   ARRAY['diabète','troubles alimentaires','rééquilibrage poids'],
   'bienveillant', ARRAY['consultation','suivi','atelier'], 'available', true),

  ('11000001-0000-0000-0000-000000000015', seed_user_id,
   'Infirmière libérale', 'Soins à domicile, pansements, injections, post-hospit.',
   'Soins à domicile : pansements, injections, surveillance post-hospitalisation. Disponible week-end.',
   ARRAY['soins infirmiers','pansements','injections','post-hospitalisation'],
   ARRAY['coordination médicale','rassurance patient','transmission soignants'],
   ARRAY['sortie d hôpital','personne âgée','maladie chronique à domicile'],
   'chaleureux', ARRAY['soins réguliers','intervention ponctuelle'], 'available', true),

  -- Formation & transmission
  ('11000001-0000-0000-0000-000000000016', seed_user_id,
   'Formateur Excel & Google Sheets', 'Formules complexes, TCD, macros VBA.',
   'Maîtrise des formules complexes, tableaux croisés dynamiques, automatisation VBA. Formation individuelle ou en groupe.',
   ARRAY['Excel','Google Sheets','VBA','tableaux croisés dynamiques','automatisation'],
   ARRAY['pédagogie adaptée','exercices pratiques','documentation claire'],
   ARRAY['montée en compétence équipe','autonomie reporting','gain de temps'],
   'pédagogue', ARRAY['formation individuelle','formation groupe','mission ponctuelle'], 'available', true),

  ('11000001-0000-0000-0000-000000000017', seed_user_id,
   'Professeur de mathématiques', 'Soutien collège-lycée-BTS, prépa concours.',
   'Soutien scolaire de la 5e au BTS, préparation aux concours. Cours particuliers et petits groupes.',
   ARRAY['mathématiques','soutien scolaire','prépa concours','lycée','BTS'],
   ARRAY['pédagogie individualisée','patience','méthode'],
   ARRAY['difficulté en maths','préparation examen','remise à niveau'],
   'pédagogue', ARRAY['cours particulier','petit groupe','stage intensif'], 'available', true),

  ('11000001-0000-0000-0000-000000000018', seed_user_id,
   'Coach prise de parole en public', 'Présentation, gestion du stress, TEDx, pitchs.',
   'Techniques de présentation, gestion du trac, leadership visible. Préparation TEDx, soutenances, entretiens, pitchs.',
   ARRAY['prise de parole','présentation','leadership','communication','pitching'],
   ARRAY['confiance en soi','structure du discours','présence scénique'],
   ARRAY['avant une soutenance','avant un pitch','avant une conférence'],
   'dynamique', ARRAY['coaching individuel','atelier groupe','répétition'], 'available', true),

  ('11000001-0000-0000-0000-000000000019', seed_user_id,
   'Mentor entrepreneuriat', 'Idée, premiers clients, levée de fonds pré-seed.',
   'Structuration d idées, validation de concept, acquisition des premiers clients, préparation de levée de fonds pré-seed.',
   ARRAY['entrepreneuriat','stratégie','premiers clients','levée de fonds','MVP'],
   ARRAY['questionnement stratégique','réseau','expérience terrain'],
   ARRAY['première entreprise','pivot produit','recherche investisseurs'],
   'direct', ARRAY['mentorat','conseil','mise en réseau'], 'soon', true),

  ('11000001-0000-0000-0000-000000000020', seed_user_id,
   'Formatrice anglais et espagnol', 'Cours intensifs, TOEIC, DELF, conversations pro.',
   'Cours intensifs, préparation aux certifications (TOEIC, DELF), conversations professionnelles quotidiennes. Tous niveaux.',
   ARRAY['anglais','espagnol','TOEIC','DELF','conversation professionnelle'],
   ARRAY['immersion','culture professionnelle','oral naturel'],
   ARRAY['avant une expatriation','promotion professionnelle','voyage'],
   'pédagogue', ARRAY['cours individuel','groupe','intensif'], 'available', true),

  -- Artisanat & travaux
  ('11000001-0000-0000-0000-000000000021', seed_user_id,
   'Électricien certifié', 'Installation, mise aux normes, dépannage. Urgences 7j/7.',
   'Installation électrique, mise aux normes NFC 15-100, dépannage. Disponible pour les urgences 7 jours sur 7.',
   ARRAY['électricité','installation','mise aux normes','dépannage','urgences'],
   ARRAY['diagnostic rapide','intervention propre','conseil sécurité'],
   ARRAY['panne électrique','rénovation','mise en conformité'],
   'efficace', ARRAY['intervention urgence','devis travaux','conseil'], 'available', true),

  ('11000001-0000-0000-0000-000000000022', seed_user_id,
   'Plombier chauffagiste', 'Fuites, chauffe-eau, chauffage. Devis gratuit.',
   'Fuites d eau, installation de chauffe-eau, robinetterie, systèmes de chauffage. Devis gratuit, intervention rapide.',
   ARRAY['plomberie','chauffage','fuite d eau','chauffe-eau','robinetterie'],
   ARRAY['diagnostic fuite','conseil matériaux','intervention rapide'],
   ARRAY['urgence fuite','panne chauffage','rénovation salle de bain'],
   'efficace', ARRAY['urgence','travaux programmés','conseil'], 'available', true),

  ('11000001-0000-0000-0000-000000000023', seed_user_id,
   'Serrurier dépannage', 'Ouverture sans destruction, remplacement, sécurisation.',
   'Ouverture de porte sans destruction, remplacement de serrures, sécurisation d appartement. Intervention rapide.',
   ARRAY['serrurerie','ouverture de porte','sécurité','blindage','dépannage'],
   ARRAY['sans dégradation','conseil sécurité','rapidité intervention'],
   ARRAY['porte claquée','serrure cassée','après cambriolage'],
   'direct', ARRAY['urgence','travaux','conseil'], 'available', true),

  ('11000001-0000-0000-0000-000000000024', seed_user_id,
   'Menuisier ébéniste', 'Sur mesure, restauration de meubles anciens, escaliers.',
   'Fabrication sur mesure, restauration de meubles anciens, agencement intérieur, escaliers bois. Travail artisanal soigné.',
   ARRAY['menuiserie','ébénisterie','fabrication sur mesure','restauration','agencement'],
   ARRAY['sens du détail','travail artisanal','conseil matériaux'],
   ARRAY['meuble abîmé','aménagement sur mesure','restauration'],
   'artisanal', ARRAY['devis','réalisation','conseil'], 'available', true),

  ('11000001-0000-0000-0000-000000000025', seed_user_id,
   'Peintre en bâtiment', 'Intérieur, extérieur, enduits décoratifs, papier peint.',
   'Travaux de peinture intérieure et extérieure, enduits décoratifs, pose de papier peint. Chantiers propres, délais respectés.',
   ARRAY['peinture bâtiment','enduits','papier peint','ravalement','finitions'],
   ARRAY['travail soigné','respect délais','conseil couleurs'],
   ARRAY['rénovation appartement','rafraîchissement peinture','chantier neuf'],
   'organisé', ARRAY['devis','réalisation','conseil'], 'available', true),

  -- Accompagnement social
  ('11000001-0000-0000-0000-000000000026', seed_user_id,
   'Assistante sociale libérale', 'CAF, logement, retraite, handicap. Démarches complexes.',
   'Aide aux démarches CAF, logement social, retraite, handicap. Accompagnement administratif des personnes dans des situations complexes.',
   ARRAY['travail social','CAF','logement','retraite','handicap','MDPH'],
   ARRAY['connaissance des droits','accompagnement','patience'],
   ARRAY['situation précaire','démarches complexes','sortie hospitalisation'],
   'bienveillant', ARRAY['accompagnement','consultation','aide à la rédaction'], 'available', true),

  ('11000001-0000-0000-0000-000000000027', seed_user_id,
   'Soutien aux aidants familiaux', 'Répit, organisation, droits, coordination médicale.',
   'Accompagnement des proches aidants : répit, organisation du quotidien, information sur les droits, coordination avec les soignants.',
   ARRAY['aidants familiaux','répit','coordination médicale','droits','organisation'],
   ARRAY['écoute sans jugement','connaissance du système de soins','pragmatisme'],
   ARRAY['aidant épuisé','parent âgé dépendant','enfant malade'],
   'chaleureux', ARRAY['accompagnement','conseil','mise en réseau'], 'available', true),

  ('11000001-0000-0000-0000-000000000028', seed_user_id,
   'Traducteur interprète arabe-français', 'Documents officiels, interprétariat médical et juridique.',
   'Traduction de documents officiels, interprétariat lors de rendez-vous médicaux, juridiques ou administratifs. Arabe dialectal et littéraire.',
   ARRAY['traduction','interprétariat','arabe','français','documents officiels'],
   ARRAY['précision terminologique','neutralité','confidentialité'],
   ARRAY['rendez-vous médical','audience juridique','démarches administratives'],
   'neutre', ARRAY['traduction','interprétariat présentiel','à distance'], 'available', true),

  ('11000001-0000-0000-0000-000000000029', seed_user_id,
   'Chauffeur accompagnateur PMR', 'Transport personnes à mobilité réduite, rendez-vous médicaux.',
   'Transport de personnes à mobilité réduite vers leurs rendez-vous médicaux, administrations, famille. Véhicule adapté.',
   ARRAY['transport PMR','accompagnement','mobilité réduite','rendez-vous médicaux'],
   ARRAY['ponctualité','douceur','aide au déplacement'],
   ARRAY['personne âgée','handicap','sortie hôpital'],
   'bienveillant', ARRAY['transport régulier','ponctuel'], 'available', true),

  ('11000001-0000-0000-0000-000000000030', seed_user_id,
   'Bénévole aide alimentaire et accueil', 'Distribution alimentaire, préparation de colis.',
   'Distribution alimentaire, préparation de colis alimentaires, accueil au sein d épiceries sociales et d associations caritatives.',
   ARRAY['aide alimentaire','bénévolat','accueil','accompagnement social'],
   ARRAY['accueil sans jugement','organisation','travail d équipe'],
   ARRAY['précarité alimentaire','isolement social','urgence sociale'],
   'chaleureux', ARRAY['bénévolat ponctuel','régulier'], 'available', true),

  -- Finance & gestion
  ('11000001-0000-0000-0000-000000000031', seed_user_id,
   'Conseiller en gestion de patrimoine', 'Placements, assurance-vie, immobilier, retraite.',
   'Analyse personnalisée et indépendante : placements financiers, assurance-vie, investissement immobilier, préparation à la retraite.',
   ARRAY['gestion de patrimoine','placements','assurance-vie','immobilier','retraite'],
   ARRAY['analyse personnalisée','indépendance des conseils','pédagogie'],
   ARRAY['héritage','retraite approchante','excédent de trésorerie'],
   'rigoureux', ARRAY['bilan patrimonial','conseil','suivi'], 'available', true),

  ('11000001-0000-0000-0000-000000000032', seed_user_id,
   'Contrôleur de gestion freelance', 'Tableaux de bord, reporting, budgets pour PME.',
   'Mise en place de tableaux de bord, reporting mensuel, analyse des écarts, construction de budgets prévisionnels pour PME.',
   ARRAY['contrôle de gestion','reporting','tableaux de bord','budget','analyse financière'],
   ARRAY['synthèse','alertes anticipées','aide à la décision'],
   ARRAY['croissance rapide','perte de visibilité financière','préparation levée'],
   'analytique', ARRAY['mission récurrente','projet ponctuel','conseil'], 'soon', true),

  ('11000001-0000-0000-0000-000000000033', seed_user_id,
   'Spécialiste RH et paie', 'DADS, bulletins de paie, DSN, gestion des absences.',
   'Bulletins de paie, DSN, gestion des absences et congés, plan de formation. Spécialiste TPE, PME et associations.',
   ARRAY['paie','RH','DSN','gestion des absences','droit social'],
   ARRAY['fiabilité','conformité légale','accompagnement DRH'],
   ARRAY['premier salarié','externalisation paie','contrôle URSSAF'],
   'rigoureux', ARRAY['mission récurrente','conseil','formation'], 'available', true),

  ('11000001-0000-0000-0000-000000000034', seed_user_id,
   'Négociateur immobilier indépendant', 'Achat, vente, location, gestion locative.',
   'Achat, vente, location, gestion locative, estimation gratuite. Réseau national, honoraires réduits pour les particuliers.',
   ARRAY['immobilier','achat','vente','location','gestion locative'],
   ARRAY['négociation','connaissance du marché','accompagnement complet'],
   ARRAY['premier achat','investissement locatif','vente urgente'],
   'direct', ARRAY['mandat','conseil','accompagnement'], 'available', true),

  ('11000001-0000-0000-0000-000000000035', seed_user_id,
   'Consultant levée de fonds et aides publiques', 'BPI, subventions, CIR, CII, innovation.',
   'Préparation des dossiers BPI France, subventions régionales, CIR/CII, aides à l innovation pour startups et PME.',
   ARRAY['levée de fonds','BPI','subventions','CIR','CII','aides publiques'],
   ARRAY['montage dossier','argumentation','connaissance dispositifs'],
   ARRAY['projet innovant','financement non dilutif','R&D'],
   'rigoureux', ARRAY['audit éligibilité','montage dossier','conseil'], 'available', true),

  -- Communication & marketing
  ('11000001-0000-0000-0000-000000000036', seed_user_id,
   'Rédacteur web SEO', 'Articles, fiches produits, pages optimisées Google.',
   'Articles de blog, fiches produits, pages d atterrissage optimisées pour Google. Livraison rapide, ton adapté.',
   ARRAY['rédaction web','SEO','content marketing','copywriting','blog'],
   ARRAY['recherche de mots-clés','adaptation du ton','respect des délais'],
   ARRAY['lancement de site','stratégie de contenu','référencement naturel'],
   'créatif', ARRAY['rédaction','stratégie éditoriale','formation SEO'], 'available', true),

  ('11000001-0000-0000-0000-000000000037', seed_user_id,
   'Community manager', 'Réseaux sociaux, contenu, stratégie éditoriale.',
   'Gestion des réseaux sociaux, création de contenu, stratégie éditoriale, reporting mensuel. Instagram, LinkedIn, Facebook, TikTok.',
   ARRAY['community management','réseaux sociaux','création de contenu','Instagram','LinkedIn'],
   ARRAY['consistance éditoriale','engagement communauté','analyse des performances'],
   ARRAY['lancement marque','croissance audience','relance compte dormant'],
   'créatif', ARRAY['mission récurrente','ponctuelle','formation'], 'available', true),

  ('11000001-0000-0000-0000-000000000038', seed_user_id,
   'Photographe professionnel', 'Portraits, événements entreprise, produits, retouche 48h.',
   'Portraits professionnels, reportages événementiels, photographie produits et immobilier. Retouche incluse, livraison en 48h.',
   ARRAY['photographie','portrait','événementiel','produit','retouche'],
   ARRAY['mise en valeur','rapidité de livraison','adaptation au contexte'],
   ARRAY['refonte site','séminaire entreprise','lancement produit'],
   'créatif', ARRAY['reportage','mission ponctuelle','conseil'], 'available', true),

  ('11000001-0000-0000-0000-000000000039', seed_user_id,
   'Graphiste print et digital', 'Logos, chartes, plaquettes, affiches, Adobe CC.',
   'Logos, chartes graphiques, plaquettes commerciales, affiches, packaging. Maîtrise complète d Adobe CC.',
   ARRAY['graphisme','identité visuelle','print','digital','Adobe CC'],
   ARRAY['sens de l esthétique','brief rapide','déclinaisons'],
   ARRAY['création entreprise','refonte identité','lancement produit'],
   'créatif', ARRAY['mission','conseil','formation'], 'available', true),

  ('11000001-0000-0000-0000-000000000040', seed_user_id,
   'Vidéaste corporate', 'Films institutionnels, événements, teasers. Montage pro.',
   'Films institutionnels, reportages événementiels, teasers réseaux sociaux. Tournage et montage professionnel.',
   ARRAY['vidéo','corporate','montage','événementiel','motion design'],
   ARRAY['narration','réactivité','qualité cinématographique'],
   ARRAY['film de présentation','séminaire','lancement produit'],
   'créatif', ARRAY['mission','devis'], 'soon', true),

  -- Logistique & opérations
  ('11000001-0000-0000-0000-000000000041', seed_user_id,
   'Transporteur messagerie courte distance', 'Livraisons express, enlèvements urgents.',
   'Livraisons express en métropole, enlèvements urgents, coursier moto ou véhicule utilitaire. Suivi en temps réel.',
   ARRAY['transport','livraison express','coursier','messagerie','urgent'],
   ARRAY['ponctualité','fiabilité','suivi'],
   ARRAY['livraison urgente','document urgent','livraison volumineuse'],
   'efficace', ARRAY['mission ponctuelle','contrat régulier'], 'available', true),

  ('11000001-0000-0000-0000-000000000042', seed_user_id,
   'Déménageur professionnel', 'Résidentiel et pro, montage meubles, stockage.',
   'Déménagements résidentiels et professionnels, démontage et montage de meubles, stockage temporaire possible.',
   ARRAY['déménagement','transport','manutention','stockage','montage meubles'],
   ARRAY['organisation','protection des objets','efficacité'],
   ARRAY['déménagement appartement','déménagement bureau','stockage temporaire'],
   'organisé', ARRAY['devis','réalisation'], 'available', true),

  ('11000001-0000-0000-0000-000000000043', seed_user_id,
   'Organisatrice d événements', 'Séminaires, lancements produit, mariages.',
   'Séminaires d entreprise, lancements produit, fêtes et mariages. Coordination complète des prestataires de A à Z.',
   ARRAY['organisation d événements','coordination','prestataires','séminaire','mariage'],
   ARRAY['gestion du stress','anticipation','créativité'],
   ARRAY['séminaire annuel','lancement produit','événement corporatif'],
   'organisé', ARRAY['accompagnement','clé en main','conseil'], 'available', true),

  ('11000001-0000-0000-0000-000000000044', seed_user_id,
   'Chef de projet indépendant', 'Projets complexes, Scrum, Kanban, livraison dans les délais.',
   'Pilotage de projets complexes, gestion d équipes pluridisciplinaires, méthodes agiles Scrum et Kanban.',
   ARRAY['gestion de projet','Scrum','Kanban','pilotage','équipes'],
   ARRAY['clarification des objectifs','communication','gestion des risques'],
   ARRAY['projet qui dérive','lancement produit','réorganisation'],
   'structuré', ARRAY['pilotage','conseil','formation'], 'available', true),

  ('11000001-0000-0000-0000-000000000045', seed_user_id,
   'Consultante en organisation', 'Processus, outils collaboratifs, efficacité collective.',
   'Optimisation des processus internes, mise en place d outils collaboratifs (Notion, Slack, Airtable), amélioration de l efficacité collective.',
   ARRAY['organisation','processus','outils collaboratifs','Notion','efficacité'],
   ARRAY['diagnostic organisationnel','pragmatisme','accompagnement au changement'],
   ARRAY['désorganisation croissante','onboarding nouveaux','outils inadaptés'],
   'pragmatique', ARRAY['audit','accompagnement','formation'], 'available', true),

  -- Nature & transition
  ('11000001-0000-0000-0000-000000000046', seed_user_id,
   'Maraîcher bio en AMAP', 'Légumes biologiques, paniers hebdomadaires, permaculture.',
   'Vente directe de légumes biologiques en AMAP, paniers hebdomadaires, animations pédagogiques autour de la permaculture.',
   ARRAY['maraîchage','bio','AMAP','permaculture','légumes'],
   ARRAY['transmission','lien producteur-consommateur','agriculture durable'],
   ARRAY['accès à une alimentation saine','comprendre d où vient sa nourriture'],
   'chaleureux', ARRAY['vente directe','atelier','visite ferme'], 'available', true),

  ('11000001-0000-0000-0000-000000000047', seed_user_id,
   'Paysagiste concepteur', 'Jardins sur mesure, espaces verts, toitures végétalisées.',
   'Création et entretien de jardins, aménagement d espaces verts d entreprise, toitures végétalisées, potagers urbains.',
   ARRAY['paysagisme','jardins','espaces verts','toiture végétalisée','potager'],
   ARRAY['sens esthétique','connaissance botanique','conception durable'],
   ARRAY['jardin à créer','espace vert professionnel','potager débutant'],
   'créatif', ARRAY['conception','réalisation','entretien'], 'available', true),

  ('11000001-0000-0000-0000-000000000048', seed_user_id,
   'Apiculteur formateur', 'Formation apiculture, installation ruches, miel artisanal.',
   'Formation à l apiculture débutant, installation de ruches en milieu urbain ou rural, vente de miel artisanal, animations scolaires.',
   ARRAY['apiculture','formation','ruches','miel','biodiversité'],
   ARRAY['pédagogie','passion transmise','connaissance naturaliste'],
   ARRAY['découverte apiculture','ruche entreprise','miel local'],
   'pédagogue', ARRAY['formation','installation','conseil'], 'available', true),

  ('11000001-0000-0000-0000-000000000049', seed_user_id,
   'Animatrice nature et biodiversité', 'Sorties nature, plantes, sensibilisation scolaire.',
   'Sorties de terrain, ateliers de reconnaissance des plantes et champignons, sensibilisation à la biodiversité pour scolaires et adultes.',
   ARRAY['biodiversité','botanique','sorties nature','sensibilisation','éducation environnementale'],
   ARRAY['enthousiasme communicatif','pédagogie terrain','connaissance naturaliste'],
   ARRAY['sensibilisation enfants','découverte nature','sortie scolaire'],
   'dynamique', ARRAY['sortie nature','atelier','conférence'], 'available', true),

  ('11000001-0000-0000-0000-000000000050', seed_user_id,
   'Consultant transition énergétique', 'Audit énergétique, rénovation, MaPrimeRénov, solaire.',
   'Audit énergétique du bâtiment, accompagnement dans les rénovations, dossiers CEE, MaPrimeRénov, installation de panneaux solaires.',
   ARRAY['transition énergétique','audit énergétique','rénovation','MaPrimeRénov','solaire'],
   ARRAY['connaissance des aides','analyse technique','accompagnement dossier'],
   ARRAY['factures trop élevées','rénovation énergétique','investissement solaire'],
   'rigoureux', ARRAY['audit','accompagnement','conseil'], 'available', true)

  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    tagline = EXCLUDED.tagline,
    summary = EXCLUDED.summary,
    explicit_capabilities = EXCLUDED.explicit_capabilities,
    implicit_capabilities = EXCLUDED.implicit_capabilities,
    success_contexts = EXCLUDED.success_contexts,
    relational_style = EXCLUDED.relational_style,
    help_formats = EXCLUDED.help_formats,
    availability = EXCLUDED.availability,
    is_published = EXCLUDED.is_published;

END $$;

-- ── Fix RLS situation_graph : OR → AND ──────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own situation graph" ON situation_graph;
DROP POLICY IF EXISTS "situation_graph_select" ON situation_graph;

CREATE POLICY "situation_graph_select"
  ON situation_graph
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM needs WHERE id = source_need_id AND user_id = auth.uid())
    AND
    EXISTS (SELECT 1 FROM needs WHERE id = target_need_id AND user_id = auth.uid())
  );

-- ── Fix RLS coordinator_signals INSERT ──────────────────────────────────────

DROP POLICY IF EXISTS "Users can insert coordinator signals" ON coordinator_signals;
DROP POLICY IF EXISTS "coordinator_signals_insert" ON coordinator_signals;

CREATE POLICY "coordinator_signals_insert"
  ON coordinator_signals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND
    EXISTS (SELECT 1 FROM needs WHERE id = need_id AND user_id = auth.uid())
  );
