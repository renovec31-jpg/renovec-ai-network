/*
  # RENOVEC — Coordinator OS Schema

  ## Titre
  Fondation architecturale du coordinateur comme système d'exploitation humain

  ## Description
  Ce schéma crée les tables qui permettent au coordinateur d'être
  le cœur opérationnel de RENOVEC : mémoire profonde, graphe de situations,
  orchestration humaine, moteur de confiance, et couche d'adaptation.

  ## Nouvelles tables

  ### 1. coordinator_memory
  Mémoire persistante du coordinateur par utilisateur et par situation.
  Le coordinateur accumule du contexte entre les sessions : patterns détectés,
  préférences observées, signaux de confiance, continuité situationnelle.

  ### 2. situation_graph
  Graphe de relations entre situations (besoins).
  Permet au coordinateur de voir les connexions : situations similaires,
  dépendances causales, successions temporelles, clusters thématiques.

  ### 3. human_orchestration_log
  Trace de toutes les décisions d'orchestration humaine :
  qui a été mobilisé, pourquoi, à quelle étape, avec quel résultat.
  Permet l'apprentissage et l'audit des décisions de routing.

  ### 4. trust_engine_state
  État calculé du moteur de confiance par utilisateur.
  Score composite, dimensions détaillées, historique de fiabilité,
  signaux comportementaux, date de dernière mise à jour.

  ### 5. experience_profiles
  Profil d'expérience adaptatif par utilisateur.
  Capture le niveau d'expertise, le style de communication, le rythme
  préféré, les patterns d'utilisation, pour adapter l'expérience en temps réel.

  ### 6. coordinator_signals
  Signaux temps réel émis par le coordinateur vers l'UI et le système.
  Urgences détectées, suggestions d'action, redirections, alertes humaines.
  Consommés par la couche d'orchestration UI.

  ## Modifications
  - Ajout de `coordinator_context` (JSONB) sur `needs` pour les métadonnées riches
  - Ajout de `orchestration_state` (JSONB) sur `needs` pour l'état d'orchestration courant

  ## Sécurité
  RLS activé sur toutes les tables. Accès strictement contrôlé par ownership.
*/

-- ─── 1. coordinator_memory ────────────────────────────────────────────────────
-- Mémoire profonde : le coordinateur retient ce qu'il a appris sur chaque
-- utilisateur et chaque situation pour assurer la continuité.

CREATE TABLE IF NOT EXISTS coordinator_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  need_id uuid REFERENCES needs(id) ON DELETE SET NULL,

  -- Type de mémoire : conversational | situational | relational | contextual | behavioral
  memory_type text NOT NULL DEFAULT 'situational',

  -- Contenu structuré de la mémoire
  content jsonb NOT NULL DEFAULT '{}',
  -- Exemple : { "patterns": [], "user_style": "direct", "confusion_signals": [], "trust_level": 0.7 }

  -- Importance de ce fragment de mémoire (0.0 → 1.0)
  salience float DEFAULT 0.5,

  -- Nombre de fois que cette mémoire a été confirmée ou contredite
  reinforcement_count int DEFAULT 1,
  contradiction_count int DEFAULT 0,

  -- Decay : à partir de quand cette mémoire devient obsolète
  expires_at timestamptz DEFAULT (now() + interval '90 days'),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE coordinator_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own coordinator memory"
  ON coordinator_memory FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coordinator memory"
  ON coordinator_memory FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own coordinator memory"
  ON coordinator_memory FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_coordinator_memory_user ON coordinator_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_coordinator_memory_need ON coordinator_memory(need_id);
CREATE INDEX IF NOT EXISTS idx_coordinator_memory_type ON coordinator_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_coordinator_memory_salience ON coordinator_memory(salience DESC);

-- ─── 2. situation_graph ───────────────────────────────────────────────────────
-- Graphe de relations entre situations.
-- Permet au coordinateur de voir les connexions et patterns entre besoins.

CREATE TABLE IF NOT EXISTS situation_graph (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Nœuds source et destination
  source_need_id uuid NOT NULL REFERENCES needs(id) ON DELETE CASCADE,
  target_need_id uuid NOT NULL REFERENCES needs(id) ON DELETE CASCADE,

  -- Type de relation entre situations
  -- similar | causal | successive | thematic | contradictory | resolved_by
  relation_type text NOT NULL DEFAULT 'similar',

  -- Force de la relation (0.0 → 1.0)
  weight float DEFAULT 0.5,

  -- Contexte de la relation
  context text,

  -- Qui a établi ce lien : 'coordinator' | 'admin' | 'system'
  established_by text DEFAULT 'coordinator',

  created_at timestamptz DEFAULT now()
);

