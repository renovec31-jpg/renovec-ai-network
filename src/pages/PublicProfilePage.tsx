import { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, MessageSquare, Award, Globe, Users, Check, Wifi } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type PublicProfile = {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  location: string;
  zone: string | null;
  explicit_capabilities: string[];
  implicit_capabilities: string[];
  sav_points: number;
  last_seen: string | null;
  availability: string | null;
  vitrine_pitch: string | null;
  vitrine_badges: string[] | null;
};

type Props = {
  profileUserId: string;
  onBack: () => void;
  onEdit: () => void;
  onContact: (conversationId?: string) => void;
};

const ZONE_LABELS: Record<string, { label: string; icon: typeof Globe; color: string }> = {
  local:    { label: 'Proximité', icon: MapPin,  color: '#F26522' },
  distance: { label: 'À distance', icon: Globe,  color: '#3b82f6' },
  both:     { label: 'Flexible',   icon: Users,  color: '#8b5cf6' },
};

const CAP_COLORS = [
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-stone-100 text-stone-600 border-stone-200',
];

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 15 * 60 * 1000;
}

function Avatar({ name, url, size = 64, online }: { name: string; url: string | null; size?: number; online?: boolean }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex items-center justify-center overflow-hidden bg-stone-100"
        style={{ width: size, height: size, borderRadius: Math.round(size * 0.25) }}
      >
        {url
          ? <img src={url} alt={name} className="w-full h-full object-cover" />
          : <span style={{ fontSize: size * 0.3, fontWeight: 600, color: '#78716c' }}>{initials}</span>}
      </div>
      {online !== undefined && (
        <div
          className={`absolute border-2 border-white rounded-full ${online ? 'bg-emerald-400' : 'bg-stone-300'}`}
          style={{ width: size * 0.22, height: size * 0.22, bottom: -2, right: -2 }}
        />
      )}
    </div>
  );
}

