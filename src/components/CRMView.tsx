/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Users, Phone, Mail
} from 'lucide-react';
import { CustomerCRM } from '../types';
import { StorageService } from '../services/db';

interface CRMViewProps {
  tenantId: string;
  language: 'ar' | 'en';
  onAddNotification: (msgAr: string, msgEn: string, type: 'info' | 'success' | 'warning') => void;
}

export default function CRMView({ tenantId, language, onAddNotification }: CRMViewProps) {
  const isRtl = language === 'ar';

  const [crm, setCrm] = useState<CustomerCRM[]>(() => StorageService.getCRM(tenantId));
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const loadedCrm = await StorageService.loadCRMFromApi(tenantId);
        if (!active) return;
        setCrm(loadedCrm);
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load CRM data');
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

  return (
    <div className="text-slate-200 animate-fade-in select-none">
      
      {/* Customer Profiles Log sheets */}
      <div className="glass-panel bg-[#0d121f]/50 border border-slate-800/80 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-4">
        {errorMessage && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {isRtl ? 'تعذر تحميل بيانات العملاء من الخادم:' : 'Unable to load CRM data from the server:'} {errorMessage}
          </div>
        )}
        {isLoading && !errorMessage && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-300">
            {isRtl ? 'جاري تحميل بيانات العملاء…' : 'Loading CRM data from the server…'}
          </div>
        )}
        <div className="pb-3 border-b border-slate-850 mb-2 font-sans flex justify-between items-center">
          <div>
            <h3 className="font-extrabold text-white text-xs uppercase tracking-wider">{isRtl ? 'بوابة العملاء ونظام الولاء' : 'CRM Customer Database & Loyalty Tiers'}</h3>
            <p className="text-[10px] text-slate-400">{isRtl ? 'تفقد بيانات العملاء ومعدل تكرار الشراء والإنفاق الكلي' : 'Inspect visitor profiles, purchase frequencies and spending levels'}</p>
          </div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-3 py-1 rounded-full font-black tracking-wider uppercase">
            {crm.length} {isRtl ? 'عملاء معتمدين' : 'Authorized Profiles'}
          </span>
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
          {crm.map((cust) => {
            // Colors of loyalty badges
            const tierColors = {
              Bronze: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
              Silver: 'bg-slate-400/10 border-slate-400/20 text-slate-400',
              Gold: 'bg-amber-500/10 border-amber-500/35 text-amber-400 font-extrabold',
              VIP: 'bg-indigo-500/10 border-indigo-500/35 text-indigo-400 font-black animate-pulse',
            }[cust.loyaltyTier] || 'bg-slate-900 border-slate-800';

            return (
              <div key={cust.id} className="p-4 rounded-3xl bg-[#090d16]/40 border border-slate-850 hover:border-slate-750 hover:bg-[#0c101d]/60 shadow-[0_4px_20px_rgba(0,0,0,0.2)] transition duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                
                {/* identity info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-900 text-slate-400 border border-slate-800 rounded-2xl">
                      <Users className="w-4 h-4 text-orange-500" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-white">{cust.name}</h4>
                      <div className="flex gap-2 text-[10px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1 font-mono"><Phone className="w-3 h-3 text-amber-500" /> {cust.phone}</span>
                        {cust.email && <span className="flex items-center gap-1 font-mono"><Mail className="w-3 h-3 text-orange-500" /> {cust.email}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* stats information and loyal badges */}
                <div className="flex items-center gap-4 text-right shrink-0">
                  <div className="text-[11px] font-sans text-slate-400 font-medium leading-normal">
                    <p>{isRtl ? 'طلبات الصالة:' : 'Volume:'} <span className="font-bold font-mono text-white">{cust.ordersCount}</span></p>
                    <p>{isRtl ? 'إجمالي الإنفاق:' : 'Spent:'} <span className="font-bold font-mono text-emerald-400">{cust.totalSpent.toFixed(2)} ر.س</span></p>
                  </div>

                  <div className="text-center space-y-1">
                    <span className={`px-3 py-1 rounded-full text-[9px] border uppercase inline-block font-black tracking-wider ${tierColors}`}>
                      {cust.loyaltyTier}
                    </span>
                    <p className="text-[9px] text-slate-400 font-mono font-bold leading-none block">
                      {cust.points} Points
                    </p>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
