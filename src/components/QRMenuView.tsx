/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Heart, ShoppingCart, Search, Utensils, Info, Check, Plus, Minus, Send, CheckCircle2, ListFilter, AlertCircle, Sparkles, ChevronRight, X 
} from 'lucide-react';
import { MenuItem, Category, Order, OrderItem, MenuItemExtra, Tenant, Table } from '../types';
import { StorageService } from '../services/db';

interface QRMenuViewProps {
  tenant: Tenant;
  tables: Table[];
  language: 'ar' | 'en';
  onAddNotification: (msgAr: string, msgEn: string, type: 'info' | 'success' | 'warning') => void;
}

export default function QRMenuView({ tenant, tables, language, onAddNotification }: QRMenuViewProps) {
  const isRtl = language === 'ar';

  // State configurations
  const [activeTableId, setActiveTableId] = useState<string>(tables[0]?.id || 'tbl_1_1');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mobile Cart State
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  // Modifiers overlay
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [modifierQty, setModifierQty] = useState(1);
  const [modifierExtras, setModifierExtras] = useState<MenuItemExtra[]>([]);
  const [modifierNote, setModifierNote] = useState('');

  // Submitted order tracking list
  const [submittedOrders, setSubmittedOrders] = useState<Order[]>([]);
  const [submittedStatusView, setSubmittedStatusView] = useState<Order | null>(null);

  // Load menu
  const categories = useMemo(() => StorageService.getCategories(tenant.id).filter(c => c.isActive), [tenant.id]);
  const menuItems = useMemo(() => StorageService.getMenuItems(tenant.id).filter(i => i.isAvailable), [tenant.id]);

  const activeTable = useMemo(() => tables.find(t => t.id === activeTableId), [tables, activeTableId]);

  // Filter items
  const filteredItems = useMemo(() => {
    return menuItems.filter((i) => {
      const matchCat = selectedCategory === 'all' || i.categoryId === selectedCategory;
      const matchSearch =
        i.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.nameEn.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Handle cart mutation
  const handleAddToCart = () => {
    if (!selectedItem) return;

    const cartId = `${selectedItem.id}-${modifierExtras.map(e => e.nameEn).join('-')}-${modifierNote}`;
    const existingIdx = cart.findIndex(c => c.id === cartId);

    if (existingIdx >= 0) {
      const updated = [...cart];
      updated[existingIdx].quantity += modifierQty;
      setCart(updated);
    } else {
      const newItem: OrderItem = {
        id: cartId,
        menuItemId: selectedItem.id,
        nameAr: selectedItem.nameAr,
        nameEn: selectedItem.nameEn,
        quantity: modifierQty,
        price: selectedItem.price,
        notes: modifierNote || undefined,
        selectedExtras: modifierExtras
      };
      setCart([...cart, newItem]);
    }

    setSelectedItem(null);
    onAddNotification(
      'تمت إضافة الوجبة إلى طلبيات الطاولة تفاعلياً',
      'Meal added successfully to your digital table basket',
      'success'
    );
  };

  const toggleExtra = (ex: MenuItemExtra) => {
    if (modifierExtras.some(e => e.nameEn === ex.nameEn)) {
      setModifierExtras(modifierExtras.filter(e => e.nameEn !== ex.nameEn));
    } else {
      setModifierExtras([...modifierExtras, ex]);
    }
  };

  const updateCartQty = (id: string, delta: number) => {
    const updated = cart.map(item => {
      if (item.id === id) {
        const nQty = item.quantity + delta;
        return nQty > 0 ? { ...item, quantity: nQty } : null;
      }
      return item;
    }).filter(Boolean) as OrderItem[];
    setCart(updated);
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, i) => {
      const exs = i.selectedExtras.reduce((s, e) => s + e.price, 0);
      return sum + (i.price + exs) * i.quantity;
    }, 0);
  }, [cart]);

  // Submit actual order to KDS and database
  const handleSubmitQRAction = async () => {
    if (cart.length === 0) return;

    const taxAmount = (cartTotal * tenant.taxPercent) / 100;
    const serviceAmount = (cartTotal * tenant.servicePercent) / 100;
    const total = cartTotal + taxAmount + serviceAmount;

    const newOrder: Order = {
      id: `ord_${Date.now()}`,
      tenantId: tenant.id,
      branchId: tables[0]?.id ? 'b1_1' : 'b1_1', // default branch
      tableId: activeTableId,
      type: 'dine_in',
      status: 'new', // goes directly to kitchen queue
      items: cart,
      subtotal: cartTotal,
      taxAmount,
      serviceAmount,
      discountAmount: 0,
      total,
      customerName: guestName || (isRtl ? 'عميل كيو-آر طاولة' : 'QR Guest Visitor'),
      customerPhone: guestPhone || '0500000000',
      paymentMethod: 'unpaid',
      paymentStatus: 'unpaid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: notes || undefined
    };

    const savedOrder = await StorageService.saveOrder(newOrder, true);
    
    // Add to submitted list to track live progress inside mobile viewport!
    setSubmittedOrders([savedOrder, ...submittedOrders]);
    setSubmittedStatusView(savedOrder);

    // Reset Mobile inputs
    setCart([]);
    setNotes('');
    setIsCartOpen(false);

    onAddNotification(
      'تم إرسال طلبك من الطاولة مباشرة إلى تحضير المطبخ!',
      'Your order has been sent directly to the kitchen chef line!',
      'success'
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 bg-transparent rounded-3xl p-1 md:p-2 min-h-[82vh] text-slate-200 select-none animate-fade-in">
      
      {/* LEFT CONTROL RAIL: Table simulation switcher */}
      <div className="w-full lg:w-72 glass-panel bg-[#111827] border border-slate-800/80 rounded-3xl p-5 shadow-[0_10px_24px_rgba(0,0,0,0.24)] flex flex-col justify-start relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <h4 className="text-xs font-black text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
          {isRtl ? 'محاكاة ماسح QR من الجوال' : 'Mobile Web-Menu Sandbox'}
        </h4>
        <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
          {isRtl 
            ? 'حدد الطاولة لمحاكاة قراءة كود الـ QR الخاص بها بواسطة هاتف الزبون لتجربة الفوترة والطلب الذاتي المباشر.' 
            : 'Select table number below to simulate a user scanning the real table physical QR tag on their mobile phone.'}
        </p>

        <span className="text-xs font-extrabold text-slate-400 block mb-1.5 uppercase tracking-wider">{isRtl ? 'اختر طاولة للزيارة:' : 'Set target simulated table:'}</span>
        <div className="grid grid-cols-4 gap-1.5 mb-6">
          {tables.map(t => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTableId(t.id);
                setSubmittedStatusView(null);
              }}
              className={`py-2 text-center rounded-xl font-mono text-xs font-black border transition-all cursor-pointer active:scale-95 ${activeTableId === t.id ? 'bg-orange-600 text-white border-transparent shadow-sm' : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'}`}
            >
              {t.number}
            </button>
          ))}
        </div>

        {/* List of orders submitted by mobile scanner to track preparation state */}
        {submittedOrders.length > 0 && (
          <div className="border-t border-slate-850/60 pt-4 space-y-2">
            <span className="text-xs font-extrabold text-slate-400 block uppercase tracking-wider">{isRtl ? 'طلباتك المرسلة للمطبخ:' : 'Your Active Table Bills:'}</span>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {submittedOrders.map(so => {
                const liveOrder = StorageService.getOrders(tenant.id).find(o => o.id === so.id) || so;
                return (
                  <button
                    key={so.id}
                    onClick={() => setSubmittedStatusView(liveOrder)}
                    className="w-full bg-slate-950/40 hover:bg-slate-900/40 p-3 border border-slate-850 rounded-2xl text-left text-[11px] font-mono font-bold flex justify-between items-center text-slate-300 cursor-pointer active:scale-98 transition duration-200"
                  >
                    <div>
                      <p className="text-white font-extrabold">INV-{so.id.slice(-5).toUpperCase()}</p>
                      <p className="text-[9px] text-slate-500">{new Date(so.createdAt).toLocaleTimeString()}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      liveOrder.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      liveOrder.status === 'ready' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' :
                      liveOrder.status === 'preparing' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}>
                      {isRtl ? { new: 'انتظار', preparing: 'تحضير', ready: 'جاهز!', delivered: 'تم التقديم', cancelled: 'ملغي' }[liveOrder.status] : liveOrder.status}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PREVIEW SCREEN: Simulated Customer Smartphone Frame */}
      <div className="flex-1 flex justify-center items-start">
        
        {/* Phone Frame Housing */}
        <div className="w-full max-w-[375px] bg-[#090d16] border-[10px] border-slate-900 rounded-[44px] shadow-[0_25px_60px_rgba(0,0,0,0.8)] relative flex flex-col justify-between overflow-hidden min-h-[720px] max-h-[800px]">
          
          {/* Phone Notch & Ear Speaker */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-6 bg-slate-900 rounded-b-2xl z-50 flex items-center justify-center border-b border-slate-850">
            <div className="w-12 h-1 bg-slate-950 rounded-full mb-1"></div>
          </div>

          {/* Scrolling Web Page Frame */}
          <div className="flex-1 overflow-y-auto px-4 pt-10 pb-20 scrollbar-none bg-[#090d16] text-slate-200">
            
            {/* 1. Brand Logo Spot & banner */}
            <div className="text-center py-4 border-b border-dashed border-slate-850 mb-4 bg-slate-950/40 rounded-3xl p-3">
              <span className="text-3.5xl drop-shadow-md">{tenant.logoUrl || '🍔'}</span>
              <h2 className="text-sm font-black text-white mt-1 uppercase tracking-tight">
                {isRtl ? tenant.nameAr : tenant.nameEn}
              </h2>
              <p className="text-[9px] font-bold text-slate-500">
                {isRtl ? 'فرع السليمانية • قائمة الطلب الرقمية' : 'Al-Sulaimania Branch • Direct Ordering'}
              </p>
              
              <div className="mt-2.5 bg-gradient-to-r from-orange-600 to-amber-500 text-white font-mono font-black text-[10px] py-1 px-3.5 rounded-full inline-flex items-center gap-1 shadow-md">
                {isRtl ? `طاولة رقم: ${activeTable?.number || '101'}` : `Dining Table: ${activeTable?.number || '101'}`}
              </div>
            </div>

            {/* Check if tracking submittal status */}
            {submittedStatusView ? (
              <div className="space-y-4 py-4 animate-fade-in text-slate-300">
                <div className="text-center">
                  <CheckCircle2 className="w-12 h-12 text-amber-500 mx-auto animate-bounce mb-2.5" />
                  <h3 className="font-extrabold text-white text-xs">
                    {isRtl ? 'طلبك قيد التحضير في المطبخ!' : 'Chef started cooking!'}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    INV-{submittedStatusView.id.slice(-6).toUpperCase()}
                  </p>
                </div>

                {/* Progress bar visual */}
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-850 space-y-3">
                  <div className="flex justify-between text-[9px] font-black tracking-wider uppercase">
                    <span className={submittedStatusView.status === 'new' ? 'text-orange-500' : 'text-slate-500'}>
                      {isRtl ? '١. الانتظار' : '1. Queued'}
                    </span>
                    <span className={submittedStatusView.status === 'preparing' ? 'text-amber-500 animate-pulse' : 'text-slate-500'}>
                      {isRtl ? '٢. التحضير' : '2. Cooking'}
                    </span>
                    <span className={submittedStatusView.status === 'ready' ? 'text-white font-black scale-105' : 'text-slate-500'}>
                      {isRtl ? '٣. جاهز!' : '3. Ready!'}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-850">
                    <div className={`h-full bg-gradient-to-r from-orange-600 to-amber-500 transition-all duration-1000 ${
                      submittedStatusView.status === 'new' ? 'w-1/3' :
                      submittedStatusView.status === 'preparing' ? 'w-2/3' : 'w-full'
                    }`}></div>
                  </div>
                </div>

                {/* Table Receipt Items list */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">{isRtl ? 'المجموعات المطلوبة:' : 'Your ordered meals:'}</span>
                  {submittedStatusView.items.map((item, idX) => (
                    <div key={idX} className="p-2.5 bg-slate-950/40 border border-slate-900 rounded-xl text-xs flex justify-between text-slate-300">
                      <span>x{item.quantity} {isRtl ? item.nameAr : item.nameEn}</span>
                      <span className="font-mono font-bold text-slate-200">{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t border-dashed border-slate-800 pt-2 flex justify-between text-xs font-black text-white">
                    <span>{isRtl ? 'المجموع النهائي:' : 'Grand Total:'}</span>
                    <span className="text-amber-500 font-mono">{submittedStatusView.total.toFixed(2)} {isRtl ? tenant.currencyAr : tenant.currencyEn}</span>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => setSubmittedStatusView(null)}
                    className="w-full flex items-center justify-center gap-1 text-[11px] font-black uppercase text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-850 py-3 rounded-2xl border border-slate-800 transition-all cursor-pointer active:scale-95"
                  >
                    <ChevronRight className="w-4 h-4 text-orange-500" />
                    {isRtl ? 'العودة لتصفح المنيو والطلب مرة أخرى' : 'Order more dishes'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 2. Category horizontal scroll */}
                <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`py-1.5 px-3.5 rounded-full text-[10px] font-black whitespace-nowrap transition-all border cursor-pointer ${selectedCategory === 'all' ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white border-transparent' : 'bg-slate-950/60 border-slate-850 text-slate-400'}`}
                  >
                    {isRtl ? 'الكل' : 'All'}
                  </button>
                  {categories.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCategory(c.id)}
                      className={`py-1.5 px-3.5 rounded-full text-[10px] font-black whitespace-nowrap transition-all border cursor-pointer ${selectedCategory === c.id ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white border-transparent' : 'bg-slate-950/60 border-slate-850 text-slate-400'}`}
                    >
                      {isRtl ? c.nameAr : c.nameEn}
                    </button>
                  ))}
                </div>

                {/* Search Bar inside Mobile viewport */}
                <div className="relative mb-4">
                  <Search className="absolute top-2.5 w-3.5 h-3.5 text-slate-500 left-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isRtl ? 'ابحث عن وجبة، شاورما، مقبلات...' : 'Search delicious Shawarma...'}
                    className="w-full bg-[#0d121f]/60 border border-slate-850 pl-9 pr-3.5 py-1.5 rounded-xl text-[10px] text-white focus:outline-none focus:border-orange-500 font-bold placeholder-slate-550"
                  />
                </div>

                {/* 3. Product list visual columns */}
                <div className="space-y-3">
                  {filteredItems.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => {
                        setSelectedItem(item);
                        setModifierQty(1);
                        setModifierExtras([]);
                        setModifierNote('');
                      }}
                      className="flex gap-2.5 p-2.5 rounded-2xl bg-slate-950/40 hover:bg-slate-900/40 border border-slate-900 hover:border-slate-800 transition-all cursor-pointer duration-200 active:scale-98"
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-900">
                        <img src={item.imageUrl} alt={item.nameEn} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <h4 className="text-[11px] font-extrabold text-white line-clamp-1">
                            {isRtl ? item.nameAr : item.nameEn}
                          </h4>
                          <p className="text-[9px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">
                            {isRtl ? item.descriptionAr : item.descriptionEn}
                          </p>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="font-mono font-black text-amber-500 text-[11px]">
                            {item.price.toFixed(2)} {isRtl ? tenant.currencyAr : tenant.currencyEn}
                          </span>
                          <span className="w-5 h-5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-500 text-white flex items-center justify-center text-xs shadow-md">
                            <Plus className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

          </div>

          {/* Phone Bottom Sticky Order Bar */}
          {!submittedStatusView && cart.length > 0 && (
            <div className="absolute bottom-4 left-0 right-0 px-4 z-40">
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-3 rounded-2xl shadow-sm flex items-center justify-between px-4 text-xs transition cursor-pointer active:scale-95"
              >
                <div className="flex items-center gap-2">
                  <div className="bg-white/15 p-1.5 rounded-lg relative border border-white/10">
                    <ShoppingCart className="w-4 h-4" />
                    <span className="absolute -top-1 -right-1.5 bg-rose-600 text-white font-mono text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-orange-500">
                      {cart.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  </div>
                  <span>{isRtl ? 'استعرض تذكرة طلباتك' : 'Review Basket'}</span>
                </div>
                <span className="font-mono font-black">{cartTotal.toFixed(2)} {isRtl ? tenant.currencyAr : tenant.currencyEn}</span>
              </button>
            </div>
          )}

          {/* SMARTPHONE DIGITAL MODIFIER OVERLAY */}
          {selectedItem && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-end">
              <div className="bg-[#090d16] border-t border-slate-850 rounded-t-[32px] w-full p-5 space-y-4 max-h-[85%] overflow-y-auto">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-900">
                  <h4 className="text-xs font-black text-white">
                    {isRtl ? selectedItem.nameAr : selectedItem.nameEn}
                  </h4>
                  <button 
                    type="button"
                    onClick={() => setSelectedItem(null)} 
                    className="p-1.5 rounded-full bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {selectedItem.extras && selectedItem.extras.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">{isRtl ? 'إضافات الطعام المتاحة:' : 'Extra toppings:'}</span>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedItem.extras.map((ex, exIdx) => {
                        const isChecked = modifierExtras.some(e => e.nameEn === ex.nameEn);
                        return (
                          <button
                            key={exIdx}
                            type="button"
                            onClick={() => toggleExtra(ex)}
                            className={`p-2.5 rounded-xl text-center border text-[10px] font-extrabold transition-all cursor-pointer ${isChecked ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:text-white'}`}
                          >
                            {isRtl ? ex.nameAr : ex.nameEn} (+{ex.price} ر.س)
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block mb-1.5 uppercase tracking-wider">{isRtl ? 'طلب خاص للمطبخ:' : 'Custom cooking request:'}</span>
                  <input
                    type="text"
                    value={modifierNote}
                    onChange={(e) => setModifierNote(e.target.value)}
                    placeholder={isRtl ? 'مثال: بدون كاتشب، زيادة ثوم...' : 'Example: No sauce please...'}
                    className="w-full bg-slate-950/40 border border-slate-850 p-2.5 rounded-xl text-[10px] text-white focus:outline-none focus:border-orange-500 placeholder-slate-600"
                  />
                </div>

                <div className="flex items-center justify-between bg-slate-950/40 border border-slate-900 p-3 rounded-xl">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{isRtl ? 'تحضير الكمية:' : 'Volume:'}</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setModifierQty(Math.max(1, modifierQty - 1))}
                      className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer active:scale-90"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono font-black text-xs text-amber-500">{modifierQty}</span>
                    <button
                      type="button"
                      onClick={() => setModifierQty(modifierQty + 1)}
                      className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer active:scale-90"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black py-3 rounded-2xl text-xs active:scale-95 transition-all text-center cursor-pointer shadow-md"
                >
                  {isRtl ? 'أكد الصنف' : 'Add to Table Order'}
                </button>
              </div>
            </div>
          )}

          {/* MOBILE DIGITAL MINI CART DRAWER */}
          {isCartOpen && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-end">
              <div className="bg-[#090d16] border-t border-slate-850 rounded-t-[32px] w-full p-5 space-y-4 max-h-[85%] overflow-y-auto flex flex-col justify-between">
                
                <div>
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-900">
                    <h4 className="text-xs font-black text-white">
                      {isRtl ? 'مراجعة تذكرة الطاولة وجباتك' : 'Review Table Items'}
                    </h4>
                    <button 
                      type="button" 
                      onClick={() => setIsCartOpen(false)} 
                      className="p-1.5 rounded-full bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* CRM inputs inside QR guest */}
                  <div className="py-3 border-b border-dashed border-slate-850 space-y-2.5">
                    <span className="text-[9px] font-black text-amber-400 block bg-orange-500/10 px-2.5 py-1 rounded uppercase tracking-wider border border-orange-500/10">{isRtl ? 'سجل هويتك لكسب نقاط الولاء:' : 'Leave details to gain Loyalty rewards:'}</span>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder={isRtl ? 'اسمك لتسمية الطلبية...' : 'Your Name...'}
                      className="w-full bg-[#0d121f]/60 border border-slate-850 px-3.5 py-2 rounded-xl text-[10px] text-white focus:outline-none focus:border-orange-500"
                    />
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder={isRtl ? 'جوالك لكسب النقاط (مهم)...' : 'Phone for loyalty benefits...'}
                      className="w-full bg-[#0d121f]/60 border border-slate-850 px-3.5 py-2 rounded-xl text-[10px] text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  {/* Cart scroll log */}
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 py-2">
                    {cart.map(item => (
                      <div key={item.id} className="p-3 bg-slate-950/40 border border-slate-900 rounded-2xl flex justify-between items-center text-xs text-slate-300">
                        <div>
                          <p className="font-extrabold text-white">{isRtl ? item.nameAr : item.nameEn}</p>
                          {item.selectedExtras.length > 0 && (
                            <p className="text-[9px] text-slate-500 mt-0.5">
                              + {item.selectedExtras.map(e => isRtl ? e.nameAr : e.nameEn).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateCartQty(item.id, -1)} className="p-1 rounded bg-slate-900 text-slate-400 hover:text-white cursor-pointer"><Minus className="w-3 h-3" /></button>
                          <span className="font-mono font-black text-xs text-amber-500 w-5 text-center">{item.quantity}</span>
                          <button onClick={() => updateCartQty(item.id, 1)} className="p-1 rounded bg-slate-900 text-slate-400 hover:text-white cursor-pointer"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>

                <div className="pt-3 border-t border-slate-900 space-y-3.5">
                  <div className="flex justify-between text-xs font-black text-white">
                    <span>{isRtl ? 'الحساب المطلوب:' : 'Table Order Total:'}</span>
                    <span className="text-amber-500 font-mono text-sm">{cartTotal.toFixed(2)} {isRtl ? tenant.currencyAr : tenant.currencyEn}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitQRAction}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-3.5 rounded-2xl text-xs flex justify-center items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4 shrink-0" />
                    {isRtl ? '🔥 إرسال الطلبية للمطبخ فوراً' : '🔥 Submit Kitchen Order'}
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
