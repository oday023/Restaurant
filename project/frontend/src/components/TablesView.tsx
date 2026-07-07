/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Plus, Users, Grid, RefreshCw, Layers, Printer, Landmark, CheckCircle, Flame, ExternalLink, HelpCircle 
} from 'lucide-react';
import { Table, Hall, TableStatus } from '../types';
import { StorageService } from '../services/db';
import QRCode from './QRCode';

interface TablesViewProps {
  branchId: string;
  language: 'ar' | 'en';
  onAddNotification: (msgAr: string, msgEn: string, type: 'info' | 'success' | 'warning') => void;
}

export default function TablesView({ branchId, language, onAddNotification }: TablesViewProps) {
  const isRtl = language === 'ar';

  const [halls, setHalls] = useState<Hall[]>(() => StorageService.getHalls(branchId));
  const [selectedHallId, setSelectedHallId] = useState<string>('all');
  
  const [tables, setTables] = useState<Table[]>(() => StorageService.getTables(branchId));
  const [activeDrawerTable, setActiveDrawerTable] = useState<Table | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const [loadedHalls, loadedTables] = await Promise.all([
          StorageService.loadHallsFromApi(branchId),
          StorageService.loadTablesFromApi(branchId),
        ]);
        if (!active) return;
        setHalls(loadedHalls);
        setTables(loadedTables);
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load tables');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [branchId]);

  // Print isolating trigger for physical table stickers
  const handlePrintQRSticker = () => {
    if (!activeDrawerTable) return;
    const printWindow = window.open('about:blank', 'PrintTableQR', 'width=400,height=500');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Ticket Table ${activeDrawerTable.number}</title>
            <style>
              body { font-family: monospace; text-align: center; padding: 20px; color: #333; }
              .card { border: 2px dashed #10b981; border-radius: 20px; padding: 25px; margin: 0 auto; max-width: 250px; background: #fff;}
              .logo { font-size: 30px; margin-bottom: 5px; }
              .title { font-size: 20px; font-weight: bold; margin: 0; }
              .tbl { font-size: 40px; font-weight: black; margin: 15px 0; color: #047857; background: #f0fdf4; border-radius: 12px; }
              .pnt { font-size: 11px; color: #666; margin-top: 15px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="logo">🍔</div>
              <div class="title">ORDER DIGITAL MENU</div>
              <div class="tbl">TABLE ${activeDrawerTable.number}</div>
              <div style="display:flex; justify-content:center; margin: 15px 0;">
                <svg width="150" height="150" viewBox="0 0 21 21" style="shape-rendering: crispEdges;">
                  <!-- Mock vector QR layout for direct offline print rendering -->
                  <path d="M0,0 h7 v7 h-7 z M1,1 h5 v5 h-5 z M2,2 h3 v3 h-3 z" fill="#1f2937" />
                  <path d="M14,0 h7 v7 h-7 z M15,1 h5 v5 h-5 z M16,2 h3 v3 h-3 z" fill="#1f2937" />
                  <path d="M0,14 h7 v7 h-7 z M1,15 h5 v5 h-5 z M2,16 h3 v3 h-3 z" fill="#1f2937" />
                  <rect x="9" y="0" width="1" height="6" fill="#1f2937" />
                  <rect x="0" y="9" width="6" height="1" fill="#1f2937" />
                  <rect x="9" y="9" width="3" height="3" fill="#10b981" />
                  <rect x="14" y="9" width="5" height="5" fill="#1f2937" />
                  <rect x="9" y="14" width="5" height="5" fill="#1f2937" />
                </svg>
              </div>
              <div class="pnt">SCAN QR TO ORDER DIRECTLY<br>امسح الكود واطلب مباشرة</div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
    }
  };

  const handleUpdateStatus = async (tableId: string, status: TableStatus) => {
    const freshList = tables.map(t => {
      if (t.id === tableId) {
        const u = { ...t, status };
        if (activeDrawerTable && activeDrawerTable.id === tableId) {
          setActiveDrawerTable(u);
        }
        return u;
      }
      return t;
    });

    const persisted = await StorageService.updateTables(freshList);
    setTables(persisted);
    onAddNotification(
      'تم تحديث حالة الطاولة بنجاح',
      `Table status successfully updated to: ${status}`,
      'success'
    );
  };

  const currentTablesFiltered = useMemo(() => {
    return tables.filter(t => selectedHallId === 'all' || t.hallId === selectedHallId);
  }, [tables, selectedHallId]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fade-in text-slate-200 select-none">
      
      {errorMessage && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {isRtl ? 'تعذر تحميل بيانات الطاولات من الخادم:' : 'Unable to load table data from the server:'} {errorMessage}
        </div>
      )}
      {isLoading && !errorMessage && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-300">
          {isRtl ? 'جاري تحميل بيانات الطاولات…' : 'Loading table data from the server…'}
        </div>
      )}

      {/* LEFT AREA: Floor view grid */}
      <div className="flex-1 space-y-6">
        
        {/* Navigation tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-center glass-panel bg-[#0d121f]/50 p-4 rounded-3xl border border-slate-800/80 shadow-[0_10px_40px_rgba(0,0,0,0.5)] gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-500/10 text-orange-500 rounded-xl border border-orange-500/20">
              <Landmark className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-white text-sm">
                {isRtl ? 'صالة جلوس المطعم وخارطة الطاولات' : 'Dining Room Floor Planner'}
              </h3>
              <p className="text-[10px] text-slate-500">
                {isRtl ? 'تحكم في إشغال الطاولات وإصدار الملصقات الرقمية' : 'Manage occupancy and view digital QR nodes'}
              </p>
            </div>
          </div>

          {/* Hall pill switcher */}
          <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
            <button
              onClick={() => setSelectedHallId('all')}
              className={`py-1.5 px-3.5 rounded-xl text-xs font-black transition-all border cursor-pointer ${selectedHallId === 'all' ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white border-transparent shadow-md' : 'bg-slate-900/60 border-slate-850 text-slate-400 hover:text-white'}`}
            >
              {isRtl ? 'كل الصالات' : 'All Sections'}
            </button>
            {halls.map((h) => (
              <button
                key={h.id}
                onClick={() => setSelectedHallId(h.id)}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-black transition-all border cursor-pointer ${selectedHallId === h.id ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white border-transparent shadow-md' : 'bg-slate-900/60 border-slate-850 text-slate-400 hover:text-white'}`}
              >
                {isRtl ? h.nameAr : h.nameEn}
              </button>
            ))}
          </div>
        </div>

        {/* Floor planner layout of cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {currentTablesFiltered.map((tbl) => {
            
            // Layout modifiers based on status
            const statusConfig = {
              free: { bg: 'border-emerald-500/25 bg-emerald-500/5 text-emerald-400', label: isRtl ? 'فارغة جاهزة' : 'Vacant' },
              reserved: { bg: 'border-blue-500/25 bg-blue-500/5 text-blue-400', label: isRtl ? 'محجوزة مسبقاً' : 'Reserved' },
              busy: { bg: 'border-orange-500/25 bg-orange-500/5 text-orange-400', label: isRtl ? 'مشغولة بزبائن' : 'Busy Dining' },
              cleaning: { bg: 'border-purple-500/25 bg-purple-500/5 text-purple-400 font-extrabold', label: isRtl ? 'تحتاج تعقيم وتطهير' : 'Cleaning' },
            }[tbl.status] || { bg: 'bg-slate-900', label: '' };

            return (
              <div 
                key={tbl.id}
                onClick={() => setActiveDrawerTable(tbl)}
                className={`group rounded-2xl border p-4 flex flex-col justify-between items-center text-center cursor-pointer hover:shadow-2xl hover:border-orange-500/30 shadow-md active:scale-95 transition-all duration-300 bg-[#0d121f]/50 border-slate-850 hover:bg-[#111727]/70 relative overflow-hidden`}
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.01] rounded-full blur-xl"></div>
                {/* Table shape badge */}
                <span className="text-[9px] text-slate-500 font-mono font-black tracking-widest">{isRtl ? 'طاولة' : 'TABLE'}</span>
                
                <h4 className="text-3xl font-black text-white font-mono my-2 tracking-tight group-hover:text-amber-400 transition">
                  {tbl.number}
                </h4>

                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-extrabold mb-4">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>{tbl.seats} {isRtl ? 'مقاعد' : 'Seats'}</span>
                </div>

                {/* Occupancy Indicator */}
                <span className={`w-full text-[9px] font-black text-center py-1 rounded-xl border uppercase tracking-wider ${statusConfig.bg}`}>
                  {statusConfig.label}
                </span>

                {/* Quick Hover view link */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all font-mono">
                  <ExternalLink className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT SIDE DETAILS AND QR GENERATOR PANEL */}
      <div className="w-full lg:w-80">
        {activeDrawerTable ? (
          <div className="glass-panel bg-[#0d121f]/50 rounded-3xl p-5 border border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-5 animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-orange-500/[0.02] rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex justify-between items-start border-b border-slate-850/60 pb-4">
              <div>
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">
                  {isRtl ? 'الصنف التفصيلي للطاولة' : 'Floor unit inspector'}
                </span>
                <h3 className="text-base font-black text-white">
                  {isRtl ? `طاولة رقم #${activeDrawerTable.number}` : `Dining Table #${activeDrawerTable.number}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawerTable(null)}
                className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white px-3 py-1.5 text-[10px] font-black uppercase rounded-xl cursor-pointer transition active:scale-90"
              >
                {isRtl ? 'إغلاق' : 'Close'}
              </button>
            </div>

            {/* Quick occupancies switch inputs */}
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-400 block uppercase tracking-wider">{isRtl ? 'تحويل حالة الإشغال الفعلي:' : 'Switch physical state:'}</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(activeDrawerTable.id, 'free')}
                  className={`py-2 rounded-xl text-[10px] font-black border transition-all cursor-pointer active:scale-95 ${activeDrawerTable.status === 'free' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-950/40 border-slate-850 text-slate-450 hover:text-white'}`}
                >
                  {isRtl ? 'فارغة' : 'Free'}
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(activeDrawerTable.id, 'reserved')}
                  className={`py-2 rounded-xl text-[10px] font-black border transition-all cursor-pointer active:scale-95 ${activeDrawerTable.status === 'reserved' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-950/40 border-slate-850 text-slate-450 hover:text-white'}`}
                >
                  {isRtl ? 'محجوزة' : 'Reserved'}
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(activeDrawerTable.id, 'busy')}
                  className={`py-2 rounded-xl text-[10px] font-black border transition-all cursor-pointer active:scale-95 ${activeDrawerTable.status === 'busy' ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'bg-slate-950/40 border-slate-850 text-slate-450 hover:text-white'}`}
                >
                  {isRtl ? 'مشغولة' : 'Busy'}
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(activeDrawerTable.id, 'cleaning')}
                  className={`py-2 rounded-xl text-[10px] font-black border transition-all cursor-pointer active:scale-95 ${activeDrawerTable.status === 'cleaning' ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-slate-950/40 border-slate-850 text-slate-450 hover:text-white'}`}
                >
                  {isRtl ? 'تنظيف' : 'Clean'}
                </button>
              </div>
            </div>

            {/* Simulated Vector QR display box */}
            <div className="border border-slate-850 p-4 bg-slate-950/40 rounded-2xl flex flex-col items-center">
              <span className="text-[10px] font-black text-slate-400 block mb-3 uppercase tracking-wider text-center">{isRtl ? 'ملصق الـ QR لطلب الزبائن:' : 'Interactive guest QR tag:'}</span>
              
              <div className="p-3.5 bg-white rounded-2xl shadow-inner">
                <QRCode
                  value={`https://qrmenu.saas-resto.com/table/${activeDrawerTable.number}`}
                  size={140}
                  label={`TABLE-${activeDrawerTable.number}`}
                />
              </div>

              <button
                type="button"
                onClick={handlePrintQRSticker}
                className="mt-4 w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white py-3 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 shadow-md"
              >
                <Printer className="w-4 h-4" />
                {isRtl ? 'اطبع بطاقة الطاولة حرارياً' : 'Print QR Label raw'}
              </button>
            </div>

          </div>
        ) : (
          <div className="glass-panel bg-[#0d121f]/40 border border-dashed border-slate-800 p-8 rounded-3xl text-center text-slate-500">
            <HelpCircle className="w-12 h-12 mx-auto stroke-1 mb-2 text-slate-600" />
            <p className="text-xs font-bold leading-relaxed">
              {isRtl ? 'اضغط على كرت أي طاولة لتفعيل نظام الـ QR والتحكم بالإشغال.' : 'Click any floor table to inspect QR node metadata.'}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
