import React from 'react';
import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle } from 'recharts';
import styles from './dashboard.module.css';

// Color palette consistent with design system
const NODE_COLORS = {
  total:    '#1F4D3B',
  source:   '#3E6B57',
  positive: '#1F4D3B',
  neutral:  '#8a968f',
  negative: '#c0392b',
  topic:    '#a07151',
  other:    '#c0a882',
};

// Custom Node
const CustomNode = ({ x, y, width, height, index, payload, containerWidth }) => {
  const isRight = x + width + 6 > containerWidth * 0.72;
  const label   = payload.name;
  const val     = payload.value;

  return (
    <Layer key={`node-${index}`}>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={payload.color || NODE_COLORS.source}
        fillOpacity={1}
        radius={4}
      />
      {/* Node label */}
      <text
        textAnchor={isRight ? 'end' : 'start'}
        x={isRight ? x - 8 : x + width + 8}
        y={y + height / 2 - 6}
        fontSize={11}
        fontWeight={600}
        fill="#1c231f"
        stroke="none"
        dominantBaseline="middle"
        fontFamily="Inter, sans-serif"
      >
        {label}
      </text>
      {/* Value sub-label */}
      <text
        textAnchor={isRight ? 'end' : 'start'}
        x={isRight ? x - 8 : x + width + 8}
        y={y + height / 2 + 9}
        fontSize={10}
        fill="#8a968f"
        stroke="none"
        dominantBaseline="middle"
        fontFamily="Inter, sans-serif"
      >
        {val.toLocaleString()} reviews
      </text>
    </Layer>
  );
};

// Custom Tooltip
const CustomTooltip = ({ payload }) => {
  if (!payload || !payload.length) return null;
  const d = payload[0].payload;
  const label = d.name
    ? `${d.name}`
    : `${d.source?.name} → ${d.target?.name}`;
  return (
    <div style={{
      background: '#fff',
      padding: '10px 14px',
      border: '1px solid rgba(0,0,0,0.06)',
      borderRadius: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
      fontSize: 12,
      fontFamily: 'Inter, sans-serif',
      color: '#1c231f',
      fontWeight: 600,
    }}>
      {label}
      <span style={{ color: '#8a968f', fontWeight: 400, marginLeft: 6 }}>
        {d.value?.toLocaleString()} reviews
      </span>
    </div>
  );
};

export default function SankeyCard({ rawData }) {
  if (!rawData || !rawData.overall) return null;

  const nodes = [];
  const links = [];
  let nodeIndex = 0;

  const addNode = (name, color) => {
    nodes.push({ name, color });
    return nodeIndex++;
  };

  // Node 0: Total
  const totalIdx = addNode('Total Reviews', NODE_COLORS.total);

  // Level 1: Sources
  const sourceKeys = Object.keys(rawData.sources || {});
  const sourceIndices = {};

  if (sourceKeys.length > 0) {
    sourceKeys.forEach(source => {
      const sData = rawData.sources[source];
      if (sData.totalAnalyzed > 0) {
        const label = source.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const sIdx  = addNode(label, NODE_COLORS.source);
        sourceIndices[source] = sIdx;
        links.push({ source: totalIdx, target: sIdx, value: sData.totalAnalyzed });
      }
    });
  } else {
    const sIdx = addNode('All Sources', NODE_COLORS.source);
    sourceIndices['all'] = sIdx;
    links.push({ source: totalIdx, target: sIdx, value: rawData.overall.totalAnalyzed });
  }

  // Level 2: Sentiment
  const posIdx = addNode('Positive', NODE_COLORS.positive);
  const neuIdx = addNode('Neutral',  NODE_COLORS.neutral);
  const negIdx = addNode('Negative', NODE_COLORS.negative);

  if (sourceKeys.length > 0) {
    sourceKeys.forEach(source => {
      const sData = rawData.sources[source];
      const sIdx  = sourceIndices[source];
      if (sIdx !== undefined && sData.sentiment) {
        if (sData.sentiment.POSITIVE > 0) links.push({ source: sIdx, target: posIdx, value: sData.sentiment.POSITIVE });
        if (sData.sentiment.NEUTRAL  > 0) links.push({ source: sIdx, target: neuIdx, value: sData.sentiment.NEUTRAL });
        if (sData.sentiment.NEGATIVE > 0) links.push({ source: sIdx, target: negIdx, value: sData.sentiment.NEGATIVE });
      }
    });
  } else {
    const sIdx  = sourceIndices['all'];
    const sData = rawData.overall;
    if (sData.sentiment) {
      if (sData.sentiment.POSITIVE > 0) links.push({ source: sIdx, target: posIdx, value: sData.sentiment.POSITIVE });
      if (sData.sentiment.NEUTRAL  > 0) links.push({ source: sIdx, target: neuIdx, value: sData.sentiment.NEUTRAL });
      if (sData.sentiment.NEGATIVE > 0) links.push({ source: sIdx, target: negIdx, value: sData.sentiment.NEGATIVE });
    }
  }

  // Level 3: Top Negative Topics
  const negTopics    = rawData.overall.topTopics?.slice(0, 3) || [];
  let remainingNeg   = rawData.overall.sentiment?.NEGATIVE || 0;

  negTopics.forEach(t => {
    const val  = Math.max(1, Math.floor(t.count * 0.3));
    const name = t.topic.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const tIdx = addNode(name, NODE_COLORS.topic);
    links.push({ source: negIdx, target: tIdx, value: Math.min(val, remainingNeg) });
    remainingNeg -= val;
  });

  if (remainingNeg > 0 && negTopics.length > 0) {
    const otherIdx = addNode('Other Issues', NODE_COLORS.other);
    links.push({ source: negIdx, target: otherIdx, value: remainingNeg });
  }

  const sankeyData = { nodes, links };

  return (
    <div className={styles.card} style={{ gridColumn: '1 / -1', minHeight: 400, padding: 32 }}>
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.cardTitle}>Feedback Flow</p>
          <p className={styles.cardSubTitle}>How reviews distribute across sources, sentiment, and key topics</p>
        </div>
      </div>
      <div style={{ width: '100%', height: 340, marginTop: 20 }}>
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={sankeyData}
            node={<CustomNode />}
            nodePadding={24}
            nodeWidth={14}
            margin={{ left: 10, right: 160, top: 10, bottom: 10 }}
            link={{ stroke: '#1F4D3B', strokeOpacity: 0.12 }}
          >
            <Tooltip content={<CustomTooltip />} />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
