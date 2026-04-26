import { useState, useEffect, useCallback } from "react";
import {
  Search, LayoutDashboard, Radar as IconRadar, TrendingUp, MapPin, FileText, AlertCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import styles from "./dashboard.module.css";
import DashboardOverview from "./DashboardOverview";
import LocationInsights from "./LocationInsights";
import SentimentRadar from "./SentimentRadar";
import RatingTrends from "./RatingTrends";
import SignOutButton from "../../components/SignOutButton";
import { supabase } from "../../services/supabase";

/* ─────────────────────────────────────────────────────────────
   JSON DATA INTEGRATION
───────────────────────────────────────────────────────────── */
const fetchAnalyticsData = async () => {
  try {
    const { data: records, error } = await supabase
      .from('analytics_summaries')
      .select('data')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    
    let analyticsData = {};
    if (records && records.length > 0) {
      analyticsData = records[0].data;
    }

    // Fallback/Mock structure if the Supabase data doesn't perfectly match the old overall structure
    const overall = analyticsData.overall || {
      topTopics: [{ topic: 'general', count: 1 }],
      emotions: { joy: 10, sadness: 10, anger: 10, fear: 10, surprise: 10, disgust: 10 },
      sentiment: { POSITIVE: 50, NEGATIVE: 50 },
      totalAnalyzed: 100,
      topKeywords: [{ keyword: 'app', count: 1 }]
    };

    // Process ratingData from topTopics
    const maxTopicCount = Math.max(...overall.topTopics.map(t => t.count), 1);
    const bars = overall.topTopics.slice(0, 4).map((t) => ({
      id: t.topic,
      label: t.topic.charAt(0).toUpperCase() + t.topic.slice(1).replace('_', ' '),
      value: Math.round((t.count / maxTopicCount) * 100),
      max: 100,
      color: "primary"
    }));

    // Process radarData from emotions
    const emotions = overall.emotions;
    const radarData = [
      { attr: "JOY", score: emotions.joy || 0 },
      { attr: "SADNESS", score: emotions.sadness || 0 },
      { attr: "ANGER", score: emotions.anger || 0 },
      { attr: "FEAR", score: emotions.fear || 0 },
      { attr: "SURPRISE", score: emotions.surprise || 0 },
      { attr: "DISGUST", score: emotions.disgust || 0 }
    ];

    // Normalize radar scores to 0-100
    const maxEmotion = Math.max(...radarData.map(d => d.score), 1);
    radarData.forEach(d => { d.score = Math.round((d.score / maxEmotion) * 100); });

    // Process sentimentData
    const total = overall.totalAnalyzed || 1;
    const pos = overall.sentiment?.POSITIVE || 0;
    const pct = Math.round((pos / total) * 100);
    const avgRating = (pct / 100) * 5;

    return {
      rawData: analyticsData,
      parsedData: {
        ratingData: {
          main: { label: "Average Rating", value: avgRating, max: 5 },
          bars: bars,
        },
        radarData: radarData,
        sentimentData: { pct: pct, label: "POSITIVE" },
        totalAnalyzed: total,
        topTopic: overall.topTopics[0]?.topic || 'general',
        topKeyword: overall.topKeywords[0]?.keyword || 'app',
        trendData: [
          { month: "Jan", rating: 3.8 },
          { month: "Feb", rating: 4.0 },
          { month: "Mar", rating: 3.7 },
          { month: "Apr", rating: 4.2 },
          { month: "May", rating: Math.max(0, avgRating - 0.2) },
          { month: "Jun", rating: Math.min(5, avgRating + 0.1) },
          { month: "Jul", rating: Math.max(0, avgRating - 0.1) },
          { month: "Aug", rating: avgRating },
        ]
      }
    };
  } catch (err) {
    console.error("Failed to fetch analytics from Supabase", err);
    throw err;
  }
};

/* ─────────────────────────────────────────────────────────────
   SIDEBAR
───────────────────────────────────────────────────────────── */
function Sidebar({ activeView, setActiveView }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarLogo}>
        <div className={styles.logoIcon}>IE</div>
        <div>
          <h2 className={styles.logoTitle}>InsightEngine</h2>
          <p className={styles.logoSub}>AI Analytics Lab</p>
        </div>
      </div>

      <nav className={styles.sidebarNav}>
        <a href="#" className={`${styles.navItem} ${activeView === 'Dashboard' ? styles.active : ''}`} onClick={(e) => { e.preventDefault(); setActiveView('Dashboard'); }}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </a>
        <a href="#" className={`${styles.navItem} ${activeView === 'Location Insights' ? styles.active : ''}`} onClick={(e) => { e.preventDefault(); setActiveView('Location Insights'); }}>
          <MapPin size={20} />
          <span>Location Insights</span>
        </a>
        <a href="#" className={`${styles.navItem} ${activeView === 'Sentiment Radar' ? styles.active : ''}`} onClick={(e) => { e.preventDefault(); setActiveView('Sentiment Radar'); }}>
          <IconRadar size={20} />
          <span>Sentiment Radar</span>
        </a>
        <a href="#" className={`${styles.navItem} ${activeView === 'Rating Trends' ? styles.active : ''}`} onClick={(e) => { e.preventDefault(); setActiveView('Rating Trends'); }}>
          <TrendingUp size={20} />
          <span>Rating Trends</span>
        </a>
        <a href="#" className={`${styles.navItem} ${activeView === 'AI Summary' ? styles.active : ''}`} onClick={(e) => { e.preventDefault(); setActiveView('AI Summary'); }}>
          <FileText size={20} />
          <span>AI Summary</span>
        </a>
        <a href="#" className={`${styles.navItem} ${activeView === 'Urgency Analysis' ? styles.active : ''}`} onClick={(e) => { e.preventDefault(); setActiveView('Urgency Analysis'); }}>
          <AlertCircle size={20} />
          <span>Priority Dispatch</span>
        </a>
      </nav>

      <div className={styles.sidebarBottom}>
        <SignOutButton />
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────────
   AI SUMMARY VIEW
───────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────
   URGENCY ANALYSIS VIEW (Priority Dispatch)
───────────────────────────────────────────────────────────── */
function UrgencyAnalysisView({ rawData }) {
  const trends = rawData?.trends || {};
  const sortedMonths = Object.keys(trends).sort();
  
  const urgencyData = sortedMonths.map(month => ({
    month,
    urgency: Math.round((trends[month].averageUrgency || 0) * 10) / 10,
    total: trends[month].totalAnalyzed || 0
  }));

  const avgUrgency = urgencyData.length > 0 
    ? (urgencyData.reduce((acc, curr) => acc + curr.urgency, 0) / urgencyData.length).toFixed(1)
    : 0;

  return (
    <div>
      <div className={styles.topNav} style={{ marginBottom: 32 }}>
        <h2 className={styles.navTitle}>Priority Dispatch Analysis</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 24 }}>
        <div className={styles.summaryCard}>
          <div>
            <p className={styles.summaryTitle}>AVG URGENCY SCORE</p>
            <p className={styles.summaryValue}>{avgUrgency}/10</p>
          </div>
          <div className={styles.summaryIconWrapper} style={{ background: 'rgba(224,122,95,0.1)', color: '#E07A5F' }}>🔥</div>
        </div>
        <div className={styles.summaryCard}>
          <div>
            <p className={styles.summaryTitle}>HIGH PRIORITY LOAD</p>
            <p className={styles.summaryValue}>
              {urgencyData[urgencyData.length-1]?.total || 0}
            </p>
          </div>
          <div className={styles.summaryIconWrapper} style={{ background: 'rgba(31,77,59,0.06)', color: '#1F4D3B' }}>⚡</div>
        </div>
        <div className={styles.summaryCard}>
          <div>
            <p className={styles.summaryTitle}>RESPONSE TARGET</p>
            <p className={styles.summaryValue}>&lt; 2h</p>
          </div>
          <div className={styles.summaryIconWrapper} style={{ background: 'rgba(160,113,81,0.08)', color: '#a07151' }}>⏱️</div>
        </div>
      </div>

      <div className={styles.card} style={{ padding: 32, marginBottom: 24 }}>
        <div className={styles.cardHeader} style={{ marginBottom: 24 }}>
          <div>
            <p className={styles.cardTitle}>Urgency Trends</p>
            <p className={styles.cardSubTitle}>Monthly average urgency score (1-10 scale)</p>
          </div>
        </div>
        <div style={{ height: 300, width: '100%' }}>
           <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={urgencyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorUrgency" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E07A5F" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#E07A5F" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
              <XAxis dataKey="month" tick={{ fill: "#8a968f", fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
              <YAxis domain={[0, 10]} tick={{ fill: "#8a968f", fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} />
              <Tooltip 
                contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
              />
              <Area type="monotone" dataKey="urgency" name="Urgency Score" stroke="#E07A5F" strokeWidth={3} fill="url(#colorUrgency)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.card} style={{ padding: 32, marginBottom: 24 }}>
        <div className={styles.cardHeader} style={{ marginBottom: 24 }}>
          <div>
            <p className={styles.cardTitle}>Identified Problems & Risks</p>
            <p className={styles.cardSubTitle}>Topics identified as potential blockers or high-priority issues</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {rawData?.overall?.topTopics?.slice(0, 6).map((t, idx) => (
            <div key={idx} style={{ 
              padding: 20, 
              background: 'rgba(31,77,59,0.03)', 
              borderRadius: 16, 
              border: '1px solid rgba(31,77,59,0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: 16
            }}>
              <div style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 12, 
                background: '#E07A5F', 
                color: '#fff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 14
              }}>
                !
              </div>
              <div>
                <p style={{ fontWeight: 700, color: '#1c231f', textTransform: 'capitalize', marginBottom: 2 }}>{t.topic.replace(/_/g, ' ')}</p>
                <p style={{ fontSize: 12, color: '#8a968f' }}>{t.count} mentions identified in latest batch</p>
              </div>
            </div>
          ))}
          {(!rawData?.overall?.topTopics || rawData.overall.topTopics.length === 0) && (
            <p style={{ color: '#8a968f', fontSize: 14 }}>No specific problems identified in the current data batch.</p>
          )}
        </div>
      </div>

      <div className={styles.card} style={{ padding: 32 }}>
        <div className={styles.cardHeader} style={{ marginBottom: 20 }}>
          <p className={styles.cardTitle}>Response Prioritization Strategy</p>
        </div>
        <div style={{ color: '#1c231f', fontSize: 14, lineHeight: 1.6 }}>
          <p style={{ marginBottom: 12 }}>Based on the current <strong>{avgUrgency}/10</strong> urgency level, we recommend the following prioritization:</p>
          <ul style={{ paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}><strong>Critical (Score 8-10):</strong> Immediate escalation to support leads. Target response: 30 mins.</li>
            <li style={{ marginBottom: 8 }}><strong>High (Score 6-8):</strong> Direct assignment to specialized teams. Target response: 2 hours.</li>
            <li><strong>Medium/Low (Score &lt; 6):</strong> Batch processing by standard support queues. Target response: 24 hours.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function AISummaryView({ rawData }) {
  const summary = rawData?.llm_executive_summary;
  const overall = rawData?.overall;

  return (
    <div>
      <div className={styles.topNav} style={{ marginBottom: 32 }}>
        <h2 className={styles.navTitle}>AI Summary Report</h2>
      </div>

      {overall && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 24 }}>
          <div className={styles.summaryCard}>
            <div>
              <p className={styles.summaryTitle}>TOTAL REVIEWS</p>
              <p className={styles.summaryValue}>{overall.totalAnalyzed?.toLocaleString() || 0}</p>
            </div>
            <div className={styles.summaryIconWrapper} style={{ background: 'rgba(31,77,59,0.06)', color: '#1F4D3B' }}>📊</div>
          </div>
          <div className={styles.summaryCard}>
            <div>
              <p className={styles.summaryTitle}>POSITIVE SENTIMENT</p>
              <p className={styles.summaryValue}>
                {overall.totalAnalyzed
                  ? Math.round(((overall.sentiment?.POSITIVE || 0) / overall.totalAnalyzed) * 100)
                  : 0}%
              </p>
            </div>
            <div className={styles.summaryIconWrapper} style={{ background: 'rgba(31,77,59,0.06)', color: '#1F4D3B' }}>😊</div>
          </div>
          <div className={styles.summaryCard}>
            <div>
              <p className={styles.summaryTitle}>TOP TOPIC</p>
              <p className={styles.summaryValue} style={{ fontSize: 22, textTransform: 'capitalize' }}>
                {overall.topTopics?.[0]?.topic?.replace(/_/g, ' ') || '—'}
              </p>
            </div>
            <div className={styles.summaryIconWrapper} style={{ background: 'rgba(160,113,81,0.08)', color: '#a07151' }}>🏷️</div>
          </div>
        </div>
      )}

      {summary ? (
        <div className={styles.card} style={{ padding: 40, lineHeight: 1.8 }}>
          <div className={styles.cardHeader} style={{ marginBottom: 24 }}>
            <div>
              <p className={styles.cardTitle} style={{ fontSize: 20 }}>Executive Summary</p>
              <p className={styles.cardSubTitle}>AI-generated report from the latest data batch</p>
            </div>
            <div style={{
              background: 'rgba(31,77,59,0.06)',
              color: '#1F4D3B',
              borderRadius: 999,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
            }}>
              ✦ AI Generated
            </div>
          </div>
          <div style={{
            fontSize: 15,
            color: '#1c231f',
            lineHeight: 1.9,
            fontFamily: 'Inter, sans-serif',
          }}>
            <ReactMarkdown className="markdown-report">{summary}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className={styles.card} style={{ padding: 56, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
          <p className={styles.cardTitle} style={{ marginBottom: 8 }}>No AI Summary Available</p>
          <p className={styles.cardSubTitle}>
            Run the AI pipeline to generate an executive summary report.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ROOT DASHBOARD (InsightEngine)
───────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const [activeView, setActiveView] = useState('Dashboard');
  const [globalRawData, setGlobalRawData] = useState(null);
  const [globalParsedData, setGlobalParsedData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchAnalyticsData();
      setGlobalRawData(response.rawData);
      setGlobalParsedData(response.parsedData);
    } catch (error) {
      console.error("Failed to fetch analytics data", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return (
    <div className={styles.dashboardContainer}>
      <Sidebar activeView={activeView} setActiveView={setActiveView} />

      <main className={styles.mainContent}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '600px', color: 'var(--text2)' }}>Loading Analytics Data...</div>
        ) : (
          <>
            {activeView === 'Location Insights' && <LocationInsights data={globalRawData} />}
            {activeView === 'Sentiment Radar' && <SentimentRadar data={globalRawData} />}
            {activeView === 'Rating Trends' && <RatingTrends data={globalRawData} />}
            {activeView === 'Dashboard' && <DashboardOverview parsedData={globalParsedData} rawData={globalRawData} />}
            {activeView === 'AI Summary' && <AISummaryView rawData={globalRawData} />}
            {activeView === 'Urgency Analysis' && <UrgencyAnalysisView rawData={globalRawData} />}
          </>
        )}
      </main>
    </div>
  );
}