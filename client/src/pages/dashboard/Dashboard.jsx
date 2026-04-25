import { useState, useEffect, useCallback } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  RadialBarChart,
  RadialBar,
} from "recharts";
import {
  Search, LayoutDashboard, Radar as IconRadar, TrendingUp, Users, Settings, Plus, Sparkles, CheckCircle2, MoreVertical, Star, Smile, Database, LogOut
} from 'lucide-react';
import styles from "./dashboard.module.css";
import { useAuth } from "../../context/AuthContext";

import analyticsData from "../../../analytics_summary_fast.json";

/* ─────────────────────────────────────────────────────────────
   JSON DATA INTEGRATION
───────────────────────────────────────────────────────────── */
const fetchAnalyticsData = () => {
  return new Promise((resolve) => {
    const overall = analyticsData.overall;

    // Process ratingData from topTopics
    const maxTopicCount = Math.max(...overall.topTopics.map(t => t.count));
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
      { attr: "JOY", score: emotions.joy },
      { attr: "SADNESS", score: emotions.sadness },
      { attr: "ANGER", score: emotions.anger },
      { attr: "FEAR", score: emotions.fear },
      { attr: "SURPRISE", score: emotions.surprise },
      { attr: "DISGUST", score: emotions.disgust }
    ];

    // Normalize radar scores to 0-100
    const maxEmotion = Math.max(...radarData.map(d => d.score), 1);
    radarData.forEach(d => { d.score = Math.round((d.score / maxEmotion) * 100); });

    // Process sentimentData
    const total = overall.totalAnalyzed;
    const pos = overall.sentiment.POSITIVE;
    const pct = Math.round((pos / total) * 100);
    const avgRating = (pct / 100) * 5;

    resolve({
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
        { month: "May", rating: avgRating - 0.2 },
        { month: "Jun", rating: avgRating + 0.1 },
        { month: "Jul", rating: avgRating - 0.1 },
        { month: "Aug", rating: avgRating },
      ]
    });
  });
};

/* ─────────────────────────────────────────────────────────────
   SMALL REUSABLE PIECES
───────────────────────────────────────────────────────────── */
function StarRow({ value, max = 5 }) {
  return (
    <div className={styles.starRow}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={i < Math.round(value) ? styles.star : styles.starEmpty}>
          ★
        </span>
      ))}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.customTooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      <div className={styles.tooltipVal}>{payload[0].value}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SIDEBAR
───────────────────────────────────────────────────────────── */
function Sidebar() {
  const { signOut } = useAuth();

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
        <a href="#" className={`${styles.navItem} ${styles.active}`}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </a>
        <a href="#" className={styles.navItem}>
          <IconRadar size={20} />
          <span>Sentiment Radar</span>
        </a>
        <a href="#" className={styles.navItem}>
          <TrendingUp size={20} />
          <span>Rating Trends</span>
        </a>
        <a href="#" className={styles.navItem}>
          <Users size={20} />
          <span>Team Insights</span>
        </a>
        <a href="#" className={styles.navItem}>
          <Settings size={20} />
          <span>System Settings</span>
        </a>
      </nav>

      <div className={styles.sidebarBottom}>
        <button className={styles.newAnalysisBtn} style={{ marginBottom: '12px' }}>
          <Plus size={18} />
          New Analysis
        </button>
        <button className={styles.newAnalysisBtn} onClick={signOut} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}>
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────────
   CHART A — RADAR
