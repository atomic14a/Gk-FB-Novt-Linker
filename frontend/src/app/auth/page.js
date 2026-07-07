'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabase';
import { LogIn, UserPlus, Key, Mail, Sparkles, ShieldCheck, User } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dashboard');
      }
    };
    checkUser();
  }, [router]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isLogin) {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
      } else {
        // Sign Up
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: fullName
            }
          }
        });
        if (error) throw error;
        setSuccessMsg('Account created successfully! Check your email for confirmation, then log in.');
        setIsLogin(true);
      }
    } catch (err) {
      console.error("Auth error details:", err);
      const msg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      setErrorMsg(msg === '{}' ? 'Database configuration error (e.g. database trigger failed). Please verify your tables and profiles trigger.' : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } catch (err) {
      console.error("Google login error:", err);
      setErrorMsg(err.message || 'Failed to initialize Google login.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative'
    }}>
      {/* Background Orbs */}
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        background: 'rgba(99, 102, 241, 0.15)',
        filter: 'blur(80px)',
        top: '20%',
        left: '25%',
        borderRadius: '50%',
        zIndex: -1
      }}></div>
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        background: 'rgba(217, 70, 239, 0.12)',
        filter: 'blur(80px)',
        bottom: '20%',
        right: '25%',
        borderRadius: '50%',
        zIndex: -1
      }}></div>

      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div 
            onClick={() => router.push('/')}
            style={{
              display: 'inline-flex',
              padding: '12px',
              background: 'rgba(99, 102, 241, 0.1)',
              borderRadius: '12px',
              color: '#6366f1',
              marginBottom: '16px',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              cursor: 'pointer'
            }}
            title="Novt Linker Home"
          >
            <Sparkles size={28} />
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '8px' }}>
            {isLogin ? 'Welcome Back' : 'Create SaaS Account'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {isLogin ? 'Log in to manage your ad creative posts' : 'Get started with a free trial of 10 links'}
          </p>
        </div>

        {errorMsg && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            borderRadius: '10px',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: '#10b981',
            borderRadius: '10px',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleAuth}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }} />
                <input
                  type="text"
                  required={!isLogin}
                  className="form-input"
                  style={{ paddingLeft: '44px' }}
                  placeholder="Zain Ali"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }} />
              <input
                type="email"
                required
                className="form-input"
                style={{ paddingLeft: '44px' }}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Key size={18} style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }} />
              <input
                type="password"
                required
                className="form-input"
                style={{ paddingLeft: '44px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px' }} disabled={loading}>
            {loading ? 'Authenticating...' : (
              isLogin ? (
                <>
                  <LogIn size={18} /> Log In
                </>
              ) : (
                <>
                  <UserPlus size={18} /> Register Account
                </>
              )
            )}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '10px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }}></div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }}></div>
        </div>

        <button 
          type="button" 
          onClick={handleGoogleLogin} 
          className="btn btn-secondary" 
          style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
          disabled={loading}
        >
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          Continue with Google
        </button>

        <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid var(--panel-border)', paddingTop: '20px' }}>
          <button
            onClick={() => setIsLogin(!isLogin)}
            style={{
              background: 'none',
              border: 'none',
              color: '#6366f1',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '12px'
            }}
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
          </button>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            This project is created by Novatix Solution
          </div>
        </div>
      </div>
    </div>
  );
}
