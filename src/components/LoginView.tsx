/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Key, ShieldAlert, Globe, Eye, EyeOff } from 'lucide-react';
import { Employee, Tenant } from '../types';
import { StorageService } from '../services/db';

interface LoginViewProps {
  tenant: Tenant;
  onLoginSuccess: (emp: Employee) => void;
  language: 'ar' | 'en';
  setLanguage: (lang: 'ar' | 'en') => void;
  onAddNotification: (msgAr: string, msgEn: string, type: 'info' | 'success' | 'warning') => void;
}

export default function LoginView({
  tenant,
  onLoginSuccess,
  language,
  setLanguage,
  onAddNotification
}: LoginViewProps) {
  const isRtl = language === 'ar';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimeLeft(prev => {
        if (prev <= 1) {
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimeLeft]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lockoutTimeLeft > 0) {
      onAddNotification(
        `النظام مقفل مؤقتاً! يرجى الانتظار ${lockoutTimeLeft} ثانية.`,
        `System locked! Please wait ${lockoutTimeLeft} seconds.`,
        'warning'
      );
      return;
    }

    if (!username.trim() || !password.trim()) {
      onAddNotification(
        'يرجى كتابة اسم المستخدم وكلمة المرور',
        'Please enter username and password',
        'warning'
      );
      return;
    }

    try {
      const matched = await StorageService.login(username.trim(), password.trim());

      if (matched.status === 'suspended') {
        onAddNotification(
          'هذا الحساب موقوف من قبل الإدارة العليا!',
          'This account has been suspended by the management!',
          'warning'
        );
        return;
      }

      StorageService.addAuditLog(
        matched.tenantId || tenant.id,
        matched.username || 'unknown',
        `Logged in successfully via PostgreSQL authentication`
      );
      onLoginSuccess(matched);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      const isInvalidCredentials = /invalid username|invalid email|password/i.test(message);
      const userMessageAr = isInvalidCredentials
        ? 'اسم المستخدم أو كلمة المرور غير صحيحة. حاول مرة أخرى.'
        : 'تعذر تسجيل الدخول حالياً. تحقق من اتصال الإنترنت وحاول مرة أخرى.';
      const userMessageEn = isInvalidCredentials
        ? 'Invalid username or password. Please try again.'
        : 'Unable to sign in right now. Check your network and try again.';

      onAddNotification(userMessageAr, userMessageEn, 'warning');

      if (import.meta.env.DEV) {
        console.warn('Login failed', message);
      }
    }

    const newFailed = failedAttempts + 1;
    setFailedAttempts(newFailed);

    if (newFailed >= 5) {
      setLockoutTimeLeft(60);
      StorageService.addAuditLog(
        tenant.id,
        username || 'guest',
        `Account lockout triggered due to 5 failed login attempts`
      );
      onAddNotification(
        'تم قفل النظام لحمايتك! تم حظر المحاولات لـ 60 ثانية بسبب تكرار الفشل.',
        'Account locked for 60 seconds due to 5 consecutive failures.',
        'warning'
      );
    } else {
      onAddNotification(
        `بيانات الدخول خاطئة! المحاولات المتبقية قبل القفل: ${5 - newFailed}`,
        `Invalid credentials! Attempts remaining before lockout: ${5 - newFailed}`,
        'warning'
      );
    }
  };

  // Password reset and development-only demo login features were removed to keep production login flow focused.
  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-between p-6 relative overflow-hidden font-sans select-none selection:bg-orange-500/30 selection:text-orange-200">
      
      {/* Absolute Cinematic Glowing Backdrops */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#141923_1px,transparent_1px),linear-gradient(to_bottom,#141923_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 z-0"></div>

      {/* Immersive background glow elements */}
      <div className="absolute top-[-25%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-orange-600/10 blur-[130px] pointer-events-none animate-glow-slow-1"></div>
      <div className="absolute bottom-[-15%] right-[-15%] w-[60vw] h-[60vw] rounded-full bg-amber-500/8 blur-[150px] pointer-events-none animate-glow-slow-2"></div>

      {/* Language / Header Row */}
      <header className="relative z-10 w-full flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3.5 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 flex items-center justify-center text-2xl shadow-2xl relative">
            <div className="absolute inset-[-1px] bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl blur-sm opacity-20"></div>
            <span className="relative z-10">{tenant.logoUrl || '🍔'}</span>
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white tracking-wide uppercase shimmer-text">
              {isRtl ? tenant.nameAr : tenant.nameEn}
            </h1>
            <span className="text-[9px] text-slate-500 block font-mono tracking-widest mt-0.5">ERP SAAS ENGINE v4.0 • HIGHLY SECURE</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className="p-2 px-4 rounded-xl bg-slate-900/60 border border-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-2 transition duration-200 active:scale-95 cursor-pointer shadow-md"
        >
          <Globe className="w-3.5 h-3.5 text-amber-500" />
          <span>{language === 'ar' ? 'English' : 'العربية'}</span>
        </button>
      </header>

      {/* Main Authentication Card */}
      <main className="relative z-10 my-auto flex items-center justify-center py-10">
        <div className="w-full max-w-md bg-[#0c101b]/70 backdrop-blur-2xl border border-slate-850/80 p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          {/* Top Lock status bar or brand text */}
          <div className="flex flex-col items-center text-center mb-7">
            <div className={`w-14 h-14 rounded-2xl ${lockoutTimeLeft > 0 ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500' : 'bg-orange-500/10 border border-orange-500/25 text-orange-400'} flex items-center justify-center mb-4 relative shadow-inner`}>
              <Key className="w-5.5 h-5.5" />
              {lockoutTimeLeft > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse">
                  {lockoutTimeLeft}s
                </span>
              )}
            </div>

            <h2 className="text-xl font-black text-white tracking-tight">
              {isRtl ? 'منصة الدخول الموحد للفرع' : 'Unified Staff ERP Login'}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-[300px] leading-relaxed">
              {isRtl ? 'بوابة التحقق السحابي الآمن لكافة موظفي الفرع والصالة' : 'Authorized workspace for authenticated operations'}
            </p>
          </div>

          {/* Form wrapper */}
          <form onSubmit={handleLoginSubmit} className="space-y-4.5" aria-label="Login form">
              
              {lockoutTimeLeft > 0 && (
                <div role="alert" className="p-4 bg-rose-950/20 border border-rose-900/30 rounded-2xl flex items-start gap-3">
                  <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="text-[10px] text-rose-200">
                    <p className="font-bold">{isRtl ? 'تم قفل محاولات الدخول مؤقتاً' : 'Login Locked Temporarily'}</p>
                    <p className="opacity-80 mt-0.5">
                      {isRtl 
                        ? `لقد أدخلت كلمة مرور خاطئة 5 مرات متتالية. يرجى الانتظار ${lockoutTimeLeft} ثانية لفك القفل.` 
                        : `You have failed logins 5 times. Please wait ${lockoutTimeLeft}s before trying again.`
                      }
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="login-username" className="text-[11px] font-extrabold text-slate-300 block uppercase tracking-wider">
                  {isRtl ? 'اسم المستخدم المسجل (Username):' : 'Authorized Username:'}
                </label>
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  disabled={lockoutTimeLeft > 0}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-850 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 rounded-xl px-4 py-3.5 text-xs text-white focus:outline-none transition font-mono shadow-inner"
                  placeholder={isRtl ? 'أدخل اسم المستخدم... مثل ali' : 'e.g. ali'}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password" className="text-[11px] font-extrabold text-slate-300 block uppercase tracking-wider">
                  {isRtl ? 'كلمة المرور المشفرة (Password):' : 'Secure Password:'}
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    disabled={lockoutTimeLeft > 0}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-850 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 rounded-xl px-4 py-3.5 text-xs text-white focus:outline-none transition font-mono pr-10 shadow-inner"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 hover:text-slate-200 transition"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={lockoutTimeLeft > 0}
                className={`w-full py-3.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition text-white shadow-lg cursor-pointer ${
                  lockoutTimeLeft > 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50 shadow-none'
                    : 'bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 shadow-[0_4px_25px_rgba(249,115,22,0.3)] active:scale-98'
                }`}
              >
                <Key className="w-4 h-4" />
                <span>{isRtl ? 'تأكيد الدخول الموثق للفرع' : 'Access Secure ERP Workspace'}</span>
              </button>

              <div className="pt-2"></div>

            </form>

        </div>
      </main>

      {/* Footer Credentials Info Banner */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto border-t border-slate-850/60 pt-4 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-slate-500">
        <div>
          <p>© 2026 RESTO-ERP Systems SAAS platform. All server-side credentials and transactions are encrypted.</p>
        </div>
      </footer>

    </div>
  );
}
