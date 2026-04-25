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
  Search, LayoutDashboard, Radar as IconRadar, TrendingUp, Users, Settings, Plus, Sparkles, CheckCircle2, MoreVertical, Star, Smile, Database
} from 'lucide-react';
import styles from "./Dashboard.module.css";

/* ─────────────────────────────────────────────────────────────
   MOCK BACKEND API
───────────────────────────────────────────────────────────── */
const fetchAnalyticsData = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ratingData: {
          main: { label: "Average Rating", value: 4.8, max: 5 },
          bars: [
            { id: "quality",  label: "Build Quality", value: 96, max: 100, color: "primary" },
            { id: "value",    label: "Value for Money", value: 88, max: 100, color: "primary" },
            { id: "support",  label: "Support Score",   value: 74, max: 100, color: "primary" },
            { id: "ux",       label: "UX Consistency",   value: 91, max: 100, color: "primary" },
          ],
        },
        radarData: [
          { attr: "SOUND",      score: 88 },
          { attr: "BATTERY",    score: 72 },
          { attr: "COMFORT",    score: 91 },
          { attr: "DURABILITY", score: 65 },
          { attr: "DESIGN",     score: 84 },
          { attr: "VALUE",      score: 78 },
        ],
        sentimentData: { pct: 93, label: "POSITIVE" },
        trendData: [
          { month: "Jan", rating: 3.8 },
          { month: "Feb", rating: 4.0 },
          { month: "Mar", rating: 3.7 },
          { month: "Apr", rating: 4.2 },
          { month: "May", rating: 4.85 },
          { month: "Jun", rating: 4.3 },
          { month: "Jul", rating: 4.6 },
          { month: "Aug", rating: 4.8 },
        ],
      });
    }, 800);
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
        <button className={styles.newAnalysisBtn}>
          <Plus size={18} />
          New Analysis
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
              stroke="#2563eb"
              strokeWidth={2}
              fill="#eff6ff"
              fillOpacity={0.8}
              dot={{ fill: "#2563eb", r: 4, strokeWidth: 0 }}
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
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ fill: "#fff", stroke: "#2563eb", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: "#1e40af", stroke: "#fff", strokeWidth: 2 }}
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
    { name: "track", value: 100, fill: "#eff6ff" },
    { name: data.label, value: data.pct, fill: "#2563eb" },
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
              <div className={styles.donutLegendDot} style={{ background: "#2563eb" }} />
              <span>Positive</span>
            </div>
            <span className={styles.legendVal}>93%</span>
          </div>
          <div className={styles.donutLegendItem}>
            <div className={styles.legendLeft}>
              <div className={styles.donutLegendDot} style={{ background: "#e5e7eb" }} />
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
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchAnalyticsData();
      setRatingData(response.ratingData);
      setRadarData(response.radarData);
      setSentimentData(response.sentimentData);
      setTrendData(response.trendData);
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
                <span className={styles.summaryValue}>4.82</span>
                <span className={styles.summaryTrend}>~+12%</span>
              </div>
            </div>
            <div className={styles.summaryIconWrapper} style={{ background: '#eff6ff', color: '#2563eb' }}>
              <Star size={24} fill="currentColor" />
            </div>
          </div>
          
          <div className={styles.summaryCard}>
            <div>
              <p className={styles.summaryTitle}>SENTIMENT SCORE</p>
              <div className={styles.summaryValueRow}>
                <span className={styles.summaryValue}>92.4</span>
                <span className={styles.summaryTrend}>~+5.2%</span>
              </div>
            </div>
            <div className={styles.summaryIconWrapper} style={{ background: '#dcfce7', color: '#16a34a' }}>
              <Smile size={24} fill="currentColor" />
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div>
              <p className={styles.summaryTitle}>TOTAL ANALYZED</p>
              <div className={styles.summaryValueRow}>
                <span className={styles.summaryValue}>12,408</span>
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
              <div className={styles.insightIconWrapper} style={{ color: '#16a34a' }}>
                <TrendingUp size={20} />
              </div>
              <div className={styles.insightContent}>
                <h4>Growth Opportunity identified</h4>
                <p>Users in the <strong>"Professional"</strong> segment are requesting improved battery telemetry. Implementing this could raise segment LTV by 14%.</p>
              </div>
            </div>

            <div className={styles.aiInsightCard}>
              <div className={styles.insightIconWrapper} style={{ color: '#2563eb' }}>
                <CheckCircle2 size={20} />
              </div>
              <div className={styles.insightContent}>
                <h4>Recent Fix Impact</h4>
                <p>The v2.4 firmware update has successfully mitigated <strong>"Connection Jitter"</strong> reports, leading to a +22% bump in stability ratings.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}