ALTER TABLE situation_graph ENABLE ROW LEVEL SECURITY;

-- Lecture possible si l'utilisateur est owner d'au moins un des deux nœuds
CREATE POLICY "Users can view situation graph for their needs"
  ON situation_graph FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM needs WHERE id = source_need_id AND user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM needs WHERE id = target_need_id AND user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_situation_graph_source ON situation_graph(source_need_id);
CREATE INDEX IF NOT EXISTS idx_situation_graph_target ON situation_graph(target_need_id);
CREATE INDEX IF NOT EXISTS idx_situation_graph_type ON situation_graph(relation_type);

-- Empêcher doublons directionnels
CREATE UNIQUE INDEX IF NOT EXISTS idx_situation_graph_unique
  ON situation_graph(source_need_id, target_need_id, relation_type);

-- ─── 3. human_orchestration_log ──────────────────────────────────────────────
-- Trace de toutes les décisions d'orchestration humaine du coordinateur.
-- Apprentissage, audit, amélioration du routing.

CREATE TABLE IF NOT EXISTS human_orchestration_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id uuid REFERENCES needs(id) ON DELETE SET NULL,

  -- Qui a été considéré / mobilisé
  candidate_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Décision prise
  -- invited | deferred | rejected | escalated | matched | dismissed
  decision text NOT NULL DEFAULT 'invited',

  -- Raison structurée de la décision
  decision_reason jsonb NOT NULL DEFAULT '{}',
  -- Exemple : { "signals": ["high_trust", "domain_match"], "confidence": 0.85 }

  -- Contexte de la situation au moment de la décision
  situation_snapshot jsonb DEFAULT '{}',

  -- Résultat si connu : accepted | declined | no_response | completed | abandoned
  outcome text,
  outcome_at timestamptz,

  -- Score de qualité du matching post-facto (0.0 → 1.0)
  matching_quality float,

  created_at timestamptz DEFAULT now()
);

ALTER TABLE human_orchestration_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view orchestration log for their needs"
  ON human_orchestration_log FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM needs WHERE id = need_id AND user_id = auth.uid())
    OR candidate_user_id = auth.uid()
  );

CREATE POLICY "System can insert orchestration log"
  ON human_orchestration_log FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM needs WHERE id = need_id AND user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_orchestration_need ON human_orchestration_log(need_id);
CREATE INDEX IF NOT EXISTS idx_orchestration_candidate ON human_orchestration_log(candidate_user_id);
CREATE INDEX IF NOT EXISTS idx_orchestration_decision ON human_orchestration_log(decision);

-- ─── 4. trust_engine_state ────────────────────────────────────────────────────
-- État calculé du moteur de confiance par utilisateur.
-- Mis à jour par l'Edge Function après chaque interaction significative.

CREATE TABLE IF NOT EXISTS trust_engine_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Score global de confiance (0.0 → 1.0)
  overall_trust_score float DEFAULT 0.5,

  -- Dimensions détaillées
  dimensions jsonb NOT NULL DEFAULT '{
    "continuity": 0.5,
    "reliability": 0.5,
    "relational_quality": 0.5,
    "resolution_rate": 0.5,
    "consistency": 0.5,
    "behavioral_trust": 0.5
  }',

  -- Signaux comportementaux observés
  behavioral_signals jsonb DEFAULT '[]',
  -- Exemple : [{ "signal": "response_speed", "value": "fast", "weight": 0.8 }]

  -- Contextes dans lesquels cet utilisateur est fiable
  trusted_contexts jsonb DEFAULT '[]',
  -- Exemple : ["juridique", "urgence_logement", "soutien_moral"]

  -- Anomalies détectées
  anomalies jsonb DEFAULT '[]',

  -- Nombre d'interactions qui ont nourri ce score
  sample_size int DEFAULT 0,

  -- Tendance : improving | stable | declining
  trend text DEFAULT 'stable',

  last_calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trust_engine_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own trust state"
  ON trust_engine_state FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trust state"
  ON trust_engine_state FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trust state"
  ON trust_engine_state FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_trust_engine_user ON trust_engine_state(user_id);
