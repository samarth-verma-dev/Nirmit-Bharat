import { useState, useEffect, useCallback } from "react";
import {
  Search, LayoutDashboard, Radar as IconRadar, TrendingUp, MapPin
} from 'lucide-react';
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
      </nav>

      <div className={styles.sidebarBottom}>
        <SignOutButton />
      </div>
    </aside>
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
          </>
        )}
      </main>
    </div>
  );
}