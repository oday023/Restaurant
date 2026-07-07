/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import {
  TrendingUp, ShoppingCart, ChefHat, QrCode, Grid, Warehouse, DollarSign, Users, Award, ShieldAlert,
  Globe, Info, Check, LogOut, RefreshCw, Key, X, User, Menu
} from 'lucide-react';

import { StorageService } from './services/db';
import { Tenant, Role, Employee } from './types';

import ErrorBoundary from './components/ErrorBoundary';

const DashboardView = React.lazy(() => import('./components/DashboardView'));
const POSView = React.lazy(() => import('./components/POSView'));
const KDSView = React.lazy(() => import('./components/KDSView'));
const QRMenuView = React.lazy(() => import('./components/QRMenuView'));
const TablesView = React.lazy(() => import('./components/TablesView'));
const InventoryView = React.lazy(() => import('./components/InventoryView'));
const AccountingView = React.lazy(() => import('./components/AccountingView'));
const StaffView = React.lazy(() => import('./components/StaffView'));
const CRMView = React.lazy(() => import('./components/CRMView'));
const SystemAdminView = React.lazy(() => import('./components/SystemAdminView'));
const LoginView = React.lazy(() => import('./components/LoginView'));

interface AppNotification {
  id: string;
  msgAr: string;
  msgEn: string;
  type: 'info' | 'success' | 'warning';
}

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  super_admin: ['dashboard', 'pos', 'kds', 'qrmenu', 'tables', 'inventory', 'accounting', 'staff', 'crm', 'saas_admin'],
  owner: ['dashboard', 'pos', 'kds', 'qrmenu', 'tables', 'inventory', 'accounting', 'staff', 'crm'],
  manager: ['dashboard', 'pos', 'kds', 'qrmenu', 'tables', 'inventory', 'crm', 'staff'],
  accountant: ['accounting', 'dashboard'],
  hr_manager: ['staff', 'dashboard'],
  inventory_manager: ['inventory', 'dashboard'],
  cashier: ['pos', 'qrmenu', 'tables'],
  waiter: ['pos', 'qrmenu', 'tables'],
  kitchen: ['kds'],
  customer: ['qrmenu'],
  cleaner: [],
  security: [],
  other: [],
};

