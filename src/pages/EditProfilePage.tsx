import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Upload, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Props = {
  onBack: () => void;
  onSaved: () => void;
};

const ZONE_OPTIONS = [
  { value: 'local',    label: 'Proximité',  sub: 'Dans ma ville, mon quartier' },
  { value: 'distance', label: 'À distance', sub: 'Peu importe la localisation' },
  { value: 'both',     label: 'Les deux',   sub: 'Flexible selon les situations' },
];

const MAX_BIO = 300;
const MAX_CAPS = 10;

const CAP_COLORS = [
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-stone-100 text-stone-600 border-stone-200',
];

type ToastState = 'idle' | 'saving' | 'success' | 'error';

export default function EditProfilePage({ onBack, onSaved }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [city, setCity] = useState(profile?.location || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [zone, setZone] = useState<string>('both');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [capInput, setCapInput] = useState('');
  const [uploadProgress, setUploadProgress] = useState(false);
  const [toast, setToast] = useState<ToastState>('idle');
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    loadExisting();
  }, []);

  async function loadExisting() {
    if (!user) return;
    const [profileRes, capRes] = await Promise.all([
      supabase.from('user_profiles').select('display_name, bio, location, zone, avatar_url').eq('id', user.id).maybeSingle(),
      supabase.from('capability_profiles').select('explicit_capabilities').eq('user_id', user.id).eq('is_published', true).maybeSingle(),
    ]);
    if (profileRes.data) {
      setDisplayName(profileRes.data.display_name || '');
      setBio(profileRes.data.bio || '');
      setCity(profileRes.data.location || '');
      setZone(profileRes.data.zone || 'both');
      setAvatarUrl(profileRes.data.avatar_url || null);
      setAvatarPreview(profileRes.data.avatar_url || null);
    }
    if (capRes.data?.explicit_capabilities) {
      setCapabilities(capRes.data.explicit_capabilities);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setUploadProgress(true);

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/avatar.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(publicUrl);
    } catch {
      setAvatarPreview(avatarUrl);
    } finally {
      setUploadProgress(false);
    }
  }

  function addCap(val: string) {
    const trimmed = val.trim();
    if (!trimmed || capabilities.includes(trimmed) || capabilities.length >= MAX_CAPS) return;
    setCapabilities(c => [...c, trimmed]);
    setCapInput('');
  }

  function removeCap(cap: string) {
    setCapabilities(c => c.filter(x => x !== cap));
  }

  async function handleSave() {
    if (!user || !displayName.trim()) return;
    setToast('saving');

    try {
      const [profileErr, capRes] = await Promise.all([
        supabase.from('user_profiles').update({
          display_name: displayName.trim(),
          bio: bio.trim(),
          location: city.trim(),
          zone,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        }).eq('id', user.id),

        supabase.from('capability_profiles').select('id').eq('user_id', user.id).maybeSingle(),
      ]);

      if (profileErr.error) throw profileErr.error;

      if (capabilities.length > 0) {
        const capPayload = {
          user_id: user.id,
          explicit_capabilities: capabilities,
          city: city.trim() || null,
          is_published: true,
          updated_at: new Date().toISOString(),
        };
        if (capRes.data?.id) {
          await supabase.from('capability_profiles').update(capPayload).eq('id', capRes.data.id);
        } else {
          await supabase.from('capability_profiles').insert({
            ...capPayload,
            title: capabilities[0],
            availability: 'disponible',
          });
        }
      }

      await refreshProfile();
      setToast('success');
      setToastMsg('Profil enregistré.');
      setTimeout(() => { setToast('idle'); onSaved(); }, 1200);
    } catch {
      setToast('error');
      setToastMsg('Une erreur est survenue. Réessayez.');
      setTimeout(() => setToast('idle'), 3000);
    }
  }

  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || '?';

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
          <span className="text-sm font-semibold text-stone-900 flex-1">Modifier mon profil</span>
          <button
            onClick={handleSave}
            disabled={!displayName.trim() || toast === 'saving'}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-stone-900 text-white text-xs font-semibold rounded-xl disabled:opacity-40 transition-all hover:bg-stone-800"
          >
            {toast === 'saving'
              ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : toast === 'success'
              ? <><Check size={11} /> Enregistré</>
              : 'Enregistrer'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* Toast */}
        {(toast === 'success' || toast === 'error') && (
          <div className={`fixed top-[68px] left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all ${
            toast === 'success' ? 'bg-emerald-900 text-white' : 'bg-red-900 text-white'
          }`}>
            {toastMsg}
          </div>
        )}

        {/* Avatar upload */}
        <div className="flex items-center gap-5">
          <div
            className="relative cursor-pointer group flex-shrink-0"
            onClick={() => fileRef.current?.click()}
            style={{ width: 72, height: 72 }}
          >
            <div
              className="w-full h-full flex items-center justify-center overflow-hidden bg-stone-100 transition-all group-hover:opacity-80"
              style={{ borderRadius: 18 }}
            >
              {avatarPreview
                ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                : <span className="text-xl font-semibold text-stone-400">{initials}</span>}
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-[18px]">
              {uploadProgress
                ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Upload size={16} className="text-white" />}
            </div>
          </div>
          <div>
            <button
              onClick={() => fileRef.current?.click()}
              className="text-sm text-stone-700 hover:text-stone-900 font-medium transition-colors"
            >
              Changer l'avatar
            </button>
            <p className="text-xs text-stone-400 mt-0.5">JPG, PNG · max 2 Mo</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs text-stone-400 uppercase tracking-widest mb-2">Nom affiché</label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Comment souhaitez-vous être connu·e ?"
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all"
          />
        </div>

        {/* City */}
        <div>
          <label className="block text-xs text-stone-400 uppercase tracking-widest mb-2">Ville ou zone</label>
          <input
            type="text"
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="Ex : Lyon, Paris 11e, Bordeaux…"
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all"
          />
        </div>

        {/* Bio */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-stone-400 uppercase tracking-widest">Bio courte</label>
            <span className={`text-xs tabular-nums ${bio.length > MAX_BIO - 20 ? 'text-amber-500' : 'text-stone-300'}`}>
              {bio.length}/{MAX_BIO}
            </span>
          </div>
          <textarea
            value={bio}
            onChange={e => e.target.value.length <= MAX_BIO && setBio(e.target.value)}
            rows={4}
            placeholder="Quelques mots sur vous, ce que vous apportez, votre manière d'être…"
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200 resize-none leading-relaxed transition-all"
          />
        </div>

        {/* Zone */}
        <div>
          <label className="block text-xs text-stone-400 uppercase tracking-widest mb-3">Zone de mobilité</label>
          <div className="space-y-2">
            {ZONE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setZone(opt.value)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                  zone === opt.value
                    ? 'border-stone-900 bg-stone-50'
                    : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50/50'
                }`}
              >
                <div>
                  <p className={`text-sm font-medium ${zone === opt.value ? 'text-stone-900' : 'text-stone-600'}`}>{opt.label}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{opt.sub}</p>
                </div>
                {zone === opt.value && (
                  <div className="w-5 h-5 rounded-full bg-stone-900 flex items-center justify-center flex-shrink-0">
                    <Check size={10} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Capabilities */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs text-stone-400 uppercase tracking-widest">Capacités</label>
            <span className="text-xs text-stone-300">{capabilities.length}/{MAX_CAPS}</span>
          </div>

          {capabilities.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {capabilities.map((cap, i) => (
                <span
                  key={cap}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${CAP_COLORS[i % CAP_COLORS.length]}`}
                >
                  {cap}
                  <button
                    onClick={() => removeCap(cap)}
                    className="opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {capabilities.length < MAX_CAPS && (
            <div className="flex gap-2">
              <input
                type="text"
                value={capInput}
                onChange={e => setCapInput(e.target.value)}
                placeholder="Ajouter une capacité…"
                className="flex-1 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm placeholder-stone-400 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all"
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addCap(capInput); } }}
              />
              <button
                onClick={() => addCap(capInput)}
                disabled={!capInput.trim()}
                className="px-4 py-2.5 bg-stone-100 text-stone-600 rounded-xl text-sm font-medium hover:bg-stone-200 disabled:opacity-30 transition-all"
              >
                +
              </button>
            </div>
          )}
          <p className="text-xs text-stone-300 mt-1.5">Appuyez sur Entrée pour valider · max {MAX_CAPS}</p>
        </div>

        {/* Save */}
        <div className="pt-2 pb-8">
          <button
            onClick={handleSave}
            disabled={!displayName.trim() || toast === 'saving'}
            className="w-full py-4 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-2xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
          >
            {toast === 'saving'
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enregistrement…</>
              : toast === 'success'
              ? <><Check size={14} /> Enregistré</>
              : 'Enregistrer les modifications'}
          </button>
        </div>
      </div>
    </div>
  );
}
