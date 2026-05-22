import { Tag, Send, FileText } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';

export default function WorkspacePublication() {
  const { publicationDraft } = useWorkspace();

  if (!publicationDraft) return null;

  return (
    <div className="h-full overflow-y-auto px-6 py-8 scrollbar-hide animate-fade-up">
      <div className="mb-8">
        <p className="text-[11px] tracking-widest uppercase text-white/20 font-medium mb-2">
          Publication en préparation
        </p>
        <h2 className="text-xl font-semibold text-white/80 leading-snug mb-1.5">
          Aperçu de votre annonce
        </h2>
        <p className="text-[13px] text-white/30 leading-relaxed">
          Générée à partir de votre conversation. Modifiable avant publication.
        </p>
      </div>

      {/* Draft card */}
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.025] to-transparent overflow-hidden mb-6">
        {/* Title */}
        <div className="p-5 border-b border-white/[0.04]">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={13} className="text-white/20" />
            <span className="text-[10px] tracking-widest uppercase text-white/20 font-medium">Titre</span>
          </div>
          <input
            type="text"
            defaultValue={publicationDraft.title}
            className="w-full text-[16px] font-semibold text-white/85 bg-transparent border-none outline-none placeholder-white/20"
            placeholder="Titre de l'annonce"
          />
        </div>

        {/* Description */}
        <div className="p-5 border-b border-white/[0.04]">
          <textarea
            defaultValue={publicationDraft.description}
            rows={6}
            className="w-full text-[13px] text-white/55 bg-transparent border-none outline-none resize-none placeholder-white/20 leading-[1.8]"
            placeholder="Description détaillée..."
          />
        </div>

        {/* Tags */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Tag size={12} className="text-white/20" />
            <span className="text-[10px] tracking-widest uppercase text-white/20 font-medium">Tags</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {publicationDraft.tags.map(tag => (
              <span
                key={tag}
                className="text-[11px] px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/45 font-medium"
              >
                {tag}
              </span>
            ))}
            <button className="text-[11px] px-3 py-1.5 rounded-lg border border-dashed border-white/[0.08] text-white/20 hover:text-white/40 hover:border-white/20 transition-colors">
              + Ajouter
            </button>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="p-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.03] mb-8">
        <p className="text-[12px] text-amber-400/70 font-medium mb-1">Brouillon</p>
        <p className="text-[11px] text-white/30 leading-relaxed">
          Non publiée — visible uniquement par vous. Le coordinateur peut l'enrichir à partir de la conversation.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button className="flex-1 py-3.5 rounded-xl border border-white/[0.06] hover:border-white/[0.12] text-[13px] text-white/40 hover:text-white/65 transition-all">
          Modifier
        </button>
        <button className="flex-1 py-3.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.06] hover:border-white/[0.12] text-[13px] font-medium text-white/70 hover:text-white/90 transition-all flex items-center justify-center gap-2">
          <Send size={13} />
          Publier
        </button>
      </div>
    </div>
  );
}
