'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabase';
import { 
  Sparkles, ShieldCheck, Compass, Layers, 
  HelpCircle, CheckCircle, ArrowRight, ExternalLink
} from 'lucide-react';

export default function DashboardOverview() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ account_type: 'trial', links_limit: 10, links_created: 0, full_name: '' });
  const [profilesCount, setProfilesCount] = useState(0);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchOverviewData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }
      setUser(session.user);

      try {
        // 1. Fetch profile metrics
        const profResp = await fetch(`${backendUrl}/api/user/profile/${session.user.id}`);
        const profData = await profResp.json();
        if (profData && !profData.detail) {
          setProfile(profData);
        }

        // 2. Fetch Facebook profiles connected count
        const accsResp = await fetch(`${backendUrl}/api/accounts/${session.user.id}`);
        const accsData = await accsResp.json();
        if (Array.isArray(accsData)) {
          setProfilesCount(accsData.length);
        }

        // 3. Fetch recent generation history logs from Supabase
        const { data: history } = await supabase
          .from("posts_history")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(5);
        
        if (history) {
          setRecentPosts(history);
        }
      } catch (err) {
        console.error("Error loading overview metrics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, [router, backendUrl]);

  if (loading) {
    return (
      <div style={{ padding: '40px', color: 'var(--text-muted)', textAlign: 'center' }}>
        Loading dashboard Overview metrics...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-fade-in">
      
      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        
        {/* Plan Type Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Current Subscription</span>
            <h3 style={{ fontSize: '28px', fontWeight: '800', marginTop: '8px', marginBottom: '4px' }}>
              {profile.account_type === 'purchased' ? 'Unlimited Pro Plan' : 'Trial Account'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              {profile.account_type === 'purchased' ? 'Lifetime premium access granted' : `Trial plan active (${profile.links_limit || 10} links limit)`}
            </p>
          </div>
          {profile.account_type !== 'purchased' && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--panel-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#6366f1' }}>Upgrade to Purchased Plan ($15)</span>
                <ArrowRight size={14} style={{ color: '#6366f1' }} title="Upgrade now" />
              </div>
            </div>
          )}
        </div>

        {/* Links Created Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Created Links Metric</span>
            <h3 style={{ fontSize: '28px', fontWeight: '800', marginTop: '8px', marginBottom: '4px' }}>
              {profile.links_created} <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-muted)' }}>/ {profile.account_type === 'purchased' ? '∞' : profile.links_limit}</span>
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Total generated customized meta redirect links
            </p>
          </div>
          <div style={{ marginTop: '16px' }}>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ 
                width: profile.account_type === 'purchased' ? '100%' : `${(profile.links_created / profile.links_limit) * 100}%`, 
                height: '100%', 
                background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)' 
              }}></div>
            </div>
          </div>
        </div>

        {/* Facebook Profiles Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Connected Profiles</span>
            <h3 style={{ fontSize: '28px', fontWeight: '800', marginTop: '8px', marginBottom: '4px' }}>
              {profilesCount}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Active Facebook account profile cookies saved
            </p>
          </div>
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--panel-border)' }} onClick={() => router.push('/dashboard/profiles')} className="cursor-pointer">
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Add Another Cookie Profile</span>
          </div>
        </div>

      </div>

      {/* Main Grid: Guidelines & Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
        
        {/* Guidelines section */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Novt Linker Automation Guide</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', flexShrink: 0, fontWeight: '700', fontSize: '13px' }}>1</div>
              <div>
                <h5 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>Add Facebook Cookie</h5>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Go to the <strong>Facebook Profiles</strong> page. Paste your raw Facebook login cookie. The scraper will automatically extract the name, token, and ad account details.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', flexShrink: 0, fontWeight: '700', fontSize: '13px' }}>2</div>
              <div>
                <h5 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>Populate Media Library</h5>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Save your marketing banner images inside the <strong>Media Library</strong> so you can instantly select them during post creation. Drag and drop local images or paste URL locations.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', flexShrink: 0, fontWeight: '700', fontSize: '13px' }}>3</div>
              <div>
                <h5 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>Generate Customized Banners</h5>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Go to <strong>Create Link</strong>. Select a Facebook profile, click check to load its pages, choose an image, setup your title/CTA button, and generate the final link assets instantly.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent generation log activity */}
        <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Recent Link Creations</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            {recentPosts.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '160px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No links created yet. Click "Create Link" to begin.
              </div>
            ) : (
              recentPosts.map((post) => (
                <div key={post.id} style={{
                  padding: '12px',
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ maxWidth: '70%' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {post.peek_link}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Page: {post.page_name} | {new Date(post.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div>
                    {post.permalink && post.permalink !== "N/A" ? (
                      <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', gap: '4px' }}>
                        <ExternalLink size={12} title="View created redirect story on Facebook" /> View
                      </a>
                    ) : (
                      <span className="badge badge-trial" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '10px' }}>
                        FAILED
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
