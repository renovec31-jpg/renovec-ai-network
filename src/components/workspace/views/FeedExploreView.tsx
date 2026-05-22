import { MOCK_FEED } from '../../../data/mockOccitanie';

export default function FeedExploreView() {
  return (
    <div className="aib-view aib-feed">
      <span className="aib-match-label">Ce qui circule dans le reseau</span>

      <div className="aib-feed-list">
        {MOCK_FEED.slice(0, 8).map(item => (
          <div key={item.id} className="aib-feed-row">
            <div className="aib-feed-dot" style={{ background: item.color }} />
            <div className="aib-feed-content">
              <span className="aib-feed-title">{item.title}</span>
              <span className="aib-feed-meta">{item.author} · {item.city} · {item.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
