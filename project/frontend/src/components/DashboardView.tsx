/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { 
  TrendingUp, ShoppingBag, Loader, AlertTriangle, Users, DollarSign, ArrowUpRight, ArrowDownRight, Warehouse, Clock, ChefHat 
} from 'lucide-react';
import { Order, Transaction, Tenant, Ingredient } from '../types';
import { StorageService } from '../services/db';

interface DashboardViewProps {
  tenant: Tenant;
  language: 'ar' | 'en';
}

export default function DashboardView({ tenant, language }: DashboardViewProps) {
  const isRtl = language === 'ar';
  const [orders, setOrders] = useState(() => StorageService.getOrders(tenant.id));
  const [transactions, setTransactions] = useState(() => StorageService.getTransactions(tenant.id));
  const [ingredients, setIngredients] = useState(() => StorageService.getIngredients(tenant.id));
  const [crm, setCrm] = useState(() => StorageService.getCRM(tenant.id));
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const [loadedOrders, loadedTransactions, loadedIngredients, loadedCrm] = await Promise.all([
          StorageService.loadOrdersFromApi(tenant.id),
          StorageService.loadOrdersFromApi(tenant.id),
          StorageService.loadIngredientsFromApi(tenant.id),
          StorageService.loadCRMFromApi(tenant.id),
        ]);
        if (!active) return;
        setOrders(loadedOrders);
        setTransactions(loadedTransactions.filter((order) => order.paymentStatus === 'paid').map((order) => ({
          id: order.id,
          tenantId: order.tenantId,
          branchId: order.branchId,
          type: 'income',
          categoryAr: 'مبيعات الطلبات',
          categoryEn: 'Order sales',
          amount: order.total,
          descriptionAr: order.customerName || 'طلبية',
          descriptionEn: order.customerName || 'Order',
          date: order.createdAt,
          createdBy: order.cashierId || 'System',
        })));
        setIngredients(loadedIngredients);
        setCrm(loadedCrm);
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load dashboard data');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [tenant.id]);

  // 2. Metrics & Accounting Formulas
  const completedOrders = useMemo(() => orders.filter((o) => o.status === 'delivered'), [orders]);
  
  const todaySalesVal = useMemo(() => {
    // Sum total of completed paid bills
    return completedOrders.reduce((sum, o) => sum + o.total, 0);
  }, [completedOrders]);

  const averageTicketBasket = useMemo(() => {
    if (completedOrders.length === 0) return 0;
    return todaySalesVal / completedOrders.length;
  }, [completedOrders, todaySalesVal]);

  const lowStockCount = useMemo(() => {
    return ingredients.filter((i) => i.stock <= i.minStock).length;
  }, [ingredients]);

  // Overall Financial summary (Subscribers & owner double-entry logs helper)
  const totalIncomesFromCash = useMemo(() => {
    const rawIn = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    return rawIn;
  }, [transactions]);

  const totalExpensesLedger = useMemo(() => {
    return transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // 1. Monthly mock sales vectors (for customized elegant SVG drawing bounds)
  const monthlyDataPoints = [42000, 58000, 49000, 68000, 84000, 95400];
  const monthlyLabels = isRtl 
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'] 
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  // Top Selling Dishes analyzer
  const topSellingFoods = useMemo(() => {
    const tracker: Record<string, { nameAr: string, nameEn: string, qty: number, price: number }> = {};
    orders.forEach((ord) => {
      if (ord.status !== 'cancelled') {
        ord.items.forEach((item) => {
          if (!tracker[item.menuItemId]) {
            tracker[item.menuItemId] = {
              nameAr: item.nameAr,
              nameEn: item.nameEn,
              qty: 0,
              price: item.price
            };
          }
          tracker[item.menuItemId].qty += item.quantity;
        });
      }
    });

    return Object.values(tracker)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 4);
  }, [orders]);

  // Dynamic calculations for vector graph rendering
  const maxSalesVal = Math.max(...monthlyDataPoints);
  const chartHeight = 120;
  const chartWidth = 500;
  const svgLinePoints = useMemo(() => {
    return monthlyDataPoints.map((val, idx) => {
      const x = (idx / (monthlyDataPoints.length - 1)) * chartWidth;
      const y = chartHeight - (val / maxSalesVal) * (chartHeight - 20);
      return `${x},${y}`;
    }).join(' ');
  }, [monthlyDataPoints, maxSalesVal]);

  return (
    <div className="space-y-8 animate-fade-in select-none">
      {errorMessage && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {isRtl ? 'تعذر تحميل البيانات من الخادم:' : 'Unable to load data from the server:'} {errorMessage}
        </div>
      )}
      {isLoading && !errorMessage && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-300">
          {isRtl ? 'جاري تحميل لوحة الأداء من الخادم…' : 'Loading dashboard data from the server…'}
        </div>
      )}
      
      {/* 1. KEY PERFORMANCE METRICS SECTION (KPI) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1: Gross Sales */}
        <div className="glass-panel bg-[#0d121f]/50 border border-slate-800/75 p-6 rounded-3xl shadow-xl relative overflow-hidden group hover:border-orange-500/35 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-orange-500/10 transition"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                {isRtl ? 'إجمالي المبيعات النشطة اليوم' : 'Today Gross Revenue'}
              </span>
              <p className="text-2xl font-black text-white font-mono tracking-tight">
                {todaySalesVal.toFixed(2)} <span className="text-xs text-orange-500 font-sans font-bold">{isRtl ? tenant.currencyAr : tenant.currencyEn}</span>
              </p>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                +14.2% {isRtl ? 'عن الأسبوع الماضي' : 'vs last week'}
              </span>
            </div>
            <div className="p-3.5 bg-orange-500/10 text-orange-400 rounded-2xl border border-orange-500/20 group-hover:scale-110 transition duration-300">
              <DollarSign className="w-5.5 h-5.5" />
            </div>
          </div>
        </div>

        {/* KPI 2: Completed Orders */}
        <div className="glass-panel bg-[#0d121f]/50 border border-slate-800/75 p-6 rounded-3xl shadow-xl relative overflow-hidden group hover:border-amber-500/35 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                {isRtl ? 'فواتير الطلبات المغلقة' : 'Settled Orders count'}
              </span>
              <p className="text-2xl font-black text-white font-mono tracking-tight">
                {completedOrders.length} <span className="text-xs text-slate-400 font-sans font-bold">{isRtl ? 'طلب' : 'Tickets'}</span>
              </p>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                +4 {isRtl ? 'طلبيات جديدة الآن' : 'new orders today'}
              </span>
            </div>
            <div className="p-3.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 group-hover:scale-110 transition duration-300">
              <ShoppingBag className="w-5.5 h-5.5" />
            </div>
          </div>
        </div>

        {/* KPI 3: Average Ticket basket */}
        <div className="glass-panel bg-[#0d121f]/50 border border-slate-800/75 p-6 rounded-3xl shadow-xl relative overflow-hidden group hover:border-amber-500/35 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                {isRtl ? 'متوسط قيمة سلة الفاتورة' : 'Average Cart Basket Value'}
              </span>
              <p className="text-2xl font-black text-white font-mono tracking-tight">
                {averageTicketBasket.toFixed(2)} <span className="text-xs text-amber-500 font-sans font-bold">{isRtl ? tenant.currencyAr : tenant.currencyEn}</span>
              </p>
              <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1 mt-1">
                <TrendingUp className="w-3.5 h-3.5" />
                {isRtl ? 'مستويات الشراء مستقرة' : 'Steady basket levels'}
              </span>
            </div>
            <div className="p-3.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 group-hover:scale-110 transition duration-300">
              <TrendingUp className="w-5.5 h-5.5" />
            </div>
          </div>
        </div>

        {/* KPI 4: Stock warning materials */}
        <div className="glass-panel bg-[#0d121f]/50 border border-slate-800/75 p-6 rounded-3xl shadow-xl relative overflow-hidden group hover:border-rose-500/35 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/10 transition"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">
                {isRtl ? 'أصناف تحت حد المخزون الحرج' : 'Low Stock raw items'}
              </span>
              <p className="text-2xl font-black text-rose-500 font-mono tracking-tight">
                {lowStockCount} <span className="text-xs text-slate-400 font-sans font-bold">{isRtl ? 'مكونات' : 'ingredients'}</span>
              </p>
              <span className={`text-[10px] font-bold flex items-center gap-1 mt-1 ${lowStockCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}>
                <AlertTriangle className="w-3.5 h-3.5" />
                {lowStockCount > 0 ? (isRtl ? 'تحذير: نقص مواد أولية' : 'Warning: Action required') : (isRtl ? 'المستودعات مؤمنة بالكامل' : 'Inventory levels healthy')}
              </span>
            </div>
            <div className={`p-3.5 rounded-2xl border ${lowStockCount > 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-800 text-slate-500 border-slate-850'}`}>
              <Warehouse className="w-5.5 h-5.5" />
            </div>
          </div>
        </div>

      </div>

      {/* 2. ANALYTICS GRAPHS: DUAL COLUMN VECTOR LAYOUTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Custom SVG Line Chart block (Gross monthly SaaS reports) */}
        <div className="glass-panel bg-[#0d121f]/50 border border-slate-800/75 p-6 rounded-3xl shadow-xl lg:col-span-2 group hover:border-slate-750 transition-all">
          <div className="flex justify-between items-center pb-4 border-b border-slate-850 mb-5">
            <div>
              <h3 className="font-extrabold text-white text-sm">
                {isRtl ? 'منحنى الإيرادات والمبيعات (نصف سنوي)' : 'Revenue Trend curve (6 Months Report)'}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{isRtl ? 'رصد نمو المبيعات الكلية للمطعم' : 'Evaluates gross SaaS restaurant progress index'}</p>
            </div>
            <div className="bg-slate-950/60 border border-slate-850 px-3 py-1.5 rounded-xl text-[10px] text-slate-400 font-black font-mono tracking-wide">
              {isRtl ? 'من ٤٢,٠٠٠ ر.س ← ٩٥,٤٠٠ ر.س' : 'SAR 42,000 → SAR 95,400'}
            </div>
          </div>

          <div className="relative pt-6">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-42 overflow-visible">
              {/* Defs with premium glowing filters and gradients */}
              <defs>
                <linearGradient id="chart-area-grad-lux" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                </linearGradient>
                <filter id="lux-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#f97316" floodOpacity="0.4" />
                </filter>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="#161e2e" strokeWidth="0.8" strokeDasharray="5" />
              <line x1="0" y1="60" x2={chartWidth} y2="60" stroke="#161e2e" strokeWidth="0.8" strokeDasharray="5" />
              <line x1="0" y1="100" x2={chartWidth} y2="100" stroke="#161e2e" strokeWidth="0.8" strokeDasharray="5" />

              {/* Area gradient under graph curve */}
              <path
                d={`M 0,${chartHeight} L ${svgLinePoints} L ${chartWidth},${chartHeight} Z`}
                fill="url(#chart-area-grad-lux)"
              />

              {/* Core Line path */}
              <polyline
                fill="none"
                stroke="#f97316"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={svgLinePoints}
                style={{ filter: 'url(#lux-glow)' }}
              />

              {/* Data circles for points */}
              {monthlyDataPoints.map((val, idx) => {
                const x = (idx / (monthlyDataPoints.length - 1)) * chartWidth;
                const y = chartHeight - (val / maxSalesVal) * (chartHeight - 20);
                return (
                  <g key={idx} className="group cursor-pointer">
                    <circle cx={x} cy={y} r="4.5" fill="#07090e" stroke="#fbbf24" strokeWidth="2.5" />
                    <text x={x} y={y - 12} fontSize="8" fontWeight="bold" fill="#f8fafc" textAnchor="middle" className="hidden group-hover:block font-mono bg-slate-900 px-1 rounded">
                      {(val / 1000).toFixed(1)}k
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* X-Axis labels */}
            <div className="flex justify-between mt-4 text-[10px] text-slate-400 font-extrabold tracking-wider font-mono uppercase">
              {monthlyLabels.map((lbl, idx) => (
                <span key={idx} className="hover:text-white transition duration-150">{lbl}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Top selling foods bar chart visualization */}
        <div className="glass-panel bg-[#0d121f]/50 border border-slate-800/75 p-6 rounded-3xl shadow-xl flex flex-col justify-between group hover:border-slate-750 transition-all">
          <div>
            <div className="pb-3 border-b border-slate-850 mb-5">
              <h3 className="font-extrabold text-white text-sm">
                {isRtl ? 'الوجبات الأكثر مبيعاً وعليها طلب دائم' : 'Top selling dishes (Dine & Away)'}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{isRtl ? 'مرتبة تنازلياً حسب وحدات المبيعات الكلية' : 'Ranked based on total item sales quantities'}</p>
            </div>

            {/* Flat visual bars (Responsive bento layout) */}
            <div className="space-y-4">
              {topSellingFoods.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center font-bold">{isRtl ? 'بانتظار تسجيل طلبيات لحساب الإحصائية' : 'No sales logs recorded yet'}</p>
              ) : (
                topSellingFoods.map((item, idx) => {
                  const maxQtyToRatio = Math.max(...topSellingFoods.map(f => f.qty));
                  const percentWidth = maxQtyToRatio > 0 ? (item.qty / maxQtyToRatio) * 100 : 0;
                  
                  return (
                    <div key={idx} className="space-y-1.5 group/bar">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                        <span className="truncate max-w-[150px] group-hover/bar:text-white transition">{isRtl ? item.nameAr : item.nameEn}</span>
                        <span className="font-mono text-amber-500 font-extrabold">{item.qty} {isRtl ? 'وجبة' : 'orders'}</span>
                      </div>
                      
                      {/* Bar indicator gauge */}
                      <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900 shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-600 to-amber-500 rounded-full group-hover/bar:brightness-110 transition duration-500" 
                          style={{ width: `${percentWidth}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-slate-950/45 border border-slate-850 rounded-2xl p-3.5 flex justify-between items-center text-[11px] text-slate-400 mt-5 shadow-inner">
            <span className="font-bold flex items-center gap-1.5">🔥 {isRtl ? 'الصنف الذهبي الكلي:' : 'Best Seller overall:'}</span>
            <span className="font-extrabold text-amber-400 font-sans tracking-wide">
              {topSellingFoods[0] ? (isRtl ? topSellingFoods[0].nameAr : topSellingFoods[0].nameEn) : 'No Item'}
            </span>
          </div>
        </div>

      </div>

      {/* 3. LOWER SECTION: COHESIVE CASHLOG ENTRIES & BRANCH COMPARATIVE METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Cash Register Journal of ledger entries */}
        <div className="glass-panel bg-[#0d121f]/50 border border-slate-800/75 p-6 rounded-3xl shadow-xl group hover:border-slate-750 transition-all">
          <div className="flex justify-between items-center pb-4 border-b border-slate-850 mb-5 font-sans">
            <div>
              <h3 className="font-extrabold text-white text-sm">
                {isRtl ? 'دفتر العمليات المالية وحركات المقبوضات' : 'General Ledger Operating Stream'}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{isRtl ? 'تسجيل الإيرادات والمصاريف التشغيلية للمطعم' : 'Income logs vs operating and raw materials costs'}</p>
            </div>
            
            <div className="flex gap-2 font-mono">
              <span className="text-[10px] font-extrabold border border-emerald-500/15 bg-emerald-500/5 text-emerald-400 px-2.5 py-1 rounded-xl shadow-inner">
                +{totalIncomesFromCash.toFixed(2)} {isRtl ? 'ر.س' : 'SAR'}
              </span>
              <span className="text-[10px] font-extrabold border border-rose-500/15 bg-rose-500/5 text-rose-400 px-2.5 py-1 rounded-xl shadow-inner">
                -{totalExpensesLedger.toFixed(2)} {isRtl ? 'ر.س' : 'SAR'}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {transactions.map((tx) => (
              <div 
                key={tx.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition-all duration-250 ${
                  tx.type === 'income' 
                    ? 'hover:bg-emerald-500/5 border-emerald-500/10 bg-emerald-950/5' 
                    : 'hover:bg-rose-500/5 border-rose-500/10 bg-rose-950/5'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black tracking-wider ${
                    tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {tx.type === 'income' ? 'IN' : 'OUT'}
                  </div>
                  <div>
                    <p className="font-bold text-slate-200 truncate">
                      {isRtl ? tx.descriptionAr : tx.descriptionEn}
                    </p>
                    <p className="text-[9px] text-slate-400 flex items-center gap-1.5 mt-1 font-mono">
                      <span>{new Date(tx.date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="text-amber-500/70 font-bold">By: {tx.createdBy}</span>
                    </p>
                  </div>
                </div>

                <span className={`font-mono font-black text-sm shrink-0 ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}{tx.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Branch statistics sheet */}
        <div className="glass-panel bg-[#0d121f]/50 border border-slate-800/75 p-6 rounded-3xl shadow-xl group hover:border-slate-750 transition-all">
          <div className="pb-4 border-b border-slate-850 mb-5">
            <h3 className="font-extrabold text-white text-sm">
              {isRtl ? 'مستويات كفاءة ومعادلات الفروع' : 'Corporate Store Performance Indexes'}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{isRtl ? 'مقارنة حجم مبيعات الفروع المفتوحة والنشطة' : 'Active stores telemetry, service SLA benchmarks & outputs'}</p>
          </div>

          {/* Simple table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-850 pb-2 text-right">
                  <th className="pb-3 text-right">{isRtl ? 'الفرع المستهدف' : 'Branch'}</th>
                  <th className="pb-3 text-center">{isRtl ? 'المبيعات الكلية' : 'Gross Sales'}</th>
                  <th className="pb-3 text-center">{isRtl ? 'الحالة التشغيلية' : 'Status'}</th>
                  <th className="pb-3 text-left">SLA KPIs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50">
                <tr className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 font-bold text-slate-200">
                    {isRtl ? 'فرع السليمانية - الرياض' : 'Al-Sulaimania, Riyadh'}
                  </td>
                  <td className="text-center font-mono font-extrabold text-slate-300">
                    {todaySalesVal.toFixed(2)} <span className="text-[10px] text-slate-400">{isRtl ? 'ر.س' : 'SAR'}</span>
                  </td>
                  <td className="text-center">
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold text-[9px] tracking-wide uppercase inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      {isRtl ? 'نشط وقائم' : 'Active'}
                    </span>
                  </td>
                  <td className="text-left text-emerald-400 font-black font-sans">
                    98.4%
                  </td>
                </tr>
                <tr className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 font-bold text-slate-200">
                    {isRtl ? 'فرع الحزام الذهبي - الخبر' : 'Golden Belt, Khobar'}
                  </td>
                  <td className="text-center font-mono font-extrabold text-slate-300">
                    0.00 <span className="text-[10px] text-slate-400">{isRtl ? 'ر.س' : 'SAR'}</span>
                  </td>
                  <td className="text-center">
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-extrabold text-[9px] tracking-wide uppercase inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                      {isRtl ? 'مغلق مؤقتاً' : 'On-hold'}
                    </span>
                  </td>
                  <td className="text-left text-slate-400">
                    --
                  </td>
                </tr>
                <tr className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 font-bold text-slate-200">
                    {isRtl ? 'الرئيسي - جدة الحمراء' : 'Jeddah Main Andalus'}
                  </td>
                  <td className="text-center font-mono font-extrabold text-slate-300">
                    1250.00 <span className="text-[10px] text-slate-400">{isRtl ? 'ر.س' : 'SAR'}</span>
                  </td>
                  <td className="text-center">
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold text-[9px] tracking-wide uppercase inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      {isRtl ? 'نشط وقائم' : 'Active'}
                    </span>
                  </td>
                  <td className="text-left text-orange-400 font-black font-sans">
                    92.1%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
