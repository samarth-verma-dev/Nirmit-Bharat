import React from 'react';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignOutButton({ className, style }) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      // Clear onboarding wizard localStorage
      localStorage.removeItem('adminOnboardingStep');
      localStorage.removeItem('adminOnboardingData');
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        width: '100%',
        padding: '14px 20px',
        backgroundColor: '#ffffff',
        color: '#1c231f',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        borderRadius: '9999px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.2s ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f9fafb';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#ffffff';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.04)';
      }}
    >
      <LogOut size={18} color="#5c6b61" />
      <span>Sign Out</span>
    </button>
  );
}
