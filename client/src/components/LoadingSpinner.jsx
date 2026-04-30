import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ size = 24, text = 'Loading...' }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px',
      color: 'var(--text2, #6b7280)'
    }}>
      <Loader2 size={size} className="spinner" style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
      {text && <span style={{ fontSize: '0.875rem' }}>{text}</span>}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