export default function PublicProfilePage({ profileUserId, onBack, onEdit, onContact }: Props) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recognizing, setRecognizing] = useState(false);
  const [recognized, setRecognized] = useState(false);
  const [recognitionCount, setRecognitionCount] = useState(0);
  const [contacting, setContacting] = useState(false);

  const isSelf = user?.id === profileUserId;

  useEffect(() => {
    load();
    loadRecognitionCount();
  }, [profileUserId]);

  async function load() {
    const [profileRes, capRes] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('id, display_name, avatar_url, bio, location, zone, last_seen')
        .eq('id', profileUserId)
        .maybeSingle(),
      supabase
        .from('capability_profiles')
        .select('explicit_capabilities, implicit_capabilities, sav_points, availability, vitrine_pitch, vitrine_badges')
        .eq('user_id', profileUserId)
        .eq('is_published', true)
        .maybeSingle(),
    ]);

    if (profileRes.data) {
      setProfile({
        id: profileRes.data.id,
        user_id: profileRes.data.id,
        display_name: profileRes.data.display_name || 'Membre',
        avatar_url: profileRes.data.avatar_url,
        bio: profileRes.data.bio || '',
        location: profileRes.data.location || '',
        zone: profileRes.data.zone,
        last_seen: profileRes.data.last_seen,
        explicit_capabilities: capRes.data?.explicit_capabilities || [],
        implicit_capabilities: capRes.data?.implicit_capabilities || [],
        sav_points: capRes.data?.sav_points || 0,
        availability: capRes.data?.availability || null,
        vitrine_pitch: capRes.data?.vitrine_pitch || null,
        vitrine_badges: capRes.data?.vitrine_badges || null,
      });
    }
    setLoading(false);
  }

  async function loadRecognitionCount() {
    const { count } = await supabase
      .from('trust_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('reviewed_id', profileUserId)
      .eq('is_public', true);
    setRecognitionCount(count || 0);

    if (user) {
      const { data } = await supabase
        .from('trust_reviews')
        .select('id')
        .eq('reviewed_id', profileUserId)
        .eq('reviewer_id', user.id)
        .maybeSingle();
      if (data) setRecognized(true);
    }
  }

  async function handleRecognize() {
    if (!user || recognized || recognizing || isSelf) return;
    setRecognizing(true);
    try {
      await supabase.from('trust_reviews').insert({
        reviewer_id: user.id,
        reviewed_id: profileUserId,
        clarity_score: 4,
        usefulness_score: 4,
        reliability_score: 4,
        pedagogy_score: 4,
        reassurance_score: 4,
        follow_through_score: 4,
        qualitative_summary: '',
        is_public: true,
      });
      setRecognized(true);
      setRecognitionCount(c => c + 1);
    } catch { /* non-fatal */ } finally {
      setRecognizing(false);
    }
  }

  async function handleContact() {
    if (!user || isSelf || contacting) return;
    setContacting(true);
    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('seeker_id', user.id)
        .eq('provider_id', profileUserId)
        .is('need_id', null)
        .maybeSingle();

      let convId = existing?.id;
      if (!convId) {
        const { data } = await supabase.from('conversations').insert({
          seeker_id: user.id,
          provider_id: profileUserId,
          need_id: null,
          status: 'active',
          last_message_at: new Date().toISOString(),
        }).select('id').single();
        convId = data?.id;
      }
      onContact(convId);
    } catch { /* non-fatal */ } finally {
      setContacting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border border-stone-200 border-t-stone-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <p className="text-stone-400 text-sm">Profil introuvable.</p>
        <button onClick={onBack} className="text-sm text-stone-500 hover:text-stone-900 transition-colors">
          Retour
        </button>
      </div>
    );
  }

  const online = isOnline(profile.last_seen);
  const zoneInfo = ZONE_LABELS[profile.zone || 'both'];
  const ZoneIcon = zoneInfo.icon;
  const allCaps = [...profile.explicit_capabilities, ...profile.implicit_capabilities];

  return (
    <div className="min-h-screen bg-white animate-fade-up">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-stone-100">
        <div className="max-w-2xl mx-auto px-4 flex items-center gap-3" style={{ height: 52 }}>
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-stone-400 hover:text-stone-900 transition-colors rounded-xl hover:bg-stone-100"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="text-sm font-medium text-stone-700 flex-1 truncate">{profile.display_name}</span>
          {online && (
            <div className="flex items-center gap-1.5">
              <Wifi size={11} className="text-emerald-500" />
              <span className="text-xs text-emerald-600 font-medium">En ligne</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Identity block */}
        <div className="flex items-start gap-5 mb-7">
          <Avatar name={profile.display_name} url={profile.avatar_url} size={72} online={online} />
          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-xl font-semibold text-stone-900 leading-tight mb-1">{profile.display_name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-400">
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={10} />
                  {profile.location}
                </span>
              )}
              {profile.zone && (
                <span className="flex items-center gap-1" style={{ color: zoneInfo.color }}>
                  <ZoneIcon size={10} />
                  {zoneInfo.label}
                </span>
              )}
              {profile.sav_points > 0 && (
                <span className="flex items-center gap-1 text-stone-400">
                  <Award size={10} />
                  {profile.sav_points} pts
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {(profile.bio || profile.vitrine_pitch) && (
          <div className="mb-7 py-5 border-y border-stone-100">
            <p className="text-sm text-stone-600 leading-relaxed">
              {profile.vitrine_pitch || profile.bio}
            </p>
          </div>
        )}

        {/* Vitrine badges */}
        {profile.vitrine_badges && profile.vitrine_badges.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {profile.vitrine_badges.map(badge => (
              <span key={badge} className="text-xs px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full font-medium">
                {badge}
              </span>
            ))}
          </div>
        )}

        {/* Capabilities */}
        {allCaps.length > 0 && (
          <div className="mb-8">
            <p className="text-xs text-stone-300 uppercase tracking-widest font-medium mb-4">Capacités</p>
            <div className="flex flex-wrap gap-2">
              {allCaps.map((cap, i) => (
                <span
                  key={cap}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium ${CAP_COLORS[i % CAP_COLORS.length]}`}
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Availability */}
        {profile.availability && (
          <div className="mb-8 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              profile.availability.toLowerCase().includes('maintenant') ? 'bg-emerald-400' : 'bg-stone-200'
            }`} />
            <p className="text-sm text-stone-500">{profile.availability}</p>
          </div>
        )}

        {/* Recognition count */}
        {recognitionCount > 0 && (
          <div className="mb-8 flex items-center gap-2 text-sm text-stone-500">
            <Award size={14} className="text-amber-500" />
            <span>{recognitionCount} reconnaissance{recognitionCount > 1 ? 's' : ''} reçue{recognitionCount > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* CTAs */}
        {isSelf ? (
          <button
            onClick={onEdit}
            className="w-full py-4 border border-stone-200 text-stone-700 font-medium rounded-2xl text-sm hover:bg-stone-50 transition-all"
          >
            Modifier mon profil
          </button>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleContact}
              disabled={contacting}
              className="w-full py-4 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-2xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 group"
            >
              {contacting
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><MessageSquare size={13} /> Contacter</>}
            </button>
            <button
              onClick={handleRecognize}
              disabled={recognized || recognizing || !user}
              className={`w-full py-3.5 border rounded-2xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                recognized
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40'
              }`}
            >
              {recognized
                ? <><Check size={13} /> Reconnaissance envoyée</>
                : <><Award size={13} /> Reconnaître ({recognitionCount})</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
