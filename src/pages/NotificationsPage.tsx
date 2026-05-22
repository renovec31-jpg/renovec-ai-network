import { useState, useEffect } from 'react';
import { supabase, Notification } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSituation } from '../contexts/SituationContext';
import SituationThread from '../components/SituationThread';

const NOTIF_NARRATIVE: Record<string, { verb: string; color: string }> = {
  message:      { verb: "Un échange s'est ouvert",       color: 'text-white/70' },
  match:        { verb: "Une présence humaine a émergé",  color: 'text-emerald-400' },
  contribution: { verb: "Un mouvement a été reconnu",     color: 'text-amber-400' },
  trust:        { verb: "Quelqu'un a laissé un retour",   color: 'text-white/60' },
  default:      { verb: "Le réseau a bougé",              color: 'text-white/40' },
};

function timeLabel(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "hier";
  if (d < 7) return `il y a ${d} jours`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const { phase, activeNeed } = useSituation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNotifications(); }, []);

  async function loadNotifications() {
    const { data } = await supabase
      .from('notifications').select('*').eq('user_id', user!.id)
      .order('created_at', { ascending: false }).limit(50);
    setNotifications(data || []);
    setLoading(false);
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ is_read: true })
      .eq('user_id', user!.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  const unread = notifications.filter(n => !n.is_read);
  const read = notifications.filter(n => n.is_read);

  return (
    <div className="animate-fade-up">
      {activeNeed && <SituationThread needId={activeNeed.id} />}

      <div className="mb-8">
        <p className="text-[11px] tracking-widest uppercase text-white/25 font-medium mb-2">Signaux</p>
        <h1 className="text-2xl font-semibold text-white leading-snug mb-1.5">
          {unread.length === 0
            ? "Rien de nouveau pour l'instant."
            : unread.length === 1
              ? "Un signal du réseau."
              : `${unread.length} signaux dans le réseau.`}
        </h1>
        <p className="text-white/40 text-sm leading-relaxed">
          {phase !== 'idle' && activeNeed
            ? "Ces signaux sont liés à votre situation en cours."
            : "Ce qui se passe dans le réseau autour de vous."}
        </p>
      </div>

      {unread.length > 0 && (
        <div className="flex justify-end mb-5">
          <button onClick={markAllRead} className="text-xs text-white/20 hover:text-white/50 transition-colors">
            Tout marquer comme vu
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="relative w-10 h-10">
            <div className="w-10 h-10 border border-amber-400/20 rounded-full animate-breathe" />
            <div className="absolute inset-2 border border-amber-400/15 rounded-full animate-breathe" style={{ animationDelay: '0.5s' }} />
          </div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-28 space-y-4">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto animate-breathe">
            <div className="w-3 h-3 rounded-full bg-white/10" />
          </div>
          <div className="space-y-1.5">
            <p className="text-white/35 text-sm">Rien encore.</p>
            <p className="text-white/20 text-xs leading-relaxed max-w-xs mx-auto">
              Quand quelque chose se passe dans le réseau autour de vous, cela apparaîtra ici.
            </p>
          </div>
        </div>
      ) : (
        <div className="animate-stagger">
          {unread.length > 0 && (
            <div className="mb-7">
              {unread.map((notif, idx) => (
                <NotifRow key={notif.id} notif={notif} onRead={() => markRead(notif.id)} isLast={idx === unread.length - 1} unread />
              ))}
            </div>
          )}
          {read.length > 0 && (
            <div>
              {unread.length > 0 && (
                <p className="text-[11px] tracking-widest uppercase text-white/20 font-medium mb-4">Déjà vus</p>
              )}
              {read.map((notif, idx) => (
                <NotifRow key={notif.id} notif={notif} onRead={() => {}} isLast={idx === read.length - 1} unread={false} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotifRow({ notif, onRead, isLast, unread }: {
  notif: Notification; onRead: () => void; isLast: boolean; unread: boolean;
}) {
  const narrative = NOTIF_NARRATIVE[notif.type] || NOTIF_NARRATIVE.default;
  return (
    <button
      onClick={onRead}
      className={`w-full text-left py-5 transition-all group hover:pl-1 ${!isLast ? 'border-b border-white/8' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 transition-all ${unread ? 'bg-amber-400 animate-pulse-dot' : 'bg-white/15'}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium mb-1 transition-all ${unread ? narrative.color : 'text-white/25'}`}>
            {narrative.verb}
          </p>
          <p className={`text-sm leading-relaxed transition-all ${unread ? 'text-white/90 font-medium' : 'text-white/40'}`}>
            {notif.title}
          </p>
          {notif.body && (
            <p className="text-xs text-white/30 mt-1 leading-relaxed">{notif.body}</p>
          )}
          <p className="text-xs text-white/20 mt-2">{timeLabel(notif.created_at)}</p>
        </div>
        <span className="text-white/15 group-hover:text-white/40 transition-colors text-sm flex-shrink-0 mt-1">→</span>
      </div>
    </button>
  );
}
