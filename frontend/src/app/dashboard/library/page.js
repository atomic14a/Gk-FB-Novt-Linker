'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabase';
import { 
  Upload, Trash2, Copy, Check, Link2, 
  FileImage, CheckCircle, AlertTriangle, Loader2,
  Pencil, X
} from 'lucide-react';

export default function MediaLibraryPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingUrl, setSavingUrl] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageName, setImageName] = useState('');
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [copiedId, setCopiedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [hoveredId, setHoveredId] = useState(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  const fetchLibrary = async (userId) => {
    try {
      const r = await fetch(`${backendUrl}/api/library/${userId}`);
      const data = await r.json();
      if (Array.isArray(data)) {
        setAssets(data);
      }
    } catch (err) {
      console.error("Failed to load media assets:", err);
    } finally {
      setLoading(false);
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
      fetchLibrary(session.user.id);
    };
    initPage();
  }, [router, backendUrl]);

  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback({ type: '', text: '' }), 5000);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate that all files are images
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      showFeedback('error', 'Only image files are allowed in the Media Library.');
      return;
    }

    setUploading(true);
    showFeedback('', '');

    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
      try {
        // 1. Upload file using backend upload-file endpoint
        const formData = new FormData();
        formData.append('file', file);

        const uploadResp = await fetch(`${backendUrl}/api/upload-file`, {
          method: 'POST',
          body: formData
        });

        const uploadResult = await uploadResp.json();
        if (!uploadResp.ok || !uploadResult.success) {
          failCount++;
          continue;
        }

        const uploadedUrl = uploadResult.url;

        // 2. Add uploaded asset details to Media Library database table
        const addResp = await fetch(`${backendUrl}/api/library/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            filename: file.name,
            url: uploadedUrl
          })
        });

        const addResult = await addResp.json();
        if (addResp.ok && addResult.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        console.error(err);
        failCount++;
      }
    }

    if (successCount > 0) {
      showFeedback('success', `Successfully uploaded ${successCount} image(s)!${failCount > 0 ? ` Failed to upload ${failCount} image(s).` : ''}`);
      fetchLibrary(user.id);
    } else {
      showFeedback('error', `Failed to upload the selected image files.`);
    }

    setUploading(false);
    // Clear input
    e.target.value = '';
  };

  // Save image asset by URL
  const handleAddUrl = async (e) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      showFeedback('error', 'Please enter a valid image URL.');
      return;
    }

    setSavingUrl(true);
    showFeedback('', '');

    const nameToSave = imageName.trim() || imageUrl.split('/').pop()?.split('?')[0] || 'Remote Image';

    try {
      const addResp = await fetch(`${backendUrl}/api/library/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          filename: nameToSave,
          url: imageUrl.trim()
        })
      });

      const result = await addResp.json();
      if (addResp.ok && result.success) {
        showFeedback('success', 'External image URL added successfully!');
        setImageUrl('');
        setImageName('');
        fetchLibrary(user.id);
      } else {
        showFeedback('error', result.detail || 'Failed to add image asset URL.');
      }
    } catch (err) {
      showFeedback('error', 'Connection to API server failed.');
    } finally {
      setSavingUrl(false);
    }
  };

  // Delete media asset
  const handleDeleteAsset = async (id) => {
    if (!window.confirm('Are you sure you want to remove this image from your Media Library?')) {
      return;
    }

    try {
      const r = await fetch(`${backendUrl}/api/library/${user.id}/${id}`, {
        method: 'DELETE'
      });

      if (r.ok) {
        showFeedback('success', 'Image asset deleted from library.');
        setAssets(prev => prev.filter(item => item.id !== id));
      } else {
        showFeedback('error', 'Failed to delete library asset.');
      }
    } catch (err) {
      showFeedback('error', 'API communication error.');
    }
  };

  // Copy url helper
  const handleCopyUrl = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle renaming asset
  const handleRenameAsset = async (assetId, newName) => {
    if (!newName.trim()) {
      showFeedback('error', 'Name cannot be empty.');
      return;
    }
    try {
      const resp = await fetch(`${backendUrl}/api/library/update/${user.id}/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: newName.trim() })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setAssets(prev => prev.map(item => item.id === assetId ? { ...item, filename: newName.trim() } : item));
        setEditingId(null);
        showFeedback('success', 'Filename updated successfully!');
      } else {
        showFeedback('error', data.detail || 'Failed to update asset name.');
      }
    } catch (err) {
      showFeedback('error', 'API communication error during renaming.');
    }
  };

  const handleKeyDown = (e, assetId) => {
    if (e.key === 'Enter') {
      handleRenameAsset(assetId, editingName);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', color: 'var(--text-muted)', textAlign: 'center' }}>
        Loading Media Library assets...
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} className="animate-fade-in">
      
      {/* Media gallery grid panel */}
      <div className="glass-panel" style={{ height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Your Saved Images</h3>
            <span style={{ 
              fontSize: '12px', 
              fontWeight: '700', 
              color: 'var(--primary)', 
              background: 'rgba(99, 102, 241, 0.1)', 
              padding: '4px 12px', 
              borderRadius: '99px' 
            }}>
              {assets.length} Image(s)
            </span>
          </div>

        {assets.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            color: 'var(--text-muted)',
            border: '1px dashed var(--panel-border)',
            borderRadius: '12px',
            gap: '12px'
          }}>
            <FileImage size={40} style={{ opacity: 0.3 }} title="Media library is empty" />
            <span style={{ fontSize: '14px' }}>No image assets stored in your library yet.</span>
          </div>
        ) : (
          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '20px'
            }}>
            {assets.map((asset) => (
              <div key={asset.id} style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--panel-border)',
                borderRadius: '12px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s ease',
                position: 'relative'
              }}>
                {/* Image Thumbnail */}
                <div style={{
                  width: '100%',
                  height: '130px',
                  background: 'rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                  borderBottom: '1px solid var(--panel-border)'
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={asset.url} 
                    alt={asset.filename} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentNode.innerHTML = '<span style="font-size:12px;color:rgba(255,255,255,0.2)">Broken Image URL</span>';
                    }}
                  />
                </div>

                {/* Details Footer */}
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, justifyContent: 'space-between' }}>
                  {editingId === asset.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, asset.id)}
                        autoFocus
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          height: '24px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--primary)',
                          borderRadius: '6px',
                          color: 'var(--text-main)',
                          flex: 1
                        }}
                      />
                      <button 
                        onClick={() => handleRenameAsset(asset.id, editingName)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--success)',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Save Name"
                      >
                        <Check size={14} />
                      </button>
                      <button 
                        onClick={() => setEditingId(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onMouseEnter={() => setHoveredId(asset.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        width: '100%',
                        minHeight: '24px'
                      }}
                    >
                      <span 
                        style={{ 
                          fontSize: '13px', 
                          fontWeight: '700', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          color: 'var(--text-main)',
                          flex: 1
                        }} 
                        title={asset.filename}
                      >
                        {asset.filename}
                      </span>
                      {hoveredId === asset.id && (
                        <button
                          onClick={() => {
                            setEditingId(asset.id);
                            setEditingName(asset.filename);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            marginLeft: '4px'
                          }}
                          title="Rename Image"
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      onClick={() => handleCopyUrl(asset.url, asset.id)}
                      className="btn btn-secondary" 
                      style={{ flex: 1, padding: '6px 0', fontSize: '11px', gap: '4px' }}
                      title="Copy Image URL"
                    >
                      {copiedId === asset.id ? <Check size={12} style={{ color: 'var(--success)' }} title="Copied successfully" /> : <Copy size={12} title="Copy public image URL" />}
                      {copiedId === asset.id ? 'Copied' : 'Copy URL'}
                    </button>
                    <button 
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="btn btn-secondary" 
                      style={{ padding: '6px 10px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.1)' }}
                      title="Delete Image"
                    >
                      <Trash2 size={12} title="Remove image from library" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

      {/* Upload files / add url section */}
      <div className="no-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100vh - 180px)', overflowY: 'auto' }}>
        
        {/* Upload widget */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '6px' }}>Upload Asset</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '16px' }}>
            Upload standard banner images (JPG, PNG) directly to your secure storage bucket.
          </p>

          {feedback.text && feedback.type !== 'success' && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '16px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px'
            }}>
              <AlertTriangle size={14} title="Warning" />
              <span>{feedback.text}</span>
            </div>
          )}

          {feedback.text && feedback.type === 'success' && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '16px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px'
            }}>
              <CheckCircle size={14} title="Success" />
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Custom drag-n-drop or click box */}
          <label className="upload-zone" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '16px 20px' }}>
            <input 
              type="file" 
              accept="image/*" 
              multiple
              onChange={handleFileUpload} 
              style={{ display: 'none' }}
              disabled={uploading}
            />
            {uploading ? (
              <>
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} title="Uploading file..." />
                <span style={{ fontSize: '13px', fontWeight: '600' }}>Uploading image to storage...</span>
              </>
            ) : (
              <>
                <Upload size={32} style={{ color: 'var(--text-muted)' }} title="Click to upload standard image banner" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700' }}>Click to select files</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Supports JPG, PNG up to 10MB</span>
                </div>
              </>
            )}
          </label>
        </div>

        {/* URL Addition Widget */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '6px' }}>Add URL Asset</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '16px' }}>
            Reference any public hosting image URL directly without using file storage.
          </p>

          <form onSubmit={handleAddUrl}>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ fontSize: '12px', marginBottom: '6px' }}>Asset Filename Label</label>
              <input 
                type="text" 
                placeholder="e.g. Black Friday Banner" 
                className="form-input"
                value={imageName}
                onChange={(e) => setImageName(e.target.value)}
                style={{ padding: '10px 12px', fontSize: '13px', height: '36px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ fontSize: '12px', marginBottom: '6px' }}>Image Asset URL</label>
              <input 
                type="url" 
                required
                placeholder="https://example.com/images/banner.jpg" 
                className="form-input"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                style={{ padding: '10px 12px', fontSize: '13px', height: '36px' }}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', gap: '8px', padding: '11px', fontSize: '13px' }}
              disabled={savingUrl}
            >
              <Link2 size={14} title="Save public image URL to library" /> {savingUrl ? 'Adding asset URL...' : 'Save External URL'}
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
