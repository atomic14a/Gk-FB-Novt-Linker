'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabase';
import { 
  Plus, Trash2, CheckCircle, AlertTriangle, 
  RefreshCw, ShieldAlert, Key, UserCheck, Check, X,
  ShieldCheck, HelpCircle, Loader2
} from 'lucide-react';

export default function ProfilesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  
  // Input form state
  const [cookieText, setCookieText] = useState('');
  
  // Two-step verification states
  const [verifying, setVerifying] = useState(false);
  const [verifyStep, setVerifyStep] = useState(1);
  const [scrapedDetails, setScrapedDetails] = useState(null);
  const [verifyError, setVerifyError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [isFromDelete, setIsFromDelete] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  
  const [checkingId, setCheckingId] = useState(null);
  const [statuses, setStatuses] = useState({}); // { account_id: { active: bool, reason: str } }
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  const fetchAccounts = async (userId) => {
    try {
      const r = await fetch(`${backendUrl}/api/accounts/${userId}`);
      const data = await r.json();
      if (Array.isArray(data)) {
        setAccounts(data);
        
        // Trigger a connection check for each profile
        data.forEach(acc => {
          checkConnection(userId, acc.id);
        });
      }
    } catch (err) {
      console.error("Failed to load accounts:", err);
    }
  };

  useEffect(() => {
    const initPage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }
      setUser(session.user);
      fetchAccounts(session.user.id);
    };
    initPage();
  }, [router, backendUrl]);

  const checkConnection = async (userId, accountId) => {
    setCheckingId(accountId);
    try {
      const r = await fetch(`${backendUrl}/api/accounts/${userId}/${accountId}/check`);
      const status = await r.json();
      setStatuses(prev => ({ ...prev, [accountId]: status }));
    } catch (err) {
      setStatuses(prev => ({ ...prev, [accountId]: { active: false, reason: 'Check failed' } }));
    } finally {
      setCheckingId(null);
    }
  };

  // Run verify cookie flow
  const runVerifyCookieFlow = async (cookieToVerify, isDeletedSource = false) => {
    setVerifying(true);
    setVerifyStep(1);
    setScrapedDetails(null);
    setVerifyError('');
    setIsFromDelete(isDeletedSource);
    setFeedbackMsg({ type: '', text: '' });

    // Progress bar staggered animations
    const stepIntervals = [
      setTimeout(() => setVerifyStep(2), 1200),
      setTimeout(() => setVerifyStep(3), 2400)
    ];

    try {
      const r = await fetch(`${backendUrl}/api/accounts/verify-cookie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie_text: cookieToVerify })
      });
      const data = await r.json();

      // Clear any pending step timers
      stepIntervals.forEach(t => clearTimeout(t));

      if (r.ok && data.success) {
        setScrapedDetails(data.details);
        setCustomLabel(data.details.name || '');
      } else {
        setVerifyError(data.detail || 'Could not verify cookie profile. Ensure the cookies are fresh.');
      }
    } catch (err) {
      setVerifyError('Backend server connection failed. Please ensure the backend is running.');
    } finally {
      setVerifying(false);
    }
  };

  // Step 1: Verify the cookie on the backend without saving (Manual paste)
  const handleVerifyProfile = async (e) => {
    e.preventDefault();
    if (!cookieText || !cookieText.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Please paste a valid Facebook Cookie string.' });
      return;
    }
    await runVerifyCookieFlow(cookieText, false);
  };

  // Step 2: Confirm and save profile configuration in database
  const handleConfirmSave = async () => {
    if (!scrapedDetails) return;

    setSavingProfile(true);
    setFeedbackMsg({ type: '', text: '' });

    try {
      const r = await fetch(`${backendUrl}/api/accounts/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          label: customLabel || scrapedDetails.name,
          cookie_text: scrapedDetails.cookie_text,
          access_token: scrapedDetails.access_token,
          act_id: scrapedDetails.act_id,
          fb_user_id: scrapedDetails.uid
        })
      });
      const data = await r.json();

      if (r.ok && data.success) {
        setFeedbackMsg({ 
          type: 'success', 
          text: `Profile "${customLabel || scrapedDetails.name}" saved successfully!` 
        });
        setScrapedDetails(null);
        setCookieText('');
        fetchAccounts(user.id);
      } else {
        setFeedbackMsg({ type: 'error', text: data.detail || 'Failed to save profile details.' });
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Error connecting to database savior.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelSave = () => {
    setScrapedDetails(null);
    setIsFromDelete(false);
    setFeedbackMsg({ type: '', text: '' });
  };

  const handleDeleteProfile = async (accountId, cookieTextValue) => {
    if (!window.confirm("Are you sure you want to remove this Facebook Profile cookie configuration?")) {
      return;
    }

    try {
      const r = await fetch(`${backendUrl}/api/accounts/${user.id}/${accountId}`, {
        method: 'DELETE'
      });
      if (r.ok) {
        setFeedbackMsg({ type: 'success', text: 'Facebook profile removed. Cookie loaded on the right for review.' });
        fetchAccounts(user.id);
        
        // Auto populate input, trigger verification, set isFromDelete flag
        setCookieText(cookieTextValue);
        await runVerifyCookieFlow(cookieTextValue, true);
      } else {
        setFeedbackMsg({ type: 'error', text: 'Failed to delete profile.' });
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'API communication error.' });
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} className="animate-fade-in">
      
      {/* Active Profiles List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Active Facebook Profiles</h3>

          {accounts.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--panel-border)', borderRadius: '12px' }}>
              No Facebook profiles added yet. Paste a cookie on the right to start.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {accounts.map((acc) => {
                const status = statuses[acc.id] || { active: null, reason: 'Checking...' };
                return (
                  <div key={acc.id} style={{
                    padding: '20px',
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '16px', fontWeight: '700' }}>{acc.label}</span>
                        {status.active === true && (
                          <span className="badge badge-purchased" style={{ fontSize: '10px' }}>CONNECTED</span>
                        )}
                        {status.active === false && (
                          <span className="badge badge-trial" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '10px' }}>EXPIRED</span>
                        )}
                        {status.active === null && (
                          <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '10px' }}>CHECKING...</span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span>UID: {acc.fb_user_id || 'N/A'}</span>
                        <span>Ads Account ID: {acc.act_id || 'N/A'}</span>
                        {status.active === false && (
                          <span style={{ color: '#ef4444', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                            <ShieldAlert size={12} title="Alert Details" /> Status: {status.reason}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => checkConnection(user.id, acc.id)} 
                        className="btn btn-secondary"
                        style={{ padding: '8px 12px' }}
                        disabled={checkingId === acc.id}
                        title="Recheck Facebook profile connection"
                      >
                        <RefreshCw size={14} className={checkingId === acc.id ? 'animate-spin' : ''} title="Checking..." />
                      </button>
                      <button 
                        onClick={() => handleDeleteProfile(acc.id, acc.cookie_text)} 
                        className="btn btn-secondary"
                        style={{ padding: '8px 12px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.1)' }}
                        title="Delete profile & review cookie details"
                      >
                        <Trash2 size={14} title="Delete Profile" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add / Verification Flow panel */}
      <div>
        
        {/* Progress Bar Loading View */}
        {verifying && (
          <div className="glass-panel animate-fade-in" style={{ padding: '32px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--primary)' }} title="Testing live..." />
              <span style={{ fontSize: '16px', fontWeight: '800' }}>Running Backend Scraper Testing...</span>
            </div>

            {/* Stepped loading bar */}
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: verifyStep === 1 ? '33%' : verifyStep === 2 ? '66%' : '100%',
                height: '100%',
                background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)',
                transition: 'width 0.8s ease'
              }}></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <span style={{ color: verifyStep >= 1 ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: verifyStep === 1 ? '700' : '400' }}>
                {verifyStep > 1 ? '✓' : '•'} Step 1: Parsing cookies & extracting Profile UID...
              </span>
              <span style={{ color: verifyStep >= 2 ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: verifyStep === 2 ? '700' : '400' }}>
                {verifyStep > 2 ? '✓' : '•'} Step 2: Grabbing Ads Manager Token (EAAB) & Ad account IDs...
              </span>
              <span style={{ color: verifyStep >= 3 ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: verifyStep === 3 ? '700' : '400' }}>
                {verifyStep > 3 ? '✓' : '•'} Step 3: Verifying Facebook Pages connection...
              </span>
            </div>
          </div>
        )}

        {/* Verification Error Panel */}
        {verifyError && (
          <div className="glass-panel animate-fade-in" style={{ padding: '32px', marginBottom: '24px', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', marginBottom: '14px' }}>
              <ShieldAlert size={24} title="Failed Status" />
              <h4 style={{ fontWeight: '800', fontSize: '16px' }}>Scrape Connection Failed</h4>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '20px' }}>
              {verifyError}
            </p>
            <button onClick={() => setVerifyError('')} className="btn btn-secondary" style={{ width: '100%' }}>
              Try Again
            </button>
          </div>
        )}

        {/* Confirmation Preview Card */}
        {scrapedDetails && (
          <div className="glass-panel animate-fade-in" style={{ padding: '32px', border: scrapedDetails && isFromDelete ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: scrapedDetails && isFromDelete ? '#ef4444' : 'var(--success)', marginBottom: '16px' }}>
              {isFromDelete ? <ShieldAlert size={24} title="Reviewing Profile" /> : <ShieldCheck size={24} title="Scrape Success" />}
              <h4 style={{ fontWeight: '800', fontSize: '17px' }}>
                {isFromDelete ? 'Reviewing Deleted Cookie' : 'Cookie Verification Success!'}
              </h4>
            </div>

            {/* Scraped Info list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)', marginBottom: '20px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Profile Name</span>
                <span style={{ fontWeight: '700' }}>{scrapedDetails.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Facebook UID</span>
                <span style={{ fontWeight: '600', fontFamily: 'monospace' }}>{scrapedDetails.uid}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Ads Token Status</span>
                <span className="badge badge-purchased" style={{ fontSize: '10px', padding: '2px 8px' }}>
                  {scrapedDetails.token_status.toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Ad Account ID</span>
                <span style={{ fontFamily: 'monospace' }}>{scrapedDetails.act_id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Accessible Pages</span>
                <span style={{ fontWeight: '700', color: '#6366f1' }}>{scrapedDetails.pages_count} Pages connected</span>
              </div>
            </div>

            {isFromDelete ? (
              <>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', textAlign: 'center' }}>
                  This cookie has been extracted from the deleted profile for check and review.
                </p>
                <button 
                  onClick={handleCancelSave} 
                  className="btn btn-secondary" 
                  style={{ width: '100%', gap: '6px' }}
                >
                  <X size={16} title="Close Review" /> Dismiss Review
                </button>
              </>
            ) : (
              <>
                <div className="form-group" style={{ marginBottom: '20px', textAlign: 'left' }}>
                  <label className="form-label">Profile Name / Custom Label</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Personal Profile, Ad Account 1"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                  />
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', textAlign: 'center' }}>
                  Would you like to save this Facebook Profile configuration to your account?
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
                  <button 
                    onClick={handleConfirmSave} 
                    className="btn btn-primary" 
                    style={{ width: '100%', gap: '6px' }}
                    disabled={savingProfile}
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Check size={16} title="Save profile" /> Confirm & Save
                      </>
                    )}
                  </button>
                  <button 
                    onClick={handleCancelSave} 
                    className="btn btn-secondary" 
                    style={{ width: '100%', gap: '6px' }}
                    disabled={savingProfile}
                  >
                    <X size={16} title="Cancel save" /> Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Default input Paste form */}
        {!verifying && !scrapedDetails && !verifyError && (
          <div className="glass-panel" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Add Facebook Profile</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
              Paste your raw cookie string below. Novt Linker will automatically login, verify your token, and fetch account information.
            </p>

            {feedbackMsg.text && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '10px',
                marginBottom: '20px',
                background: feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                color: feedbackMsg.type === 'success' ? '#10b981' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px'
              }}>
                {feedbackMsg.type === 'success' ? <CheckCircle size={16} title="Success" /> : <AlertTriangle size={16} title="Warning" />}
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleVerifyProfile}>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Raw Cookie String</label>
                <textarea 
                  required
                  placeholder="c_user=1000...; xs=...; fr=...;"
                  className="form-textarea"
                  style={{ minHeight: '140px', fontSize: '13px', fontFamily: 'monospace' }}
                  value={cookieText}
                  onChange={(e) => setCookieText(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', gap: '8px', padding: '12px' }}
              >
                <Plus size={16} title="Verify profiles" /> Verify & Add Cookie Profile
              </button>
            </form>
          </div>
        )}
      </div>

    </div>
  );
}
