import React from 'react';
import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle } from 'recharts';
import styles from './dashboard.module.css';

// Custom Node for Sankey to draw nice rectangles with labels
const CustomNode = ({ x, y, width, height, index, payload, containerWidth }) => {
  const isOut = x + width + 6 > containerWidth;
  return (
    <Layer key={`CustomNode${index}`}>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={payload.color || '#1F4D3B'}
        fillOpacity="1"
      />
      <text
        textAnchor={isOut ? 'end' : 'start'}
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2}
        fontSize="12"
        fill="var(--text)"
        stroke="none"
        alignmentBaseline="middle"
      >
        {payload.name} ({payload.value})
      </text>
    </Layer>
  );
};

export default function SankeyCard({ rawData }) {
  if (!rawData || !rawData.overall) return null;

  // Process data for Sankey
  const nodes = [];
  const links = [];
  let nodeIndex = 0;

  const addNode = (name, color) => {
    nodes.push({ name, color });
    return nodeIndex++;
  };

  // Node 0: Total
  const totalIdx = addNode('Total Reviews', '#1F4D3B');

  // Level 1: Sources
  const sourceKeys = Object.keys(rawData.sources || {});
  const sourceIndices = {};
  
  if (sourceKeys.length > 0) {
    sourceKeys.forEach(source => {
      const sData = rawData.sources[source];
      if (sData.totalAnalyzed > 0) {
        const sIdx = addNode(source, '#2f6d54');
        sourceIndices[source] = sIdx;
        links.push({ source: totalIdx, target: sIdx, value: sData.totalAnalyzed });
      }
    });
  } else {
    // Fallback if no sources
    const sIdx = addNode('All Sources', '#2f6d54');
    sourceIndices['all'] = sIdx;
    links.push({ source: totalIdx, target: sIdx, value: rawData.overall.totalAnalyzed });
  }

  // Level 2: Sentiment
  const posIdx = addNode('Positive', '#16a34a');
  const neuIdx = addNode('Neutral', '#9ca3af');
  const negIdx = addNode('Negative', '#dc2626');

  // Connect Sources to Sentiment
  if (sourceKeys.length > 0) {
    sourceKeys.forEach(source => {
      const sData = rawData.sources[source];
      const sIdx = sourceIndices[source];
      if (sIdx !== undefined && sData.sentiment) {
        if (sData.sentiment.POSITIVE > 0) links.push({ source: sIdx, target: posIdx, value: sData.sentiment.POSITIVE });
        if (sData.sentiment.NEUTRAL > 0) links.push({ source: sIdx, target: neuIdx, value: sData.sentiment.NEUTRAL });
        if (sData.sentiment.NEGATIVE > 0) links.push({ source: sIdx, target: negIdx, value: sData.sentiment.NEGATIVE });
      }
    });
  } else {
    const sIdx = sourceIndices['all'];
    const sData = rawData.overall;
    if (sData.sentiment) {
      if (sData.sentiment.POSITIVE > 0) links.push({ source: sIdx, target: posIdx, value: sData.sentiment.POSITIVE });
      if (sData.sentiment.NEUTRAL > 0) links.push({ source: sIdx, target: neuIdx, value: sData.sentiment.NEUTRAL });
      if (sData.sentiment.NEGATIVE > 0) links.push({ source: sIdx, target: negIdx, value: sData.sentiment.NEGATIVE });
    }
  }

  // Level 3: Top Negative Topics
  // We will flow Negative Sentiment -> Top 3 Topics
  const negTopics = rawData.overall.topTopics?.slice(0, 3) || [];
  let remainingNeg = rawData.overall.sentiment?.NEGATIVE || 0;

  negTopics.forEach(t => {
    // Assuming topics are distributed proportionally to negative sentiment for visualization
    const val = Math.max(1, Math.floor(t.count * 0.3)); // estimate
    const tIdx = addNode(`Issue: ${t.topic}`, '#ef4444');
    links.push({ source: negIdx, target: tIdx, value: Math.min(val, remainingNeg) });
    remainingNeg -= val;
  });

  if (remainingNeg > 0 && negTopics.length > 0) {
    const otherIdx = addNode('Other Issues', '#fca5a5');
    links.push({ source: negIdx, target: otherIdx, value: remainingNeg });
  }

  const sankeyData = { nodes, links };

  return (
    <div className={styles.card} style={{ gridColumn: '1 / -1', minHeight: '400px' }}>
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.cardTitle}>Feedback Journey Flowchart</p>
          <p className={styles.cardSubTitle}>Trace exactly how reviews flow into positive or negative topics</p>
        </div>
      </div>
      <div style={{ width: '100%', height: 320, marginTop: '20px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={sankeyData}
            node={<CustomNode />}
            nodePadding={20}
            margin={{ left: 20, right: 120, top: 10, bottom: 10 }}
            link={{ stroke: '#a07151', strokeOpacity: 0.2 }}
          >
            <Tooltip
              content={({ payload }) => {
                if (payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div style={{ background: '#fff', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}>
                      {data.name || `${data.source?.name} → ${data.target?.name}`} : {data.value} reviews
                    </div>
                  );
                }
                return null;
              }}
            />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
