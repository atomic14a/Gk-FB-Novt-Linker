'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Sparkles, Check, Info, Star, ShieldCheck, Mail } from 'lucide-react';

const defaultPlans = [
  {
    id: 'trial',
    name: 'Trial Package',
    price: '$0',
    period: 'lifetime',
    description: 'Ideal for beginners testing out campaign structures.',
    limits: '10 Total Links',
    features: [
      'Up to 10 customized redirection links',
      'Basic Facebook Creative preview tools',
      'Custom CTA link buttons support',
      'Standard media library file uploads'
    ],
    badge: 'Starter',
    badgeBg: 'rgba(255, 255, 255, 0.05)',
    badgeColor: 'var(--text-muted)'
  },
  {
    id: 'plus',
    name: 'Plus Package',
    price: '$15',
    period: 'per month',
    description: 'Perfect for active marketers scaling daily creative assets.',
    limits: '50 Daily / 500 Monthly Links',
    features: [
      'Max 50 new links daily limit',
      'Max 500 links monthly limit',
      'Dynamic mockup settings presets',
      'Unlimited media library storage capacity',
      'Priority banner resizing & blurring tools'
    ],
    badge: 'Most Popular',
    badgeBg: 'rgba(99, 102, 241, 0.15)',
    badgeColor: 'var(--primary)'
  },
  {
    id: 'premium',
    name: 'Premium Package',
    price: '$30',
    period: 'per month',
    description: 'For agencies and power users requiring absolute scale.',
    limits: 'Unlimited Links',
    features: [
      'Unlimited daily link creations',
      'Unlimited monthly link creations',
      'Priority ad creative processing speed',
      'Full mockup click-to-focus interactive page access',
      '24/7 client support assistance'
    ],
    badge: 'Unrestricted',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    badgeColor: 'var(--success)'
  }
];

export default function SubscriptionPage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ account_type: 'trial', links_created: 0 });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null); // tracks clicked plan for the mock checkout modal

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUser(session.user);
      
      try {
        const profResp = await fetch(`${backendUrl}/api/user/profile/${session.user.id}`);
        const profData = await profResp.json();
        if (profData && !profData.detail) {
          setProfile(profData);
        }
        
        // Fetch plans
        const plansResp = await fetch(`${backendUrl}/api/subscription/plans`);
        const plansData = await plansResp.json();
        if (Array.isArray(plansData)) {
          setPlans(plansData);
        }
      } catch (err) {
        console.error("API error loading subscription page:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [backendUrl]);

  if (loading) {
    return (
      <div style={{ padding: '40px', color: 'var(--text-muted)', textAlign: 'center' }}>
        Loading subscription packages...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-fade-in">
      
      {/* Title Header */}
      <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <h3 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Subscription Pricing Plans</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Select the optimal plan to scale your Facebook redirection links and banner creatives.
        </p>
      </div>

      {/* Grid of Plans */}
      <div className="no-scrollbar" style={{ width: '100%', overflowX: 'auto', padding: '12px 4px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
          width: '100%',
          minWidth: '880px'
        }}>
        {(plans.length > 0 ? plans : defaultPlans).map((plan) => {
          const isActive = profile.account_type === plan.id;
          
          return (
            <div 
              key={plan.id} 
              style={{
                background: isActive ? 'rgba(99, 102, 241, 0.03)' : 'var(--panel-bg)',
                border: isActive ? '2px solid var(--primary)' : '1px solid var(--panel-border)',
                borderRadius: '16px',
                padding: '32px 24px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxShadow: isActive ? '0 8px 32px rgba(99, 102, 241, 0.1)' : '0 4px 16px rgba(0,0,0,0.2)',
                transition: 'all 0.3s ease'
              }}
            >
              {/* Badge label */}
              <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: plan.badge_bg || plan.badgeBg,
                  color: plan.badge_color || plan.badgeColor,
                  textTransform: 'uppercase'
                }}>
                  {plan.badge}
                </span>
              </div>

              {/* Package Header */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>{plan.name}</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', minHeight: '36px' }}>{plan.description}</p>
                
                <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '16px', gap: '4px' }}>
                  <span style={{ fontSize: '36px', fontWeight: '800', color: '#fff' }}>{plan.price}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/ {plan.period}</span>
                </div>
              </div>

              {/* Limit Details indicator */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--panel-border)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: '700',
                color: isActive ? 'var(--primary)' : 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '24px'
              }}>
                <Star size={14} style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)' }} />
                <span>Limit: {
                  plan.id === 'trial'
                    ? plan.limits.replace(/\b10\b/g, plan.link_limit || 10)
                    : plan.id === 'plus'
                      ? plan.limits.replace(/\b500\b/g, plan.link_limit || 500)
                      : plan.limits
                }</span>
              </div>

              {/* Features List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, marginBottom: '32px' }}>
                {plan.features.map((feat, idx) => {
                  const formattedFeat = plan.id === 'trial'
                    ? feat.replace(/\b10\b/g, plan.link_limit || 10)
                    : plan.id === 'plus'
                      ? feat.replace(/\b500\b/g, plan.link_limit || 500)
                      : feat;
                  return (
                    <div key={idx} style={{ display: 'flex', gap: '10px', fontSize: '13px' }}>
                      <Check size={16} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ color: 'var(--text-muted)' }}>{formattedFeat}</span>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Purchase CTA Action button */}
              {isActive ? (
                <button 
                  disabled 
                  className="btn btn-secondary" 
                  style={{ width: '100%', cursor: 'default', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)' }}
                >
                  <ShieldCheck size={16} /> Current Active Plan
                </button>
              ) : (
                <button 
                  onClick={() => setSelectedPlan(plan)}
                  className="btn btn-primary" 
                  style={{ width: '100%', background: plan.id === 'premium' ? 'linear-gradient(135deg, var(--accent), #f472b6)' : 'linear-gradient(135deg, var(--primary), #818cf8)', boxShadow: 'none' }}
                >
                  Buy Plan
                </button>
              )}
            </div>
          );
        })}
        </div>
      </div>

      {/* Mock Manual Checkout Activation Modal */}
      {selectedPlan && (
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
          <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.1)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto'
            }}>
              <Mail size={28} />
            </div>
            
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>Plan Purchase Requested</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.5' }}>
                Thank you for selecting the <b>{selectedPlan.name}</b>. Currently, all plan activations are processed manually by the administrator.
              </p>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--panel-border)',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '13px',
              textAlign: 'left'
            }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Please email/send your User ID to the owner:</div>
              <div style={{ fontFamily: 'monospace', fontWeight: '700', wordBreak: 'break-all', color: 'var(--primary)' }}>
                {user?.id}
              </div>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              The administrator will manually update your package in the database immediately upon request validation.
            </p>

            <button onClick={() => setSelectedPlan(null)} className="btn btn-primary" style={{ width: '100%' }}>
              Close Window
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