export default function App() {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const isRtl = language === 'ar';

  // Session State
  const [loggedInEmployee, setLoggedInEmployee] = useState<Employee | null>(null);
  const [activeRole, setActiveRole] = useState<Role>('owner');
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Multi-branch state
  const [selectedBranchId, setSelectedBranchId] = useState<string>('b1_1');

  // User Profile modal state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profilePassword, setProfilePassword] = useState('');

  // Toast notifications
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const handleAddNewNotification = (msgAr: string, msgEn: string, type: 'info' | 'success' | 'warning') => {
    const alertId = `${Date.now()}-${Math.random()}`;
    setNotifications(prev => [...prev, { id: alertId, msgAr, msgEn, type }]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== alertId));
    }, 4500);
  };

  const [isDataReady, setIsDataReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const restored = await StorageService.restoreSession().catch((error) => {
        if (import.meta.env.DEV) {
          console.warn('Session restore failed.', error);
        }
        return null;
      });
      if (restored) {
        setLoggedInEmployee(restored);
        setActiveRole(restored.role);
        setSelectedBranchId(restored.branchId || 'b1_1');
      }
      setIsDataReady(true);
    })();
  }, []);

  const tenants = useMemo(() => StorageService.getTenants(), [isDataReady]);
  const defaultTenant = useMemo(() => {
    if (loggedInEmployee && loggedInEmployee.tenantId) {
      const matchedTenant = tenants.find(t => t.id === loggedInEmployee.tenantId);
      if (matchedTenant) return matchedTenant;
    }
    return tenants[0] || ({
      id: 't1',
      nameAr: 'شاورما وجريل الفاخر',
      nameEn: 'Shawarma & Grill Premium',
      subscriptionPlan: 'pro',
      logoUrl: '🍔',
      currencyAr: 'ر.س',
      currencyEn: 'SAR',
      taxPercent: 15,
      servicePercent: 0,
      status: 'active',
      address: '',
      email: '',
      phone: '',
      createdAt: new Date().toISOString(),
    } as Tenant);
  }, [tenants, loggedInEmployee]);

  const branches = useMemo(() => {
    const list = StorageService.getBranches();
    return list.filter((b) => b.tenantId === defaultTenant.id);
  }, [defaultTenant.id, isDataReady]);

  const currentBranch = useMemo(() => {
    return branches.find(b => b.id === selectedBranchId) || branches[0] || {
      id: 'b1_1',
      tenantId: defaultTenant.id,
      nameAr: 'فرع السليمانية - الرياض',
      nameEn: 'Al-Sulaimania Branch - Riyadh',
      city: 'Riyadh',
      address: 'طريق الملك عبدالعزيز، حي السليمانية',
      phone: '0112445566',
      status: 'active' as const
    };
  }, [branches, selectedBranchId, defaultTenant.id]);

  // Lock standard employees to their assigned branchId
  useEffect(() => {
    if (loggedInEmployee && !['super_admin', 'owner'].includes(loggedInEmployee.role)) {
      if (loggedInEmployee.branchId && loggedInEmployee.branchId !== selectedBranchId) {
        setSelectedBranchId(loggedInEmployee.branchId);
      }
    }
  }, [loggedInEmployee, selectedBranchId]);

  const tables = useMemo(() => StorageService.getTables(currentBranch.id), [currentBranch.id]);

  const roleMetadata = {
    super_admin: { name: isRtl ? 'مشرف المنصة الكلي' : 'Super Admin', color: 'bg-gradient-to-r from-red-600 to-amber-600 text-white border border-red-500/30' },
    owner: { name: isRtl ? 'مالك المطعم الأونر' : 'Restaurant Owner', color: 'bg-gradient-to-r from-amber-600 to-yellow-500 text-white border border-amber-500/30' },
    manager: { name: isRtl ? 'مدير الفرع العام' : 'Store Manager', color: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border border-blue-500/30' },
    accountant: { name: isRtl ? 'المحاسب المالي' : 'Accountant', color: 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white border border-teal-500/30' },
    hr_manager: { name: isRtl ? 'مدير الموارد البشرية' : 'HR Manager', color: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border border-purple-500/30' },
    inventory_manager: { name: isRtl ? 'أمين المستودع' : 'Inventory Manager', color: 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white border border-cyan-500/30' },
    cashier: { name: isRtl ? 'موظف الكاشير POS' : 'POS Cashier', color: 'bg-gradient-to-r from-orange-600 to-rose-600 text-white border border-orange-500/30' },
    waiter: { name: isRtl ? 'كابتن الصالة ويتر' : 'Table Waiter', color: 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white border border-emerald-500/30' },
    kitchen: { name: isRtl ? 'طاهي المطبخ الشيف' : 'Kitchen Chef', color: 'bg-gradient-to-r from-rose-600 to-red-500 text-white border border-rose-500/30' },
    customer: { name: isRtl ? 'العميل المباشر' : 'Walk-in Customer', color: 'bg-slate-800 text-slate-200 border border-slate-700' },
    cleaner: { name: 'Auxiliary Staff', color: 'bg-slate-800 text-slate-400' },
    security: { name: 'Security staff', color: 'bg-slate-800 text-slate-400' },
    other: { name: 'Other services', color: 'bg-slate-800 text-slate-400' },
  };

  const navTabs = [
    { id: 'dashboard', icon: TrendingUp, labelAr: 'لوحة الأداء والذكاء', labelEn: 'SaaS Analytics', roles: ROLE_PERMISSIONS },
    { id: 'pos', icon: ShoppingCart, labelAr: 'كاشير المبيعات POS', labelEn: 'Cashier POS', roles: ROLE_PERMISSIONS },
    { id: 'kds', icon: ChefHat, labelAr: 'شاشة المطبخ KDS', labelEn: 'Kitchen Monitor', roles: ROLE_PERMISSIONS },
    { id: 'qrmenu', icon: QrCode, labelAr: 'ركن طلبات كيو آر', labelEn: 'Customer QR Menu', roles: ROLE_PERMISSIONS },
    { id: 'tables', icon: Grid, labelAr: 'تخطيط الصالة والطاولات', labelEn: 'Floor Map & Tables', roles: ROLE_PERMISSIONS },
    { id: 'inventory', icon: Warehouse, labelAr: 'المستودعات والوصفات', labelEn: 'Inventory Recipe costing', roles: ROLE_PERMISSIONS },
    { id: 'accounting', icon: DollarSign, labelAr: 'الخزينة والحسابات', labelEn: 'Double-entry GL', roles: ROLE_PERMISSIONS },
    { id: 'staff', icon: Users, labelAr: 'الموظفين والرواتب الموحدة', labelEn: 'HR Staff & Payroll', roles: ROLE_PERMISSIONS },
    { id: 'crm', icon: Award, labelAr: 'نظام ولاء العملاء والعروض', labelEn: 'CRM Promos & Loyalty', roles: ROLE_PERMISSIONS },
    { id: 'saas_admin', icon: ShieldAlert, labelAr: 'إدارة المنصة SaaS', labelEn: 'Multi-Tenant SaaS Admin', roles: ROLE_PERMISSIONS },
  ];

  // RBAC Gating
  const currentAllowedTabs = useMemo(() => {
    const allowedIds = ROLE_PERMISSIONS[activeRole] || [];
    return navTabs.filter(tab => allowedIds.includes(tab.id));
  }, [activeRole]);

  useEffect(() => {
    if (!currentAllowedTabs.some(t => t.id === activeTab)) {
      if (currentAllowedTabs.length > 0) {
        setActiveTab(currentAllowedTabs[0].id);
      }
    }
  }, [activeRole, currentAllowedTabs, activeTab]);

  useEffect(() => {
    if (window.innerWidth >= 768) {
      setIsSidebarOpen(false);
    }
  }, [activeTab]);

  const handleOpenProfile = () => {
    if (!loggedInEmployee) return;
    setProfileName(loggedInEmployee.name);
    setProfileEmail(loggedInEmployee.email);
    setProfilePhone(loggedInEmployee.phone);
    setProfilePassword(loggedInEmployee.password || '');
    setIsProfileOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedInEmployee) return;

    const oldEmp = { ...loggedInEmployee };
    const updated: Employee = {
      ...loggedInEmployee,
      name: profileName.trim(),
      email: profileEmail.trim(),
      phone: profilePhone.trim(),
      password: profilePassword.trim() || undefined
    };

    await StorageService.saveEmployee(updated);
    setLoggedInEmployee(updated);
    setIsProfileOpen(false);

    await StorageService.addAuditLog(
      defaultTenant.id,
      loggedInEmployee.username || 'unknown',
      `Updated user profile settings (Name/Password changed)`,
      oldEmp,
      updated
    );

    handleAddNewNotification(
      'تم تحديث ملفك الشخصي المشفر وكلمة المرور بنجاح!',
      'Profile information and secure password updated successfully!',
      'success'
    );
  };

  const renderActiveModule = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView tenant={defaultTenant} language={language} />;
      case 'pos':
        return <POSView tenant={defaultTenant} branch={currentBranch} language={language} onAddNotification={handleAddNewNotification} />;
      case 'kds':
        return <KDSView tenant={defaultTenant} language={language} onAddNotification={handleAddNewNotification} />;
      case 'qrmenu':
        return <QRMenuView tenant={defaultTenant} tables={tables} language={language} onAddNotification={handleAddNewNotification} />;
      case 'tables':
        return <TablesView branchId={currentBranch.id} language={language} onAddNotification={handleAddNewNotification} />;
      case 'inventory':
        return <InventoryView tenantId={defaultTenant.id} language={language} onAddNotification={handleAddNewNotification} />;
      case 'accounting':
        return <AccountingView tenant={defaultTenant} branch={currentBranch} language={language} onAddNotification={handleAddNewNotification} />;
      case 'staff':
        return <StaffView tenantId={defaultTenant.id} language={language} onAddNotification={handleAddNewNotification} currentUserRole={activeRole} />;
      case 'crm':
        return <CRMView tenantId={defaultTenant.id} language={language} onAddNotification={handleAddNewNotification} />;
      case 'saas_admin':
        return <SystemAdminView language={language} onAddNotification={handleAddNewNotification} />;
      default:
        return (
          <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-slate-800/70 bg-slate-950/40 p-6 text-center text-sm text-slate-400">
            {isRtl ? 'لا توجد وحدة متاحة في هذا العرض حالياً.' : 'No module is available in this view right now.'}
          </div>
        );
    }
  };

  const handleEmployeeLogout = async () => {
    if (loggedInEmployee) {
      await StorageService.addAuditLog(
        defaultTenant.id,
        loggedInEmployee.username || 'unknown',
        `Logged out from the system successfully`
      );
      handleAddNewNotification(
        `مع السلامة يا ${loggedInEmployee.name}! تم تسجيل الخروج بنجاح`,
        `Goodbye ${loggedInEmployee.name}! Logged out successfully`,
        'info'
      );
    }
    await StorageService.logout();
    setLoggedInEmployee(null);
  };

  // If session is empty, render beautiful login portal
  if (!isDataReady) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-slate-200">
        <div className="text-center space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 animate-pulse">
            <RefreshCw className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium">Loading platform data...</p>
          <p className="text-xs text-slate-400">Waiting for API/local store initialization.</p>
        </div>
      </div>
    );
  }

  if (!loggedInEmployee) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-slate-200">
          <div className="text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 animate-pulse">
              <RefreshCw className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium">Loading login module...</p>
          </div>
        </div>
      }>
        <LoginView
          tenant={defaultTenant}
          language={language}
          setLanguage={setLanguage}
          onAddNotification={handleAddNewNotification}
          onLoginSuccess={(emp) => {
            setLoggedInEmployee(emp);
            setActiveRole(emp.role);
            setSelectedBranchId(emp.branchId || 'b1_1');
            handleAddNewNotification(
              `أهلاً بك ${emp.name}! تم تسجيل دخولك بنجاح بصفتك (${emp.role})`,
              `Welcome ${emp.name}! Logged in successfully as (${emp.role})`,
              'success'
            );
          }}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans relative overflow-hidden selection:bg-orange-500/30 selection:text-orange-200" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Immersive background glow elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-orange-600/10 blur-[130px] pointer-events-none animate-glow-slow-1"></div>
      <div className="absolute bottom-[-10%] right-[-15%] w-[60vw] h-[60vw] rounded-full bg-amber-500/8 blur-[150px] pointer-events-none animate-glow-slow-2"></div>

      {/* 1. TOP FLOATING GLASS APP BAR */}
      <header className="bg-[#0b0f19]/70 backdrop-blur-xl border-b border-slate-800/60 px-4 md:px-8 py-3.5 sticky top-0 z-40 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-4 transition-all">
        
        {/* Left Part: Luxury Brand with ambient light glow */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4 relative">
          <div className="flex items-center gap-3">
            {/* Hamburger Button for Mobile */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 text-slate-300 hover:text-white md:hidden cursor-pointer active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              aria-label="Toggle navigation menu"
              aria-expanded={isSidebarOpen}
              aria-controls="app-sidebar"
            >
              <Menu className="w-5 h-5 text-orange-500" />
            </button>

            <div className="relative group">
              <div className="absolute inset-[-4px] bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl blur-md opacity-25 group-hover:opacity-45 transition duration-500"></div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 flex items-center justify-center text-2xl shadow-2xl select-none relative z-10">
                {defaultTenant.logoUrl || '🍔'}
              </div>
            </div>

            <div className="relative z-10 text-right md:text-initial">
              <h1 className="text-sm font-black text-white tracking-wide flex items-center gap-2 uppercase font-sans">
                <span className="shimmer-text font-extrabold">{isRtl ? defaultTenant.nameAr : defaultTenant.nameEn}</span>
                <span className="text-[9px] bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-black px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                  {defaultTenant.subscriptionPlan}
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-bold tracking-wider mt-0.5">
                {isRtl ? `${currentBranch.nameAr} • نظام مالي متوافق` : `${currentBranch.nameEn} • Secure ERP Network`}
              </p>
            </div>
          </div>
        </div>

        {/* Right Part: Dynamic Selectors, profile, and Language switcher */}
        <div className="flex items-center gap-3.5 flex-wrap z-10">
          
          {/* Multi-Branch Selector */}
          <div className="flex items-center gap-2 bg-slate-950/65 p-1.5 px-3 rounded-2xl border border-slate-800/85 shadow-inner">
            <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-widest">{isRtl ? 'الفرع:' : 'BRANCH:'}</span>
            {['super_admin', 'owner'].includes(activeRole) ? (
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-transparent border-0 py-0.5 px-1 text-[11px] font-black rounded text-slate-100 focus:outline-none cursor-pointer focus:ring-0"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id} className="bg-slate-950 text-slate-200">{isRtl ? b.nameAr : b.nameEn}</option>
                ))}
              </select>
            ) : (
              <span className="text-[11px] font-black text-slate-200">
                {isRtl ? currentBranch.nameAr : currentBranch.nameEn}
              </span>
            )}
          </div>

          {/* Logged in info pill */}
          <div className="flex items-center gap-2.5 bg-slate-950/50 border border-slate-800/80 p-1.5 px-3.5 rounded-2xl shadow-md">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            <span className="text-[11px] font-extrabold text-slate-200 flex items-center gap-1.5">
              <span>{loggedInEmployee.name}</span>
              <span className="text-slate-700">|</span>
              <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-wider uppercase ${roleMetadata[activeRole]?.color || 'bg-slate-800 text-slate-400'}`}>
                {roleMetadata[activeRole]?.name || activeRole}
              </span>
            </span>
          </div>

          {/* Translation Switch Globe */}
          <button
            type="button"
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="p-2 px-3 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:bg-slate-800/70 text-slate-300 hover:text-white font-bold text-[11px] flex items-center gap-1.5 transition duration-200 active:scale-95 cursor-pointer"
            aria-label="Toggle language"
          >
            <Globe className="w-3.5 h-3.5 text-amber-500" />
            <span>{language === 'ar' ? 'English' : 'العربية'}</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleEmployeeLogout}
            className="p-2 rounded-xl bg-rose-950/50 border border-rose-900/45 text-rose-400 hover:bg-rose-900/70 hover:text-rose-200 transition duration-200 flex items-center justify-center active:scale-90 cursor-pointer shadow-md"
            title="Log out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>

        </div>

      </header>

      {/* 2. CORE LAYOUT: SIDEBAR NAV + MAIN MODULE CONTAINER */}
      <div className="flex-1 flex flex-col md:flex-row z-10 relative">
        
        {/* Mobile Sidebar backdrop */}
        {isSidebarOpen && (
          <div 
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-[#05070c]/80 backdrop-blur-sm z-40 md:hidden transition-all"
          ></div>
        )}

        {/* Left hand Sidebar navigation rail */}
        <aside id="app-sidebar" className={`${isSidebarOpen ? `flex fixed inset-y-0 z-50 w-72 bg-[#090d16] border-slate-800 ${isRtl ? 'right-0 border-l' : 'left-0 border-r'}` : 'hidden'} md:flex md:w-68 bg-[#0b0f19]/35 backdrop-blur-lg border-slate-800/40 p-4 shrink-0 flex-col justify-between shadow-2xl space-y-6 md:sticky md:top-24 h-full md:h-[calc(100vh-100px)] transition-all duration-300`}>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between px-3 mb-3">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block font-sans">
                {isRtl ? 'الأقسام والوظائف المصرحة' : 'ERP Workspace Modules'}
              </span>
              {/* Close button on mobile inside sidebar */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="text-slate-400 hover:text-white md:hidden cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-1.5 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
              {currentAllowedTabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-3.5 group relative cursor-pointer ${
                      isActive 
                        ? 'bg-gradient-to-r from-orange-600/90 to-amber-500/90 text-white shadow-[0_4px_20px_rgba(249,115,22,0.25)] border border-orange-500/30 scale-[1.02]' 
                        : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200 border border-transparent'
                    }`}
                    dir={isRtl ? 'rtl' : 'ltr'}
                  >
                    {isActive && (
                      <span className="absolute left-1 right-1 top-0 bottom-0 bg-white/5 rounded-xl blur-sm pointer-events-none"></span>
                    )}
                    <TabIcon className={`w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-amber-500'}`} />
                    <span className="flex-1 truncate text-right">
                      {isRtl ? tab.labelAr : tab.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* User profile bottom executive widget */}
          <div className="pt-4 border-t border-slate-800/80">
            <button
              onClick={() => {
                handleOpenProfile();
                setIsSidebarOpen(false);
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 hover:bg-slate-900/60 border border-slate-800/60 hover:border-amber-500/20 transition-all duration-300 text-xs font-bold shadow-lg relative group cursor-pointer"
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"></div>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-850 to-slate-950 text-white flex items-center justify-center text-xs font-black border border-slate-800 shadow-md">
                  <User className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-right min-w-0">
                  <p className="text-slate-200 font-black truncate max-w-[125px] group-hover:text-white transition">{loggedInEmployee.name}</p>
                  <p className="text-[9px] text-amber-500 font-extrabold uppercase tracking-widest mt-0.5">{loggedInEmployee.role}</p>
                </div>
              </div>
              <span className="text-[9px] bg-slate-900 text-slate-400 group-hover:text-amber-400 border border-slate-800 group-hover:border-amber-500/30 px-2 py-1 rounded-lg transition">{isRtl ? 'ملفي' : 'Edit'}</span>
            </button>
          </div>

        </aside>

        {/* Core Display Dashboard Container */}
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden min-h-[calc(100vh-100px)]" aria-label="Application module content">
          <div className="h-full glass-panel bg-slate-950/20 border-slate-900/40 rounded-3xl p-4 md:p-6 shadow-3xl">
            <ErrorBoundary>
              <Suspense fallback={
                <div className="min-h-[280px] rounded-3xl border border-slate-800/70 bg-slate-950/40 p-6 text-center text-sm text-slate-400 flex items-center justify-center">
                  <div className="space-y-2">
                    <div className="h-3 w-24 mx-auto rounded-full bg-slate-800 animate-pulse"></div>
                    <p>Loading module view…</p>
                  </div>
                </div>
              }>
                {renderActiveModule()}
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>

      </div>

      {/* 3. PREMIUM SLIDE-UP ALERT TOAST SYSTEM QUEUE */}
      <div className="fixed bottom-6 right-6 z-[999] space-y-3 max-w-sm w-full px-4" role="status" aria-live="polite" aria-label="Notifications">
        {notifications.map((toast) => (
          <div 
            key={toast.id}
            className={`p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] border flex gap-3.5 items-center backdrop-blur-xl transition-all duration-300 bg-slate-950/90 text-xs font-bold ${
              toast.type === 'success' ? 'border-emerald-500/35 text-emerald-100 shadow-emerald-950/20' :
              toast.type === 'warning' ? 'border-amber-500/35 text-amber-100 shadow-amber-950/20' : 'border-orange-500/35 text-orange-100'
            }`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              toast.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
            }`}>
              {toast.type === 'success' ? <Check className="w-4 h-4 font-bold" /> : <Info className="w-4 h-4" />}
            </div>
            <p className="flex-1 text-[11px] leading-relaxed">{isRtl ? toast.msgAr : toast.msgEn}</p>
          </div>
        ))}
      </div>

      {/* 4. EXECUTIVE PROFILE DIALOG MODAL (FROSTED GLASS) */}
      {isProfileOpen && (
        <div className="fixed inset-0 bg-[#05070c]/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title" className="glass-panel bg-slate-950/80 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] max-w-md w-full text-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6">
              <div>
                <h4 id="profile-dialog-title" className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-500" />
                  <span>{isRtl ? 'ملفي الشخصي المشفر' : 'Secure ERP Account Settings'}</span>
                </h4>
                <p className="text-[10px] text-slate-500 font-mono mt-1">ID: {loggedInEmployee.username}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsProfileOpen(false)} 
                className="text-slate-400 hover:text-slate-100 transition p-1.5 hover:bg-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              
              <div className="space-y-1.5">
                <label className="block font-black text-slate-300 text-[11px] uppercase tracking-wider">{isRtl ? 'الاسم بالكامل:' : 'Full Name:'}</label>
                <input
                  type="text" required
                  value={profileName} onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-black text-slate-300 text-[11px] uppercase tracking-wider">{isRtl ? 'البريد الإلكتروني:' : 'Email Address:'}</label>
                <input
                  type="email" required
                  value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white font-mono focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-black text-slate-300 text-[11px] uppercase tracking-wider">{isRtl ? 'رقم الهاتف:' : 'Phone Number:'}</label>
                <input
                  type="text" required
                  value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white font-mono focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40 transition"
                />
              </div>

              <div className="space-y-1.5 p-3.5 bg-orange-950/20 rounded-2xl border border-orange-500/10">
                <label className="block font-black text-orange-400 text-[11px] uppercase tracking-wider">{isRtl ? 'تغيير كلمة المرور المشفرة:' : 'Change Secure Password:'}</label>
                <input
                  type="text" required
                  value={profilePassword} onChange={(e) => setProfilePassword(e.target.value)}
                  className="w-full bg-slate-950/70 border border-orange-500/20 px-3.5 py-2.5 rounded-xl text-xs font-bold text-orange-200 font-mono focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40 transition mt-1"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black py-3 rounded-xl transition duration-300 shadow-[0_4px_20px_rgba(249,115,22,0.3)] hover:shadow-[0_4px_25px_rgba(249,115,22,0.45)] cursor-pointer text-center active:scale-[0.98]"
              >
                {isRtl ? 'حفظ وتأمين الحساب' : 'Save Profile Changes'}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

