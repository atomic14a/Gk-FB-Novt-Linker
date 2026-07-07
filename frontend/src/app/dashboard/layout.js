'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../supabase';
import { 
  Sparkles, Settings, LogOut, User, 
  UploadCloud, LayoutDashboard, Link, AlertTriangle, CreditCard
} from 'lucide-react';
import '../globals.css';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ 
    account_type: 'trial', 
    links_limit: 10, 
    links_created: 0, 
    daily_links_created: 0,
    monthly_links_created: 0,
    full_name: '' 
  });
  
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  const fetchUserData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth');
      return;
    }
    setUser(session.user);
    
    try {
      const profResp = await fetch(`${backendUrl}/api/user/profile/${session.user.id}`);
      const profData = await profResp.json();
      if (profData && !profData.detail) {
        setProfile(profData);
      }
    } catch (err) {
      console.error("API error loading layout profile:", err);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [router, backendUrl, pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const menuItems = [
    { name: 'Overview', path: '/dashboard', icon: <LayoutDashboard size={18} title="Overview Dashboard Console" /> },
    { name: 'Create Link', path: '/dashboard/create', icon: <Link size={18} title="Generate customized redirect links" /> },
    { name: 'Facebook Profiles', path: '/dashboard/profiles', icon: <User size={18} title="Verify & manage Facebook profile cookies" /> },
    { name: 'Media Library', path: '/dashboard/library', icon: <UploadCloud size={18} title="Upload banner images asset library" /> },
    { name: 'Defaults Settings', path: '/dashboard/settings', icon: <Settings size={18} title="Configure default settings" /> },
    { name: 'Subscription', path: '/dashboard/subscription', icon: <CreditCard size={18} title="View subscription plans" /> }
  ];

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

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-muted)' }}>
        Loading Session...
      </div>
    );
  }

  return (
    <div className="main-layout">
      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', cursor: 'pointer' }} onClick={() => router.push('/')}>
            <div style={{
              padding: '8px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              borderRadius: '8px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={20} title="Novt Linker Brand Logo" />
            </div>
            <span style={{ fontSize: '18px', fontWeight: '800' }}>Novt Linker</span>
          </div>
          
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className="btn btn-secondary"
                  style={{
                    justifyContent: 'flex-start',
                    background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                    borderColor: isActive ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                    color: isActive ? '#6366f1' : 'var(--text)'
                  }}
                >
                  {item.icon} {item.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          {/* Plan Info Box */}
          <div style={{ 
            padding: '16px', 
            background: 'rgba(255,255,255,0.02)', 
            borderRadius: '12px', 
            marginBottom: '16px', 
            border: '1px solid var(--panel-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status Plan</span>
              <span 
                className="badge"
                style={{
                  textTransform: 'uppercase',
                  background: profile.account_type === 'premium' ? 'rgba(16, 185, 129, 0.1)' : profile.account_type === 'plus' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(217, 70, 239, 0.1)',
                  color: profile.account_type === 'premium' ? 'var(--success)' : profile.account_type === 'plus' ? 'var(--primary)' : 'var(--accent)',
                  border: profile.account_type === 'premium' ? '1px solid rgba(16, 185, 129, 0.2)' : profile.account_type === 'plus' ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(217, 70, 239, 0.2)'
                }}
              >
                {profile.account_type}
              </span>
            </div>
            
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px' }}>
              {profile.account_type === 'premium' ? (
                <span>Links Created: {profile.links_created} (∞)</span>
              ) : profile.account_type === 'plus' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span>Daily: {profile.daily_links_created || 0} / 50</span>
                  <span>Monthly: {profile.monthly_links_created || 0} / 500</span>
                </div>
              ) : (
                <span>Links: {profile.links_created} / {profile.links_limit || 10}</span>
              )}
            </div>
          </div>
          
          <button onClick={handleSignOut} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', color: '#ef4444' }}>
            <LogOut size={18} title="Sign out of your session" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content viewport */}
      <main className="content-area animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Warning Alert Banner */}
        {isLimitReached && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            padding: '12px 20px',
            borderRadius: '12px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>Subscription Limit Reached! Upgrade your package to keep creating customized redirection links.</span>
            </div>
            <button 
              onClick={() => router.push('/dashboard/subscription')}
              className="btn btn-primary"
              style={{
                padding: '6px 16px',
                fontSize: '12px',
                background: '#ef4444',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                flexShrink: 0
              }}
            >
              Update Subscription
            </button>
          </div>
        )}

        {/* Top Header Profile Panel */}
        <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '32px',
          borderBottom: '1px solid var(--panel-border)',
          paddingBottom: '20px'
        }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>
              {menuItems.find(m => m.path === pathname)?.name || 'Dashboard'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
              Manage your Facebook creative post links
            </p>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '8px 16px',
            borderRadius: '12px',
            border: '1px solid var(--panel-border)'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '14px'
            }}>
              {(profile.full_name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>{profile.full_name || 'Master Zain User'}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user?.email}</span>
            </div>
          </div>
        </header>

        {/* Dynamic page children rendering */}
        <div style={{ flex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
