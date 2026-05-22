import { MapPin, ArrowRight } from 'lucide-react';
import type { ContextSummary } from './types';
import { clarityLabel } from './types';

interface Props {
  context: ContextSummary;
}

export default function ContextBar({ context }: Props) {
  const { intentLabel, territory, clarityLevel, nextStep } = context;
  const show = intentLabel || territory || nextStep;

  if (!show) return null;

  return (
    <div className="aib-context-bar">
      {intentLabel && (
        <div className="aib-ctx-item">
          <div className={`aib-ctx-dot aib-ctx-dot--${clarityLevel}`} />
          <span>{intentLabel}</span>
        </div>
      )}

      {territory && (
        <div className="aib-ctx-item">
          <MapPin size={10} />
          <span>{territory}</span>
        </div>
      )}

      <div className="aib-ctx-item aib-ctx-clarity">
        <span>{clarityLabel(clarityLevel)}</span>
      </div>

      {nextStep && (
        <div className="aib-ctx-next">
          <ArrowRight size={10} />
          <span>{nextStep}</span>
        </div>
      )}
    </div>
  );
}
