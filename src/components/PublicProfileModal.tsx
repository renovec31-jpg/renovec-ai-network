import { useState, useEffect } from 'react';
import { X, Lock, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ProfileVitrine, { VitrineProfile } from './ProfileVitrine';

interface Props {
  profileId: string;
  onClose: () => void;
  onEnter: () => void;   // CTA to create account
  isGuest: boolean;
}

export default function PublicProfileModal({ profileId, onClose, onEnter, isGuest }: Props) {
  const [profile, setProfile] = useState<VitrineProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('public_matching_profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();
      if (data) {
        // Map public profile to VitrineProfile shape
        setProfile({
          id: data.id,
          user_id: '',  // hidden from public
          title: isGuest ? blurName(data.title) : data.title,
          tagline: data.vitrine_pitch || '',
          summary: '',  // hidden
          explicit_capabilities: data.explicit_capabilities || [],
          implicit_capabilities: data.implicit_capabilities || [],
          success_contexts: data.success_contexts || [],
          relational_style: '',
          help_formats: data.help_formats || [],
          availability: data.availability || '',
          sav_points: data.sav_points || 0,
          impact_summary: '',
          city: isGuest ? blurCity(data.city) : data.city,
          profile_type: data.profile_type,
          vitrine_hero_title: data.vitrine_hero_title || data.title,
          vitrine_bio: '',  // hidden for guests
          vitrine_pitch: data.vitrine_pitch || '',
          vitrine_services: data.vitrine_services || [],
          vitrine_portfolio: data.vitrine_portfolio || [],
          vitrine_faq: data.vitrine_faq || [],
          vitrine_response_time: data.vitrine_response_time || '',
          vitrine_badges: data.vitrine_badges || [],
          vitrine_generated_at: data.vitrine_generated_at,
        });
      }
      setLoading(false);
    }
    load();
  }, [profileId, isGuest]);

  // Blur last half of a name for guests
  function blurName(name: string): string {
    if (!isGuest) return name;
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0] + '···';
    return parts[0] + ' ' + parts.slice(1).map(p => p[0] + '·'.repeat(p.length - 1)).join(' ');
  }

  function blurCity(city?: string): string {
    if (!isGuest || !city) return city || '';
    const parts = city.split(',');
    return parts[0].trim() + (parts.length > 1 ? ' ···' : '');
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="relative bg-white w-full sm:max-w-xl sm:rounded-2xl overflow-hidden max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-stone-500 hover:text-stone-900 transition-colors shadow-sm border border-stone-100"
        >
          <X size={14} />
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <span className="w-8 h-8 border border-stone-200 border-t-stone-500 rounded-full animate-spin" />
          </div>
        ) : profile ? (
          <>
            <ProfileVitrine
              profile={profile}
              isOwner={false}
              onBack={onClose}
              onContact={isGuest ? onEnter : onClose}
              contacted={false}
              contacting={false}
              onRefresh={() => {}}
            />
            {isGuest && (
              <div className="sticky bottom-0 bg-stone-950 border-t border-stone-800 px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-stone-400 mb-0.5">Informations complètes et messagerie</p>
                    <p className="text-sm font-semibold text-white">Réservé aux membres</p>
                  </div>
                  <button
                    onClick={onEnter}
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm px-5 py-2.5 rounded-xl transition-all"
                  >
                    <Lock size={11} />
                    Rejoindre
                    <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center py-24 text-stone-400 text-sm">
            Profil introuvable
          </div>
        )}
      </div>
    </div>
  );
}
