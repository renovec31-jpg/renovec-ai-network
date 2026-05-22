/*
  # Seed vitrines for all fake/seed capability profiles

  Generates rich vitrine data for all 1020 seed profiles based on their
  capabilities, city, availability and profile type. vitrine_badges is text[],
  vitrine_services/faq are jsonb.
*/

DO $$
DECLARE
  rec RECORD;
  cap1 TEXT;
  cap2 TEXT;
  cap3 TEXT;
  hero TEXT;
  bio  TEXT;
  pitch TEXT;
  services JSONB;
  faq JSONB;
  badges TEXT[];
  resp TEXT;
BEGIN

FOR rec IN
  SELECT id, title, explicit_capabilities, city, availability, sav_points, profile_type, tagline, summary
  FROM capability_profiles
  WHERE is_seed = true
    AND (vitrine_hero_title IS NULL OR vitrine_hero_title = '')
LOOP
  cap1 := COALESCE(rec.explicit_capabilities[1], 'Aide polyvalente');
  cap2 := COALESCE(rec.explicit_capabilities[2], cap1);
  cap3 := COALESCE(rec.explicit_capabilities[3], cap2);

  resp := CASE
    WHEN rec.availability ILIKE '%maintenant%' THEN 'Repond en moins de 2h'
    WHEN rec.availability ILIKE '%48h%' OR rec.availability ILIKE '%weekend%' THEN 'Repond sous 48h'
    WHEN rec.availability ILIKE '%semaine%' THEN 'Repond en 3-5 jours'
    ELSE 'Repond generalement sous 48h'
  END;

  badges := ARRAY['Verifie RENOVEC'];
  IF rec.sav_points >= 50  THEN badges := badges || ARRAY['Reconnu par le reseau']; END IF;
  IF rec.sav_points >= 100 THEN badges := badges || ARRAY['Contributeur actif']; END IF;
  IF rec.sav_points >= 200 THEN badges := badges || ARRAY['Expert reseau']; END IF;
  IF rec.availability ILIKE '%maintenant%' THEN badges := badges || ARRAY['Disponible maintenant']; END IF;

  IF cap1 ILIKE '%coach%' THEN
    hero  := rec.title || ' - Coach & Accompagnateur';
    pitch := 'J accompagne les personnes en transition vers ce qui leur correspond vraiment.';
    bio   := 'Depuis plusieurs annees, j aide des professionnels a clarifier leur trajectoire, debloquer leurs blocages et retrouver un elan. Mon approche est directe, bienveillante et orientee resultats concrets. Je travaille en mode confiance — pas de methode rigide, mais une ecoute precise et des questions qui font avancer.';

  ELSIF cap1 ILIKE '%programmation%' OR cap1 ILIKE '%developpement%' OR cap1 ILIKE '%React%' OR cap1 ILIKE '%Node%' OR cap1 ILIKE '%WordPress%' THEN
    hero  := rec.title || ' - Developpeur & Formateur tech';
    pitch := 'Je construis des solutions web solides et j aide les autres a apprendre le code.';
    bio   := 'Developpeur passionne, je travaille aussi bien sur des projets techniques que sur la transmission de savoirs. J aime les defis reels, les equipes qui apprennent vite et les produits qui servent vraiment leurs utilisateurs. Disponible pour du mentorat, des missions courtes ou des formations sur mesure.';

  ELSIF cap1 ILIKE '%formation%' OR cap1 ILIKE '%cours%' THEN
    hero  := rec.title || ' - Formateur & Pedagogue';
    pitch := 'Je rends les choses comprehensibles — meme les plus complexes.';
    bio   := 'J ai une passion pour la transmission. Que ce soit en groupe ou en individuel, j adapte mon approche au niveau et au rythme de chacun. Mes formations sont concretes, actionnables et souvent memorables.';

  ELSIF cap1 ILIKE '%graphisme%' OR cap1 ILIKE '%design%' OR cap1 ILIKE '%branding%' OR cap1 ILIKE '%dessin%' THEN
    hero  := rec.title || ' - Designer & Creatif';
    pitch := 'Je donne une identite visuelle forte a vos projets et vos idees.';
    bio   := 'Entre intuition creative et rigueur graphique, je travaille avec des independants, des startups et des associations pour creer des identites visuelles qui parlent vraiment.';

  ELSIF cap1 ILIKE '%RH%' OR cap1 ILIKE '%recrutement%' OR cap1 ILIKE '%ressources humaines%' OR cap1 ILIKE '%accompagnement RH%' THEN
    hero  := rec.title || ' - Consultant RH & Carriere';
    pitch := 'Je securise vos recrutements et accompagne vos equipes dans la duree.';
    bio   := 'Avec une experience solide en ressources humaines, j accompagne les structures dans leurs recrutements, leurs conflits d equipe et leurs projets de transformation.';

  ELSIF cap1 ILIKE '%photo%' OR cap1 ILIKE '%montage%' OR cap1 ILIKE '%video%' THEN
    hero  := rec.title || ' - Photographe & Videaste';
    pitch := 'Je capture ce qui compte et je le mets en valeur.';
    bio   := 'La photographie et la video sont mes langages. Je travaille sur des portraits professionnels, des evenements, du contenu pour les reseaux ou des projets artistiques.';

  ELSIF cap1 ILIKE '%juridique%' OR cap1 ILIKE '%droit%' OR cap1 ILIKE '%comptabi%' THEN
    hero  := rec.title || ' - Conseil Juridique & Administratif';
    pitch := 'Je simplifie ce qui est complexe et protege ce qui compte pour vous.';
    bio   := 'Fort d une experience en droit et en gestion administrative, j aide les particuliers et les petites structures a y voir plus clair dans leurs obligations legales, leurs demarches et leurs contrats.';

  ELSIF cap1 ILIKE '%electricite%' OR cap1 ILIKE '%plomberie%' OR cap1 ILIKE '%menuiserie%' OR cap1 ILIKE '%reparation%' THEN
    hero  := rec.title || ' - Artisan & Expert technique';
    pitch := 'Des mains expertes pour vos projets — du petit depannage a la renovation.';
    bio   := 'Artisan de metier, je mets mes competences techniques au service de vos projets. Que ce soit pour un depannage urgent, une installation ou un chantier, j interviens avec soin et efficacite.';

  ELSIF cap1 ILIKE '%cuisine%' OR cap1 ILIKE '%cuisinier%' THEN
    hero  := rec.title || ' - Chef & Formateur culinaire';
    pitch := 'Je partage ma passion pour la cuisine — du technique au creatif.';
    bio   := 'Cuisinier dans l ame, j enseigne aussi bien les bases que les techniques avancees. Mes cours sont conviviaux, pratiques et adaptes a tous les niveaux.';

  ELSIF cap1 ILIKE '%jardin%' THEN
    hero  := rec.title || ' - Jardinier & Guide du vivant';
    pitch := 'J aide les gens a renouer avec la nature, meme en milieu urbain.';
    bio   := 'Passionne par le monde vegetal, j accompagne les debutants comme les jardiniers confirmes dans leurs projets verts. Potagers, jardins d ornement, balcons — chaque espace a son potentiel.';

  ELSIF cap1 ILIKE '%guitare%' OR cap1 ILIKE '%musique%' THEN
    hero  := rec.title || ' - Musicien & Professeur de musique';
    pitch := 'La musique s apprend mieux quand elle vient du coeur.';
    bio   := 'Musicien depuis l enfance, j enseigne la guitare et la musique a tous les ages et tous les niveaux. Cours individuels ou en petit groupe, en presentiel ou en ligne.';

  ELSIF cap1 ILIKE '%CV%' OR cap1 ILIKE '%lettre%' OR cap1 ILIKE '%entretien%' OR cap1 ILIKE '%reconversion%' THEN
    hero  := rec.title || ' - Specialiste Carriere & Emploi';
    pitch := 'Je vous aide a vous vendre — avec authenticite et efficacite.';
    bio   := 'J accompagne les chercheurs d emploi, les reconvertis et les ambitieux dans leur demarche professionnelle. CV percutant, lettres de motivation, preparation d entretiens.';

  ELSIF cap1 ILIKE '%soutien scolaire%' OR cap1 ILIKE '%prise de parole%' THEN
    hero  := rec.title || ' - Enseignant & Coach';
    pitch := 'J aide a progresser — pas seulement a reussir.';
    bio   := 'Passionne par la pedagogie, j offre un accompagnement personnalise adapte au niveau et aux objectifs de chacun. Chaque personne est differente — j adapte mon approche en consequence.';

  ELSIF cap1 ILIKE '%informatique%' OR cap1 ILIKE '%Linux%' OR cap1 ILIKE '%depannage%' OR cap1 ILIKE '%smartphone%' OR cap1 ILIKE '%installation%' THEN
    hero  := rec.title || ' - Expert informatique & Support';
    pitch := 'Je resous vos problemes tech — rapidement et durablement.';
    bio   := 'Technicien informatique avec une solide experience, j interviens pour du depannage, de l installation et de la formation aux outils numeriques. Mon approche : expliquer ce que je fais pour que vous soyez autonome ensuite.';

  ELSIF cap1 ILIKE '%creation entreprise%' OR cap1 ILIKE '%gestion de projets%' OR cap1 ILIKE '%mentorat%' THEN
    hero  := rec.title || ' - Consultant & Mentor';
    pitch := 'Je transforme les idees en projets solides — de la vision a l execution.';
    bio   := 'Entrepreneur et consultant, j accompagne les porteurs de projet dans la structuration de leur activite. Business plan, positionnement, financement — je couvre toutes les etapes du lancement.';

  ELSIF cap1 ILIKE '%transport%' THEN
    hero  := rec.title || ' - Service Mobilite & Transport';
    pitch := 'Je facilite vos deplacements avec fiabilite et disponibilite.';
    bio   := 'Conducteur attentionne, je propose des services de transport adaptes a vos besoins : rendez-vous medicaux, aeroport, deplacements professionnels ou personnels.';

  ELSIF cap1 ILIKE '%couture%' OR cap1 ILIKE '%coutur%' THEN
    hero  := rec.title || ' - Couturier & Createur textile';
    pitch := 'Je repare, cree et transforme vos vetements avec soin.';
    bio   := 'Passionne par la couture et le travail du tissu, je propose des retouches, des creations sur mesure et des ateliers d initiation.';

  ELSIF cap1 ILIKE '%administrative%' OR cap1 ILIKE '%demarches%' OR cap1 ILIKE '%Pole Emploi%' OR cap1 ILIKE '%aide administrative%' THEN
    hero  := rec.title || ' - Facilitateur Administratif';
    pitch := 'Je simplifie les demarches pour que vous vous concentriez sur ce qui compte.';
    bio   := 'Les demarches administratives peuvent etre un vrai parcours du combattant. Je vous aide a constituer vos dossiers, comprendre vos droits et naviguer dans les systemes — avec patience et methode.';

  ELSIF cap1 ILIKE '%ecriture%' OR cap1 ILIKE '%redaction%' THEN
    hero  := rec.title || ' - Redacteur & Auteur';
    pitch := 'Je mets les mots justes sur vos idees et vos projets.';
    bio   := 'Redacteur et auteur, j aide les individus et les organisations a exprimer clairement ce qu ils veulent dire. Articles, contenus web, lettres, livres blancs — chaque texte merite d etre pense avec soin.';

  ELSE
    hero  := rec.title || ' - Professionnel polyvalent';
    pitch := 'Je mets mes competences au service de votre situation — avec engagement et precision.';
    bio   := 'Membre actif du reseau RENOVEC, je propose mon aide dans mon domaine d expertise avec une approche humaine et concrete. N hesitez pas a me contacter pour un premier echange sans engagement.';
  END IF;

  services := jsonb_build_array(
    jsonb_build_object(
      'title', INITCAP(cap1),
      'description', 'Accompagnement personnalise sur ' || LOWER(cap1) || ' — adapte a votre niveau et vos objectifs.',
      'price_hint', 'Sur demande',
      'format', CASE WHEN rec.profile_type = 'formateur' THEN 'Formation individuelle ou groupe' ELSE 'Presentiel ou en ligne' END,
      'highlight', TRUE
    ),
    jsonb_build_object(
      'title', INITCAP(cap2) || ' — session decouverte',
      'description', 'Une premiere session pour cerner vos besoins et poser les bases d une collaboration.',
      'price_hint', 'Gratuit (1h)',
      'format', 'En ligne ou a ' || COALESCE(rec.city, 'votre ville'),
      'highlight', FALSE
    ),
    jsonb_build_object(
      'title', 'Accompagnement sur mesure',
      'description', 'Un programme personnalise combinant ' || LOWER(cap1) || ' et ' || LOWER(cap3) || '.',
      'price_hint', 'Tarif selon projet',
      'format', 'Flexible',
      'highlight', FALSE
    )
  );

  faq := jsonb_build_array(
    jsonb_build_object(
      'question', 'Comment se passe un premier contact ?',
      'answer', 'Je reponds generalement dans les 24-48h. On commence par un echange rapide pour comprendre votre situation, puis on voit ensemble si je suis la bonne personne pour vous aider.'
    ),
    jsonb_build_object(
      'question', 'Etes-vous disponible pour des demandes urgentes ?',
      'answer', CASE
        WHEN rec.availability ILIKE '%maintenant%' THEN 'Oui, je suis disponible maintenant. Contactez-moi directement via la plateforme.'
        WHEN rec.availability ILIKE '%48h%' THEN 'Je peux repondre sous 48h. Precisez le caractere urgent dans votre message.'
        ELSE 'Ma disponibilite actuelle : ' || rec.availability || '. Mentionnez l urgence dans votre message.'
      END
    )
  );

  UPDATE capability_profiles SET
    vitrine_hero_title    = hero,
    vitrine_pitch         = pitch,
    vitrine_bio           = bio,
    vitrine_services      = services,
    vitrine_faq           = faq,
    vitrine_badges        = badges,
    vitrine_response_time = resp,
    vitrine_generated_at  = NOW(),
    tagline = CASE WHEN tagline IS NULL OR tagline = '' THEN pitch ELSE tagline END,
    summary = CASE WHEN summary IS NULL OR summary = '' THEN bio ELSE summary END
  WHERE id = rec.id;

END LOOP;

END $$;
