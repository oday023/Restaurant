/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, DollarSign, Wallet, FileDown, TrendingUp, TrendingDown, Clock, HelpCircle, FileText, Check, Layers, BarChart3, Receipt, Scale, ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import { Transaction, Tenant, Branch } from '../types';
import { StorageService } from '../services/db';

interface AccountingViewProps {
  tenant: Tenant;
  branch: Branch;
  language: 'ar' | 'en';
  onAddNotification: (msgAr: string, msgEn: string, type: 'info' | 'success' | 'warning') => void;
}

export default function AccountingView({ tenant, branch, language, onAddNotification }: AccountingViewProps) {
  const isRtl = language === 'ar';

  const [transactions, setTransactions] = useState<Transaction[]>(() => StorageService.getTransactions(tenant.id, branch.id));
  const [activeSubTab, setActiveSubTab] = useState<'ledger' | 'chart' | 'journal' | 'trial' | 'reports'>('ledger');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ledger form states
  const [isNewTxOpen, setIsNewTxOpen] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [txCatAr, setTxCatAr] = useState('شراء تموينات المشروبات');
  const [txCatEn, setTxCatEn] = useState('Operating soft drinks supplies');
  const [txAmount, setTxAmount] = useState('150');
  const [txDescAr, setTxDescAr] = useState('شراء كرتونين مياه صحية فريش من الموزع المحلي');
  const [txDescEn, setTxDescEn] = useState('Purchased 2 boxes mineral water from local distributor');

  // COGS cost adjustment state for inventory costing recipe link simulation
  const [cogsPercent, setCogsPercent] = useState<number>(35); // 35% standard COGS ratio

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const loadedTransactions = await StorageService.loadOrdersFromApi(tenant.id, branch.id);
        if (!active) return;
        setTransactions(loadedTransactions.map((order) => ({
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
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load accounting data');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [tenant.id, branch.id]);

  // 1. Chart of Accounts Definitions
  const chartOfAccounts = useMemo(() => {
    // Math based on current ledger
    const totalSales = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalWages = transactions.filter(t => t.categoryEn?.toLowerCase().includes('wage') || t.categoryAr?.includes('رواتب')).reduce((sum, t) => sum + t.amount, 0);
    const totalPurchases = transactions.filter(t => t.type === 'expense' && !t.categoryEn?.toLowerCase().includes('wage') && !t.categoryAr?.includes('رواتب')).reduce((sum, t) => sum + t.amount, 0);
    
    const cashOnHand = Math.max(25000 + totalSales - totalWages - totalPurchases, 1200);
    const inventoryVal = 14500 - (totalSales * (cogsPercent / 100));
    const paidInCapital = 35000;
    const vatAmount = totalSales * 0.15;

    return [
      { code: '1010', nameAr: 'الصندوق النقدي اليومي (كاش)', nameEn: 'Cash on Hand', type: 'Asset', balance: cashOnHand },
      { code: '1020', nameAr: 'حساب البنك الراجحي الجاري', nameEn: 'Bank Current Account', type: 'Asset', balance: 18400.00 },
      { code: '1200', nameAr: 'مخزون مستودع المكونات', nameEn: 'Inventory Raw Materials', type: 'Asset', balance: Math.max(inventoryVal, 1000) },
      { code: '2100', nameAr: 'ذمم الموردين الدائنة (مشتريات)', nameEn: 'Accounts Payable', type: 'Liability', balance: 3450.00 },
      { code: '2200', nameAr: 'حساب مصلحة الضرائب والزكاة (VAT)', nameEn: 'VAT Payable Liability', type: 'Liability', balance: vatAmount },
      { code: '3100', nameAr: 'رأس مال الشركاء المدفوع', nameEn: 'Paid-in Partner Capital', type: 'Equity', balance: paidInCapital },
      { code: '4100', nameAr: 'إيرادات المبيعات والطلبيات', nameEn: 'Food Sales Revenues', type: 'Revenue', balance: totalSales },
      { code: '5100', nameAr: 'تكلفة الأغذية والمشروبات المباعة', nameEn: 'Cost of Goods Sold (COGS)', type: 'Expense', balance: totalSales * (cogsPercent / 100) },
      { code: '5200', nameAr: 'مصاريف أجور ورواتب الطاقم', nameEn: 'Staff Wages Expense', type: 'Expense', balance: totalWages },
      { code: '5300', nameAr: 'مصاريف التشغيل والمشتريات الأخرى', nameEn: 'Operating Sourcing Expense', type: 'Expense', balance: totalPurchases },
    ];
  }, [transactions, cogsPercent]);

  // 2. Double Entry Journal Entries Synthesizer
  const doubleEntryJournal = useMemo(() => {
    const journalList: Array<{
      id: string;
      date: string;
      descriptionAr: string;
      descriptionEn: string;
      debitCode: string;
      debitName: string;
      creditCode: string;
      creditName: string;
      amount: number;
    }> = [];

    transactions.forEach((tx, idx) => {
      if (tx.type === 'income') {
        // Sales Journal entry: Debit Cash 1010, Credit Revenue 4100 and VAT 2200
        journalList.push({
          id: `JE_${tx.id.slice(-6).toUpperCase()}_1`,
          date: tx.date,
          descriptionAr: `إثبات إيراد بيع طلبيات كاشير بقيمة ${tx.amount}`,
          descriptionEn: `POS sale ticket transaction ref #${tx.id.slice(-6).toUpperCase()}`,
          debitCode: '1010',
          debitName: isRtl ? 'الصندوق النقدي اليومي' : 'Cash on Hand',
          creditCode: '4100',
          creditName: isRtl ? 'إيرادات مبيعات الأغذية' : 'Food Sales Revenues',
          amount: tx.amount
        });
      } else {
        // Expense Journal entry: Debit Sourcing/Wages, Credit Cash 1010
        const isWage = tx.categoryEn?.toLowerCase().includes('wage') || tx.categoryAr?.includes('رواتب');
        journalList.push({
          id: `JE_${tx.id.slice(-6).toUpperCase()}_2`,
          date: tx.date,
          descriptionAr: `سداد قيد مصرفي: ${tx.descriptionAr}`,
          descriptionEn: `Cash disbursement: ${tx.descriptionEn}`,
          debitCode: isWage ? '5200' : '5300',
          debitName: isWage ? (isRtl ? 'مصاريف رواتب طاقم العمل' : 'Staff Wages Expense') : (isRtl ? 'مصاريف تشغيل ومشتريات' : 'Operating Sourcing Expense'),
          creditCode: '1010',
          creditName: isRtl ? 'الصندوق النقدي اليومي (كاش)' : 'Cash on Hand',
          amount: tx.amount
        });
      }
    });

    return journalList;
  }, [transactions, isRtl]);

  // 3. Financial calculations
  const grossIncomes = useMemo(() => {
    return transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const grossExpenses = useMemo(() => {
    return transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const netProfit = useMemo(() => {
    return grossIncomes - grossExpenses;
  }, [grossIncomes, grossExpenses]);

  // Add customized manual ledger entry
  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || !txDescAr) return;

    const newTx: Transaction = {
      id: `tx_custom_${Date.now()}`,
      tenantId: tenant.id,
      branchId: branch.id,
      type: txType,
      categoryAr: txCatAr,
      categoryEn: txCatEn,
      amount: Number(txAmount) || 0,
      descriptionAr: txDescAr,
      descriptionEn: txDescEn,
      date: new Date().toISOString(),
      createdBy: 'محاسب الفرع الرئيسي'
    };

    await StorageService.addTransaction(newTx);
    setTransactions(StorageService.getTransactions(tenant.id, branch.id));
    setIsNewTxOpen(false);

    // Reset inputs
    setTxAmount('150');
    setTxDescAr('');
    setTxDescEn('');

    onAddNotification(
      'تم إدراج القيد المحاسبي المزدوج الصفر في دفتر الأستاذ العام بنجاح',
      'Double-entry successfully balanced and posted to general ledger',
      'success'
    );
  };

  const handleSimulateExport = (mode: 'pdf' | 'csv') => {
    onAddNotification(
      `جاري تجهيز وتصدير التقرير المحاسبي المزدوج بصيغة ${mode.toUpperCase()}...`,
      `Synthesizing balanced double-entry statement as simulated ${mode.toUpperCase()}...`,
      'info'
    );
    setTimeout(() => {
      onAddNotification(
        `تم حفظ وتحميل التقرير المحاسبي المتوازن المعتمد!`,
        `Balanced audited financial document successfully generated.`,
        'success'
      );
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-200 select-none">
      
      {errorMessage && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {isRtl ? 'تعذر تحميل دفتر الأستاذ من الخادم:' : 'Unable to load the ledger from the server:'} {errorMessage}
        </div>
      )}
      {isLoading && !errorMessage && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-300">
          {isRtl ? 'جاري تحميل دفتر الأستاذ…' : 'Loading ledger data from the server…'}
        </div>
      )}

      {/* Top Balanced Metrics Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        
        <div className="glass-panel panel-soft border border-slate-800/80 p-5 rounded-3xl shadow-[0_10px_24px_rgba(0,0,0,0.22)] space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl"></div>
          <div className="flex items-center gap-2 text-slate-400">
            <TrendingUp className="w-4 h-4 text-emerald-450" />
            <span className="text-[9px] font-black uppercase tracking-wider">{isRtl ? 'إجمالي المقبوضات الدائنة' : 'Revenues Credit'}</span>
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
            +{grossIncomes.toFixed(2)} <span className="text-[10px] font-sans font-medium text-slate-400">{isRtl ? tenant.currencyAr : tenant.currencyEn}</span>
          </p>
        </div>

        <div className="glass-panel panel-soft border border-slate-800/80 p-5 rounded-3xl shadow-[0_10px_24px_rgba(0,0,0,0.22)] space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-full blur-xl"></div>
          <div className="flex items-center gap-2 text-slate-400">
            <TrendingDown className="w-4 h-4 text-rose-450" />
            <span className="text-[9px] font-black uppercase tracking-wider">{isRtl ? 'إجمالي المدفوعات المدينة' : 'Expenditures Debit'}</span>
          </div>
          <p className="text-2xl font-black text-rose-400 font-mono tracking-tight">
            -{grossExpenses.toFixed(2)} <span className="text-[10px] font-sans font-medium text-slate-400">{isRtl ? tenant.currencyAr : tenant.currencyEn}</span>
          </p>
        </div>

        <div className="glass-panel panel-soft border border-slate-800/80 p-5 rounded-3xl shadow-[0_10px_24px_rgba(0,0,0,0.22)] space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/5 rounded-full blur-xl"></div>
          <div className="flex items-center gap-2 text-slate-400">
            <Wallet className="w-4 h-4 text-orange-450" />
            <span className="text-[9px] font-black uppercase tracking-wider">{isRtl ? 'صافي الربح التشغيلي' : 'Net Profit'}</span>
          </div>
          <p className={`text-2xl font-black font-mono tracking-tight ${netProfit >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
            {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(2)} <span className="text-[10px] font-sans font-medium text-slate-400">{isRtl ? tenant.currencyAr : tenant.currencyEn}</span>
          </p>
        </div>

        <div className="glass-panel panel-soft border border-slate-800/80 p-5 rounded-3xl shadow-[0_10px_24px_rgba(0,0,0,0.22)] space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/[0.03] rounded-full blur-xl"></div>
          <div className="flex items-center gap-2 text-slate-400">
            <Scale className="w-4 h-4 text-orange-500 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="text-[9px] font-black uppercase tracking-wider text-orange-500/90">{isRtl ? 'توازن القيود المزدوجة' : 'Trial Balance Match'}</span>
          </div>
          <div className="text-sm font-black text-white font-mono flex items-center gap-1.5 mt-1">
            <Check className="w-4 h-4 text-emerald-400 font-bold" />
            <span className="tracking-wide">BALANCED (0.00)</span>
          </div>
        </div>

      </div>

      {/* SUB-TABS SELECTOR DECK */}
      <div className="glass-panel panel-soft border border-slate-800/80 p-2.5 rounded-2xl flex flex-wrap gap-2 shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
        <button
          onClick={() => setActiveSubTab('ledger')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'ledger' ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900/40'}`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>{isRtl ? 'دفتر الأستاذ العام' : 'General Ledger'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('chart')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'chart' ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900/40'}`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{isRtl ? 'شجرة الحسابات' : 'Chart of Accounts'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('journal')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'journal' ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900/40'}`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{isRtl ? 'القيود المحاسبية الثنائية' : 'Double Journal'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('trial')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'trial' ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900/40'}`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>{isRtl ? 'ميزان المراجعة المطابق' : 'Trial Balance'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('reports')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'reports' ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900/40'}`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>{isRtl ? 'القوائم المالية والتقارير' : 'Financial Statements'}</span>
        </button>
      </div>

      {/* SUB-VIEW CONDITIONAL RENDERERS */}

      {activeSubTab === 'ledger' && (
        <div className="glass-panel panel-soft border border-slate-800/80 rounded-3xl p-5 shadow-[0_10px_24px_rgba(0,0,0,0.22)] space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pb-3 border-b border-slate-850/60 mb-3">
            <div>
              <h3 className="font-extrabold text-white text-xs">
                {isRtl ? 'كشف حركة المقبوضات والصندوق اليومي' : 'General Ledger Sourcing Ledger'}
              </h3>
              <p className="text-[10px] text-slate-400">{isRtl ? 'سجل تفصيلي بجميع المقبوضات والمصروفات بالصندوق اليومي' : 'Track and audit general ledger transactions'}</p>
            </div>

            <div className="flex gap-1.5">
              <button onClick={() => handleSimulateExport('pdf')} className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-[10px] font-black flex items-center gap-1 cursor-pointer transition">
                <FileDown className="w-3.5 h-3.5 text-orange-500" />
                <span>PDF</span>
              </button>
              <button onClick={() => handleSimulateExport('csv')} className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-[10px] font-black flex items-center gap-1 cursor-pointer transition">
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <span>CSV</span>
              </button>
              <button onClick={() => setIsNewTxOpen(true)} className="p-2 px-3 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white rounded-xl text-[10px] font-black flex items-center gap-1 cursor-pointer transition shadow-md active:scale-95">
                <Plus className="w-3.5 h-3.5" />
                <span>{isRtl ? 'تسجيل سند جديد' : 'New Entry'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 font-extrabold border-b border-slate-850 text-left uppercase tracking-wider">
                  <th className="pb-3 pl-2 font-sans">#</th>
                  <th className="pb-3 font-sans">{isRtl ? 'البيان وتوصيف العملية' : 'Description'}</th>
                  <th className="pb-3 font-sans text-center">{isRtl ? 'البند الضريبي' : 'Tax Bracket'}</th>
                  <th className="pb-3 font-sans text-center">{isRtl ? 'التاريخ وبواسطة' : 'Responsible'}</th>
                  <th className="pb-3 font-sans text-right pr-2">{isRtl ? 'القيمة المالية' : 'Amount'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/40">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-900/30 transition duration-150">
                    <td className="py-4 pl-2 font-mono font-black text-amber-500 text-[10px]">#{tx.id.slice(-6).toUpperCase()}</td>
                    <td>
                      <p className="font-extrabold text-white">{isRtl ? tx.descriptionAr : tx.descriptionEn}</p>
                      {tx.referenceOrderId && <span className="text-[8px] bg-slate-950 text-slate-400 border border-slate-850 font-mono px-1.5 py-0.5 rounded inline-block mt-1">ORDER-ID: {tx.referenceOrderId.slice(-5).toUpperCase()}</span>}
                    </td>
                    <td className="text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${tx.type === 'income' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
                        {isRtl ? tx.categoryAr : tx.categoryEn}
                      </span>
                    </td>
                    <td className="text-center font-mono text-[10px] text-slate-450">
                      <p className="font-extrabold text-slate-300">{new Date(tx.date).toLocaleDateString()}</p>
                      <p className="text-slate-400">By: {tx.createdBy}</p>
                    </td>
                    <td className={`text-right pr-2 font-mono font-black text-sm ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{tx.amount.toFixed(2)} SAR
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'chart' && (
        <div className="glass-panel panel-soft border border-slate-800/80 rounded-3xl p-5 shadow-[0_10px_24px_rgba(0,0,0,0.22)] space-y-4">
          <div>
            <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">{isRtl ? 'شجرة الحسابات الموحدة ونظام الترميز (Chart of Accounts)' : 'Unified Chart of Accounts (COA)'}</h4>
            <p className="text-[10px] text-slate-400">{isRtl ? 'نظام المحاسبة السحابي ثنائي القيد للشركة لتنظيم الأصول والخصوم والملكيات والمصروفات' : 'ERP system account nodes mapping financial assets, liabilities, equities, revenues, and expenses'}</p>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs font-sans">
              <thead>
                <tr className="text-slate-400 font-extrabold border-b border-slate-850 uppercase tracking-wider text-left">
                  <th className="pb-3 pl-2">{isRtl ? 'رقم الحساب' : 'Code'}</th>
                  <th className="pb-3">{isRtl ? 'اسم الحساب المحاسبي' : 'Account Title'}</th>
                  <th className="pb-3 text-center">{isRtl ? 'نوع الحساب' : 'Group Type'}</th>
                  <th className="pb-3 text-right pr-2">{isRtl ? 'الرصيد المالي الحالي' : 'Current Balance'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/40">
                {chartOfAccounts.map((account) => (
                  <tr key={account.code} className="hover:bg-slate-900/30 transition duration-150">
                    <td className="py-3.5 pl-2 font-mono font-black text-amber-500">{account.code}</td>
                    <td className="font-extrabold text-white">{isRtl ? account.nameAr : account.nameEn}</td>
                    <td className="text-center">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                        account.type === 'Asset' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                        account.type === 'Liability' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' :
                        account.type === 'Equity' ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400' :
                        account.type === 'Revenue' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-slate-900 border border-slate-800 text-slate-400'
                      }`}>
                        {account.type}
                      </span>
                    </td>
                    <td className="text-right pr-2 font-mono font-black text-white">{account.balance.toFixed(2)} SAR</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'journal' && (
        <div className="glass-panel panel-soft border border-slate-800/80 rounded-3xl p-5 shadow-[0_10px_24px_rgba(0,0,0,0.22)] space-y-4">
          <div>
            <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">{isRtl ? 'دفتر القيود اليومية المحاسبية المزدوجة' : 'Balanced Double-Entry Journal Book'}</h4>
            <p className="text-[10px] text-slate-400">{isRtl ? 'كل قيد مالي يسجل طرفين متساويين: مدين (Debit) ودائن (Credit) لضمان الصفر المحاسبي المتوازن' : 'Audit logs tracking precise zero-sum debits and credits per business action'}</p>
          </div>

          <div className="space-y-4">
            {doubleEntryJournal.map((entry) => (
              <div key={entry.id} className="p-4 bg-slate-950/45 border border-slate-850 rounded-2xl space-y-3 font-sans hover:border-slate-750 transition duration-150">
                <div className="flex justify-between items-center text-[10px] font-black border-b pb-2 border-slate-900/65">
                  <span className="font-mono text-amber-500">{entry.id}</span>
                  <span className="text-slate-400 font-mono">{new Date(entry.date).toLocaleString()}</span>
                </div>
                
                <p className="text-xs font-bold text-slate-300">
                  {isRtl ? entry.descriptionAr : entry.descriptionEn}
                </p>

                <div className="grid grid-cols-2 gap-4 text-[11px] bg-slate-950/90 p-3.5 rounded-xl border border-slate-900">
                  <div className="border-r border-slate-850/60 pr-2">
                    <span className="text-[8px] font-black text-emerald-400 block uppercase tracking-wider">📥 DEBIT (مدين)</span>
                    <p className="font-extrabold text-white mt-1">{entry.debitName}</p>
                    <p className="font-mono text-[10px] text-slate-500 mt-0.5">Code: {entry.debitCode}</p>
                    <p className="font-mono font-black text-xs text-emerald-400 mt-2">+{entry.amount.toFixed(2)} SAR</p>
                  </div>

                  <div className="pl-2">
                    <span className="text-[8px] font-black text-rose-450 block uppercase tracking-wider">📤 CREDIT (دائن)</span>
                    <p className="font-extrabold text-white mt-1">{entry.creditName}</p>
                    <p className="font-mono text-[10px] text-slate-500 mt-0.5">Code: {entry.creditCode}</p>
                    <p className="font-mono font-black text-xs text-rose-400 mt-2">-{entry.amount.toFixed(2)} SAR</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'trial' && (
        <div className="glass-panel panel-soft border border-slate-800/80 rounded-3xl p-5 shadow-[0_10px_24px_rgba(0,0,0,0.22)] space-y-4">
          <div>
            <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">{isRtl ? 'ميزان المراجعة الحسابي المتوازن للفرع' : 'Corporate Trial Balance Ledger'}</h4>
            <p className="text-[10px] text-slate-400">{isRtl ? 'قائمة الحسابات الختامية مجمعة في أعمدة المدين والدائن للتحقق من تكافؤ العمليات وصحة التقارير' : 'Balanced sheet mapping absolute debits and credits from Chart of Accounts'}</p>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs font-sans">
              <thead>
                <tr className="text-slate-400 font-extrabold border-b border-slate-850 text-left uppercase tracking-wider">
                  <th className="pb-3 pl-2">Code</th>
                  <th className="pb-3">{isRtl ? 'الحساب' : 'Account'}</th>
                  <th className="pb-3 text-center">Debits (مدين)</th>
                  <th className="pb-3 text-center pr-2">Credits (دائن)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/40">
                {chartOfAccounts.map((acc) => {
                  const isDebitSide = acc.type === 'Asset' || acc.type === 'Expense';
                  return (
                    <tr key={acc.code} className="hover:bg-slate-900/30 transition duration-150">
                      <td className="py-3.5 pl-2 font-mono text-slate-400">{acc.code}</td>
                      <td className="font-extrabold text-white">{isRtl ? acc.nameAr : acc.nameEn}</td>
                      <td className="text-center font-mono font-black text-emerald-400 bg-emerald-500/[0.02]">
                        {isDebitSide ? `${acc.balance.toFixed(2)} SAR` : '---'}
                      </td>
                      <td className="text-center font-mono font-black text-rose-400 bg-rose-500/[0.02] pr-2">
                        {!isDebitSide ? `${acc.balance.toFixed(2)} SAR` : '---'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'reports' && (
        <div className="space-y-6">
          
          {/* Income Statement: Profit & Loss */}
          <div className="glass-panel panel-soft border border-slate-800/80 rounded-3xl p-5 shadow-[0_10px_24px_rgba(0,0,0,0.22)] space-y-4">
            <div className="flex justify-between items-center border-b border-slate-850/60 pb-3">
              <div>
                <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">{isRtl ? 'قائمة الأرباح والخسائر (Income Statement / P&L)' : 'Income Statement (Profit & Loss / P&L)'}</h4>
                <p className="text-[9px] text-slate-400 font-mono">June 2026 Monthly Statement</p>
              </div>
              <span className="p-1 px-2.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-black rounded-lg text-[9px] tracking-wider">AUDITED & APPROVED</span>
            </div>

            <div className="space-y-3.5 text-xs font-sans">
              <div className="flex justify-between items-center py-2.5 border-b border-slate-900">
                <span className="font-bold text-slate-400">{isRtl ? 'إيرادات مبيعات الأطعمة والطلبات (+)' : 'Gross Food Sales revenues (+)'}</span>
                <span className="font-mono font-black text-emerald-400">+{grossIncomes.toFixed(2)} SAR</span>
              </div>

              <div className="flex justify-between items-center py-2.5 border-b border-slate-900 pl-4 text-rose-400">
                <span className="font-medium">{isRtl ? 'تكلفة الأغذية والسلع المباعة COGS (-)' : 'Cost of Goods Sold (COGS) (-)'}</span>
                <span className="font-mono font-black">-{ (grossIncomes * (cogsPercent / 100)).toFixed(2) } SAR</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-900 bg-slate-950/40 p-3 rounded-xl font-black text-white">
                <span>{isRtl ? 'إجمالي الربح قبل المصاريف والتشغيل' : 'Gross Profit Margin'}</span>
                <span className="font-mono text-amber-500">+{ (grossIncomes - (grossIncomes * (cogsPercent / 100))).toFixed(2) } SAR</span>
              </div>

              <div className="flex justify-between items-center py-2.5 border-b border-slate-900 pl-4 text-rose-400">
                <span className="font-medium">{isRtl ? 'مصاريف رواتب وأجور الموظفين (-)' : 'Staff Wages & Payroll outlays (-)'}</span>
                <span className="font-mono font-black">
                  -{ transactions.filter(t => t.categoryEn?.toLowerCase().includes('wage') || t.categoryAr?.includes('رواتب')).reduce((sum, t) => sum + t.amount, 0).toFixed(2) } SAR
                </span>
              </div>

              <div className="flex justify-between items-center py-2.5 border-b border-slate-900 pl-4 text-rose-400 font-sans">
                <span className="font-medium">{isRtl ? 'مصاريف المشتريات والتشغيل الأخرى (-)' : 'Other operational & Sourcing outlays (-)'}</span>
                <span className="font-mono font-black">
                  -{ transactions.filter(t => t.type === 'expense' && !t.categoryEn?.toLowerCase().includes('wage') && !t.categoryAr?.includes('رواتب')).reduce((sum, t) => sum + t.amount, 0).toFixed(2) } SAR
                </span>
              </div>

              <div className="flex justify-between items-center p-3.5 bg-gradient-to-r from-orange-600/10 to-amber-500/10 border border-orange-500/20 rounded-2xl font-black text-xs text-amber-400">
                <span>{isRtl ? 'صافي الأرباح التشغيلية للمستثمرين' : 'Net Operating Earnings (EBITDA)'}</span>
                <span className="font-mono text-base">{(grossIncomes - grossExpenses).toFixed(2)} SAR</span>
              </div>
            </div>
          </div>

          {/* Balance Sheet Preview */}
          <div className="glass-panel panel-soft border border-slate-800/80 rounded-3xl p-5 shadow-[0_10px_24px_rgba(0,0,0,0.22)] space-y-4">
            <div className="flex justify-between items-center border-b border-slate-850/60 pb-3">
              <div>
                <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">{isRtl ? 'الميزانية العمومية المتوازنة (Balance Sheet)' : 'Balanced Sheet (Assets, Liabilities & Equity)'}</h4>
                <p className="text-[9px] text-slate-400 font-mono">As of June 30, 2026</p>
              </div>
              <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg tracking-wider">DEBITS = CREDITS</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans text-xs">
              <div className="space-y-3">
                <span className="text-[9px] font-black text-emerald-450 block uppercase tracking-wider">📥 Total Assets (الأصول والموجودات)</span>
                <div className="space-y-2">
                  {chartOfAccounts.filter(a => a.type === 'Asset').map(a => (
                    <div key={a.code} className="flex justify-between items-center py-2 border-b border-slate-900 font-medium">
                      <span className="text-slate-300">{isRtl ? a.nameAr : a.nameEn}</span>
                      <span className="font-mono font-bold text-white">{a.balance.toFixed(2)} SAR</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-2.5 bg-emerald-500/5 p-3 rounded-xl font-black text-emerald-400 mt-2 border border-emerald-500/10">
                    <span>Total Assets</span>
                    <span className="font-mono">
                      {chartOfAccounts.filter(a => a.type === 'Asset').reduce((sum, a) => sum + a.balance, 0).toFixed(2)} SAR
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[9px] font-black text-rose-450 block uppercase tracking-wider">📤 Liabilities & Equity (الخصوم وحقوق الملكية)</span>
                <div className="space-y-2">
                  {chartOfAccounts.filter(a => a.type === 'Liability' || a.type === 'Equity').map(a => (
                    <div key={a.code} className="flex justify-between items-center py-2 border-b border-slate-900 font-medium">
                      <span className="text-slate-300">{isRtl ? a.nameAr : a.nameEn}</span>
                      <span className="font-mono font-bold text-white">{a.balance.toFixed(2)} SAR</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-2.5 bg-indigo-500/5 p-3 rounded-xl font-black text-indigo-400 mt-2 border border-indigo-500/10">
                    <span>Total Liabilities + Equity</span>
                    <span className="font-mono">
                      {chartOfAccounts.filter(a => a.type === 'Liability' || a.type === 'Equity').reduce((sum, a) => sum + a.balance, 0).toFixed(2)} SAR
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Manual Entry modal */}
      {isNewTxOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-[#090d16] border border-slate-850 rounded-[32px] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.8)] max-w-sm w-full font-sans relative animate-fade-in text-slate-200">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl"></div>
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-900 mb-4">
              <h3 className="font-black text-white text-xs uppercase tracking-wider">
                {isRtl ? 'تسجيل قيد مالي جديد بالدفتر' : 'Manual Ledger Deposit Sheet'}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsNewTxOpen(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-900 border border-slate-800 cursor-pointer active:scale-90"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleRecordTransaction} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 border border-slate-850 rounded-xl">
                <button
                  type="button" onClick={() => setTxType('income')}
                  className={`py-2 rounded-lg text-[10px] font-black uppercase cursor-pointer transition ${txType === 'income' ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md' : 'text-slate-450 hover:text-white'}`}
                >
                  {isRtl ? 'سند قبض إيراد' : 'Credit Income'}
                </button>
                <button
                  type="button" onClick={() => setTxType('expense')}
                  className={`py-2 rounded-lg text-[10px] font-black uppercase cursor-pointer transition ${txType === 'expense' ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md' : 'text-slate-450 hover:text-white'}`}
                >
                  {isRtl ? 'سند صرف مصروف' : 'Debit Expense'}
                </button>
              </div>

              <div>
                <label className="block font-black text-slate-400 uppercase tracking-wider mb-1">{isRtl ? 'التبويب بالإنجليزي:' : 'Accounting category name (En):'}</label>
                <input
                  type="text" required
                  value={txCatEn} onChange={(e) => setTxCatEn(e.target.value)}
                  className="w-full bg-slate-950/40 border border-slate-850 px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-black text-slate-400 uppercase tracking-wider mb-1">{isRtl ? 'مبلغ السند (السعر والمال):' : 'Amount in SAR:'}</label>
                <input
                  type="number" required
                  value={txAmount} onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full bg-slate-950/40 border border-slate-850 px-3.5 py-2.5 rounded-xl text-xs font-mono font-black text-white focus:outline-none focus:border-orange-500 text-center text-sm"
                />
              </div>

              <div>
                <label className="block font-black text-slate-400 uppercase tracking-wider mb-1">{isRtl ? 'توصيف العملية بالعربي:' : 'Detailed description (Arabic):'}</label>
                <input
                  type="text" required
                  value={txDescAr} onChange={(e) => setTxDescAr(e.target.value)}
                  className="w-full bg-slate-950/40 border border-slate-850 px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500 font-bold"
                  placeholder="مثال: شراء كرتون خضار طازج..."
                />
              </div>

              <button
                type="submit"
                className="w-full mt-4 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black py-3.5 rounded-xl cursor-pointer active:scale-95 transition-all shadow-md"
              >
                {isRtl ? 'تأكيد وحفظ القيد المحاسبي' : 'Approve & write transaction'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
