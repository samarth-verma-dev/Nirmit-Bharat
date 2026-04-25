import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './dashboard.module.css';
import { MapPin, Truck, Wrench, Package } from 'lucide-react';


const PIN_COORDINATES = {
  "110001": { lat: 28.6304, lng: 77.2177, name: "Connaught Place" },
  "110002": { lat: 28.6433, lng: 77.2407, name: "Daryaganj" },
  "110005": { lat: 28.6504, lng: 77.1906, name: "Karol Bagh" },
  "110016": { lat: 28.5535, lng: 77.2023, name: "Hauz Khas" },
  "110020": { lat: 28.5300, lng: 77.2709, name: "Okhla" },
  "110024": { lat: 28.5677, lng: 77.2433, name: "Lajpat Nagar" },
  "110045": { lat: 28.5912, lng: 77.0600, name: "Dwarka" },
  "110058": { lat: 28.6253, lng: 77.0863, name: "Janakpuri" },
  "110070": { lat: 28.5355, lng: 77.1558, name: "Vasant Kunj" },
  "110091": { lat: 28.6083, lng: 77.2917, name: "Mayur Vihar" },
};

export default function LocationInsights({ data }) {
  const [activeTab, setActiveTab] = useState('Delivery');

  // We mock the score logic assuming data provides metrics.
  // In a real scenario, this matches your JSON pincodes -> scores.
  const mapData = useMemo(() => {
    // Generate some stable fake scores for demonstration, as pincodes aren't explicit in the subset
    return Object.keys(PIN_COORDINATES).map(pin => {
      // Deterministic pseudo-random score between 30 and 100 based on pin and tab
      const seed = parseInt(pin) + activeTab.length * 10;
      const score = 40 + (seed % 60); 

      let color = '#EF4444'; // Red (Poor)
      let category = 'Poor';
      
      if (score >= 80) {
        color = '#10B981'; // Green (Good)
        category = 'Good';
      } else if (score >= 60) {
        color = '#F59E0B'; // Orange (Medium)
        category = 'Average';
      }

      return {
        pincode: pin,
        ...PIN_COORDINATES[pin],
        score,
        color,
        category
      };
    });
  }, [activeTab]);

  const sortedData = [...mapData].sort((a, b) => b.score - a.score);
  const topArea = sortedData[0];
  const lowArea = sortedData[sortedData.length - 1];

  if (!data) {
    return (
      <div className={styles.locationInsights} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '600px' }}>
        <div style={{ color: 'var(--text2)', fontWeight: 500 }}>Waiting for data...</div>
      </div>
    );
  }

  return (
    <div className={styles.locationInsights}>
      <div className={styles.topNav} style={{ marginBottom: 24 }}>
        <h2 className={styles.navTitle} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MapPin size={28} color="var(--primary)" />
          Location-Based Insights
        </h2>
      </div>

      <div style={{ display: 'flex', gap: 24, height: '650px' }}>
        {/* SIDE PANEL */}
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className={styles.card} style={{ padding: 20 }}>
            <h3 className={styles.cardTitle} style={{ marginBottom: 16 }}>Metrics Filter</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { id: 'Delivery', icon: Truck },
                { id: 'Service', icon: Wrench },
                { id: 'Product Quality', icon: Package }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px', borderRadius: 8,
                      border: `1px solid ${isActive ? 'var(--primary)' : 'rgba(0,0,0,0.06)'}`,
                      background: isActive ? 'rgba(31, 77, 59, 0.08)' : '#fff',
                      color: isActive ? 'var(--primary)' : 'var(--text2)',
                      fontWeight: isActive ? 600 : 500,
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    <Icon size={18} />
                    {tab.id}
                  </button>
                )
              })}
            </div>
          </div>

          <div className={styles.card} style={{ padding: 20, flex: 1 }}>
            <h3 className={styles.cardTitle} style={{ marginBottom: 16 }}>Key Findings</h3>
            
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', marginBottom: 4 }}>Top Performing</div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{topArea?.name} ({topArea?.pincode})</div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>Score: {topArea?.score}/100</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', marginBottom: 4 }}>Needs Improvement</div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{lowArea?.name} ({lowArea?.pincode})</div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>Score: {lowArea?.score}/100</div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: '#D1D5DB' }} />
                3 areas with insufficient data
              </div>
            </div>
          </div>
        </div>

        {/* MAP VISUALIZATION */}
        <div className={styles.card} style={{ flex: 1, padding: 0, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
          <MapContainer 
            center={[28.59, 77.20]} 
            zoom={11} 
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            />
            {mapData.map((data) => (
              <CircleMarker
                key={data.pincode}
                center={[data.lat, data.lng]}
                radius={data.score / 3} // Scale radius slightly
                pathOptions={{
                  fillColor: data.color,
                  fillOpacity: 0.7,
                  color: data.color,
                  weight: 2
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                  <div style={{ padding: '4px 8px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1c231f' }}>{data.name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{data.pincode}</div>
                    <div style={{ fontWeight: 600, color: data.color }}>{activeTab}: {data.score}/100</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
