import React, { useMemo, useState } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from 'recharts';
import './Dashboard.css';
import analyticsData from '../../../analytics_summary_fast.json';

const ENT_COLORS = {
  positive: '#16a34a',
  warning: '#d97706',
  critical: '#dc2626',
  primary: '#1F4D3B',
  muted: '#5c6b61',
  text: '#1c231f',
  grid: 'rgba(0, 0, 0, 0.08)',
  bg: '#ffffff'
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: ENT_COLORS.bg, border: `1px solid ${ENT_COLORS.grid}`, padding: '12px', color: ENT_COLORS.text, borderRadius: '4px', fontSize: '0.85rem', fontFamily: 'monospace', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        {label && <div style={{ marginBottom: '8px', fontWeight: 600, color: ENT_COLORS.muted }}>{label}</div>}
        {payload.map((entry, index) => (
          <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
            <div style={{ width: 8, height: 8, background: entry.color || entry.fill, borderRadius: '50%' }} />
            <span style={{ color: ENT_COLORS.text, fontWeight: 500 }}>{entry.name}: {entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard({ company, onLogout }) {
  const { overall, sources } = analyticsData;
  const [activeTab, setActiveTab] = useState('overview');

  // ─────────────────────────────────────────────────────────
  // DATA TRANSFORMATION
  // ─────────────────────────────────────────────────────────
  
  // 1. Sentiment Distribution (Pie Chart)
  const sentimentData = [
    { name: 'POSITIVE', value: overall.sentiment.POSITIVE, color: ENT_COLORS.positive },
    { name: 'NEGATIVE', value: overall.sentiment.NEGATIVE, color: ENT_COLORS.critical },
    { name: 'NEUTRAL', value: overall.sentiment.NEUTRAL, color: ENT_COLORS.primary }
  ].filter(d => d.value > 0);

  // 2. Top Issues (Horizontal Bar Chart)
  const topIssuesData = overall.topTopics.slice(0, 6).map(t => ({
    name: t.topic.toUpperCase(),
    value: t.count,
    fill: t.topic === 'bugs' ? ENT_COLORS.critical : ENT_COLORS.primary
  }));

  // 3. Emotion Distribution (Donut Chart)
  const emotionData = Object.entries(overall.emotions)
    .filter(([k]) => k !== 'neutral')
    .map(([k, v]) => ({
      name: k.toUpperCase(),
      value: v,
      fill: k === 'sadness' || k === 'anger' || k === 'disgust' ? ENT_COLORS.warning : ENT_COLORS.primary
    }))
    .sort((a, b) => b.value - a.value);

  // 4. Platform Comparison (Stacked Bar Chart)
  const platformData = Object.entries(sources).map(([name, data]) => ({
    name: name.replace('_', ' ').toUpperCase(),
    Positive: data.sentiment.POSITIVE,
    Negative: data.sentiment.NEGATIVE
  }));

  // 5. Simulated Trend Data (Line Graph)
  const trendData = [
    { period: 'W-6', score: 68, volume: 150 },
    { period: 'W-5', score: 65, volume: 165 },
    { period: 'W-4', score: 62, volume: 180 },
    { period: 'W-3', score: 55, volume: 220 },
    { period: 'W-2', score: 50, volume: 260 },
    { period: 'W-1', score: 48, volume: 285 },
    { period: 'Current', score: 45, volume: 291 }
  ];

  // 6. Keyword Frequency Data
  const criticalKeywords = ["connect", "otp", "not working", "can't", "working", "failed"];
  const keywordData = overall.topKeywords.slice(0, 8).map(k => ({
    name: k.keyword.toUpperCase(),
    value: k.count,
    fill: criticalKeywords.includes(k.keyword) ? ENT_COLORS.critical : ENT_COLORS.primary
  }));

  // ─────────────────────────────────────────────────────────
  // INTELLIGENCE LAYER
  // ─────────────────────────────────────────────────────────
  const intel = useMemo(() => {
    const bugsTopic = overall.topTopics.find(t => t.topic === 'bugs');
    const bugsCount = bugsTopic ? bugsTopic.count : 0;
    const isBugCritical = bugsCount > 200 && overall.sentiment.NEGATIVE > overall.sentiment.POSITIVE;

    const foundCriticals = overall.topKeywords.filter(k => criticalKeywords.includes(k.keyword));
    const hasCriticalFailure = foundCriticals.length > 0 && foundCriticals.some(k => k.count > 50);

    let worstPlatform = { name: '', negativeCount: -1 };
    Object.entries(sources).forEach(([platformName, platformData]) => {
      if (platformData.sentiment.NEGATIVE > worstPlatform.negativeCount) {
        worstPlatform = { name: platformName, negativeCount: platformData.sentiment.NEGATIVE };
      }
    });

    const insights = [];
    if (isBugCritical) {
      insights.push({ type: 'critical', text: `[CRITICAL ALERT] Major volume of bug reports (${bugsCount}). Negative sentiment dominant. Developer escalation required immediately.` });
    }
    if (hasCriticalFailure) {
      const keys = foundCriticals.slice(0, 3).map(k => k.keyword.toUpperCase()).join(', ');
      insights.push({ type: 'critical', text: `[CRITICAL ALERT] System functional failure detected. Keywords: [${keys}]. High volume of blockages reported.` });
    }
    if (worstPlatform.name) {
      insights.push({ type: 'warning', text: `[WARNING] Elevated risk on platform ${worstPlatform.name.toUpperCase()}. Highest negative distribution recorded (${worstPlatform.negativeCount} negative).` });
    }
    insights.push({ type: 'info', text: `[INSIGHT] Analysis of ${overall.totalAnalyzed} unstructured data points complete. Average urgency sits at ${overall.averageUrgency}/100.` });

    return { insights, hasCriticalFailure, isBugCritical };
  }, [overall, sources]);

  const totalSentiment = overall.sentiment.POSITIVE + overall.sentiment.NEGATIVE;
  const pctNeg = totalSentiment > 0 ? Math.round((overall.sentiment.NEGATIVE / totalSentiment) * 100) : 0;

  return (
    <div className="ent-dashboard">
      <header className="ent-header">
        <div>
          <h1 className="ent-title">ANALYTICS & INTELLIGENCE PORTAL</h1>
          <div className="ent-subtitle">Workspace: {company?.name || 'SYS_DEFAULT'} | Data Points: {overall.totalAnalyzed}</div>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {company?.invite_code && (
            <div className="ent-badge info" style={{ padding: '6px 12px' }}>
              INVITE: {company.invite_code}
            </div>
          )}
          <button className="ent-btn-ghost" onClick={onLogout}>DISCONNECT</button>
        </div>
      </header>

      {/* TABS NAVIGATION */}
      <div className="ent-tabs-container">
        <button 
          className={`ent-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`ent-tab ${activeTab === 'incidents' ? 'active' : ''}`}
          onClick={() => setActiveTab('incidents')}
        >
          Critical Incidents
          {(intel.isBugCritical || intel.hasCriticalFailure) && (
            <span style={{ marginLeft: '8px', background: ENT_COLORS.critical, color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
              ALERT
            </span>
          )}
        </button>
      </div>

      <main className="ent-main">
        {activeTab === 'overview' && (
          <div className="ent-grid">
            {/* ROW 1: TOP METRICS */}
            <div className="ent-row-3">
              <div className="ent-card">
                <div className="ent-card-header">System Health Status</div>
                <div className="ent-metric-value">
                  {intel.hasCriticalFailure ? 'DEGRADED' : 'NOMINAL'}
                  <span className={`ent-badge ${intel.hasCriticalFailure ? 'critical' : 'success'}`}>
                    {intel.hasCriticalFailure ? 'ACTION REQ' : 'STABLE'}
                  </span>
                </div>
              </div>

              <div className="ent-card">
                <div className="ent-card-header">Global Sentiment Imbalance</div>
                <div className="ent-metric-value">
                  {pctNeg}% 
                  <span className={`ent-badge ${pctNeg > 50 ? 'critical' : 'success'}`}>
                    {pctNeg > 50 ? 'NEGATIVE BIAS' : 'POSITIVE BIAS'}
                  </span>
                </div>
              </div>

              <div className="ent-card">
                <div className="ent-card-header">Calculated Urgency Index</div>
                <div className="ent-metric-value">
                  {overall.averageUrgency} <span className="ent-metric-sub">/ 100</span>
                  <span className={`ent-badge ${overall.averageUrgency > 30 ? 'warning' : 'info'}`}>
                    {overall.averageUrgency > 30 ? 'ELEVATED' : 'BASELINE'}
                  </span>
                </div>
              </div>
            </div>

            {/* ROW 3: DISTRIBUTION CHARTS */}
            <div className="ent-row-3">
              <div className="ent-card">
                <div className="ent-card-header">Sentiment Distribution</div>
                <div className="ent-chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sentimentData} innerRadius={0} outerRadius={120} dataKey="value" stroke="none">
                        {sentimentData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: ENT_COLORS.muted }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="ent-chart-caption">Clear visualization of positive vs negative volume. High negative ratio warrants immediate analysis of bottom rows.</div>
              </div>

              <div className="ent-card">
                <div className="ent-card-header">Emotion Distribution</div>
                <div className="ent-chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={emotionData} innerRadius={80} outerRadius={120} dataKey="value" stroke="none" paddingAngle={2}>
                        {emotionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: ENT_COLORS.muted }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="ent-chart-caption">Dominant emotion heavily skews towards negative vectors (sadness/disgust), indicating core user dissatisfaction pattern.</div>
              </div>

              <div className="ent-card">
                <div className="ent-card-header">Trailing Issue Trend (Simulated)</div>
                <div className="ent-chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={ENT_COLORS.grid} vertical={false} />
                      <XAxis dataKey="period" stroke={ENT_COLORS.muted} fontSize={12} tickLine={false} />
                      <YAxis yAxisId="left" stroke={ENT_COLORS.muted} fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="right" orientation="right" stroke={ENT_COLORS.muted} fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: ENT_COLORS.muted }} />
                      <Line yAxisId="left" type="monotone" dataKey="volume" name="Issue Volume" stroke={ENT_COLORS.critical} strokeWidth={3} dot={{ r: 4, fill: ENT_COLORS.bg }} activeDot={{ r: 8 }} />
                      <Line yAxisId="right" type="monotone" dataKey="score" name="Health Score" stroke={ENT_COLORS.primary} strokeWidth={3} dot={{ r: 4, fill: ENT_COLORS.bg }} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="ent-chart-caption">Inverse correlation detected: As issue volume spikes, the overall health score plummets.</div>
              </div>
            </div>

            {/* ROW 4: TOPICS */}
            <div className="ent-row-2" style={{ marginTop: '24px' }}>
              <div className="ent-card">
                <div className="ent-card-header">Top Issue Categories</div>
                <div className="ent-chart-container" style={{ minHeight: '350px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topIssuesData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={ENT_COLORS.grid} horizontal={false} />
                      <XAxis type="number" stroke={ENT_COLORS.muted} fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" width={100} stroke={ENT_COLORS.muted} fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                      <Bar dataKey="value" fill={ENT_COLORS.primary} radius={[0, 4, 4, 0]} barSize={28}>
                        {topIssuesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="ent-chart-caption">Bugs category highlighted in red. Represents severe systemic failure across recent datasets.</div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'incidents' && (
          <div className="ent-grid">
            
            {/* ROW 2: INTELLIGENCE PANEL */}
            <div className="ent-card" style={{ padding: '32px' }}>
              <div className="ent-card-header" style={{ marginBottom: '24px', fontSize: '1rem' }}>Automated Intelligence & Escalation Desk</div>
              <div className="ent-alerts-panel">
                {intel.insights.map((insight, idx) => (
                  <div key={idx} className={`ent-alert-item ${insight.type}`}>
                    <div className="ent-alert-title">
                      <span className={`ent-badge ${insight.type}`}>{insight.type.toUpperCase()}</span>
                    </div>
                    <div className="ent-alert-text">{insight.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ent-row-2">
              <div className="ent-card">
                <div className="ent-card-header">Critical Keyword Frequency</div>
                <div className="ent-chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={keywordData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={ENT_COLORS.grid} vertical={false} />
                      <XAxis dataKey="name" stroke={ENT_COLORS.muted} fontSize={12} tickLine={false} angle={-30} textAnchor="end" height={60} />
                      <YAxis stroke={ENT_COLORS.muted} fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
                        {keywordData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="ent-chart-caption">Keywords associated with connection loss and OTP failures dominate the current narrative.</div>
              </div>

              <div className="ent-card">
                <div className="ent-card-header">Platform Comparison Risk Assessment (Pos/Neg)</div>
                <div className="ent-chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={platformData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={ENT_COLORS.grid} vertical={false} />
                      <XAxis dataKey="name" stroke={ENT_COLORS.muted} fontSize={12} tickLine={false} />
                      <YAxis stroke={ENT_COLORS.muted} fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: ENT_COLORS.muted }} />
                      <Bar dataKey="Positive" stackId="a" fill={ENT_COLORS.positive} barSize={40} />
                      <Bar dataKey="Negative" stackId="a" fill={ENT_COLORS.critical} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="ent-chart-caption">Play Store generates maximum friction. Urgent platform-specific QA recommended.</div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
