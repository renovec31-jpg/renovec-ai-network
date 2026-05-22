import { useEffect, useRef, useState } from 'react';

interface MapPresence {
  id: string;
  lng: number;
  lat: number;
  name: string;
  cap: string;
  district: string;
  img: string;
  active: boolean;
}

const PRESENCES: MapPresence[] = [
  {
    id: 'p1', lng: 4.8357, lat: 45.7676,
    name: 'Thomas', cap: 'droit locatif', district: 'Croix-Rousse',
    img: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1',
    active: true,
  },
  {
    id: 'p2', lng: 4.8312, lat: 45.7580,
    name: 'Fatima', cap: 'dossiers sociaux', district: 'Presqu\'île',
    img: 'https://images.pexels.com/photos/2208740/pexels-photo-2208740.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1',
    active: true,
  },
  {
    id: 'p3', lng: 4.8453, lat: 45.7502,
    name: 'Marie', cap: 'démarches admin.', district: 'Guillotière',
    img: 'https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1',
    active: true,
  },
  {
    id: 'p4', lng: 4.8157, lat: 45.7416,
    name: 'Marc', cap: 'transitions pro', district: 'Confluence',
    img: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1',
    active: false,
  },
  {
    id: 'p5', lng: 4.8614, lat: 45.7589,
    name: 'Anne', cap: 'accompagnement', district: 'Part-Dieu',
    img: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1',
    active: false,
  },
];

const LINKS: [string, string, boolean][] = [
  ['p1', 'p2', true],
  ['p2', 'p3', true],
  ['p3', 'p4', false],
  ['p1', 'p5', false],
];

interface Props {
  className?: string;
}

export default function RenovecMap({ className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    if (typeof L === 'undefined') return;

    const map = L.map(container, {
      center: [45.7580, 4.8357],
      zoom: 13,
      zoomControl: false,
      attributionControl: true,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 0);

    // Draw connection lines
    const byId = Object.fromEntries(PRESENCES.map(p => [p.id, p]));
    LINKS.forEach(([a, b, consolidated]) => {
      const pa = byId[a];
      const pb = byId[b];
      L.polyline([[pa.lat, pa.lng], [pb.lat, pb.lng]], {
        color: consolidated ? 'rgba(255,175,70,0.7)' : 'rgba(180,148,100,0.35)',
        weight: consolidated ? 2 : 1,
        dashArray: consolidated ? undefined : '5, 6',
      }).addTo(map);
    });

    // Draw markers
    PRESENCES.forEach(p => {
      const icon = L.divIcon({
        className: '',
        html: `
          <div class="renovec-marker${p.active ? ' is-active' : ''}" data-id="${p.id}">
            <div class="renovec-marker-inner">
              ${p.active ? '<div class="renovec-marker-pulse"></div>' : ''}
              <div class="renovec-marker-photo">
                <img src="${p.img}" alt="${p.name}" loading="lazy" />
              </div>
            </div>
            <div class="renovec-marker-tooltip">
              <span class="renovec-marker-name">${p.name}</span>
              <span class="renovec-marker-cap">${p.cap}</span>
              <span class="renovec-marker-district">${p.district}</span>
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([p.lat, p.lng], { icon }).addTo(map);
      marker.on('mouseover', () => setHoveredId(p.id));
      marker.on('mouseout', () => setHoveredId(null));
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  void hoveredId;

  return (
    <div className={`renovec-map-wrap ${className || ''}`}>
      <div ref={containerRef} className="renovec-map-container" />
      <div className="renovec-map-vignette" aria-hidden />
    </div>
  );
}
