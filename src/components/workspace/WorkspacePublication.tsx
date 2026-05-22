import { Tag, Send } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';

export default function WorkspacePublication() {
  const { publicationDraft } = useWorkspace();

  if (!publicationDraft) return null;

  return (
    <div className="px-5 py-6 animate-fade-up">
      <div className="mb-6">
        <p className="text-[11px] tracking-widest uppercase text-white/20 font-medium mb-1.5">
          Publication en preparation
        </p>
        <h2 className="text-lg font-medium text-white/80 mb-1">
          Apercu de votre annonce
        </h2>
        <p className="text-[13px] text-white/35 leading-relaxed">
          Generee a partir de votre conversation. Vous pouvez la modifier avant publication.
        </p>
      </div>

      {/* Draft preview */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden mb-6">
        {/* Title */}
        <div className="p-5 border-b border-white/[0.05]">
          <input
            type="text"
            defaultValue={publicationDraft.title}
            className="w-full text-[16px] font-semibold text-white/85 bg-transparent border-none outline-none placeholder-white/20"
            placeholder="Titre de l'annonce"
          />
        </div>

        {/* Description */}
        <div className="p-5 border-b border-white/[0.05]">
          <textarea
            defaultValue={publicationDraft.description}
            rows={5}
            className="w-full text-[13px] text-white/60 bg-transparent border-none outline-none resize-none placeholder-white/20 leading-relaxed"
            placeholder="Description detaillee..."
          />
        </div>

        {/* Tags */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Tag size={12} className="text-white/25" />
            <span className="text-[11px] text-white/25 font-medium">Tags</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {publicationDraft.tags.map(tag => (
              <span
                key={tag}
                className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/45"
              >
                {tag}
              </span>
            ))}
            <button className="text-[11px] px-2.5 py-1 rounded-full border border-dashed border-white/[0.1] text-white/20 hover:text-white/40 hover:border-white/20 transition-colors">
              + Ajouter
            </button>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="p-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.03] mb-6">
        <p className="text-[12px] text-amber-400/70 font-medium mb-0.5">Brouillon</p>
        <p className="text-[11px] text-white/30">
          Non publiee — visible uniquement par vous. Le coordinateur peut l'enrichir.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button className="flex-1 py-3 rounded-xl border border-white/[0.08] hover:border-white/[0.15] text-[13px] text-white/40 hover:text-white/65 transition-all">
          Modifier
        </button>
        <button className="flex-1 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-[13px] font-medium text-white/70 transition-all flex items-center justify-center gap-2">
          <Send size={13} />
          Publier
        </button>
      </div>
    </div>
  );
}
