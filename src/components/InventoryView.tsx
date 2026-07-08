/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Warehouse, Sliders, AlertTriangle, ArrowUpRight, HelpCircle, UserCheck, FileText, Check, DollarSign, ListOrdered 
} from 'lucide-react';
import { Ingredient, Supplier, MenuItem } from '../types';
import { StorageService } from '../services/db';

interface InventoryViewProps {
  tenantId: string;
  language: 'ar' | 'en';
  onAddNotification: (msgAr: string, msgEn: string, type: 'info' | 'success' | 'warning') => void;
}

export default function InventoryView({ tenantId, language, onAddNotification }: InventoryViewProps) {
  const isRtl = language === 'ar';

  // State log sheets
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => StorageService.getIngredients(tenantId));
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => StorageService.getSuppliers(tenantId));
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => StorageService.getMenuItems(tenantId));
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [ingNameAr, setIngNameAr] = useState('');
  const [ingNameEn, setIngNameEn] = useState('');
  const [ingStock, setIngStock] = useState('50');
  const [ingMinStock, setIngMinStock] = useState('15');
  const [ingUnitAr, setIngUnitAr] = useState('كيلو');
  const [ingUnitEn, setIngUnitEn] = useState('kg');
  const [ingCost, setIngCost] = useState('12');
  const [ingSupplier, setIngSupplier] = useState('');

  // Active sub tab
  const [subTab, setSubTab] = useState<'materials' | 'suppliers'>('materials');

  React.useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const [loadedIngredients, loadedSuppliers, loadedMenuItems] = await Promise.all([
          StorageService.loadIngredientsFromApi(tenantId),
          StorageService.loadSuppliersFromApi(tenantId),
          StorageService.loadMenuItemsFromApi(tenantId),
        ]);
        if (!active) return;
        setIngredients(loadedIngredients);
        setSuppliers(loadedSuppliers);
        setMenuItems(loadedMenuItems);
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load inventory data');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [tenantId]);

  // Add new raw material action
  const handleCreateIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingNameAr || !ingNameEn) return;

    const newIng: Ingredient = {
      id: `ing1_custom_${Date.now()}`,
      tenantId,
      nameAr: ingNameAr,
      nameEn: ingNameEn,
      stock: Number(ingStock) || 0,
      minStock: Number(ingMinStock) || 0,
      unitAr: ingUnitAr,
      unitEn: ingUnitEn,
      costPerUnit: Number(ingCost) || 0,
      supplierId: ingSupplier || undefined,
    };

    await StorageService.saveIngredient(newIng);
    const updatedIngredients = await StorageService.loadIngredientsFromApi(tenantId);
    setIngredients(updatedIngredients);
    setIsAddOpen(false);

    // Reset inputs
    setIngNameAr('');
    setIngNameEn('');
    setIngStock('50');
    setIngMinStock('15');
    setIngCost('12');
    setIngSupplier('');

    onAddNotification('تم إدراج مادة أولية جديدة للمخازن', 'New raw material registered successfully in inventory', 'success');
  };

  // Adjust stock volume manually (Purchasing flow simulation)
  const handleRefillStock = async (ingId: string, amount: number) => {
    const matched = ingredients.find(i => i.id === ingId);
    if (matched) {
      matched.stock += amount;
      await StorageService.saveIngredient(matched);
      const updatedIngredients = await StorageService.loadIngredientsFromApi(tenantId);
      setIngredients(updatedIngredients);

      // Record a debit financial transaction for cost of procurement
      const totalCost = amount * matched.costPerUnit;
      await StorageService.addTransaction({
        id: `tx_supply_${Date.now()}`,
        tenantId,
        branchId: 'b1_1',
        type: 'expense',
        categoryAr: 'فواتير مشتريات ومخزون',
        categoryEn: 'Procurements cost logs',
        amount: totalCost,
        descriptionAr: `توريد مستودع: إضافة شحنة دبل ومقدار ${amount} ${matched.unitAr} من ${matched.nameAr}`,
        descriptionEn: `Sourcing supply: refilled ${amount} ${matched.unitEn} of ${matched.nameEn}`,
        date: new Date().toISOString(),
        createdBy: 'أمين المستودع'
      });

      onAddNotification('تم توريد الشحنة وتحديث رصيد المخزن', `Inventory supplied with +${amount} units. Costs debited.`, 'success');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-200 select-none">
      
      {/* 1. Header with custom tabs switcher */}
      <div className="flex flex-col md:flex-row justify-between items-center glass-panel panel-soft p-4 rounded-3xl border border-slate-800/80 shadow-[0_10px_24px_rgba(0,0,0,0.22)] gap-4">
        <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none">
          <button
            onClick={() => setSubTab('materials')}
            className={`py-2 px-4.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${subTab === 'materials' ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-850'}`}
          >
            {isRtl ? 'المواد الأولية والمخزون الحركي' : 'Raw Materials & Stock Log'}
          </button>
          <button
            onClick={() => setSubTab('suppliers')}
            className={`py-2 px-4.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${subTab === 'suppliers' ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-850'}`}
          >
            {isRtl ? 'قائمة الموردين المعتمدين' : 'Authorized Suppliers'}
          </button>
        </div>

        {subTab === 'materials' && (
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="w-full md:w-auto flex items-center justify-center gap-1.5 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black py-2.5 px-4 rounded-xl text-xs transition cursor-pointer active:scale-95 shadow-md"
          >
            <Plus className="w-4 h-4" />
            {isRtl ? 'إدراج مادة أولية جديدة' : 'Add Raw Material'}
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {isRtl ? 'تعذر تحميل المخزون من الخادم:' : 'Unable to load inventory from the server:'} {errorMessage}
        </div>
      )}
      {isLoading && !errorMessage && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-300">
          {isRtl ? 'جاري تحميل بيانات المخزون…' : 'Loading inventory from the server…'}
        </div>
      )}

      {/* 2. SUBTAB CONTENT PANES */}

      {/* TAB A: General materials list */}
      {subTab === 'materials' && (
        <div className="glass-panel panel-soft border border-slate-800/80 rounded-3xl shadow-[0_10px_24px_rgba(0,0,0,0.22)] p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="pb-3 border-b border-slate-850/60 mb-4 text-slate-300">
            <h3 className="font-extrabold text-white text-sm">{isRtl ? 'سجل أرصدة المخازن الحالية' : 'Current Warehouse Stock Balances'}</h3>
            <p className="text-[10px] text-slate-400">{isRtl ? 'رصد تناقص المخزن التلقائي فور اتمام الفواتير' : 'Shows decrements synchronized with kitchen POS sales'}</p>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 font-extrabold border-b border-slate-850 uppercase tracking-wider text-left">
                  <th className="pb-3 pl-2">{isRtl ? 'المادة الأولية' : 'Raw Material'}</th>
                  <th className="pb-3 text-center">{isRtl ? 'الرصيد المتاح' : 'Available Stock'}</th>
                  <th className="pb-3 text-center">{isRtl ? 'حد الخطر' : 'Safety Minimum'}</th>
                  <th className="pb-3 text-center">{isRtl ? 'تكلفة الوحدة' : 'Estimated Unit cost'}</th>
                  <th className="pb-3 text-center">{isRtl ? 'المورد المعتمد' : 'Supplied By'}</th>
                  <th className="pb-3 text-right pr-2">{isRtl ? 'إجراء توريد سريع' : 'Quick Refill Logistics'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/40">
                {ingredients.map((ing) => {
                  const isCritical = ing.stock <= ing.minStock;
                  const supName = suppliers.find(s => s.id === ing.supplierId)?.name || 'Local Store';

                  return (
                    <tr key={ing.id} className="hover:bg-slate-900/30 transition duration-150">
                      <td className="py-3.5 pl-2">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${isCritical ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                          <div>
                            <p className="font-extrabold text-white">{isRtl ? ing.nameAr : ing.nameEn}</p>
                            {isCritical && (
                              <span className="text-[8px] text-rose-400 font-black uppercase tracking-widest mt-0.5 block">
                                {isRtl ? 'منخفض للغاية!' : 'CRITICAL REFILL NEEDED'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-center font-mono font-black text-amber-500 text-sm">
                        {ing.stock.toFixed(2)} {isRtl ? ing.unitAr : ing.unitEn}
                      </td>
                      <td className="text-center font-mono text-slate-400">
                        {ing.minStock.toFixed(2)} {isRtl ? ing.unitAr : ing.unitEn}
                      </td>
                      <td className="text-center font-mono font-semibold text-slate-300">
                        {ing.costPerUnit.toFixed(2)} ر.س
                      </td>
                      <td className="text-center text-slate-400 font-bold">
                        {supName}
                      </td>
                      <td className="text-right py-2.5 pr-2">
                        <div className="inline-flex gap-1.5 self-end">
                          <button
                            type="button"
                            onClick={() => handleRefillStock(ing.id, 10)}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-black px-2.5 py-1 rounded-xl text-[10px] border border-emerald-500/20 cursor-pointer active:scale-90 transition-all"
                          >
                            +10
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRefillStock(ing.id, 50)}
                            className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-black px-2.5 py-1 rounded-xl text-[10px] border border-orange-500/20 cursor-pointer active:scale-90 transition-all"
                          >
                            +50
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB B: Authorized Suppliers log */}
      {subTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.map((sup) => (
            <div key={sup.id} className="glass-panel bg-[#0d121f]/50 p-5 rounded-3xl border border-slate-800/80 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex justify-between items-start hover:border-slate-750 transition duration-200">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck className="w-5 h-5 text-orange-500" />
                  <h4 className="font-extrabold text-xs text-white">{sup.name}</h4>
                </div>
                <div className="space-y-1 text-[11px] text-slate-400 font-medium">
                  <p><span className="text-slate-300">{isRtl ? 'الشخص المسؤول:' : 'Contact:'}</span> {sup.contactPerson}</p>
                  <p><span className="text-slate-300">{isRtl ? 'الجوال:' : 'Phone:'}</span> {sup.phone}</p>
                  <p><span className="text-slate-300">{isRtl ? 'البريد الإلكتروني:' : 'Email:'}</span> {sup.email}</p>
                  <p><span className="text-slate-300">{isRtl ? 'العنوان:' : 'Address:'}</span> {sup.address}</p>
                </div>
              </div>
              <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full font-black tracking-wider text-emerald-400 uppercase">
                ACTIVE
              </span>
            </div>
          ))}
        </div>
      )}

      {/* =========================================================================
                     MODALS DRAWERS OVERLAYS (STATEFUL DIALOGS)
         ========================================================================= */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-[#090d16] border border-slate-850 rounded-[32px] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.8)] max-w-sm w-full max-h-[95vh] overflow-y-auto relative animate-fade-in text-slate-200">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl"></div>
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-900 mb-4">
              <h3 className="font-black text-white text-xs uppercase tracking-wider">
                {isRtl ? 'إدراج صنف مادة أولية جديدة' : 'Add New Raw Commodity'}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsAddOpen(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-900 border border-slate-800 cursor-pointer active:scale-90"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateIngredient} className="space-y-4 text-xs">
              <div>
                <label className="block font-black text-slate-400 uppercase tracking-wider mb-1">{isRtl ? 'الاسم باللغة العربية:' : 'Name in Arabic:'}</label>
                <input
                  type="text" required
                  value={ingNameAr} onChange={(e) => setIngNameAr(e.target.value)}
                  placeholder="مثال: فلفل أسود حب..."
                  className="w-full bg-slate-950/40 border border-slate-850 px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-black text-slate-400 uppercase tracking-wider mb-1">{isRtl ? 'الاسم باللغة الإنجليزية:' : 'Name in English:'}</label>
                <input
                  type="text" required
                  value={ingNameEn} onChange={(e) => setIngNameEn(e.target.value)}
                  placeholder="e.g. Black Pepper grains..."
                  className="w-full bg-slate-950/40 border border-slate-850 px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-black text-slate-400 uppercase tracking-wider mb-1">{isRtl ? 'الرصيد الافتتاحي:' : 'Open Stock:'}</label>
                  <input
                    type="number" required
                    value={ingStock} onChange={(e) => setIngStock(e.target.value)}
                    className="w-full bg-slate-950/40 border border-slate-850 px-3 py-2 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-orange-500 text-center"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-400 uppercase tracking-wider mb-1">{isRtl ? 'حد الأمان:' : 'Min Stock:'}</label>
                  <input
                    type="number" required
                    value={ingMinStock} onChange={(e) => setIngMinStock(e.target.value)}
                    className="w-full bg-slate-950/40 border border-slate-850 px-3 py-2 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-orange-500 text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-black text-slate-400 uppercase tracking-wider mb-1">{isRtl ? 'الوحدة (عربي):' : 'Unit (Ar):'}</label>
                  <input
                    type="text" value={ingUnitAr} onChange={(e) => setIngUnitAr(e.target.value)}
                    className="w-full bg-slate-950/40 border border-slate-850 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500 text-center"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-400 uppercase tracking-wider mb-1">{isRtl ? 'الوحدة (إنجليزي):' : 'Unit (En):'}</label>
                  <input
                    type="text" value={ingUnitEn} onChange={(e) => setIngUnitEn(e.target.value)}
                    className="w-full bg-slate-950/40 border border-slate-850 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500 text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block font-black text-slate-400 uppercase tracking-wider mb-1">{isRtl ? 'تكلفة الوحدة (ر.س):' : 'Estimated Cost Per Unit:'}</label>
                <input
                  type="number" required
                  value={ingCost} onChange={(e) => setIngCost(e.target.value)}
                  className="w-full bg-slate-950/40 border border-slate-850 px-3.5 py-2.5 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-orange-500 text-center"
                />
              </div>

              <div>
                <label className="block font-black text-slate-400 uppercase tracking-wider mb-1">{isRtl ? 'المورد المعتمد السورس:' : 'Authorized Supplier:'}</label>
                <select
                  value={ingSupplier} onChange={(e) => setIngSupplier(e.target.value)}
                  className="w-full bg-slate-950/40 border border-slate-850 px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500 font-bold"
                >
                  <option value="" className="bg-[#090d16] text-white">{isRtl ? 'مسلخ محلي / بقالة عامة' : 'Local / Walk-in'}</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id} className="bg-[#090d16] text-white">{s.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-4 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black py-3.5 rounded-xl cursor-pointer active:scale-95 transition-all shadow-md"
              >
                {isRtl ? 'أكد الحفظ وإدراج المخزن' : 'Add commodity now'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
