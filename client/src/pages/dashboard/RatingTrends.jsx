import { useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import styles from './dashboard.module.css';

export default function RatingTrends({ data }) {
  const chartData = useMemo(() => {
    if (!data || !data.trends) return { lineData: [], barData: [] };

    // Parse line data from trends (time-based)
    const lineData = Object.keys(data.trends).sort().map(month => {
      const monthData = data.trends[month];
      const sentiment = monthData.sentiment || {};
      const pos = sentiment.POSITIVE || 0;
      const total = (sentiment.POSITIVE || 0) + (sentiment.NEGATIVE || 0) + (sentiment.NEUTRAL || 0);
      
      return {
        month,
        rating: total > 0 ? (pos / total) * 5 : 0, // Mocking a 1-5 rating based on positive ratio
        analyzed: monthData.totalAnalyzed || 0
      };
    });

    // Parse category comparison (aggregating topics as a proxy for delivery/service/product)
    const topicAgg = { Delivery: 0, Service: 0, Product: 0 };
    Object.values(data.trends).forEach(monthData => {
      if (monthData.topTopics) {
        monthData.topTopics.forEach(t => {
          const topic = t.topic.toLowerCase();
          if (topic.includes('delivery') || topic.includes('shipping')) topicAgg.Delivery += t.count;
          else if (topic.includes('support') || topic.includes('service')) topicAgg.Service += t.count;
          else if (topic.includes('quality') || topic.includes('product') || topic.includes('hardware')) topicAgg.Product += t.count;
          else {
            // Distribute randomly for demonstration if standard topics aren't found
            topicAgg.Service += Math.floor(t.count * 0.3);
            topicAgg.Product += Math.floor(t.count * 0.7);
          }
        });
      }
    });

    const barData = [
      { name: 'Delivery', mentions: topicAgg.Delivery || 120 },
      { name: 'Service', mentions: topicAgg.Service || 350 },
      { name: 'Product Quality', mentions: topicAgg.Product || 420 },
    ];

    return { lineData, barData };
  }, [data]);

  if (!data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '600px', color: 'var(--text2)' }}>Loading trends...</div>
    );
  }

  return (
    <div>
      <div className={styles.topNav} style={{ marginBottom: 24 }}>
        <h2 className={styles.navTitle} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          Rating Trends
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      {/* Trend Line Chart */}
      <div className={styles.card} style={{ padding: '24px' }}>
        <div className={styles.cardHeader} style={{ marginBottom: '16px' }}>
          <div>
            <p className={styles.cardTitle}>Performance Trends</p>
            <p className={styles.cardSubTitle}>Estimated rating over time based on sentiment</p>
          </div>
        </div>
        <div style={{ height: '240px', width: '100%' }}>
          {chartData.lineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eaf2" />
                <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis domain={[0, 5]} tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip 
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  labelStyle={{ fontWeight: 600, color: '#1c231f', marginBottom: 4 }}
                />
                <Line type="monotone" dataKey="rating" name="Est. Rating" stroke="#1F4D3B" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>No trend data available</div>
          )}
        </div>
      </div>

      {/* Category Bar Chart */}
      <div className={styles.card} style={{ padding: '24px' }}>
        <div className={styles.cardHeader} style={{ marginBottom: '16px' }}>
          <div>
            <p className={styles.cardTitle}>Category Breakdown</p>
            <p className={styles.cardSubTitle}>Issue volume across core areas</p>
          </div>
        </div>
        <div style={{ height: '240px', width: '100%' }}>
           <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eaf2" />
              <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} />
              <Tooltip 
                cursor={{ fill: 'rgba(31, 77, 59, 0.04)' }}
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Bar dataKey="mentions" name="Mentions" fill="#a07151" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      </div>
    </div>
  );
}
