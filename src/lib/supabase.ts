import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Domain types ────────────────────────────────────────────────────────────

export type UserProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  location: string;
  language: string;
  roles: string[];
  zone?: string;
  last_seen?: string;
  onboarding_seeker_done: boolean;
  onboarding_provider_done: boolean;
  created_at: string;
  updated_at: string;
};

export type Need = {
  id: string;
  user_id: string;
  raw_text: string;
  status: string;
  urgency: string;
  is_voice: boolean;
  created_at: string;
  updated_at: string;
};

export type Clarification = {
  id: string;
  need_id: string;
  user_id: string;
  summary: string;
  reformulated_objective: string;
  context_description: string;
  urgency_level: string;
  missing_info: string[];
  vigilance_points: string[];
  recommended_format: string;
  suggested_questions: Array<{ id: string; question: string }>;
  answers: Record<string, string>;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ProfileListing = {
  id: string;
  profile_id: string;
  listing_type: 'service' | 'object_new' | 'object_used' | 'resource' | 'demand';
  title: string;
  description: string;
  price_hint: string;
  condition?: 'new' | 'like_new' | 'good' | 'fair' | null;
  category?: string;
  image_urls: string[];
  tags: string[];
  is_available: boolean;
  is_published: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
};

export type CapabilityProfile = {
  id: string;
  user_id: string;
  title: string;
  tagline: string;
  summary: string;
  explicit_capabilities: string[];
  implicit_capabilities: string[];
  success_contexts: string[];
  relational_style: string;
  help_formats: string[];
  availability: string;
  impact_summary: string;
  sav_points: number;
  is_published: boolean;
  avatar_url?: string | null;
  cover_url?: string | null;
  city?: string;
  country_code?: string;
  lat?: number;
  lng?: number;
  profile_type?: string;
  // AI vitrine fields
  vitrine_hero_title?: string;
  vitrine_bio?: string;
  vitrine_pitch?: string;
  vitrine_services?: Array<{ title: string; description: string; price_hint: string; format: string; highlight: boolean }>;
  vitrine_portfolio?: Array<{ title: string; description: string; image_url?: string; tags: string[] }>;
  vitrine_faq?: Array<{ question: string; answer: string }>;
  vitrine_response_time?: string;
  vitrine_badges?: string[];
  vitrine_generated_at?: string;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  need_id: string | null;
  seeker_id: string;
  provider_id: string;
  status: string;
  last_message_at: string;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
};

export type Session = {
  id: string;
  conversation_id: string | null;
  need_id: string | null;
  seeker_id: string;
  provider_id: string;
  session_type: string;
  status: string;
  objective: string;
  deliverables: string;
  next_step: string;
  amount_cents: number;
  currency: string;
  scheduled_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  session_id: string | null;
  payer_id: string;
  receiver_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  provider_payment_id: string;
  created_at: string;
  updated_at: string;
};

export type TrustReview = {
  id: string;
  need_id: string | null;
  session_id: string | null;
  reviewer_id: string;
  reviewed_id: string;
  clarity_score: number;
  usefulness_score: number;
  reliability_score: number;
  pedagogy_score: number;
  reassurance_score: number;
  follow_through_score: number;
  qualitative_summary: string;
  is_public: boolean;
  created_at: string;
};

export type Contribution = {
  id: string;
  author_id: string;
  need_id: string | null;
  session_id: string | null;
  contribution_type: string;
  title: string;
  context_label: string;
  summary: string;
  impact_label: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type ContributionEvent = {
  id: string;
  user_id: string;
  event_type: string;
  description: string;
  context: string;
  context_category: string;
  impact_label: string;
  points: number;
  is_public: boolean;
  related_session_id: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  meta: Record<string, unknown>;
  created_at: string;
};

export type Match = {
  id: string;
  need_id: string;
  capability_profile_id: string;
  user_id: string;
  score: number;
  reasons: string[];
  status: string;
  created_at: string;
};

// ─── Role helpers ─────────────────────────────────────────────────────────────

export function isProvider(profile: UserProfile | null): boolean {
  return profile?.roles?.includes('provider') ?? false;
}

export function isAdmin(profile: UserProfile | null): boolean {
  return profile?.roles?.includes('admin') ?? false;
}

export function isModerator(profile: UserProfile | null): boolean {
  return (profile?.roles?.includes('moderator') || profile?.roles?.includes('admin')) ?? false;
}
