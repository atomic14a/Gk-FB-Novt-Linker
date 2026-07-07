'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabase';
import { 
  Sparkles, Layers, ArrowRight, CheckCircle2, 
  MessageSquare, Compass, ShieldCheck, HelpCircle, 
  Smartphone, Cpu, BadgeDollarSign, Send, Check
} from 'lucide-react';

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

export default function LandingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      }
    };
    const fetchPlans = async () => {
      try {
        const resp = await fetch(`${backendUrl}/api/subscription/plans`);
        const data = await resp.json();
        if (Array.isArray(data)) {
          setPlans(data);
        }
      } catch (err) {
        console.error("Failed to fetch subscription plans:", err);
      }
    };
    checkUser();
    fetchPlans();
  }, [backendUrl]);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMessage) {
      setSubmitError('Please fill out all fields.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      const resp = await fetch(`${backendUrl}/api/contact/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          message: contactMessage
        })
      });
      const data = await resp.json();
      if (data.success) {
        setSubmitSuccess(true);
        setContactName('');
        setContactEmail('');
        setContactMessage('');
      } else {
        setSubmitError(data.detail || 'Failed to send message.');
      }
    } catch (err) {
      setSubmitError('Failed to connect to contact submission API. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      {/* Background Glow Elements */}
      <div style={{
        position: 'absolute',
        width: '450px',
        height: '450px',
        background: 'rgba(99, 102, 241, 0.12)',
        filter: 'blur(100px)',
        top: '-10%',
        right: '10%',
        borderRadius: '50%',
        zIndex: -1
      }}></div>
      <div style={{
        position: 'absolute',
        width: '450px',
        height: '450px',
        background: 'rgba(217, 70, 239, 0.08)',
        filter: 'blur(100px)',
        bottom: '20%',
        left: '-5%',
        borderRadius: '50%',
        zIndex: -1
      }}></div>

      {/* Header / Navbar */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 8%',
        background: 'rgba(10, 10, 16, 0.6)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--panel-border)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => router.push('/')}>
          <div style={{
            padding: '8px',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            borderRadius: '8px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={20} />
          </div>
          <span style={{ fontSize: '20px', fontWeight: '800', tracking: '-0.5px' }}>Novt Linker</span>
        </div>

        <nav style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <a href="#features" style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} className="nav-link">Features</a>
          <a href="#pricing" style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} className="nav-link">Pricing</a>
          <a href="#contact" style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} className="nav-link">Contact</a>
        </nav>

        <div>
          {user ? (
            <button 
              onClick={() => router.push('/dashboard')} 
              className="btn btn-primary"
              style={{ gap: '8px' }}
            >
              Go to Dashboard <ArrowRight size={16} />
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => router.push('/auth')} 
                className="btn btn-secondary"
                style={{ padding: '8px 20px' }}
              >
                Log In
              </button>
              <button 
                onClick={() => router.push('/auth')} 
                className="btn btn-primary"
                style={{ padding: '8px 20px' }}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        padding: '100px 8% 80px 8%',
        textAlign: 'center',
        maxWidth: '1000px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          padding: '6px 16px',
          borderRadius: '99px',
          color: '#6366f1',
          fontSize: '12px',
          fontWeight: '700',
          marginBottom: '28px'
        }} className="animate-pulse">
          <Sparkles size={14} /> Facebook Link Customization Engine
        </div>

        <h1 style={{
          fontSize: '56px',
          fontWeight: '900',
          lineHeight: '1.15',
          letterSpacing: '-1.5px',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, #ffffff 30%, #a855f7 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Create High-Converting Facebook Banners In Seconds
        </h1>
        
        <p style={{
          fontSize: '18px',
          color: 'var(--text-muted)',
          maxWidth: '720px',
          lineHeight: '1.6',
          marginBottom: '40px'
        }}>
          Fit, pad, and preview your redirect link cards natively on Meta feeds. Bypass image aspect ratio boundaries automatically using blurred border padding and customized Call-to-Action buttons.
        </p>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '60px' }}>
          <button 
            onClick={() => router.push(user ? '/dashboard' : '/auth')} 
            className="btn btn-primary"
            style={{ padding: '14px 32px', fontSize: '15px', gap: '8px' }}
          >
            Start Free Trial ({plans.find(p => p.id === 'trial')?.link_limit || '10'} Links) <ArrowRight size={18} />
          </button>
          <a 
            href="#features" 
            className="btn btn-secondary"
            style={{ padding: '14px 32px', fontSize: '15px' }}
          >
            Learn More
          </a>
        </div>

        {/* Visual Mockup Comparison Slider */}
        <div className="glass-panel" style={{
          width: '100%',
          padding: '24px',
          border: '1px solid var(--panel-border)',
          borderRadius: '20px',
          background: 'rgba(10, 10, 16, 0.4)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Standard Post */}
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', background: '#ef4444', borderRadius: '50%' }}></span> Standard Facebook Link
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '12px',
                padding: '12px',
                flex: 1
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#333' }}></div>
                  <div>
                    <div style={{ width: '80px', height: '8px', background: '#333', borderRadius: '4px', marginBottom: '4px' }}></div>
                    <div style={{ width: '50px', height: '6px', background: '#222', borderRadius: '4px' }}></div>
                  </div>
                </div>
                <div style={{ width: '100%', height: '150px', background: '#1c1d24', border: '1px dashed #333', borderRadius: '8px', display: 'flex', alignItems: 'center', justify: 'center', color: '#666', fontSize: '11px', justifyContent: 'center' }}>
                  [ UGLY CROPPED OR STRETCHED IMAGE ]
                </div>
                <div style={{ padding: '8px', background: '#13151a', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', marginTop: '4px' }}>
                  <div style={{ width: '40px', height: '6px', background: '#444', borderRadius: '3px', marginBottom: '4px' }}></div>
                  <div style={{ width: '90%', height: '8px', background: '#555', borderRadius: '4px' }}></div>
                </div>
              </div>
            </div>

            {/* Lyncify Optimized Post */}
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }} className="animate-pulse"></span> Novt Linker Optimized Banner
              </div>
              <div style={{
                background: 'rgba(99, 102, 241, 0.03)',
                border: '1px solid rgba(99, 102, 241, 0.15)',
                borderRadius: '12px',
                padding: '12px',
                flex: 1
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }}></div>
                  <div>
                    <div style={{ width: '80px', height: '8px', background: '#6366f1', borderRadius: '4px', marginBottom: '4px' }}></div>
                    <div style={{ width: '50px', height: '6px', background: 'rgba(99, 102, 241, 0.5)', borderRadius: '4px' }}></div>
                  </div>
                </div>
                {/* Simulated blurred-padded image */}
                <div style={{ 
                  width: '100%', 
                  height: '150px', 
                  background: 'linear-gradient(90deg, rgba(99,102,241,0.2) 0%, rgba(10,10,16,1) 50%, rgba(99,102,241,0.2) 100%)', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  color: '#fff', 
                  fontSize: '11px',
                  fontWeight: '600',
                  justifyContent: 'center',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  boxShadow: 'inset 0 0 20px rgba(99,102,241,0.3)'
                }}>
                  [ AUTOMATIC BLUR-PADDED BANNER ]
                </div>
                <div style={{ 
                  padding: '8px 12px', 
                  background: 'rgba(99, 102, 241, 0.05)', 
                  borderBottomLeftRadius: '8px', 
                  borderBottomRightRadius: '8px', 
                  marginTop: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ width: '50px', height: '6px', background: 'rgba(99, 102, 241, 0.6)', borderRadius: '3px', marginBottom: '4px' }}></div>
                    <div style={{ width: '120px', height: '8px', background: '#fff', borderRadius: '4px' }}></div>
                  </div>
                  <div style={{
                    padding: '4px 10px',
                    background: '#6366f1',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '9px',
                    fontWeight: '800',
                    letterSpacing: '0.5px'
                  }}>
                    DOWNLOAD
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" style={{
        padding: '80px 8%',
        background: 'rgba(255, 255, 255, 0.01)',
        borderTop: '1px solid var(--panel-border)',
        borderBottom: '1px solid var(--panel-border)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '12px' }}>Standard-Setting Key Features</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Engineered to give your affiliate links, app downloads, and file promotions maximum CTR</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px', transition: 'transform 0.2s' }}>
            <div style={{ color: '#6366f1', marginBottom: '16px' }}><Cpu size={28} /></div>
            <h4 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Auto-Dimension Padding</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5' }}>
              Upload any image banner. Novt Linker automatically resizes it to the exact 600x315 Meta specifications, adding blurred padded borders so nothing is cut off.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px', transition: 'transform 0.2s' }}>
            <div style={{ color: '#a855f7', marginBottom: '16px' }}><Compass size={28} /></div>
            <h4 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Unpublished Dark Posts</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5' }}>
              Create and manage unpublished link preview ads. Perfect for generating clean shareable URLs without cluttering your main profile or business page feed.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px', transition: 'transform 0.2s' }}>
            <div style={{ color: '#ec4899', marginBottom: '16px' }}><Layers size={28} /></div>
            <h4 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Action Buttons (CTA)</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5' }}>
              Attach customizable call-to-action overlays directly onto your link previews. Support for DOWNLOAD, LEARN_MORE, CONTACT_US, and more.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px', transition: 'transform 0.2s' }}>
            <div style={{ color: '#10b981', marginBottom: '16px' }}><ShieldCheck size={28} /></div>
            <h4 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Supabase-Secure Access</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5' }}>
              Your credentials, Facebook access tokens, and raw cookies are encrypted and secured behind Supabase RLS policies and schema partitions.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards Section */}
      <section id="pricing" style={{ padding: '80px 24px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '12px' }}>Simple, Uncomplicated Pricing</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Start testing with our fully-featured trial, upgrade when you are ready to scale</p>
        </div>

        <div className="no-scrollbar" style={{ width: '100%', overflowX: 'auto', padding: '12px 4px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '24px', 
            width: '100%',
            minWidth: '880px'
          }}>
          {(plans.length > 0 ? plans : defaultPlans).map((plan) => {
            const isPremium = plan.id === 'premium';
            const isPlus = plan.id === 'plus';
            
            return (
              <div 
                key={plan.id}
                className="glass-panel" 
                style={{ 
                  padding: '32px 24px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  border: isPlus ? '2px solid var(--primary)' : isPremium ? '2px solid var(--accent)' : '1px solid var(--panel-border)',
                  background: isPlus ? 'rgba(99, 102, 241, 0.02)' : isPremium ? 'rgba(217, 70, 239, 0.02)' : 'var(--panel-bg)',
                  position: 'relative',
                  boxShadow: isPlus ? '0 8px 32px rgba(99, 102, 241, 0.1)' : isPremium ? '0 8px 32px rgba(217, 70, 239, 0.1)' : '0 4px 16px rgba(0,0,0,0.2)'
                }}
              >
                {plan.badge && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '24px',
                    background: plan.id === 'premium' ? 'linear-gradient(135deg, var(--accent), #f472b6)' : plan.id === 'plus' ? 'linear-gradient(135deg, var(--primary), #818cf8)' : 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '4px 12px',
                    borderRadius: '99px',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase'
                  }}>
                    {plan.badge}
                  </div>
                )}

                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>{plan.name}</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', minHeight: '36px' }}>{plan.description}</p>
                  
                  <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '16px', gap: '4px' }}>
                    <span style={{ fontSize: '36px', fontWeight: '800', color: '#fff' }}>{plan.price}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/ {plan.period}</span>
                  </div>
                </div>

                {/* Limit badge */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: isPlus ? 'var(--primary)' : isPremium ? 'var(--accent)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '20px'
                }}>
                  <span>Limit: {
                    plan.id === 'trial'
                      ? plan.limits.replace(/\b10\b/g, plan.link_limit || 10)
                      : plan.id === 'plus'
                        ? plan.limits.replace(/\b500\b/g, plan.link_limit || 500)
                        : plan.limits
                  }</span>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {plan.features.map((feat, idx) => {
                    const formattedFeat = plan.id === 'trial'
                      ? feat.replace(/\b10\b/g, plan.link_limit || 10)
                      : plan.id === 'plus'
                        ? feat.replace(/\b500\b/g, plan.link_limit || 500)
                        : feat;
                    return (
                      <li key={idx} style={{ display: 'flex', gap: '10px', fontSize: '13px', alignItems: 'flex-start' }}>
                        <CheckCircle2 size={16} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ color: 'var(--text-muted)' }}>{formattedFeat}</span>
                      </li>
                    );
                  })}
                </ul>

                <button 
                  onClick={() => router.push(user ? '/dashboard' : '/auth')} 
                  className="btn btn-primary" 
                  style={{ 
                    width: '100%', 
                    background: plan.id === 'trial' ? 'rgba(255, 255, 255, 0.05)' : plan.id === 'premium' ? 'linear-gradient(135deg, var(--accent), #f472b6)' : 'linear-gradient(135deg, var(--primary), #818cf8)',
                    color: plan.id === 'trial' ? 'var(--text-main)' : '#fff',
                    border: plan.id === 'trial' ? '1px solid var(--panel-border)' : 'none',
                    boxShadow: plan.id === 'trial' ? 'none' : undefined
                  }}
                >
                  {plan.id === 'trial' ? 'Sign Up Free' : 'Get Started Now'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      </section>

      {/* Contact Section */}
      <section id="contact" style={{ 
        padding: '80px 24px', 
        background: 'rgba(255,255,255,0.01)', 
        borderTop: '1px solid var(--panel-border)',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '12px' }}>Have Any Questions?</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Send us a message and Master Zain will get back to you shortly</p>
        </div>

        <div className="glass-panel" style={{ padding: '32px' }}>
          {submitSuccess ? (
            <div style={{
              textAlign: 'center',
              padding: '24px 0',
              color: '#10b981',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                padding: '12px',
                background: 'rgba(16, 185, 129, 0.1)',
                borderRadius: '50%',
                display: 'inline-flex'
              }}>
                <Check size={28} />
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: '700' }}>Message Sent Successfully!</h4>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Thank you for reaching out. We will review your message and reply via email.</p>
              <button 
                type="button" 
                onClick={() => setSubmitSuccess(false)}
                className="btn btn-secondary"
                style={{ marginTop: '16px' }}
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit}>
              {submitError && (
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  borderRadius: '10px',
                  fontSize: '14px',
                  marginBottom: '20px'
                }}>
                  {submitError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="Zain Ali"
                  className="form-input"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="zain@example.com"
                  className="form-input"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Message Details</label>
                <textarea 
                  required
                  placeholder="Hey, how can I upgrade my account or customize the buttons?"
                  className="form-textarea"
                  style={{ minHeight: '120px' }}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '12px', gap: '8px' }}
                disabled={submitting}
              >
                <Send size={16} /> {submitting ? 'Sending Message...' : 'Submit Contact Message'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '40px 8%',
        background: 'rgba(10, 10, 16, 0.9)',
        borderTop: '1px solid var(--panel-border)',
        textAlign: 'center',
        marginTop: '80px'
      }}>
        <div 
          onClick={() => {
            router.push('/');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '16px', cursor: 'pointer' }}
          title="Novt Linker Home"
        >
          <Sparkles size={16} style={{ color: '#6366f1' }} />
          <span style={{ fontSize: '16px', fontWeight: '800' }}>Novt Linker</span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px', fontWeight: '600' }}>
          This project is created by Novatix Solution
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
          © {new Date().getFullYear()} Novt Linker. Managed by Master Zain. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