───────────────────────────────────────────────────────────── */
function RadarCard({ data }) {
  if (!data) return <div className={styles.card}>Loading Radar...</div>;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.cardTitle}>Feature Sentiment</p>
          <p className={styles.cardSubTitle}>Multidimensional category performance</p>
        </div>
        <MoreVertical size={20} className={styles.cardActionIcon} />
      </div>

      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <PolarGrid stroke="#e8eaf2" strokeDasharray="3 3" gridType="polygon" />
            <PolarAngleAxis
              dataKey="attr"
              tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "Inter, sans-serif", fontWeight: 600, letterSpacing: 1 }}
              tickLine={false}
            />
            <Radar
              dataKey="score"
              stroke="#1F4D3B"
              strokeWidth={2}
              fill="rgba(31, 77, 59, 0.08)"
              fillOpacity={0.8}
              dot={{ fill: "#1F4D3B", r: 4, strokeWidth: 0 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CHART B — RATING BARS
───────────────────────────────────────────────────────────── */
function RatingBarsCard({ data }) {
  if (!data) return <div className={styles.card}>Loading Ratings...</div>;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.cardTitle}>AI Extracted Ratings</p>
          <p className={styles.cardSubTitle}>Granular quality breakdown from NLP engine</p>
        </div>
        <div className={styles.headerStars}>
          <StarRow value={data.main.value} />
          <span className={styles.headerStarVal}>{data.main.value.toFixed(1)}</span>
        </div>
      </div>

      <div className={styles.ratingBars}>
        {data.bars.map((bar) => (
          <div key={bar.id} className={styles.ratingRow}>
            <div className={styles.ratingRowMeta}>
              <span className={styles.ratingLabel}>{bar.label}</span>
              <span className={styles.ratingVal}>{bar.value}/100</span>
            </div>
            <div className={styles.ratingTrack}>
              <div
                className={styles.ratingFillPrimary}
                style={{ width: `${bar.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CHART C — LINE
───────────────────────────────────────────────────────────── */
function LineCard({ data }) {
  if (!data) return <div className={styles.card}>Loading Trends...</div>;

  const min = Math.max(0, Math.min(...data.map((d) => d.rating)) - 0.5);
  const max = Math.min(5, Math.max(...data.map((d) => d.rating)) + 0.3);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.cardTitle}>Rating Trend</p>
          <p className={styles.cardSubTitle}>Rolling 8-month satisfaction index</p>
        </div>
        <div className={styles.timeToggles}>
          <span className={styles.timeToggle}>6M</span>
          <span className={`${styles.timeToggle} ${styles.timeToggleActive}`}>1Y</span>
        </div>
      </div>

      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 20, right: 12, bottom: 0, left: -16 }}>
            <XAxis
              dataKey="month"
              tick={{ fill: "#9ca3af", fontSize: 12, fontFamily: "Inter, sans-serif" }}
              axisLine={{ stroke: '#f3f4f6' }}
              tickLine={false}
              dy={10}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e5e7eb", strokeWidth: 1 }} />
            <Line
              type="monotone"
              dataKey="rating"
              stroke="#1F4D3B"
              strokeWidth={3}
              dot={{ fill: "#fff", stroke: "#1F4D3B", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: "#143528", stroke: "#fff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CHART D — DONUT
───────────────────────────────────────────────────────────── */
function DonutCard({ data }) {
  if (!data) return <div className={styles.card}>Loading Sentiment...</div>;

  const radialData = [
    { name: "track", value: 100, fill: "rgba(31, 77, 59, 0.08)" },
    { name: data.label, value: data.pct, fill: "#1F4D3B" },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.cardTitle}>Overall Sentiment</p>
          <p className={styles.cardSubTitle}>Global aggregate pulse</p>
        </div>
      </div>

      <div className={styles.donutWrapper}>
        <div className={styles.donutContainer}>
          <ResponsiveContainer width={220} height={220}>
            <RadialBarChart
              innerRadius="80%"
              outerRadius="100%"
              data={radialData}
              startAngle={90}
              endAngle={-270}
              barSize={14}
            >
              <RadialBar dataKey="value" cornerRadius={8} background={false}>
                {radialData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </RadialBar>
            </RadialBarChart>
          </ResponsiveContainer>

          <div className={styles.donutCenter}>
            <div className={styles.donutPct}>{data.pct}%</div>
            <div className={styles.donutLabel}>{data.label}</div>
          </div>
        </div>

        <div className={styles.donutLegend}>
          <div className={styles.donutLegendItem}>
            <div className={styles.legendLeft}>
              <div className={styles.donutLegendDot} style={{ background: "#1F4D3B" }} />
              <span>Positive</span>
            </div>
            <span className={styles.legendVal}>93%</span>
          </div>
          <div className={styles.donutLegendItem}>
            <div className={styles.legendLeft}>
              <div className={styles.donutLegendDot} style={{ background: "rgba(31, 77, 59, 0.15)" }} />
              <span>Neutral</span>
            </div>
            <span className={styles.legendVal}>5%</span>
          </div>
          <div className={styles.donutLegendItem}>
            <div className={styles.legendLeft}>
              <div className={styles.donutLegendDot} style={{ background: "#dc2626" }} />
              <span>Negative</span>
            </div>
            <span className={styles.legendVal}>2%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ROOT DASHBOARD (InsightEngine)
───────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const [ratingData, setRatingData] = useState(null);
  const [radarData, setRadarData] = useState(null);
  const [sentimentData, setSentimentData] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [totalAnalyzed, setTotalAnalyzed] = useState(0);
  const [topTopic, setTopTopic] = useState('');
  const [topKeyword, setTopKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchAnalyticsData();
      setRatingData(response.ratingData);
      setRadarData(response.radarData);
      setSentimentData(response.sentimentData);
      setTrendData(response.trendData);
      setTotalAnalyzed(response.totalAnalyzed);
      setTopTopic(response.topTopic);
      setTopKeyword(response.topKeyword);
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
      <Sidebar />

      <main className={styles.mainContent}>
        {/* Top Navigation */}
        <header className={styles.topNav}>
          <div className={styles.searchBar}>
            <Search size={18} className={styles.searchIcon} />
            <input type="text" placeholder="Search insights..." className={styles.searchInput} />
          </div>
          <h1 className={styles.navTitle}>Analytics Overview</h1>
        </header>

        {/* Top Summary Cards */}
        <div className={styles.topCardsGrid}>
          <div className={styles.summaryCard}>
            <div>
              <p className={styles.summaryTitle}>AVG RATING</p>
              <div className={styles.summaryValueRow}>
                <span className={styles.summaryValue}>{ratingData?.main?.value?.toFixed(2) || '0.00'}</span>
                <span className={styles.summaryTrend}>~+12%</span>
              </div>
            </div>
            <div className={styles.summaryIconWrapper} style={{ background: 'rgba(31, 77, 59, 0.08)', color: '#1F4D3B' }}>
              <Star size={24} fill="currentColor" />
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div>
              <p className={styles.summaryTitle}>SENTIMENT SCORE</p>
              <div className={styles.summaryValueRow}>
                <span className={styles.summaryValue}>{sentimentData?.pct || 0}%</span>
                <span className={styles.summaryTrend}>~+5.2%</span>
              </div>
            </div>
            <div className={styles.summaryIconWrapper} style={{ background: 'rgba(160, 113, 81, 0.1)', color: '#a07151' }}>
              <Smile size={24} fill="currentColor" />
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div>
              <p className={styles.summaryTitle}>TOTAL ANALYZED</p>
              <div className={styles.summaryValueRow}>
                <span className={styles.summaryValue}>{totalAnalyzed.toLocaleString()}</span>
                <span className={styles.summarySubtext}>Reviews</span>
              </div>
            </div>
            <div className={styles.summaryIconWrapper} style={{ background: '#f3f4f6', color: '#6b7280' }}>
              <Database size={24} />
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className={styles.chartsGrid}>
          <RadarCard data={radarData} />
          <RatingBarsCard data={ratingData} />
          <LineCard data={trendData} />
          <DonutCard data={sentimentData} />
        </div>

        {/* AI Summary Section */}
        <div className={styles.aiSummarySection}>
          <div className={styles.aiSummaryHeader}>
            <div className={styles.aiSummaryIcon}>
              <Sparkles size={20} color="#fff" />
            </div>
            <div>
              <h3 className={styles.aiSummaryTitle}>InsightEngine AI Summary</h3>
              <p className={styles.aiSummarySub}>Automatic intelligence extraction from latest data batches</p>
            </div>
          </div>

          <div className={styles.aiInsightsGrid}>
            <div className={styles.aiInsightCard}>
              <div className={styles.insightIconWrapper} style={{ color: '#a07151' }}>
                <TrendingUp size={20} />
              </div>
              <div className={styles.insightContent}>
                <h4>Growth Opportunity identified</h4>
                <p>Users are frequently mentioning the topic <strong>"{topTopic}"</strong> alongside keywords like <strong>"{topKeyword}"</strong>. Implementing targeted improvements here could raise user satisfaction significantly.</p>
              </div>
            </div>

            <div className={styles.aiInsightCard}>
              <div className={styles.insightIconWrapper} style={{ color: '#1F4D3B' }}>
                <CheckCircle2 size={20} />
              </div>
              <div className={styles.insightContent}>
                <h4>Recent Feedback Focus</h4>
                <p>The latest data shows a high volume of positive sentiment ({sentimentData?.pct || 0}%). Continue monitoring the <strong>"{topTopic}"</strong> feedback to maintain this trend.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}