CREATE INDEX IF NOT EXISTS idx_trust_engine_score ON trust_engine_state(overall_trust_score DESC);

-- ─── 5. experience_profiles ───────────────────────────────────────────────────
-- Profil adaptatif par utilisateur pour personnaliser l'expérience.
-- Le coordinateur observe et adapte : rythme, ton, profondeur, guidance.

CREATE TABLE IF NOT EXISTS experience_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Niveau d'expertise dans le système (novice | familiar | experienced | expert)
  expertise_level text DEFAULT 'novice',

  -- Style de communication inféré (direct | nuanced | exploratory | guided)
  communication_style text DEFAULT 'guided',

  -- Rythme préféré (slow | normal | fast)
  pacing_preference text DEFAULT 'normal',

  -- Signaux de détresse observés (détection d'urgence émotionnelle)
  distress_signals jsonb DEFAULT '[]',

  -- Préférences d'interface observées
  interface_preferences jsonb DEFAULT '{}',
  -- Exemple : { "detail_level": "high", "examples_useful": true, "prefers_questions": false }

  -- Patterns d'utilisation
  usage_patterns jsonb DEFAULT '{}',
  -- Exemple : { "peak_hours": [9, 10, 14], "avg_session_length": 8.5, "topics": ["logement", "emploi"] }

  -- Nombre d'interactions observées
  observation_count int DEFAULT 0,

  -- Dernière adaptation significative
  last_adapted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE experience_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own experience profile"
  ON experience_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own experience profile"
  ON experience_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own experience profile"
  ON experience_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_experience_profiles_user ON experience_profiles(user_id);

-- ─── 6. coordinator_signals ───────────────────────────────────────────────────
-- Signaux temps réel émis par le coordinateur.
-- L'UI écoute ces signaux pour adapter la présentation et le flux.

CREATE TABLE IF NOT EXISTS coordinator_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  need_id uuid REFERENCES needs(id) ON DELETE SET NULL,

  -- Type de signal
  -- urgency_detected | human_recommended | phase_shift | context_clarified
  -- trust_gate | experience_adapt | escalation_required | resolution_suggested
  signal_type text NOT NULL,

  -- Priorité du signal (1 = critique, 5 = informatif)
  priority int DEFAULT 3,

  -- Payload du signal
  payload jsonb NOT NULL DEFAULT '{}',
  -- Exemple : { "urgency_level": "high", "reason": "délai critique détecté", "suggested_action": "mobiliser_humain" }

  -- Durée de vie du signal
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),

  -- Statut : pending | consumed | expired | dismissed
  status text DEFAULT 'pending',
  consumed_at timestamptz,

  created_at timestamptz DEFAULT now()
);

ALTER TABLE coordinator_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own coordinator signals"
  ON coordinator_signals FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own coordinator signals"
  ON coordinator_signals FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert coordinator signals for own needs"
  ON coordinator_signals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_coordinator_signals_user ON coordinator_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_coordinator_signals_need ON coordinator_signals(need_id);
CREATE INDEX IF NOT EXISTS idx_coordinator_signals_status ON coordinator_signals(status);
CREATE INDEX IF NOT EXISTS idx_coordinator_signals_priority ON coordinator_signals(priority);

-- ─── 7. Enrichir la table needs ───────────────────────────────────────────────
-- Ajouter des colonnes pour le contexte coordinateur et l'état d'orchestration.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'needs' AND column_name = 'coordinator_context'
  ) THEN
    ALTER TABLE needs ADD COLUMN coordinator_context jsonb DEFAULT '{}';
    -- Exemple : { "detected_urgency": "high", "inferred_domain": "logement", "emotional_signals": ["anxiété"], "complexity": 0.7 }
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'needs' AND column_name = 'orchestration_state'
  ) THEN
    ALTER TABLE needs ADD COLUMN orchestration_state jsonb DEFAULT '{}';
    -- Exemple : { "humans_considered": 3, "humans_invited": 1, "last_human_action": "2026-05-20", "routing_strategy": "trust_first" }
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'needs' AND column_name = 'situation_complexity'
  ) THEN
    ALTER TABLE needs ADD COLUMN situation_complexity float DEFAULT 0.5;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'needs' AND column_name = 'coordinator_confidence'
  ) THEN
    ALTER TABLE needs ADD COLUMN coordinator_confidence float DEFAULT 0.0;
  END IF;
END $$;
