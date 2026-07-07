/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, CheckCircle, Flame, ChefHat, AlertTriangle, Play, RefreshCw, Layers, Check, BellRing 
} from 'lucide-react';
import { Order, OrderStatus, Tenant } from '../types';
import { StorageService } from '../services/db';

interface KDSViewProps {
  tenant: Tenant;
  language: 'ar' | 'en';
  onAddNotification: (msgAr: string, msgEn: string, type: 'info' | 'success' | 'warning') => void;
}

export default function KDSView({ tenant, language, onAddNotification }: KDSViewProps) {
  const isRtl = language === 'ar';

  const [orders, setOrders] = useState<Order[]>(() => StorageService.getOrders(tenant.id));
  const [filterType, setFilterType] = useState<string>('all'); // all, dine_in, takeaway, delivery

  // Force tick state to reload elapsed time indicators every second
  const [secondsTick, setSecondsTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll for new order changes every 4 seconds to maintain the "realtime" simulation feel
  useEffect(() => {
    const pollInterval = setInterval(() => {
      const freshOrders = StorageService.getOrders(tenant.id);
      // Play high-frequency microwave chime if a brand new order is added
      const oldNewsCount = orders.filter((o) => o.status === 'new').length;
      const newNewsCount = freshOrders.filter((o) => o.status === 'new').length;
      if (newNewsCount > oldNewsCount) {
        triggerBeep();
      }
      setOrders(freshOrders);
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [orders, tenant.id]);

  const triggerBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 high pitch
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // Safe environment bypass
    }
  };

  // Status transitions
  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    const match = orders.find((o) => o.id === orderId);
    if (!match) return;

    const updatedOrder = { ...match, status: nextStatus, updatedAt: new Date().toISOString() };
    
    // Save order changes (automatically manages database state, stock reduction or transaction postings)
    await StorageService.saveOrder(updatedOrder, true);
    
    // Refresh states
    const fresh = StorageService.getOrders(tenant.id);
    setOrders(fresh);

    // Audio alerts
    if (nextStatus === 'ready') {
      triggerBeep();
      onAddNotification(
        `الطلبية INV-${orderId.slice(-6).toUpperCase()} جاهزة الآن للتسليم`,
        `Order INV-${orderId.slice(-6).toUpperCase()} is ready for service!`,
        'success'
      );
    } else {
      onAddNotification(
        `تم تغيير حالة الطلب لمرحلة: ${nextStatus === 'preparing' ? 'جاري الطبخ' : 'تم التسليم والخدمة'}`,
        `Order stage updated to: ${nextStatus}`,
        'info'
      );
    }
  };

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Show only unfinished kitchen states: 'new', 'preparing', 'ready'
      const isKitchenActive = o.status === 'new' || o.status === 'preparing' || o.status === 'ready';
      const isCorrectType = filterType === 'all' || o.type === filterType;
      return isKitchenActive && isCorrectType;
    });
  }, [orders, filterType]);

  // Sorting: Put preparing and oldest orders first (urgency queue)
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      // Preparing has priority over New
      if (a.status === 'preparing' && b.status === 'new') return -1;
      if (a.status === 'new' && b.status === 'preparing') return 1;
      
      // Secondary sorting on waiting time (timestamp oldest first)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [filteredOrders]);

  // Elapsed Time calculator in text
  const getElapsedTimeText = (createdAt: string) => {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const totalSecs = Math.floor(diffMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    
    return {
      minutes: mins,
      text: `${mins}:${secs < 10 ? '0' : ''}${secs}`,
      isOverdue: mins >= 12, // More than 12 mins in kitchen is overdue (red alert)
    };
  };

  const forceRefresh = () => {
    const raw = StorageService.getOrders(tenant.id);
    setOrders(raw);
    triggerBeep();
    onAddNotification('تم تحديث شاشة المطبخ يدوياً', 'KDS screen refreshed manually', 'info');
  };

  return (
    <div className="bg-transparent rounded-3xl p-1 md:p-2 relative min-h-[82vh] animate-fade-in select-none">
      
      {/* 1. Header controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between pb-5 border-b border-slate-850/60 mb-6 text-white">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-2xl border border-orange-500/20">
            <ChefHat className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-black flex items-center gap-2">
              {isRtl ? 'نظام المطبخ وشاشة التحضير KDS' : 'Kitchen Display System (KDS)'}
              <span className="text-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-400 font-extrabold px-2.5 py-0.5 rounded-full shadow-inner animate-pulse">
                {orders.filter((o) => o.status === 'new' || o.status === 'preparing').length} {isRtl ? 'قيد الانتظار' : 'Pending'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {isRtl ? 'لوحة المطبخ الموحدة لمراقبة الطبخ وتحضير الوجبات' : 'Unified display for chefs and line stations'}
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex gap-2 items-center w-full lg:w-auto overflow-x-auto justify-end">
          
          <button
            type="button"
            onClick={forceRefresh}
            className="p-2.5 bg-slate-900/60 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-300 transition-all flex items-center gap-1.5 text-xs font-black cursor-pointer shadow-md active:scale-95"
          >
            <RefreshCw className="w-4 h-4 text-orange-500" />
            {isRtl ? 'مزامنة سريعة' : 'Sync'}
          </button>

          <div className="bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800 flex gap-1 shadow-inner">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${filterType === 'all' ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md' : 'text-slate-300 hover:text-white'}`}
            >
              {isRtl ? 'الكل' : 'All'}
            </button>
            <button
              onClick={() => setFilterType('dine_in')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${filterType === 'dine_in' ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md' : 'text-slate-300 hover:text-white'}`}
            >
              {isRtl ? 'صالة داخلي' : 'Dine'}
            </button>
            <button
              onClick={() => setFilterType('takeaway')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${filterType === 'takeaway' ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md' : 'text-slate-300 hover:text-white'}`}
            >
              {isRtl ? 'سفري' : 'Takeaway'}
            </button>
            <button
              onClick={() => setFilterType('delivery')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${filterType === 'delivery' ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md' : 'text-slate-300 hover:text-white'}`}
            >
              {isRtl ? 'توصيل' : 'Delivery'}
            </button>
          </div>

        </div>
      </div>

      {/* 2. Kitchen tickets display card deck */}
      {sortedOrders.length === 0 ? (
        <div className="text-center py-28 text-slate-500 glass-panel bg-[#0d121f]/40 rounded-3xl border border-dashed border-slate-800">
          <CheckCircle className="w-16 h-16 mx-auto stroke-1 mb-4 text-orange-500 animate-bounce" />
          <h3 className="font-extrabold text-white text-base">
            {isRtl ? 'جميع تذاكر المطبخ منتهية ونظيفة!' : 'All kitchen tickets cleared!'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {isRtl ? 'بانتظار طلبات جديدة من الكاشير وتطبيقات هاتف QR...' : 'Waiting for incoming cashiers or mobile QR table orders...'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {sortedOrders.map((order) => {
            const timeInfo = getElapsedTimeText(order.createdAt);
            
            // Color based on urgency state
            const urgencyBg = timeInfo.isOverdue 
              ? 'bg-[#1b0a0e]/90 border-rose-500/65 shadow-[0_4px_30px_rgba(239,68,68,0.2)] animate-pulse' 
              : order.status === 'preparing'
              ? 'bg-[#18110b]/90 border-amber-500/50 shadow-[0_4px_30px_rgba(245,158,11,0.15)]'
              : 'bg-[#0d121f]/90 border-slate-800 hover:border-slate-750';

            return (
              <div 
                key={order.id}
                className={`rounded-2xl border p-4 flex flex-col justify-between transition-all duration-300 shadow-xl group ${urgencyBg}`}
              >
                <div>
                  {/* Card head metadata */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-850 mb-3 text-white">
                    <div>
                      <h4 className="font-black text-xs tracking-widest font-mono text-white group-hover:text-amber-400 transition">
                        INV-{order.id.slice(-5).toUpperCase()}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase ${
                          order.type === 'dine_in' 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15' 
                            : 'bg-orange-500/10 text-orange-400 border border-orange-500/15'
                        }`}>
                          {order.type === 'dine_in' 
                            ? (isRtl ? 'طاولة ' + (order.tableId?.split('_').pop() || '101') : 'Table ' + (order.tableId?.split('_').pop() || '101'))
                            : (isRtl ? 'سفري سفري' : 'Takeaway')}
                        </span>
                      </div>
                    </div>

                    {/* Timer */}
                    <div className={`flex items-center gap-1 text-[10px] font-mono font-black px-2.5 py-1 rounded-xl bg-slate-950/60 border ${timeInfo.isOverdue ? 'text-rose-400 border-rose-500/30 animate-pulse' : 'text-slate-400 border-slate-900'}`}>
                      <Clock className="w-3.5 h-3.5 text-orange-500" />
                      <span>{timeInfo.text}</span>
                    </div>
                  </div>

                  {/* Cooking list */}
                  <div className="space-y-2 my-3 flex-1">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-900">
                        <div className="flex justify-between items-start">
                          <p className="text-[11px] font-extrabold text-slate-200">
                            <span className="text-amber-500 font-mono font-black text-xs mr-1.5">
                              x{item.quantity}
                            </span>
                            {isRtl ? item.nameAr : item.nameEn}
                          </p>
                        </div>
                        
                        {/* Extras list display in yellow code */}
                        {item.selectedExtras.length > 0 && (
                          <p className="text-[9px] text-amber-500 mt-1 font-extrabold">
                            + {item.selectedExtras.map(ex => isRtl ? ex.nameAr : ex.nameEn).join(', ')}
                          </p>
                        )}

                        {item.notes && (
                          <div className="mt-1 bg-rose-500/10 border border-rose-500/20 text-[9px] text-rose-400 p-1.5 rounded-lg font-sans italic">
                            * {item.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Operations footer controls based on order State */}
                <div className="border-t border-slate-850/60 pt-3 mt-3">
                  {order.status === 'new' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order.id, 'preparing')}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-orange-500/30 text-slate-300 hover:text-white font-extrabold transition-all duration-200 cursor-pointer active:scale-95"
                    >
                      <ChefHat className="w-4 h-4 text-orange-500" />
                      {isRtl ? 'اقبل وابدأ الطبخ' : 'Accept & Start Preparation'}
                    </button>
                  )}

                  {order.status === 'preparing' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order.id, 'ready')}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black transition-all duration-200 cursor-pointer active:scale-95 shadow-md"
                    >
                      <Flame className="w-4 h-4 animate-bounce" />
                      {isRtl ? 'اكتمل الطبخ وجاهز للتسليم' : 'Mark as Ready to Serve'}
                    </button>
                  )}

                  {order.status === 'ready' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, 'delivered')}
                        className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-[11px] bg-slate-950 hover:bg-slate-900 border border-slate-850 text-emerald-400 font-extrabold transition cursor-pointer active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {isRtl ? 'تسليم وإنهاء' : 'Settle'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerBeep();
                          onAddNotification(
                            `تم إصدار تنبيه صوتي لطلب #${order.id.slice(-6).toUpperCase()}`,
                            `Audio pager ping sent for order #${order.id.slice(-6).toUpperCase()}`,
                            'info'
                          );
                        }}
                        className="py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-500 hover:text-orange-400 border border-slate-850 cursor-pointer active:scale-95"
                      >
                        <BellRing className="w-4 h-4 animate-swing" />
                      </button>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
