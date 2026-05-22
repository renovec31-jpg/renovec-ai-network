import { MapPin, ShoppingBag, Search, Package } from 'lucide-react';
import { MOCK_FEED } from '../../data/mockOccitanie';
import type { MockFeedItem } from '../../data/mockOccitanie';

const TYPE_META: Record<MockFeedItem['type'], { label: string; icon: typeof ShoppingBag }> = {
  service: { label: 'Service', icon: ShoppingBag },
  demand:  { label: 'Recherche', icon: Search },
  object:  { label: 'Objet', icon: Package },
};

export default function FeedOverlay() {
  return (
    <div className="ws-feed">
      <div className="ws-feed-header">
        <h3 className="ws-feed-title">Fil du réseau</h3>
        <span className="ws-feed-count">{MOCK_FEED.length} activités récentes</span>
      </div>

      <div className="ws-feed-list">
        {MOCK_FEED.map((item, idx) => {
          const meta = TYPE_META[item.type];
          const Icon = meta.icon;
          return (
            <div
              key={item.id}
              className="ws-feed-item"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="ws-feed-icon" style={{ color: item.color, background: `${item.color}12` }}>
                <Icon size={13} />
              </div>
              <div className="ws-feed-content">
                <p className="ws-feed-item-title">{item.title}</p>
                <div className="ws-feed-meta">
                  <span>{item.author}</span>
                  <span className="ws-feed-city"><MapPin size={8} /> {item.city}</span>
                  <span className="ws-feed-time">{item.time}</span>
                </div>
              </div>
              <span className="ws-feed-type" style={{ color: item.color }}>{meta.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
