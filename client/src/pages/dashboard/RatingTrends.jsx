import { useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import styles from './dashboard.module.css';

/* ─── HELPER FUNCTIONS ──────────────────────────────────────── */
const getSortedMonths = (trends) => Object.keys(trends).sort();

const getAggregatedTopics = (trends) => {
  const agg = {};
  Object.values(trends).forEach(m => {
    (m.topTopics || []).forEach(({ topic, count }) => {
      agg[topic] = (agg[topic] || 0) + count;
    });
  });
  return Object.entries(agg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));
};

const getAggregatedKeywords = (trends) => {
  const agg = {};
  Object.values(trends).forEach(m => {
    (m.topKeywords || []).forEach(({ keyword, count }) => {
      agg[keyword] = (agg[keyword] || 0) + count;
    });
  });
  return Object.entries(agg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));
};

const tooltipStyle = {
  contentStyle: { borderRadius: 16, border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '12px 16px' },
  labelStyle:   { fontWeight: 700, color: '#1c231f', marginBottom: 4, fontSize: 12 },
};

/* ─── HORIZONTAL BAR ────────────────────────────────────────── */
function HorizontalBarChart({ data, dataKey, color, nameKey = 'name' }) {
  return (
    <ResponsiveContainer width="100%" height={data.length * 44 + 20}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.04)" />
        <XAxis type="number" tick={{ fill: '#8a968f', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey={nameKey} tick={{ fill: '#1c231f', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} width={110} />
        <Tooltip
          cursor={{ fill: 'rgba(31,77,59,0.04)', radius: 8 }}
          {...tooltipStyle}
          itemStyle={{ fontWeight: 600, color }}
        />
        <Bar dataKey={dataKey} name={dataKey === 'count' ? 'Mentions' : dataKey} fill={color} radius={[0, 8, 8, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─── MAIN COMPONENT ────────────────────────────────────────── */
export default function RatingTrends({ data }) {
  const chartData = useMemo(() => {
    if (!data || !data.trends) return { lineData: [], barData: [], sentimentSeries: [], emotionMatrix: [], topics: [], keywords: [] };

    // Existing: Performance trend
    const lineData = Object.keys(data.trends).sort().map(month => {
      const monthData = data.trends[month];
      const sentiment = monthData.sentiment || {};
      const pos   = sentiment.POSITIVE || 0;
      const total = (sentiment.POSITIVE || 0) + (sentiment.NEGATIVE || 0) + (sentiment.NEUTRAL || 0);
      return { month, rating: total > 0 ? (pos / total) * 5 : 0, analyzed: monthData.totalAnalyzed || 0 };
    });

    // Existing: Category bar
    const topicAgg = { Delivery: 0, Service: 0, Product: 0 };
    Object.values(data.trends).forEach(monthData => {
      if (monthData.topTopics) {
        monthData.topTopics.forEach(t => {
          const topic = t.topic.toLowerCase();
          if (topic.includes('delivery') || topic.includes('shipping')) topicAgg.Delivery += t.count;
          else if (topic.includes('support') || topic.includes('service')) topicAgg.Service += t.count;
          else if (topic.includes('quality') || topic.includes('product') || topic.includes('hardware')) topicAgg.Product += t.count;
          else { topicAgg.Service += Math.floor(t.count * 0.3); topicAgg.Product += Math.floor(t.count * 0.7); }
        });
      }
    });
    const barData = [
      { name: 'Delivery',        mentions: topicAgg.Delivery || 120 },
      { name: 'Service',         mentions: topicAgg.Service  || 350 },
      { name: 'Product Quality', mentions: topicAgg.Product  || 420 },
    ];

    // NEW: Helpers
    const sentimentSeries = getSentimentSeries(data.trends);
    const emotionMatrix   = getEmotionMatrix(data.trends);
    const topics          = getAggregatedTopics(data.trends);
    const keywords        = getAggregatedKeywords(data.trends);

    return { lineData, barData, sentimentSeries, emotionMatrix, topics, keywords };
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

      {/* ── ROW 1: Existing charts ───────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: 24 }}>
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
                <AreaChart data={chartData.lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#1F4D3B" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#1F4D3B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                  <XAxis dataKey="month" tick={{ fill: '#8a968f', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis domain={[0, 5]} tick={{ fill: '#8a968f', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip {...tooltipStyle} itemStyle={{ fontWeight: 600, color: '#1F4D3B' }} />
                  <Area type="monotone" dataKey="rating" name="Est. Rating" stroke="#1F4D3B" strokeWidth={3} fillOpacity={1} fill="url(#colorRating)" dot={false} activeDot={{ r: 6, fill: '#1F4D3B', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
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
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                <XAxis dataKey="name" tick={{ fill: '#8a968f', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fill: '#8a968f', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip cursor={{ fill: 'rgba(31,77,59,0.04)', radius: 8 }} {...tooltipStyle} itemStyle={{ fontWeight: 600, color: '#a07151' }} />
                <Bar dataKey="mentions" name="Mentions" fill="#a07151" radius={[8, 8, 8, 8]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>




      {/* ── ROW 3 (NEW): Topic Distribution + Keyword Chart ──── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Topic Distribution */}
        <div className={styles.card} style={{ padding: '24px' }}>
          <div className={styles.cardHeader} style={{ marginBottom: '16px' }}>
            <div>
              <p className={styles.cardTitle}>Topic Distribution</p>
              <p className={styles.cardSubTitle}>Most discussed topics across all months</p>
            </div>
          </div>
          {chartData.topics.length > 0
            ? <HorizontalBarChart data={chartData.topics} dataKey="count" color="#1F4D3B" />
            : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#9ca3af' }}>No topic data</div>
          }
        </div>

        {/* Keyword Chart */}
        <div className={styles.card} style={{ padding: '24px' }}>
          <div className={styles.cardHeader} style={{ marginBottom: '16px' }}>
            <div>
              <p className={styles.cardTitle}>Top Keywords</p>
              <p className={styles.cardSubTitle}>Most frequently mentioned keywords</p>
            </div>
          </div>
          {chartData.keywords.length > 0
            ? <HorizontalBarChart data={chartData.keywords} dataKey="count" color="#a07151" />
            : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#9ca3af' }}>No keyword data</div>
          }
        </div>
      </div>
    </div>
  );
}
