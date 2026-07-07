'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabase';
import { 
  Save, CheckCircle, AlertTriangle, Sparkles, FileImage, 
  Play, Globe, Moon, Sun, Info, RefreshCw 
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  
  // Defaults configuration settings form state
  const [actionButton, setActionButton] = useState('DOWNLOAD');
  const [message, setMessage] = useState('');
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [caption, setCaption] = useState('');
  const [targetLink, setTargetLink] = useState('');
  const [publishToPage, setPublishToPage] = useState(true);
  const [autoDimension, setAutoDimension] = useState(true);
  
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

  // Preview Mode
  const [isPreviewDarkMode, setIsPreviewDarkMode] = useState(true);

  // Field element refs for interactive focus
  const refs = {
    targetLink: useRef(null),
    actionButton: useRef(null),
    message: useRef(null),
    name: useRef(null),
    description: useRef(null),
    caption: useRef(null),
    publishToPage: useRef(null),
    autoDimension: useRef(null)
  };

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }
      setUser(session.user);
      
      try {
        // Fetch default settings
        const defsResp = await fetch(`${backendUrl}/api/defaults/${session.user.id}`);
        const defsData = await defsResp.json();
        if (defsData && !defsData.detail) {
          setActionButton(defsData.action_button || 'DOWNLOAD');
          setMessage(defsData.message || '');
          setDescription(defsData.description || '');
          setName(defsData.name || '');
          setCaption(defsData.caption || '');
          setTargetLink(defsData.target_link || '');
          setPublishToPage(defsData.publish_to_page !== undefined ? defsData.publish_to_page : true);
          setAutoDimension(defsData.auto_dimension !== undefined ? defsData.auto_dimension : true);
        }
      } catch (err) {
        console.error("API error loading settings page data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [router, backendUrl]);

  // Focus utility on preview item click
  const handleFocusField = (fieldName) => {
    const targetRef = refs[fieldName];
    if (targetRef && targetRef.current) {
      targetRef.current.focus();
      targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Temporary visually highlights the input field
      targetRef.current.style.borderColor = 'var(--primary)';
      targetRef.current.style.boxShadow = '0 0 0 4px var(--primary-glow)';
      targetRef.current.style.transform = 'scale(1.01)';
      
      setTimeout(() => {
        if (targetRef.current) {
          targetRef.current.style.borderColor = '';
          targetRef.current.style.boxShadow = '';
          targetRef.current.style.transform = '';
        }
      }, 1500);
    }
  };



  // Save Defaults settings configuration
  const handleSaveDefaults = async (e) => {
    e.preventDefault();
    setSavingDefaults(true);
    setFeedbackMsg({ type: '', text: '' });
    
    const payload = {
      action_button: actionButton,
      message,
      description,
      name,
      caption,
      target_link: targetLink,
      publish_to_page: publishToPage,
      auto_dimension: autoDimension
    };
    
    try {
      const r = await fetch(`${backendUrl}/api/defaults/save/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await r.json();
      if (data.success) {
        setFeedbackMsg({ type: 'success', text: 'Automation Defaults updated successfully!' });
      } else {
        setFeedbackMsg({ type: 'error', text: 'Failed to update defaults.' });
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'API Server connection error.' });
    } finally {
      setSavingDefaults(false);
      setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 5000);
    }
  };

  // Facebook post theme styling
  const fbTheme = {
    bg: isPreviewDarkMode ? '#242526' : '#ffffff',
    text: isPreviewDarkMode ? '#e4e6eb' : '#050505',
    textMuted: isPreviewDarkMode ? '#b0b3b8' : '#65676b',
    border: isPreviewDarkMode ? '#3e4042' : '#e5e5e5',
    attachmentBg: isPreviewDarkMode ? '#3a3b3c' : '#f0f2f5',
    btnBg: isPreviewDarkMode ? '#4e4f50' : '#e4e6eb',
    btnText: isPreviewDarkMode ? '#e4e6eb' : '#050505'
  };

  if (loading) {
    return (
      <div style={{ padding: '80px 40px', color: 'var(--text-muted)', textAlign: 'center' }}>
        <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 16px', color: 'var(--primary)' }} />
        Loading settings configuration...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      


      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', alignItems: 'start' }}>
        
        {/* Left Form Panel */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '4px' }}>Automation Default Settings</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Define fallbacks to auto-populate link creators and save time on campaigns.
            </p>
          </div>

          {feedbackMsg.text && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
              color: feedbackMsg.type === 'success' ? '#10b981' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px'
            }}>
              {feedbackMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveDefaults} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--primary)' }}>Post Meta Fields</h4>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Default Target URL / Redirect Link
                  <span style={{ fontWeight: 'normal', fontSize: '11px', display: 'block', color: 'var(--text-muted)', marginTop: '2px' }}>
                    The primary destination users will be redirected to.
                  </span>
                </label>
                <input 
                  ref={refs.targetLink}
                  type="url" 
                  placeholder="e.g. https://yoursite.com" 
                  className="form-input" 
                  value={targetLink}
                  onChange={(e) => setTargetLink(e.target.value)}
                  style={{ transition: 'all 0.3s ease' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Default Feed Message / Status Text
                  <span style={{ fontWeight: 'normal', fontSize: '11px', display: 'block', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Body copy text shown directly above the post banner.
                  </span>
                </label>
                <textarea 
                  ref={refs.message}
                  placeholder="e.g. Get access to the best PDF guide now!"
                  className="form-textarea" 
                  value={message} 
                  onChange={(e) => setMessage(e.target.value)} 
                  style={{ minHeight: '70px', transition: 'all 0.3s ease' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Bold Header / Link Name
                  <span style={{ fontWeight: 'normal', fontSize: '11px', display: 'block', color: 'var(--text-muted)', marginTop: '2px' }}>
                    The main bold title adjacent to the CTA button.
                  </span>
                </label>
                <input 
                  ref={refs.name}
                  type="text" 
                  placeholder="e.g. Free Download - Study Pack"
                  className="form-input" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  style={{ transition: 'all 0.3s ease' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Subtext Description
                  <span style={{ fontWeight: 'normal', fontSize: '11px', display: 'block', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Small description details visible below the bold title.
                  </span>
                </label>
                <input 
                  ref={refs.description}
                  type="text" 
                  placeholder="e.g. Direct download | Checked Safe"
                  className="form-input" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  style={{ transition: 'all 0.3s ease' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Bottom Domain Caption
                  <span style={{ fontWeight: 'normal', fontSize: '11px', display: 'block', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Lowercase or uppercase domain header indicator.
                  </span>
                </label>
                <input 
                  ref={refs.caption}
                  type="text" 
                  placeholder="e.g. GOOGLEPLAY.COM"
                  className="form-input" 
                  value={caption} 
                  onChange={(e) => setCaption(e.target.value)} 
                  style={{ transition: 'all 0.3s ease' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--primary)' }}>Posting Rules & Actions</h4>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Default Action Button (CTA)</label>
                <select 
                  ref={refs.actionButton}
                  className="form-select" 
                  value={actionButton} 
                  onChange={(e) => setActionButton(e.target.value)}
                  style={{ transition: 'all 0.3s ease' }}
                >
                  <option value="DOWNLOAD">DOWNLOAD</option>
                  <option value="LEARN_MORE">LEARN_MORE</option>
                  <option value="WATCH_MORE">WATCH_MORE</option>
                  <option value="CONTACT_US">CONTACT_US</option>
                  <option value="SEE_MORE">SEE_MORE</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Publish Mode</label>
                  <select 
                    ref={refs.publishToPage}
                    className="form-select" 
                    value={publishToPage ? 'true' : 'false'} 
                    onChange={(e) => setPublishToPage(e.target.value === 'true')}
                  >
                    <option value="true">Live on Feed</option>
                    <option value="false">Dark Post (Hidden)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Auto Resize Banners</label>
                  <select 
                    ref={refs.autoDimension}
                    className="form-select" 
                    value={autoDimension ? 'true' : 'false'} 
                    onChange={(e) => setAutoDimension(e.target.value === 'true')}
                  >
                    <option value="true">ON (1200x630)</option>
                    <option value="false">OFF (Original)</option>
                  </select>
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', gap: '8px', padding: '14px', marginTop: '12px' }} disabled={savingDefaults}>
              <Save size={16} /> {savingDefaults ? 'Saving settings...' : 'Save Defaults'}
            </button>
          </form>
        </div>

        {/* Right Live Preview Panel */}
        <div style={{ position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={14} /> LIVE POST BANNER PREVIEW
            </span>
            <button 
              type="button"
              onClick={() => setIsPreviewDarkMode(!isPreviewDarkMode)} 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '11px', gap: '6px', background: 'rgba(255,255,255,0.02)' }}
            >
              {isPreviewDarkMode ? (
                <>
                  <Sun size={12} style={{ color: '#fbbf24' }} /> Light Theme
                </>
              ) : (
                <>
                  <Moon size={12} style={{ color: '#818cf8' }} /> Dark Theme
                </>
              )}
            </button>
          </div>

          {/* Facebook Post Card Mockup */}
          <div style={{
            background: fbTheme.bg,
            border: `1px solid ${fbTheme.border}`,
            borderRadius: '12px',
            color: fbTheme.text,
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            fontFamily: 'Segoe UI, Roboto, Helvetica, Arial, sans-serif',
            transition: 'all 0.3s ease',
            position: 'relative'
          }}>
            
            {/* Post Header */}
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #d946ef)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                color: '#fff',
                fontSize: '14px'
              }}>
                FB
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: '600', fontSize: '14px', lineHeight: '1.2' }}>Your Page Name</span>
                <span style={{ fontSize: '12px', color: fbTheme.textMuted, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  Just now · <Globe size={11} />
                </span>
              </div>
            </div>

            {/* Post Status message */}
            <div 
              onClick={() => handleFocusField('message')}
              className="preview-element"
              style={{
                padding: '4px 16px 12px',
                fontSize: '14px',
                whiteSpace: 'pre-wrap',
                cursor: 'pointer',
                minHeight: '20px',
                color: message ? fbTheme.text : 'rgba(150,150,150,0.4)',
                fontStyle: message ? 'normal' : 'italic'
              }}
              title="Click to edit Message"
            >
              {message || "Default status message... Write something above."}
            </div>

            {/* Post Attachment Media link container */}
            <div style={{
              borderTop: `1px solid ${fbTheme.border}`,
              borderBottom: `1px solid ${fbTheme.border}`,
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer'
            }}>
              
              {/* Dummy Image Banner */}
              <div style={{
                width: '100%',
                height: '220px',
                background: isPreviewDarkMode ? '#1c1d1e' : '#f0f2f5',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: `1px solid ${fbTheme.border}`,
                color: fbTheme.textMuted,
                gap: '8px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <FileImage size={36} style={{ opacity: 0.4 }} />
                <span style={{ fontSize: '12px', fontWeight: '600', opacity: 0.6 }}>
                  {autoDimension ? "Resized Image Banner (1200x630)" : "Raw Image Banner"}
                </span>
              </div>

              {/* Attachment Meta Footer info */}
              <div style={{
                background: fbTheme.attachmentBg,
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                minHeight: '80px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflow: 'hidden' }}>
                  
                  {/* Domain Caption */}
                  <span 
                    onClick={(e) => { e.stopPropagation(); handleFocusField('caption'); }}
                    style={{
                      fontSize: '11px',
                      color: fbTheme.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: '500',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    className="preview-element-inline"
                    title="Click to edit Domain Caption"
                  >
                    {caption || "YOURDOMAIN.COM"}
                  </span>

                  {/* Bold Title */}
                  <span 
                    onClick={(e) => { e.stopPropagation(); handleFocusField('name'); }}
                    style={{
                      fontWeight: '600',
                      fontSize: '15px',
                      lineHeight: '1.25',
                      color: fbTheme.text,
                      display: '-webkit-box',
                      WebkitLineClamp: '2',
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                    className="preview-element-inline"
                    title="Click to edit Bold Title"
                  >
                    {name || "Link Headline Title Go Here"}
                  </span>

                  {/* Description subtext */}
                  <span 
                    onClick={(e) => { e.stopPropagation(); handleFocusField('description'); }}
                    style={{
                      fontSize: '12px',
                      color: fbTheme.textMuted,
                      display: '-webkit-box',
                      WebkitLineClamp: '1',
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                    className="preview-element-inline"
                    title="Click to edit Description"
                  >
                    {description || "Link card description detail line."}
                  </span>
                </div>

                {/* Call To Action button */}
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleFocusField('actionButton'); }}
                  style={{
                    background: fbTheme.btnBg,
                    border: 'none',
                    color: fbTheme.btnText,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  className="preview-btn-cta"
                  title="Click to edit CTA Button"
                >
                  {actionButton || "DOWNLOAD"}
                </button>
              </div>

            </div>

          </div>

          {/* Guide Helper Tips */}
          <div className="glass-panel" style={{ padding: '20px', background: 'rgba(99, 102, 241, 0.02)', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
            <h5 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={14} /> Did You Know?
            </h5>
            <ul style={{ paddingLeft: '16px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>You can <b>click directly on any text or button</b> inside the mockup preview above, and it will highlight and scroll to that field!</li>
              <li>Facebook link posts perform 34% better when descriptions and bold headers use clear size indicators (e.g. <i>"Size: 14MB"</i>).</li>
            </ul>
          </div>
          
        </div>
      </div>

      {/* Styled Interactive Hover Borders */}
      <style jsx>{`
        .preview-element:hover {
          outline: 1.5px dashed var(--primary);
          outline-offset: 4px;
          border-radius: 4px;
          background: rgba(99, 102, 241, 0.05);
        }
        .preview-element-inline:hover {
          outline: 1.5px dashed var(--primary);
          outline-offset: 2px;
          border-radius: 2px;
          background: rgba(99, 102, 241, 0.05);
        }
        .preview-btn-cta:hover {
          outline: 2px solid var(--primary) !important;
          transform: scale(1.02);
        }
      `}</style>

    </div>
  );
}
