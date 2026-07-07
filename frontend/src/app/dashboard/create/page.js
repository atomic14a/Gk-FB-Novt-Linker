'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabase';
import { 
  Sparkles, Globe, Link2, Image, Layers, Play, CheckCircle, 
  AlertTriangle, Eye, Copy, RefreshCw, FileText, Check, ListFilter,
  ImagePlay, X, CheckSquare, Square
} from 'lucide-react';

export default function CreateLinkPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  
  // Facebook accounts & pages list state
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [pages, setPages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [loadingPages, setLoadingPages] = useState(false);
  
  const [defaultSettings, setDefaultSettings] = useState(null);
  
  // Media library assets
  const [libraryAssets, setLibraryAssets] = useState([]);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [selectedLibraryUrls, setSelectedLibraryUrls] = useState([]); // tracks multiple selections
  
  // Form fields
  const [targetLinksText, setTargetLinksText] = useState(''); // input target urls (multi format)
  const [imageLinksText, setImageLinksText] = useState('');   // input image urls (multi format)
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [caption, setCaption] = useState('');
  const [actionButton, setActionButton] = useState('DOWNLOAD');
  const [publishToPage, setPublishToPage] = useState(true);
  const [autoDimension, setAutoDimension] = useState(true);
  
  // Upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profile, setProfile] = useState(null);
  
  // Execution status
  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [results, setResults] = useState(null); // { successful: [], failed: [] }
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'history'
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all'); // 'all', 'success', 'failed'
  const [historyProfileFilter, setHistoryProfileFilter] = useState('all'); // 'all' or specific label
  
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [copiedLogId, setCopiedLogId] = useState(null);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Calculate if any limit is reached
  const isLimitReached = (() => {
    if (!profile) return false;
    const type = profile.account_type || 'trial';
    if (type === 'trial') {
      return (profile.links_created || 0) >= (profile.links_limit || 10);
    }
    if (type === 'plus') {
      return (profile.daily_links_created || 0) >= 50 || (profile.monthly_links_created || 0) >= 500;
    }
    return false; // premium is unlimited
  })();

  const generationSteps = [
    'Preparing redirect links and image dimensions',
    'Uploading banner images to Facebook Storage',
    'Creating Facebook Ad Creative configurations',
    'Waiting for effective Facebook Story ID extraction',
    'Publishing post and resolving final permalink'
  ];

  useEffect(() => {
    let intervalId;
    let stepTimeouts = [];
    
    if (generating) {
      setCurrentStep(0);
      setLoadingProgress(10);
      
      const stepUpdates = [
        { step: 0, progress: 15, delay: 0 },
        { step: 1, progress: 35, delay: 2000 },
        { step: 2, progress: 55, delay: 5000 },
        { step: 3, progress: 75, delay: 8000 },
        { step: 4, progress: 92, delay: 14000 }
      ];
      
      stepUpdates.forEach(u => {
        const timeout = setTimeout(() => {
          setCurrentStep(u.step);
          setLoadingProgress(u.progress);
        }, u.delay);
        stepTimeouts.push(timeout);
      });
      
      intervalId = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev < 98) {
            return prev + 1;
          }
          return prev;
        });
      }, 1000);
    } else {
      setLoadingProgress(0);
      setCurrentStep(0);
    }

    return () => {
      stepTimeouts.forEach(clearTimeout);
      clearInterval(intervalId);
    };
  }, [generating]);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    const loadInitData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }
      setUser(session.user);
      
      try {
        // 1. Fetch user accounts
        const accsResp = await fetch(`${backendUrl}/api/accounts/${session.user.id}`);
        const accsData = await accsResp.json();
        if (Array.isArray(accsData)) {
          setAccounts(accsData);
          if (accsData.length > 0) {
            setSelectedAccountId(accsData[0].id.toString());
          }
        }
        
        // 2. Fetch default settings
        const defsResp = await fetch(`${backendUrl}/api/defaults/${session.user.id}`);
        const defsData = await defsResp.json();
        if (defsData && !defsData.detail) {
          setDefaultSettings(defsData);
        }
        
        // 3. Fetch media library assets
        const libResp = await fetch(`${backendUrl}/api/library/${session.user.id}`);
        const libData = await libResp.json();
        if (Array.isArray(libData)) {
          setLibraryAssets(libData);
        }

        // 4. Fetch user profile limits
        const profResp = await fetch(`${backendUrl}/api/user/profile/${session.user.id}`);
        const profData = await profResp.json();
        if (profData && !profData.detail) {
          setProfile(profData);
        }
      } catch (err) {
        console.error("Error loading create-link resources:", err);
      }
    };
    loadInitData();
  }, [router, backendUrl]);

  const fetchHistoryLogs = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("posts_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) {
        setHistoryLogs(data);
      }
    } catch (err) {
      console.error("Error loading posts history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (showHistoryModal) {
      fetchHistoryLogs();
    }
  }, [showHistoryModal]);

  // Load Facebook Pages dynamically when Profile changes
  const handleLoadPages = async () => {
    if (!selectedAccountId) return;
    setLoadingPages(true);
    setPages([]);
    setFeedback({ type: '', text: '' });
    
    try {
      const resp = await fetch(`${backendUrl}/api/accounts/${user.id}/${selectedAccountId}/pages`);
      const data = await resp.json();
      if (resp.ok && Array.isArray(data)) {
        setPages(data);
        if (data.length > 0) {
          setSelectedPageId(data[0].id);
        } else {
          setFeedback({ type: 'error', text: 'No Facebook pages found for this profile. Make sure the cookie belongs to an account with pages.' });
        }
      } else {
        setFeedback({ type: 'error', text: data.detail || 'Could not load pages. Verify your session cookie is still active.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to communicate with page scraper API.' });
    } finally {
      setLoadingPages(false);
    }
  };

  // Automatically trigger loading pages when profile selected changes
  useEffect(() => {
    if (selectedAccountId && user) {
      handleLoadPages();
    }
  }, [selectedAccountId, user]);

  // Handle local image file upload (Supports Multiple Uploads!)
  const handleLocalImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setUploadingImage(true);
    setFeedback({ type: '', text: '' });
    
    try {
      const uploadedUrls = [];
      
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          continue; // Skip non-images
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        const resp = await fetch(`${backendUrl}/api/upload-file`, {
          method: 'POST',
          body: formData
        });
        const data = await resp.json();
        
        if (resp.ok && data.success) {
          uploadedUrls.push(data.url);
          
          // Save to library
          await fetch(`${backendUrl}/api/library/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: user.id,
              filename: file.name,
              url: data.url
            })
          });
        }
      }
      
      if (uploadedUrls.length > 0) {
        setImageLinksText(prev => {
          const urlsStr = uploadedUrls.join('\n');
          return prev ? `${prev}\n${urlsStr}` : urlsStr;
        });
        setFeedback({ type: 'success', text: `Successfully uploaded ${uploadedUrls.length} images to library!` });
        
        // Refresh library assets
        const libResp = await fetch(`${backendUrl}/api/library/${user.id}`);
        const libData = await libResp.json();
        if (Array.isArray(libData)) {
          setLibraryAssets(libData);
        }
      } else {
        setFeedback({ type: 'error', text: 'No valid image files were uploaded.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Image upload failed. Server error.' });
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  // Toggle selection for library modal items
  const toggleLibrarySelection = (url) => {
    setSelectedLibraryUrls(prev => {
      if (prev.includes(url)) {
        return prev.filter(u => u !== url);
      } else {
        return [...prev, url];
      }
    });
  };

  // Select all library assets
  const selectAllLibraryAssets = () => {
    setSelectedLibraryUrls(libraryAssets.map(a => a.url));
  };

  // Deselect all library assets
  const deselectAllLibraryAssets = () => {
    setSelectedLibraryUrls([]);
  };

  // Confirm selection in Media Library modal
  const handleConfirmLibrarySelection = () => {
    if (selectedLibraryUrls.length > 0) {
      const urlsStr = selectedLibraryUrls.join('\n');
      setImageLinksText(prev => prev ? `${prev}\n${urlsStr}` : urlsStr);
    }
    setShowLibraryModal(false);
    setSelectedLibraryUrls([]);
  };

  // Extract all valid URL links from raw text intelligently (splits by newline, space, comma, semicolon)
  const extractUrls = (text) => {
    if (!text) return [];
    // Split by newlines, commas, semicolons, and spaces
    const tokens = text.split(/[\n,;\s]+/);
    return tokens
      .map(t => t.trim())
      .filter(t => {
        // Keeps standard web URLs and Base64 images
        return t.startsWith('http://') || t.startsWith('https://') || t.startsWith('data:image/');
      });
  };

  // Generate customized redirect links
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!selectedAccountId || !selectedPageId) {
      setFeedback({ type: 'error', text: 'You must select a Facebook Profile and a verified Page first.' });
      return;
    }
    
    // Parse target links and image links intelligently (by commas, spaces, or newlines)
    const targets = extractUrls(targetLinksText);
    if (targets.length === 0) {
      setFeedback({ type: 'error', text: 'Please input at least one target redirect link URL.' });
      return;
    }
    
    const images = extractUrls(imageLinksText);
    if (images.length === 0) {
      setFeedback({ type: 'error', text: 'Please upload, paste, or select an image asset first.' });
      return;
    }
    
    setGenerating(true);
    setResults(null);
    setFeedback({ type: '', text: '' });
    
    const selectedAcc = accounts.find(a => a.id.toString() === selectedAccountId);
    const selectedPage = pages.find(p => p.id === selectedPageId);
    
    const payload = {
      user_id: user.id,
      cookie: selectedAcc.cookie_text,
      access_token: selectedAcc.access_token,
      page_token: selectedPage ? selectedPage.access_token : null,
      act_id: selectedAcc.act_id,
      page_id: selectedPageId,
      page_name: selectedPage ? selectedPage.name : 'Unknown Page',
      facebook_account_label: selectedAcc ? selectedAcc.label : 'Default Profile',
      peek_links: targets,
      image_links: images,
      message,
      description,
      name,
      caption,
      action_button: actionButton,
      publish_to_page: publishToPage,
      auto_dimension: autoDimension
    };
    
    try {
      const resp = await fetch(`${backendUrl}/api/posts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      
      if (resp.ok && data.success) {
        setResults(data.results);
        setFeedback({ type: 'success', text: `Link creation processing completed! Successfully generated ${data.results.successful.length} posts.` });
        
        // Automatically reset form inputs to default values or clear them
        if (defaultSettings) {
          setActionButton(defaultSettings.action_button || 'DOWNLOAD');
          setMessage(defaultSettings.message || '');
          setDescription(defaultSettings.description || '');
          setName(defaultSettings.name || '');
          setCaption(defaultSettings.caption || '');
          setTargetLinksText(defaultSettings.target_link || '');
          setImageLinksText('');
          setPublishToPage(defaultSettings.publish_to_page !== undefined ? defaultSettings.publish_to_page : true);
          setAutoDimension(defaultSettings.auto_dimension !== undefined ? defaultSettings.auto_dimension : true);
        } else {
          setTargetLinksText('');
          setImageLinksText('');
          setMessage('');
          setName('');
          setDescription('');
          setCaption('');
          setActionButton('DOWNLOAD');
          setPublishToPage(true);
          setAutoDimension(true);
        }

        // Refresh profile stats
        try {
          const profResp = await fetch(`${backendUrl}/api/user/profile/${user.id}`);
          const profData = await profResp.json();
          if (profData && !profData.detail) {
            setProfile(profData);
          }
        } catch (e) {
          console.error("Failed to refresh profile:", e);
        }
      } else {
        const errorMsg = data.results?.failed?.[0]?.reason || data.detail || 'Failed to execute link creation.';
        setFeedback({ type: 'error', text: errorMsg });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'API endpoint generated server execution error.' });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleApplyDefaults = () => {
    if (defaultSettings) {
      setActionButton(defaultSettings.action_button || 'DOWNLOAD');
      setMessage(defaultSettings.message || '');
      setDescription(defaultSettings.description || '');
      setName(defaultSettings.name || '');
      setCaption(defaultSettings.caption || '');
      setTargetLinksText(defaultSettings.target_link || '');
      setPublishToPage(defaultSettings.publish_to_page !== undefined ? defaultSettings.publish_to_page : true);
      setAutoDimension(defaultSettings.auto_dimension !== undefined ? defaultSettings.auto_dimension : true);
      setFeedback({ type: 'success', text: 'Default settings loaded successfully!' });
    } else {
      setFeedback({ type: 'error', text: 'No default settings found. Save them in the Defaults Settings page first.' });
    }
  };

  const handleClearForm = () => {
    setTargetLinksText('');
    setImageLinksText('');
    setMessage('');
    setName('');
    setDescription('');
    setCaption('');
    setActionButton('DOWNLOAD');
    setPublishToPage(true);
    setAutoDimension(true);
    setFeedback({ type: '', text: '' });
  };

  // Extract unique facebook profile labels for profile filter dropdown
  const uniqueProfiles = Array.from(new Set(historyLogs.map(log => log.facebook_account_label).filter(Boolean)));

  // Filter history logs dynamically
  const filteredHistoryLogs = historyLogs.filter(log => {
    const searchText = historySearch.toLowerCase();
    const matchesSearch = 
      (log.peek_link && log.peek_link.toLowerCase().includes(searchText)) ||
      (log.permalink && log.permalink.toLowerCase().includes(searchText)) ||
      (log.page_name && log.page_name.toLowerCase().includes(searchText)) ||
      (log.facebook_account_label && log.facebook_account_label.toLowerCase().includes(searchText));

    const matchesStatus = 
      historyStatusFilter === 'all' || 
      (historyStatusFilter === 'success' && log.status === 'success') ||
      (historyStatusFilter === 'failed' && log.status !== 'success');

    const matchesProfile = 
      historyProfileFilter === 'all' || 
      (log.facebook_account_label === historyProfileFilter);

    return matchesSearch && matchesStatus && matchesProfile;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Tabs Header Navigation */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px', marginBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('create')}
          style={{
            background: activeTab === 'create' ? 'var(--primary-glow)' : 'transparent',
            border: '1px solid ' + (activeTab === 'create' ? 'var(--primary)' : 'var(--panel-border)'),
            color: activeTab === 'create' ? 'var(--primary)' : 'var(--text-muted)',
            fontSize: '14px',
            fontWeight: '800',
            padding: '10px 24px',
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Sparkles size={16} /> Create Link
        </button>
        <button
          onClick={() => {
            setActiveTab('history');
            fetchHistoryLogs();
          }}
          style={{
            background: activeTab === 'history' ? 'var(--primary-glow)' : 'transparent',
            border: '1px solid ' + (activeTab === 'history' ? 'var(--primary)' : 'var(--panel-border)'),
            color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-muted)',
            fontSize: '14px',
            fontWeight: '800',
            padding: '10px 24px',
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FileText size={16} /> History logs
        </button>
      </div>

      {activeTab === 'create' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.65fr 1fr', gap: '32px' }}>
          
          {/* Configuration Form */}
          <div>
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Setup customized meta redirect post</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button" 
                    onClick={handleApplyDefaults}
                    className="btn btn-secondary" 
                    style={{ padding: '6px 12px', fontSize: '12px', gap: '4px', color: 'var(--primary)', borderColor: 'rgba(99, 102, 241, 0.2)' }}
                  >
                    <Sparkles size={12} /> Load Defaults
                  </button>
                  <button 
                    type="button" 
                    onClick={handleClearForm}
                    className="btn btn-secondary" 
                    style={{ padding: '6px 12px', fontSize: '12px', gap: '4px' }}
                  >
                    <X size={12} /> Clear Form
                  </button>
                </div>
              </div>

          {isLimitReached && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '20px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: '600'
            }}>
              <AlertTriangle size={16} title="Warning badge" />
              <span>Subscription Limit Reached! Upgrade your package to keep creating customized redirection links.</span>
            </div>
          )}

          {feedback.text && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '20px',
              background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
              color: feedback.type === 'success' ? '#10b981' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px'
            }}>
              {feedback.type === 'success' ? <CheckCircle size={16} title="Success badge" /> : <AlertTriangle size={16} title="Warning badge" />}
              <span>{feedback.text}</span>
            </div>
          )}

          <form onSubmit={handleGenerate}>
            {/* Step 1: FB Profile Selection */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.1fr', gap: '16px', marginBottom: '20px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Facebook Profile</label>
                {accounts.length === 0 ? (
                  <select className="form-select" disabled>
                    <option>No profiles available - Add in Profiles first</option>
                  </select>
                ) : (
                  <select 
                    className="form-select" 
                    value={selectedAccountId} 
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.label} ({a.fb_user_id || 'UID'})</option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={handleLoadPages} 
                  className="btn btn-secondary" 
                  style={{ width: '100%', gap: '6px', height: '48px' }}
                  disabled={loadingPages || !selectedAccountId}
                >
                  <RefreshCw size={14} className={loadingPages ? 'animate-spin' : ''} title="Check active FB pages connection" />
                  {loadingPages ? 'Scraping Pages...' : 'Check / Load Pages'}
                </button>
              </div>
            </div>

            {/* Step 2: Page dropdown */}
            <div className="form-group">
              <label className="form-label">Select Target Page</label>
              {pages.length === 0 ? (
                <select className="form-select" disabled>
                  <option>{loadingPages ? 'Loading accessible Facebook Pages...' : 'Click "Check / Load Pages" above'}</option>
                </select>
              ) : (
                <select 
                  className="form-select" 
                  value={selectedPageId}
                  onChange={(e) => setSelectedPageId(e.target.value)}
                >
                  {pages.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Step 3: Target links (bulk input supported) */}
            <div className="form-group">
              <label className="form-label">Target Redirect URL(s) - Per line, comma, or space separated</label>
              <textarea 
                required
                placeholder="https://site1.com, https://site2.com, https://site3.com" 
                className="form-textarea" 
                value={targetLinksText}
                onChange={(e) => setTargetLinksText(e.target.value)}
                style={{ minHeight: '80px', fontFamily: 'monospace', fontSize: '13px' }}
              />
            </div>

            {/* Step 4: Image assets */}
            <div className="form-group" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Banner Image URL(s) - Per line, comma, or space separated</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowLibraryModal(true)} 
                    className="btn btn-secondary" 
                    style={{ padding: '4px 8px', fontSize: '11px', gap: '4px' }}
                  >
                    <Image size={12} title="Select from Media Library assets" /> Select from Library
                  </button>
                  <label className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', gap: '4px', cursor: 'pointer', marginBottom: 0 }}>
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleLocalImageUpload} disabled={uploadingImage} />
                    <Layers size={12} title="Upload raw local image file(s)" /> {uploadingImage ? 'Uploading...' : 'Upload Local File(s)'}
                  </label>
                </div>
              </div>
              <textarea 
                required
                placeholder="Paste or upload image links..." 
                className="form-textarea" 
                value={imageLinksText}
                onChange={(e) => setImageLinksText(e.target.value)}
                style={{ minHeight: '80px', fontFamily: 'monospace', fontSize: '13px' }}
              />
              
              {/* Image Preview Row with Blue Glow */}
              {(() => {
                const urls = imageLinksText
                  ? imageLinksText.split(/[\n,\s]+/).map(u => u.trim()).filter(u => u.startsWith('http://') || u.startsWith('https://'))
                  : [];
                if (urls.length === 0) return null;
                return (
                  <div style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    marginTop: '12px', 
                    overflowX: 'auto', 
                    padding: '8px 4px' 
                  }} className="no-scrollbar animate-fade-in">
                    {urls.map((url, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          position: 'relative',
                          width: '70px',
                          height: '70px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          boxShadow: '0 0 10px rgba(59, 130, 246, 0.7), 0 0 20px rgba(59, 130, 246, 0.4)', // Blue Glow!
                          border: '2px solid #3b82f6',
                          flexShrink: 0,
                          background: 'rgba(0,0,0,0.2)'
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={url} 
                          alt={`Preview ${idx + 1}`} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentNode.innerHTML = '<span style="font-size:10px;color:rgba(255,255,255,0.3);text-align:center;padding:12px 4px;display:block;">Broken URL</span>';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newUrls = urls.filter((_, i) => i !== idx);
                            setImageLinksText(newUrls.join('\n'));
                          }}
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            background: 'rgba(0, 0, 0, 0.6)',
                            border: 'none',
                            color: '#ff4444',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            zIndex: 10
                          }}
                          title="Remove this URL"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Meta tags customization parameters */}
            <div style={{ borderTop: '1px solid var(--panel-border)', marginTop: '24px', paddingTop: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '16px', color: 'var(--primary)' }}>Meta Customizations</h4>

              <div className="form-group">
                <label className="form-label">Feed Post Description Text / Message</label>
                <input 
                  type="text" 
                  placeholder="e.g. Free Download - Grab this PDF guide now!"
                  className="form-input" 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Custom Link Header / Title (Bold Text)</label>
                <input 
                  type="text" 
                  placeholder="e.g. PDF: Download Exam Study Pack Here"
                  className="form-input" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Custom Subtitle Description</label>
                <input 
                  type="text" 
                  placeholder="e.g. Safe download | Size: 14.2 MB"
                  className="form-input" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Custom Caption (Bottom domain link line)</label>
                <input 
                  type="text" 
                  placeholder="e.g. GOOGLEPLAY.COM"
                  className="form-input" 
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Action Call To Action (CTA)</label>
                <select className="form-select" value={actionButton} onChange={(e) => setActionButton(e.target.value)}>
                  <option value="DOWNLOAD">DOWNLOAD</option>
                  <option value="LEARN_MORE">LEARN_MORE</option>
                  <option value="WATCH_MORE">WATCH_MORE</option>
                  <option value="CONTACT_US">CONTACT_US</option>
                  <option value="SEE_MORE">SEE_MORE</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Publish Type</label>
                  <select className="form-select" value={publishToPage ? 'true' : 'false'} onChange={(e) => setPublishToPage(e.target.value === 'true')}>
                    <option value="true">Live on Feed</option>
                    <option value="false">Dark Post (Preview Only)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Auto Image Resize (1200x630)</label>
                  <select className="form-select" value={autoDimension ? 'true' : 'false'} onChange={(e) => setAutoDimension(e.target.value === 'true')}>
                    <option value="true">ON (Blur padding)</option>
                    <option value="false">OFF (Raw dimensions)</option>
                  </select>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', gap: '8px', padding: '14px', marginBottom: generating ? '20px' : '0px', background: isLimitReached ? '#ef4444' : undefined }}
              disabled={generating || !selectedAccountId || !selectedPageId || isLimitReached}
            >
              <Play size={16} title="Generate FB customized redirect links" /> {isLimitReached ? 'Subscription Limit Reached' : generating ? 'Generating redirect link stories...' : 'Create customized links'}
            </button>
          </form>

          {/* Loading Tracing Bar */}
          {generating && (
            <div className="glass-panel" style={{ marginTop: '20px', padding: '20px', border: '1px solid rgba(99, 102, 241, 0.2)', background: 'rgba(99, 102, 241, 0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="animate-spin" style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #818cf8', borderTopColor: 'transparent', borderRadius: '50%' }}></span>
                  Generating Redirect Posts
                </span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#818cf8' }}>{loadingProgress}%</span>
              </div>
              
              {/* Outer Bar */}
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ 
                  width: `${loadingProgress}%`, 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)',
                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                }}></div>
              </div>

              {/* Steps Checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {generationSteps.map((step, idx) => {
                  const isCompleted = idx < currentStep;
                  const isActive = idx === currentStep;
                  
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: isCompleted || isActive ? 1 : 0.3, transition: 'opacity 0.3s ease' }}>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: isCompleted ? 'rgba(16, 185, 129, 0.15)' : isActive ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.05)',
                        color: isCompleted ? '#10b981' : isActive ? '#818cf8' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: '800',
                        flexShrink: 0
                      }}>
                        {isCompleted ? '✓' : idx + 1}
                      </div>
                      <span style={{ fontSize: '12px', color: isActive ? 'var(--text)' : 'var(--text-muted)', fontWeight: isActive ? '600' : '400' }}>
                        {step}
                        {isActive && <span className="animate-pulse" style={{ marginLeft: '6px', color: '#818cf8', fontSize: '11px' }}>(processing...)</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results View Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Output container */}
        <div className="glass-panel" style={{ minHeight: '300px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Post Output Results</h3>
          
          {!results ? (
            <div style={{ padding: '40px 20px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '13px' }}>
              Configure your details and click Generate on the left to create links.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Copy all output text area */}
              {results.successful.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--success)' }}>Generated Permalinks:</span>
                    <button 
                      onClick={() => copyToClipboard(results.successful.map(r => r.permalink).join('\n'))}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '11px', gap: '4px' }}
                    >
                      {copySuccess ? <Check size={12} style={{ color: 'var(--success)' }} title="Copied success" /> : <Copy size={12} title="Copy all permalinks to clipboard" />}
                      {copySuccess ? 'Copied' : 'Copy All'}
                    </button>
                  </div>
                  <textarea 
                    readOnly
                    className="result-box"
                    value={results.successful.map(r => r.permalink).join('\n')}
                  />
                </div>
              )}

              {/* Successful details list */}
              {results.successful.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px' }}>Successfully Created Posts ({results.successful.length})</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {results.successful.map((item, idx) => (
                      <div key={idx} className="link-row" style={{ fontSize: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '80%' }}>
                          <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Peek Link: {item.peek}</span>
                          <a href={item.permalink} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.permalink}
                          </a>
                        </div>
                        <a href={item.permalink} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '10px' }}>
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failures list */}
              {results.failed.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: '#ef4444' }}>Failed creations ({results.failed.length})</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {results.failed.map((item, idx) => (
                      <div key={idx} style={{
                        padding: '12px',
                        background: 'rgba(239, 68, 68, 0.05)',
                        border: '1px solid rgba(239, 68, 68, 0.1)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>Target: {item.peek}</span>
                        <span style={{ color: '#ef4444' }}>Reason: {item.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
      ) : (
        /* History view panel */
        <div className="glass-panel animate-fade-in" style={{ padding: '28px', height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Filter Toolbar */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            
            {/* Search Input */}
            <div style={{ flex: 1, minWidth: '240px' }}>
              <input 
                type="text" 
                placeholder="Search by Redirect Link, FB Link, or Page..." 
                className="form-input" 
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                style={{ height: '40px', fontSize: '13px' }}
              />
            </div>

            {/* Filter by Status */}
            <div style={{ minWidth: '150px' }}>
              <select 
                className="form-select" 
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                style={{ height: '40px', fontSize: '13px' }}
              >
                <option value="all">All Statuses</option>
                <option value="success">Success Only</option>
                <option value="failed">Failed Only</option>
              </select>
            </div>

            {/* Filter by Profile */}
            <div style={{ minWidth: '180px' }}>
              <select 
                className="form-select" 
                value={historyProfileFilter}
                onChange={(e) => setHistoryProfileFilter(e.target.value)}
                style={{ height: '40px', fontSize: '13px' }}
              >
                <option value="all">All Profiles</option>
                {uniqueProfiles.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            
            {/* Refresh Button */}
            <button 
              type="button" 
              onClick={fetchHistoryLogs} 
              className="btn btn-secondary" 
              style={{ height: '40px', padding: '0 16px', gap: '6px' }}
              disabled={loadingHistory}
            >
              <RefreshCw size={14} className={loadingHistory ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          {/* Logs List Area */}
          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            {loadingHistory ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading history logs...
              </div>
            ) : filteredHistoryLogs.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--panel-border)', borderRadius: '12px' }}>
                No matching history logs found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredHistoryLogs.map((item) => {
                  const isSuccess = item.status === 'success';
                  return (
                    <div key={item.id} style={{
                      padding: '16px 20px',
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid var(--panel-border)',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      
                      {/* Header Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--primary)' }}>
                              Profile: {item.facebook_account_label || 'Default Profile'}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--text-main)', opacity: 0.8 }}>
                              Page: {item.page_name || 'N/A'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Status Badge */}
                        <div>
                          <span 
                            style={{
                              background: isSuccess ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                              color: isSuccess ? 'var(--success)' : '#ef4444',
                              border: `1px solid ${isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                              fontSize: '11px',
                              padding: '4px 10px',
                              borderRadius: '99px',
                              fontWeight: '700'
                            }}
                          >
                            {item.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Detail Row: Target URL and Image Preview */}
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.15)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.01)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Target Redirect URL:</span>
                          <a 
                            href={item.peek_link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ fontSize: '13px', fontFamily: 'monospace', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={item.peek_link}
                          >
                            {item.peek_link}
                          </a>
                        </div>
                        
                        {/* Image Preview thumbnail */}
                        {item.image_url && (
                          <div style={{ width: '48px', height: '28px', borderRadius: '4px', overflow: 'hidden', background: '#000', border: '1px solid var(--panel-border)', flexShrink: 0 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.image_url} alt="creative preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                      </div>

                      {/* Error Box */}
                      {!isSuccess && item.error_message && (
                        <div style={{ fontSize: '12px', color: '#ef4444', background: 'rgba(239,68,68,0.04)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.1)' }}>
                          Error details: {item.error_message}
                        </div>
                      )}

                      {/* Footer/Action Row for successful posts */}
                      {isSuccess && item.permalink && item.permalink !== 'N/A' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderTop: '1px dashed var(--panel-border)', paddingTop: '10px', marginTop: '4px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Facebook Live Link:</span>
                            <a 
                              href={item.permalink} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {item.permalink}
                            </a>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(item.permalink);
                                setCopiedLogId(item.id);
                                setTimeout(() => setCopiedLogId(null), 2000);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '11px', gap: '4px', height: '32px' }}
                            >
                              {copiedLogId === item.id ? (
                                <>
                                  <Check size={12} style={{ color: 'var(--success)' }} /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy size={12} /> Copy FB Link
                                </>
                              )}
                            </button>
                            <a 
                              href={item.permalink} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="btn btn-primary" 
                              style={{ padding: '6px 12px', fontSize: '11px', height: '32px' }}
                            >
                              View Live
                            </a>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Select from Media Library Modal (Supports Multi-Selection!) */}
      {showLibraryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(8px)',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '850px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: '28px'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '800' }}>Select Images from Media Library</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>Click multiple images to select them, then click "Add Selected Images" below.</p>
              </div>
              <button 
                type="button" 
                onClick={() => { setShowLibraryModal(false); setSelectedLibraryUrls([]); }}
                className="btn btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Close
              </button>
            </div>

            {/* Quick Bulk Select Actions */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', fontSize: '13px' }}>
              <button type="button" onClick={selectAllLibraryAssets} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px', gap: '4px' }}>
                <CheckSquare size={13} title="Select all images" /> Select All
              </button>
              <button type="button" onClick={deselectAllLibraryAssets} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px', gap: '4px' }}>
                <Square size={13} title="Deselect all images" /> Deselect All
              </button>
              <span style={{ marginLeft: 'auto', alignSelf: 'center', color: 'var(--primary)', fontWeight: '700' }}>
                {selectedLibraryUrls.length} image(s) selected
              </span>
            </div>

            {/* Modal Content Grid */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '20px' }}>
              {libraryAssets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>
                  No media library items available. Upload assets in the Media Library page first.
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '16px'
                }}>
                  {libraryAssets.map(asset => {
                    const isSelected = selectedLibraryUrls.includes(asset.url);
                    return (
                      <div 
                        key={asset.id} 
                        onClick={() => toggleLibrarySelection(asset.url)}
                        style={{
                          background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                          border: isSelected ? '2px solid var(--primary)' : '1px solid var(--panel-border)',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          textAlign: 'center',
                          position: 'relative'
                        }}
                        className="library-select-item"
                      >
                        {/* Selected Indicator Badge */}
                        {isSelected && (
                          <div style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            background: 'var(--primary)',
                            color: '#ffffff',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10
                          }}>
                            <Check size={12} title="Selected" />
                          </div>
                        )}
                        
                        <div style={{ width: '100%', height: '90px', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={asset.url} alt={asset.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{
                          padding: '8px',
                          fontSize: '11px',
                          fontWeight: '700',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {asset.filename}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Action Footer */}
            <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                type="button" 
                onClick={() => { setShowLibraryModal(false); setSelectedLibraryUrls([]); }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleConfirmLibrarySelection}
                className="btn btn-primary"
                disabled={selectedLibraryUrls.length === 0}
                style={{ minWidth: '180px' }}
              >
                Add {selectedLibraryUrls.length} Selected Image(s)
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Styled library modal hover rule */}
      <style jsx>{`
        .library-select-item:hover {
          border-color: var(--primary) !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
        }
      `}</style>

    </div>
  );
}
