import React from 'react';

export default function Logo({ className, style, width = 64, height = 64, light = false }) {
  // Since the user wants a circular shape format, we add a circle background.
  const circleBg = light ? '#FFFFFF' : '#3E52A3';
  const textColor = light ? '#3E52A3' : '#FFFFFF';
  const aiBoxColor = light ? '#7ECEF4' : 'rgba(255,255,255,0.2)';
  const aiTextColor = light ? '#3E52A3' : '#FFFFFF';

  return (
    <svg 
      className={className} 
      style={style} 
      width={width} 
      height={height} 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="100" cy="100" r="100" fill={circleBg} />
      <g transform="translate(17.5, 50)">
        <g stroke={textColor} strokeWidth="8" strokeLinecap="square" strokeLinejoin="miter">
          {/* S */}
          <polyline points="32,14 10,14 10,50 32,50 32,86 10,86" />
          {/* E */}
          <polyline points="66,14 44,14 44,86 66,86" />
          <line x1="44" y1="50" x2="60" y2="50" />
          {/* T */}
          <line x1="78" y1="14" x2="100" y2="14" />
          <line x1="89" y1="14" x2="89" y2="86" />
          {/* U */}
          <polyline points="112,14 112,86 134,86 134,14" />
        </g>
        
        {/* AI Box */}
        <rect x="140" y="10" width="24" height="24" fill={aiBoxColor} />
        <text 
          x="152" 
          y="27" 
          fontFamily="sans-serif" 
          fontWeight="800" 
          fontSize="14" 
          fill={aiTextColor} 
          textAnchor="middle"
          letterSpacing="-0.5"
        >
          AI
        </text>
      </g>
    </svg>
  );
}
