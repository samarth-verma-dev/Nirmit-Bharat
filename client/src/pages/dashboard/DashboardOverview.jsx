import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';

import { Star, Smile, Database, TrendingUp, CheckCircle2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import styles from "./dashboard.module.css";
import SankeyCard from "./SankeyCard";
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
   CHART D — DONUT
───────────────────────────────────────────────────────────── */
function DonutCard({ data }) {
  if (!data) return <div className={styles.card}>Loading Sentiment...</div>;

  const pieData = [
    { name: "Positive", value: data.posPct, fill: "#1F4D3B" },
    { name: "Neutral", value: data.neuPct, fill: "#9CA3AF" },
    { name: "Negative", value: data.negPct, fill: "#dc2626" },
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
            <PieChart>
              <Pie
                data={pieData}
                innerRadius="80%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className={styles.donutCenter}>
            <div className={styles.donutPct}>{data.posPct}%</div>
            <div className={styles.donutLabel}>POSITIVE</div>
          </div>
        </div>

        <div className={styles.donutLegend}>
          <div className={styles.donutLegendItem}>
            <div className={styles.legendLeft}>
              <div className={styles.donutLegendDot} style={{ background: "#1F4D3B" }} />
              <span>Positive</span>
            </div>
            <span className={styles.legendVal}>{data.posPct}%</span>
          </div>
          <div className={styles.donutLegendItem}>
            <div className={styles.legendLeft}>
              <div className={styles.donutLegendDot} style={{ background: "#9CA3AF" }} />
              <span>Neutral</span>
            </div>
            <span className={styles.legendVal}>{data.neuPct}%</span>
          </div>
          <div className={styles.donutLegendItem}>
            <div className={styles.legendLeft}>
              <div className={styles.donutLegendDot} style={{ background: "#dc2626" }} />
              <span>Negative</span>
            </div>
            <span className={styles.legendVal}>{data.negPct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DASHBOARD OVERVIEW COMPONENT
───────────────────────────────────────────────────────────── */
export default function DashboardOverview({ parsedData, rawData }) {
  if (!parsedData) return <div>Loading overview...</div>;

  const { ratingData, sentimentData, totalAnalyzed, topTopic, topKeyword } = parsedData;

  return (
    <>
      {/* Page title */}
      <header style={{ marginBottom: 32 }}>
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
              <span className={styles.summaryValue}>{sentimentData?.posPct || 0}%</span>
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
        <RatingBarsCard data={ratingData} />
        <DonutCard data={sentimentData} />
        <SankeyCard rawData={rawData} />
      </div>


    </>
  );
}
