import { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, Clock, Search, Filter, Send, Copy, RotateCcw, CheckCircle2, User, Zap, Inbox } from 'lucide-react';
import styles from './support.module.css';

// Helpers
const getPriorityScore = (score) => {
  if (score < -0.8) return 'Critical';
  if (score < -0.5) return 'High';
  if (score < 0) return 'Medium';
  return 'Low';
};

const getSLAStatus = (createdAt) => {
  const hoursSince = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursSince > 24) return 'Breached';
  if (hoursSince > 2) return 'At Risk';
  return 'Met';
};

const URGENT_KEYWORDS = ["refund", "fraud", "worst", "angry", "not working", "bad service", "cancel", "broken"];

const detectUrgency = (message, sentimentScore) => {
  const lowerMsg = message.toLowerCase();
  const hasKeyword = URGENT_KEYWORDS.some(k => lowerMsg.includes(k));
  const isHighSentiment = sentimentScore < -0.5;
  return hasKeyword || isHighSentiment;
};

// Mock Response Generator
const generateMockResponse = (ticket, tone) => {
  const name = ticket.customer_name;
  let response = '';

  // Apology + Empathy
  if (tone === 'Apologetic') {
    response += `Dear ${name},\n\nI am so incredibly sorry to hear about the frustrating experience you've had regarding the ${ticket.issue_type.toLowerCase()} issue. I completely understand why you would be upset. `;
  } else if (tone === 'Friendly') {
    response += `Hi ${name},\n\nThanks so much for reaching out to us. I'm really sorry you're running into trouble with your ${ticket.issue_type.toLowerCase()}. `;
  } else {
    response += `Dear ${name},\n\nThank you for contacting our support team. We sincerely apologize for the inconvenience you have experienced. `;
  }

  // Acknowledgement of issue
  response += `\n\nI have carefully reviewed your message: "${ticket.message.substring(0, 40)}..." and I see that this is a priority matter. `;

  // Clear next step
  if (ticket.issue_type === 'Refund') {
    response += `I have immediately escalated your refund request to our billing department. You should see the funds returned to your original payment method within 3-5 business days. `;
  } else if (ticket.issue_type === 'Delay') {
    response += `I have tracked your order and it is currently with our priority dispatch team. I've expedited the shipping at no extra cost to you. `;
  } else {
    response += `Our technical team has been notified and is currently investigating your account to resolve this immediately. `;
  }

  // Reassurance
  response += `\n\nPlease rest assured that we are taking this very seriously and I will personally monitor this ticket until it is fully resolved. If you have any further questions, reply directly to this message.\n\nBest regards,\nCustomer Support Team`;

  return response;
};

