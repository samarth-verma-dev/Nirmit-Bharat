import React, { useState, useEffect } from 'react';
import { Play, Apple, Twitter, Info, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import styles from './dataSources.module.css';

// Config-driven approach
const platformConfig = {
  playstore: {
    name: 'Google Play',
    icon: Play,
    demo: ['packageName', 'limit'],
    api: ['packageName', 'apiKey', 'country', 'limit'],
  },
  appstore: {
    name: 'App Store',
    icon: Apple,
    demo: ['appId', 'limit'],
    api: ['appId', 'apiKey', 'country', 'limit'],
  },
  twitter: {
    name: 'Twitter / X',
    icon: Twitter,
    demo: ['keyword'],
    api: ['keyword', 'bearerToken'],
  },
};

const fieldDefinitions = {
  packageName: { label: 'Package Name', placeholder: 'e.g., com.whatsapp', type: 'text', required: true, tooltip: 'The unique application ID on Play Store' },
  appId: { label: 'App ID', placeholder: 'e.g., 310633997', type: 'text', required: true, tooltip: 'The numeric ID on the App Store' },
  keyword: { label: 'Search Keyword', placeholder: 'e.g., WhatsApp', type: 'text', required: true, tooltip: 'Keyword to search for reviews/tweets' },
  limit: { label: 'Review Limit', placeholder: 'e.g., 100', type: 'number', required: true, tooltip: 'Maximum number of reviews to fetch' },
  apiKey: { label: 'API Key', placeholder: 'Enter your API key', type: 'password', required: true, isCredential: true, tooltip: 'Your secure API token' },
  bearerToken: { label: 'Bearer Token', placeholder: 'Enter your Bearer Token', type: 'password', required: true, isCredential: true, tooltip: 'Your secure Twitter Bearer Token' },
  country: { label: 'Country Code', placeholder: 'e.g., us, in, uk', type: 'text', required: false, isCredential: true, tooltip: 'Two-letter country code' },
};

function PlatformSelector({ selected, onChange }) {
  return (
    <div>
      <h3 className={styles.sectionTitle}>Select Platform</h3>
      <div className={styles.platformGrid}>
        {Object.entries(platformConfig).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = selected === key;
          return (
            <div
              key={key}
              className={`${styles.platformCard} ${isActive ? styles.active : ''}`}
              onClick={() => onChange(key)}
            >
              <Icon size={32} className={styles.platformIcon} />
              <span className={styles.platformName}>{config.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModeToggle({ mode, onChange }) {
  return (
    <div className={styles.modeToggleWrapper}>
      <div className={styles.toggleContainer}>
        <button
          className={`${styles.toggleBtn} ${mode === 'api' ? styles.active : ''}`}
          onClick={(e) => { e.preventDefault(); onChange('api'); }}
        >
          API Mode
        </button>
        <button
          className={`${styles.toggleBtn} ${mode === 'demo' ? styles.active : ''}`}
          onClick={(e) => { e.preventDefault(); onChange('demo'); }}
        >
          Demo Mode
        </button>
      </div>
      {mode === 'demo' && (
        <div className={styles.modeNote}>
          <AlertCircle size={16} />
          Demo mode uses scraping and may be less reliable
        </div>
      )}
    </div>
  );
}

function DynamicFormFields({ platform, mode, formData, errors, onChange }) {
  const fields = platformConfig[platform]?.[mode] || [];

  const renderField = (fieldName) => {
    const def = fieldDefinitions[fieldName];
    if (!def) return null;

    return (
      <div key={fieldName} className={styles.formGroup}>
        <label className={styles.formLabel}>
          {def.label}
          {def.required && <span className={styles.requiredAst}>*</span>}
          {def.tooltip && <Info size={14} className={styles.tooltipIcon} title={def.tooltip} />}
        </label>
        <input
          type={def.type}
          className={styles.formInput}
          placeholder={def.placeholder}
          value={formData[fieldName] || ''}
          onChange={(e) => onChange(fieldName, e.target.value)}
        />
        {errors[fieldName] && <span className={styles.formError}>{errors[fieldName]}</span>}
      </div>
    );
  };

  const standardFields = fields.filter((f) => !fieldDefinitions[f].isCredential);
  const credentialFields = fields.filter((f) => fieldDefinitions[f].isCredential);

  return (
    <div className={styles.formGrid}>
      {standardFields.map(renderField)}

      {credentialFields.length > 0 && mode === 'api' && (
        <div className={styles.apiSection}>
          <h4 className={styles.apiSectionTitle}>API Credentials</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {credentialFields.map(renderField)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DataSources({ hideHeader }) {
  const [platform, setPlatform] = useState('playstore');
  const [mode, setMode] = useState('api');
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Clear form and errors when platform or mode changes
  useEffect(() => {
    setFormData({});
    setErrors({});
    setNotification(null);
  }, [platform, mode]);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const fields = platformConfig[platform]?.[mode] || [];
    let newErrors = {};
    let isValid = true;

    fields.forEach((field) => {
      const def = fieldDefinitions[field];
      if (def.required && !formData[field]) {
        newErrors[field] = 'This field is required';
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e, isSampleFetch = false) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setNotification(null);

    // Construct Payload
    const fields = platformConfig[platform]?.[mode] || [];
    let credentials = {};
    let identifier = '';
    
    // Assign identifier based on platform
    if (platform === 'playstore') identifier = formData.packageName;
    if (platform === 'appstore') identifier = formData.appId;
    if (platform === 'twitter') identifier = formData.keyword;

    // Collect credentials
    fields.forEach((f) => {
      if (fieldDefinitions[f].isCredential) {
        credentials[f] = formData[f];
      }
    });

    const payload = {
      platform,
      mode,
      identifier,
      limit: formData.limit ? parseInt(formData.limit, 10) : 100,
      credentials
    };

    // Mock API Call
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      console.log('Payload Submitted:', payload);
      
      if (isSampleFetch) {
        setNotification({ type: 'success', message: 'Successfully fetched sample reviews!' });
      } else {
        setNotification({ type: 'success', message: 'Data source configured successfully!' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to configure data source. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', marginTop: hideHeader ? '0' : '32px' }}>
      {!hideHeader && (
        <div className={styles.header}>
          <h2 className={styles.title} style={{ color: '#111827' }}>API Data Sources</h2>
          <p className={styles.subtitle} style={{ color: '#6B7280' }}>
            Configure integrations to fetch reviews and feedback.
          </p>
        </div>
      )}

      <div className={styles.container}>
        {notification && (
          <div className={`${styles.notification} ${styles[notification.type]}`}>
            {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            {notification.message}
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e, false)}>
          <PlatformSelector selected={platform} onChange={setPlatform} />
          <ModeToggle mode={mode} onChange={setMode} />
          
          <DynamicFormFields
            platform={platform}
            mode={mode}
            formData={formData}
            errors={errors}
            onChange={handleFieldChange}
          />

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={(e) => handleSubmit(e, true)}
              disabled={isLoading}
            >
              Fetch Sample
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Global CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