export default function SupportInbox({ rawData }) {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filterType, setFilterType] = useState('All');
  const [showUnresolved, setShowUnresolved] = useState(true);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiDraft, setAiDraft] = useState('');
  const [selectedTone, setSelectedTone] = useState('Professional');

  // Generate mock tickets from rawData on mount
  useEffect(() => {
    let mockTickets = [];
    const now = Date.now();

    // Try to extract some realistic data if available
    let baseStrings = [
      "I requested a refund 3 days ago and nobody has replied. This is the worst service ever.",
      "The product arrived broken and I am very angry. I want my money back.",
      "My order is delayed by two weeks. Can someone please help me?",
      "The app is not working, it crashes every time I try to log in.",
      "Just wanted to say I love the new update, but I found a small bug in the settings page."
    ];

    if (rawData && rawData.overall && rawData.overall.topKeywords) {
      baseStrings = [
        ...rawData.overall.topKeywords.map(k => `I am having an issue regarding ${k.keyword}. It's causing a lot of problems.`),
        ...baseStrings
      ];
    }

    baseStrings.forEach((msg, i) => {
      // Create some variation in sentiment and time
      const isNegative = i < 4;
      const sentiment = isNegative ? (Math.random() * -0.5) - 0.4 : (Math.random() * 0.5) + 0.1;
      const hoursAgo = isNegative ? Math.random() * 48 : Math.random() * 12;
      const createdAt = new Date(now - (hoursAgo * 60 * 60 * 1000)).toISOString();
      
      let type = 'General';
      if (msg.toLowerCase().includes('refund')) type = 'Refund';
      else if (msg.toLowerCase().includes('delay')) type = 'Delay';
      else if (msg.toLowerCase().includes('broken') || msg.toLowerCase().includes('angry')) type = 'Complaint';

      const priority = getPriorityScore(sentiment);

      mockTickets.push({
        id: `TKT-${1000 + i}`,
        customer_name: `Customer ${i + 1}`,
        message: msg,
        sentiment_score: sentiment.toFixed(2),
        is_urgent: detectUrgency(msg, sentiment),
        priority: priority,
        issue_type: type,
        status: i === 4 ? 'Resolved' : 'Open',
        created_at: createdAt,
        first_response_at: null,
      });
    });

    // Sort by critical first
    mockTickets.sort((a, b) => {
      const pMap = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
      return pMap[b.priority] - pMap[a.priority];
    });

    setTickets(mockTickets);
    setSelectedTicket(mockTickets[0]);
  }, [rawData]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (showUnresolved && t.status === 'Resolved') return false;
      if (filterType !== 'All' && t.issue_type !== filterType) return false;
      return true;
    });
  }, [tickets, showUnresolved, filterType]);

  const handleGenerateReply = () => {
    setAiGenerating(true);
    setAiDraft('');
    // Simulate AI delay
    setTimeout(() => {
      setAiDraft(generateMockResponse(selectedTicket, selectedTone));
      setAiGenerating(false);
    }, 1500);
  };

  const markResolved = (id) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'Resolved' } : t));
    if (selectedTicket?.id === id) {
      setSelectedTicket({ ...selectedTicket, status: 'Resolved' });
    }
  };



  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Critical': return <span className={`${styles.badge} ${styles.badgeCritical} ${styles.pulse}`}>🔴 Critical</span>;
      case 'High': return <span className={`${styles.badge} ${styles.badgeHigh}`}>🟠 High</span>;
      case 'Medium': return <span className={`${styles.badge} ${styles.badgeMedium}`}>🟡 Medium</span>;
      default: return <span className={`${styles.badge} ${styles.badgeLow}`}>🟢 Low</span>;
    }
  };

  const getSLABadge = (createdAt) => {
    const status = getSLAStatus(createdAt);
    switch (status) {
      case 'Breached': return <span className={`${styles.badge} ${styles.badgeSlaBreached}`}>❌ SLA Breached</span>;
      case 'At Risk': return <span className={`${styles.badge} ${styles.badgeSlaRisk}`}>⚠️ SLA At Risk</span>;
      default: return <span className={`${styles.badge} ${styles.badgeSlaMet}`}>✅ SLA Met</span>;
    }
  };

  return (
    <div className={styles.container}>


      <div className={styles.inboxWrapper}>
        {/* Left Pane - List */}
        <div className={styles.leftPane}>
          <div className={styles.filters}>
            <div className={styles.filterRow}>
              <select 
                className={styles.select} 
                value={filterType} 
                onChange={e => setFilterType(e.target.value)}
              >
                <option value="All">All Types</option>
                <option value="Refund">Refund</option>
                <option value="Complaint">Complaint</option>
                <option value="Delay">Delay</option>
                <option value="General">General</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#4b5563' }}>
              <input 
                type="checkbox" 
                id="unresolved" 
                checked={showUnresolved} 
                onChange={e => setShowUnresolved(e.target.checked)} 
              />
              <label htmlFor="unresolved" style={{ cursor: 'pointer' }}>Show unresolved only</label>
            </div>
          </div>

          <div className={styles.ticketList}>
            {filteredTickets.map(ticket => (
              <div 
                key={ticket.id} 
                className={`${styles.ticketCard} ${selectedTicket?.id === ticket.id ? styles.active : ''}`}
                onClick={() => {
                  setSelectedTicket(ticket);
                  setAiDraft('');
                }}
              >
                <div className={styles.ticketHeader}>
                  <span className={styles.customerName}>{ticket.customer_name}</span>
                  <span className={styles.time}>{new Date(ticket.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div className={styles.preview}>{ticket.message}</div>
                <div className={styles.tags}>
                  {getPriorityBadge(ticket.priority)}
                  {getSLABadge(ticket.created_at)}
                  {ticket.status === 'Resolved' && <span className={`${styles.badge} ${styles.badgeSlaMet}`}>✓ Resolved</span>}
                </div>
              </div>
            ))}
            {filteredTickets.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>
                No tickets match your filters.
              </div>
            )}
          </div>
        </div>

        {/* Right Pane - Detail */}
        {selectedTicket ? (
          <div className={styles.rightPane}>
            <div className={styles.detailHeader}>
              <div className={styles.detailTitle}>Ticket {selectedTicket.id}</div>
              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Customer</span>
                  <span className={styles.metaValue} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><User size={14}/> {selectedTicket.customer_name}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Issue Type</span>
                  <span className={styles.metaValue}>{selectedTicket.issue_type}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Status</span>
                  <span className={styles.metaValue}>{selectedTicket.status}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Created</span>
                  <span className={styles.metaValue}>{new Date(selectedTicket.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className={styles.detailBody}>
              {/* Urgency Alert */}
              {selectedTicket.is_urgent && (
                <div className={styles.urgencyBox}>
                  <div className={styles.urgencyTitle}>
                    <AlertTriangle size={16} />
                    SYSTEM URGENCY DETECTED
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.85rem', color: '#9b2c2c' }}>
                    {selectedTicket.sentiment_score < -0.5 && <li>Negative sentiment detected (Score: {selectedTicket.sentiment_score})</li>}
                    <li>High-risk keywords matched</li>
                    {getSLAStatus(selectedTicket.created_at) !== 'Met' && <li>SLA Risk / Breached</li>}
                  </ul>
                </div>
              )}

              <div className={styles.messageBox}>
                <strong style={{ display: 'block', marginBottom: 8 }}>Customer Message:</strong>
                {selectedTicket.message}
              </div>
              
              {selectedTicket.status === 'Open' && (
                <div style={{ marginTop: 'auto' }}>
                  <button className={styles.btnOutline} onClick={() => markResolved(selectedTicket.id)}>
                    <CheckCircle2 size={16} /> Mark as Resolved
                  </button>
                </div>
              )}
            </div>

            {/* AI Generator Section */}
            {selectedTicket.status === 'Open' && (
              <div className={styles.aiReplySection}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Zap size={18} color="#1F4D3B" />
                    AI Auto-Suggest Reply
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select className={styles.select} value={selectedTone} onChange={e => setSelectedTone(e.target.value)} style={{ padding: '6px 12px' }}>
                      <option value="Professional">Professional</option>
                      <option value="Apologetic">Apologetic</option>
                      <option value="Friendly">Friendly</option>
                    </select>
                    <button className={styles.btnPrimary} onClick={handleGenerateReply} disabled={aiGenerating}>
                      {aiGenerating ? 'Generating...' : 'Generate Reply'}
                    </button>
                  </div>
                </div>

                {aiGenerating && (
                  <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                    <span className={styles.pulse} style={{ display: 'inline-block' }}>✨ Analyzing intent and drafting response...</span>
                  </div>
                )}

                {aiDraft && !aiGenerating && (
                  <div>
                    <textarea 
                      className={styles.replyEditor}
                      value={aiDraft}
                      onChange={(e) => setAiDraft(e.target.value)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                      <button className={styles.btnOutline} onClick={() => navigator.clipboard.writeText(aiDraft)}>
                        <Copy size={16} /> Copy
                      </button>
                      <button className={styles.btnPrimary} onClick={() => markResolved(selectedTicket.id)}>
                        <Send size={16} /> Send & Resolve
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.rightPane} style={{ alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
            <Inbox size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
            Select a ticket to view details
          </div>
        )}
      </div>
    </div>
  );
}
