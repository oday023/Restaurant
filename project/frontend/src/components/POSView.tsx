/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Plus, Minus, Trash2, Tag, Receipt, Users, ArrowLeftRight, Check, AlertCircle, ShoppingBag, Grid, Sliders, Utensils, HelpCircle, UserPlus, CreditCard, DollarSign, Wallet, X, Clock, CheckCircle
} from 'lucide-react';
import { MenuItem, OrderItem, MenuItemExtra, Order, Table, CustomerCRM, Coupon, Tenant, Branch, OrderStatus } from '../types';
import { StorageService } from '../services/db';
import ThermalReceipt from './ThermalReceipt';

interface POSViewProps {
  tenant: Tenant;
  branch: Branch;
  language: 'ar' | 'en';
  onAddNotification: (msgAr: string, msgEn: string, type: 'info' | 'success' | 'warning') => void;
}

export default function POSView({ tenant, branch, language, onAddNotification }: POSViewProps) {
  const isRtl = language === 'ar';

  // 1. Core State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in');
  
  // Table state
  const tables = StorageService.getTables(branch.id);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  
  // CRM state
  const crmCustomers = StorageService.getCRM(tenant.id);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerCRM | null>(null);
  const [crmSearch, setCrmSearch] = useState('');
  const [isCrmOpen, setIsCrmOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Modals & modifiers state
  const [modifierItem, setModifierItem] = useState<MenuItem | null>(null);
  const [modifierQuantity, setModifierQuantity] = useState(1);
  const [modifierSelectedExtras, setModifierSelectedExtras] = useState<MenuItemExtra[]>([]);
  const [modifierNotes, setModifierNotes] = useState('');

  // Payment State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'wallet'>('cash');
  const [amountPaid, setAmountPaid] = useState<string>('');
  
  // Active / History Orders view state
  const [activeTab, setActiveTab2] = useState<'new_order' | 'active_orders'>('new_order');
  const [allOrders, setAllOrders] = useState<Order[]>(() => StorageService.getOrders(tenant.id, branch.id));
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);
  const [loadedOrderId, setLoadedOrderId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [orders] = await Promise.all([
          StorageService.loadOrdersFromApi(tenant.id, branch.id),
          StorageService.loadTablesFromApi(branch.id),
          StorageService.loadCRMFromApi(tenant.id),
        ]);
        setAllOrders(orders);
      } catch (error) {
        console.warn('Failed to refresh POS API data', error);
        setAllOrders(StorageService.getOrders(tenant.id, branch.id));
      }
    })();
  }, [tenant.id, branch.id]);

  // Split billing state
  const [splitCount, setSplitCount] = useState<number>(1);
  const [isSplitOpen, setIsSplitOpen] = useState(false);

  // Table shifting states
  const [isShiftingOpen, setIsShiftingOpen] = useState(false);
  const [shiftTargetTableId, setShiftTargetTableId] = useState('');

  // 2. Load lists
  const categories = useMemo(() => StorageService.getCategories(tenant.id), [tenant.id]);
  const menuItems = useMemo(() => StorageService.getMenuItems(tenant.id), [tenant.id]);

  // Filter products
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.categoryId === selectedCategory;
      const matchSearch = 
        item.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.descriptionAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.descriptionEn.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // 3. Cart Actions
  const handleItemClick = (item: MenuItem) => {
    if (!item.isAvailable) {
      onAddNotification('هذا الصنف غير متوفر حالياً', 'This item is currently unavailable', 'warning');
      return;
    }
    // Open modifier selector modal
    setModifierItem(item);
    setModifierQuantity(1);
    setModifierSelectedExtras([]);
    setModifierNotes('');
  };

  const handleAddModifierToCart = () => {
    if (!modifierItem) return;

    const cartItemId = `${modifierItem.id}-${modifierSelectedExtras.map(e => e.nameEn).join('-')}-${modifierNotes}`;
    
    // Check if matching cartItem already exists
    const existingIdx = cart.findIndex(c => c.id === cartItemId);
    if (existingIdx >= 0) {
      const updated = [...cart];
      updated[existingIdx].quantity += modifierQuantity;
      setCart(updated);
    } else {
      const newOrderItem: OrderItem = {
        id: cartItemId,
        menuItemId: modifierItem.id,
        nameAr: modifierItem.nameAr,
        nameEn: modifierItem.nameEn,
        quantity: modifierQuantity,
        price: modifierItem.price,
        notes: modifierNotes ? modifierNotes : undefined,
        selectedExtras: modifierSelectedExtras,
      };
      setCart([...cart, newOrderItem]);
    }

    setModifierItem(null);
    onAddNotification('تمت إضافة الصنف بنجاح', 'Item added successfully to cart', 'success');
  };

  const handleToggleExtra = (extra: MenuItemExtra) => {
    const exists = modifierSelectedExtras.find(e => e.nameEn === extra.nameEn);
    if (exists) {
      setModifierSelectedExtras(modifierSelectedExtras.filter(e => e.nameEn !== extra.nameEn));
    } else {
      setModifierSelectedExtras([...modifierSelectedExtras, extra]);
    }
  };

  const updateCartQty = (id: string, delta: number) => {
    const updated = cart.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as OrderItem[];
    setCart(updated);
  };

  const handleLoadOrder = (order: Order) => {
    setCart(order.items);
    setOrderType(order.type);
    setSelectedTableId(order.tableId || '');
    if (order.customerPhone) {
      const customer = crmCustomers.find(c => c.phone === order.customerPhone) || null;
      setSelectedCustomer(customer);
    } else {
      setSelectedCustomer(null);
    }
    setLoadedOrderId(order.id);
    setActiveTab2('new_order');
    onAddNotification(
      `تم استدعاء الطلب رقم #${order.id.slice(-5).toUpperCase()} بنجاح للتعديل والمحاسبة`,
      `Order #${order.id.slice(-5).toUpperCase()} loaded successfully for settlement or edits`,
      'success'
    );
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const extrasSum = item.selectedExtras.reduce((s, e) => s + e.price, 0);
      return sum + (item.price + extrasSum) * item.quantity;
    }, 0);
  }, [cart]);

  const discountAmount = 0;

  const taxAmount = useMemo(() => {
    const taxableBase = Math.max(0, subtotal - discountAmount);
    return (taxableBase * tenant.taxPercent) / 100;
  }, [subtotal, discountAmount, tenant.taxPercent]);

  const serviceAmount = useMemo(() => {
    const taxableBase = Math.max(0, subtotal - discountAmount);
    return (taxableBase * tenant.servicePercent) / 100;
  }, [subtotal, discountAmount, tenant.servicePercent]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + taxAmount + serviceAmount);
  }, [subtotal, discountAmount, taxAmount, serviceAmount]);

  // CRM customer interactions
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName || !newCustomerPhone) return;

    const newCust: CustomerCRM = {
      id: `crm_${Date.now()}`,
      tenantId: tenant.id,
      name: newCustomerName,
      phone: newCustomerPhone,
      points: 0,
      loyaltyTier: 'Bronze',
      ordersCount: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString()
    };

    const savedCustomer = await StorageService.saveCRM(newCust);
    setSelectedCustomer(savedCustomer ?? newCust);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setIsCrmOpen(false);
    onAddNotification('تم تسجيل عميل ولاء جديد بنجاح', 'New loyalty customer registered successfully', 'success');
  };

  // Submit Order to backend database
  const handleCheckOut = async (withPaymentPaid: boolean) => {
    if (cart.length === 0) {
      onAddNotification('سلة المبيعات فارغة', 'The cart is empty', 'warning');
      return;
    }

    if (orderType === 'dine_in' && !selectedTableId) {
      onAddNotification('يجب تحديد رقم الطاولة للطلبات الداخلية', 'Please select a table for Dine-in orders', 'warning');
      return;
    }

    const orderId = loadedOrderId || `ord_${Date.now()}`;
    const originalOrder = loadedOrderId ? allOrders.find(o => o.id === loadedOrderId) : null;

    // Status resolution: if paid, mark as 'delivered' (completed) unless it's already cooking/preparing in KDS
    let targetStatus: OrderStatus = withPaymentPaid ? 'delivered' : 'new';
    if (originalOrder) {
      if (withPaymentPaid) {
        targetStatus = (originalOrder.status === 'preparing' || originalOrder.status === 'ready') ? originalOrder.status : 'delivered';
      } else {
        targetStatus = originalOrder.status;
      }
    }

    const newOrder: Order = {
      id: orderId,
      tenantId: tenant.id,
      branchId: branch.id,
      type: orderType,
      status: targetStatus,
      items: cart,
      subtotal,
      taxAmount,
      serviceAmount,
      discountAmount,
      total: grandTotal,
      tableId: orderType === 'dine_in' ? selectedTableId : undefined,
      customerName: selectedCustomer?.name,
      customerPhone: selectedCustomer?.phone,
      paymentMethod: withPaymentPaid ? paymentMethod : 'unpaid',
      paymentStatus: withPaymentPaid ? 'paid' : 'unpaid',
      createdAt: originalOrder ? originalOrder.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cashierId: 'emp1_cashier',
    };

    // Save order (this triggers ingredients stock deduction if paid/preparing)
    const savedOrder = await StorageService.saveOrder(newOrder, true);

    // Reset State
    setCart([]);
    setSelectedTableId('');
    setSelectedCustomer(null);
    setIsPaymentOpen(false);
    setLoadedOrderId(null);
    
    // Refresh all orders
    const freshOrders = StorageService.getOrders(tenant.id, branch.id);
    setAllOrders(freshOrders);

    // Open physical print invoice view for user
    setSelectedReceiptOrder(savedOrder);

    onAddNotification('تم حفظ وإرسال الفاتورة بنجاح', 'Order registered and sent successfully', 'success');
  };

  // Move Order table
  const handleShiftTable = async () => {
    if (!selectedTableId || !shiftTargetTableId) return;

    const allTables = StorageService.getTables(branch.id);
    const origin = allTables.find(t => t.id === selectedTableId);
    const target = allTables.find(t => t.id === shiftTargetTableId);

    if (origin && target) {
      if (origin.status !== 'busy' || !origin.activeOrderId) {
        onAddNotification('هذه الطاولة لا تحتوي على طلبية نشطة لنقلها', 'This table has no active order to transfer', 'warning');
        return;
      }
      if (target.status !== 'free') {
        onAddNotification('الطاولة المستهدفة ليست فارغة', 'Target table is busy or reserved', 'warning');
        return;
      }

      // Find the order
      const activeOrders = StorageService.getOrders(tenant.id, branch.id);
      const order = activeOrders.find(o => o.id === origin.activeOrderId);
      if (order) {
        order.tableId = shiftTargetTableId;
        await StorageService.saveOrder(order, false); // save changes order and table state

        // Shift table statuses
        origin.status = 'free';
        origin.activeOrderId = undefined;
        
        target.status = 'busy';
        target.activeOrderId = order.id;

        await StorageService.saveTables([origin, target]);
        setSelectedTableId(shiftTargetTableId);
        setShiftTargetTableId('');
        setIsShiftingOpen(false);
        setAllOrders(StorageService.getOrders(tenant.id, branch.id));

        onAddNotification('تم نقل الطلبية بين الطاولات بنجاح', 'Order transferred between tables successfully', 'success');
      }
    }
  };

  // Sound chime creator for alerts
  const playChime = () => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.connect(gain);
      gain.connect(context.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, context.currentTime); // D5
      osc.frequency.setValueAtTime(880, context.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.4);
      osc.start();
      osc.stop(context.currentTime + 0.4);
    } catch {
      // Safe environment bypass
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 min-h-[82vh] bg-transparent rounded-3xl p-1 animate-fade-in text-slate-200 select-none">
      
      {/* 1. LEFT COLUMN: CART & BILLING SUMMARY (RTL SUPPORT DIRECTIVES) */}
      <div className={`w-full xl:w-[420px] glass-panel bg-[#0d121f]/50 border border-slate-800/80 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-5 flex flex-col justify-between ${isRtl ? 'order-first' : 'order-last'} relative overflow-hidden group`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          {/* Header Controls */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/60 mb-4">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-orange-500" />
              <h3 className="font-extrabold text-white text-sm">
                {isRtl ? 'سلة المبيعات والطلب الحالي' : 'Active Order Basket'}
              </h3>
            </div>
            <span className="text-xs bg-orange-500/20 border border-orange-500/40 text-orange-400 font-extrabold px-3 py-1 rounded-full shadow-inner">
              {cart.reduce((s, i) => s + i.quantity, 0)} {isRtl ? 'أصناف' : 'Items'}
            </span>
          </div>

          {/* Active Edit Mode Alert Banner */}
          {loadedOrderId && (
            <div className="mb-4 bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl flex items-center justify-between gap-2.5 animate-pulse">
              <div>
                <p className="text-xs font-extrabold text-amber-400">
                  {isRtl ? `جاري تعديل/تسوية طلب رقم: ${loadedOrderId.slice(-5).toUpperCase()}` : `Editing order #${loadedOrderId.slice(-5).toUpperCase()}`}
                </p>
                <p className="text-[10px] text-slate-400">
                  {isRtl ? 'تعديل السلة وسداد القيمة لحفظ التغييرات.' : 'Modify items and check out to save.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCart([]);
                  setSelectedTableId('');
                  setSelectedCustomer(null);
                  setLoadedOrderId(null);
                  onAddNotification('تم إلغاء تعديل الفاتورة المستدعاة', 'Retrieved order editing cancelled', 'info');
                }}
                className="text-[10px] font-black uppercase tracking-wider text-rose-400 hover:text-white bg-rose-500/20 hover:bg-rose-600 border border-rose-500/30 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          )}

          {/* Tab Selector: New Sale vs Active Bills */}
          <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-900 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab2('new_order')}
              className={`py-2.5 px-2 text-center rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'new_order' ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              {isRtl ? 'طلب جديد' : 'New Ticket'}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab2('active_orders');
                setAllOrders(StorageService.getOrders(tenant.id, branch.id));
              }}
              className={`py-2.5 px-2 text-center rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${activeTab === 'active_orders' ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <Clock className="w-4 h-4 shrink-0 animate-pulse text-orange-400" />
              {isRtl ? 'الطلبات النشطة' : 'Active Bills'}
              {allOrders.filter(o => o.paymentStatus === 'unpaid').length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 border border-rose-500/25 text-white font-mono text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow-md">
                  {allOrders.filter(o => o.paymentStatus === 'unpaid').length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'active_orders' ? (
            <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1 pb-4">
              {allOrders.filter(o => o.paymentStatus === 'unpaid').length === 0 ? (
                <div className="text-center py-20 text-slate-400 font-bold">
                  <CheckCircle className="w-12 h-12 mx-auto stroke-1 mb-3 text-emerald-500 animate-pulse" />
                  <p className="text-xs">{isRtl ? 'لا توجد طلبات معلقة بانتظار المحاسبة' : 'No pending bills awaiting payment.'}</p>
                </div>
              ) : (
                allOrders.filter(o => o.paymentStatus === 'unpaid').map((order) => (
                  <div 
                    key={order.id} 
                    className="p-4 rounded-3xl bg-slate-950/60 hover:bg-slate-900/60 border border-slate-850 hover:border-slate-750 transition duration-300 shadow-lg flex flex-col justify-between animate-fade-in"
                  >
                    <div className="flex justify-between items-start pb-2 border-b border-slate-850">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-extrabold text-white font-mono">
                            INV-{order.id.slice(-5).toUpperCase()}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                            order.type === 'dine_in' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20' :
                            order.type === 'takeaway' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' :
                            'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                          }`}>
                            {order.type === 'dine_in' 
                              ? (isRtl ? `طاولة ${tables.find(t => t.id === order.tableId)?.number || '؟'}` : `Table ${tables.find(t => t.id === order.tableId)?.number || '?'}`)
                              : (isRtl ? 'سفري' : 'Takeaway')}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-amber-500 font-mono leading-none">
                          {order.total.toFixed(2)} <span className="text-[9px] text-slate-400">{isRtl ? tenant.currencyAr : tenant.currencyEn}</span>
                        </p>
                        <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full inline-block mt-1 font-bold">
                          {isRtl ? 'بانتظار السداد' : 'Unpaid'}
                        </span>
                      </div>
                    </div>

                    <div className="py-2.5 max-h-[80px] overflow-y-auto pr-1">
                      <p className="text-[10px] text-slate-300 leading-relaxed">
                        {order.items.map(it => `${isRtl ? it.nameAr : it.nameEn} (x${it.quantity})`).join(' ، ')}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLoadOrder(order)}
                      className="w-full mt-1.5 py-3 px-4 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 transition-all duration-200 shadow-md cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                    >
                      <ShoppingBag className="w-4 h-4 shrink-0" />
                      {isRtl ? 'استدعاء وسداد الفاتورة' : 'Retrieve & Pay Bill'}
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <>
              {/* Service selectors: Dine-in, Takeaway, Delivery */}
              <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-900 shadow-inner">
                <button
                  type="button"
                  onClick={() => { setOrderType('dine_in'); }}
                  className={`py-2.5 px-1 text-center rounded-xl text-xs font-black transition-all cursor-pointer ${orderType === 'dine_in' ? 'bg-gradient-to-r from-orange-600 to-amber-500 shadow-md text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {isRtl ? 'داخل الصالة' : 'Dine-In'}
                </button>
                <button
                  type="button"
                  onClick={() => { setOrderType('takeaway'); setSelectedTableId(''); }}
                  className={`py-2.5 px-1 text-center rounded-xl text-xs font-black transition-all cursor-pointer ${orderType === 'takeaway' ? 'bg-gradient-to-r from-orange-600 to-amber-500 shadow-md text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {isRtl ? 'سفري' : 'Takeaway'}
                </button>
                <button
                  type="button"
                  onClick={() => { setOrderType('delivery'); setSelectedTableId(''); }}
                  className={`py-2.5 px-1 text-center rounded-xl text-xs font-black transition-all cursor-pointer ${orderType === 'delivery' ? 'bg-gradient-to-r from-orange-600 to-amber-500 shadow-md text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {isRtl ? 'توصيل' : 'Delivery'}
                </button>
              </div>

              {/* Conditional Table Selector */}
              {orderType === 'dine_in' && (
                <div className="mb-4 bg-slate-950/30 rounded-2xl p-3.5 border border-slate-850">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                      {isRtl ? 'طاولة الخدمة المستهدفة:' : 'Assign Dining Table:'}
                    </span>
                    {selectedTableId && (
                      <button
                        type="button"
                        onClick={() => setIsShiftingOpen(true)}
                        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400 hover:text-white bg-slate-900 border border-slate-805 px-3 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer shadow-md"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        {isRtl ? 'نقل الطاولة' : 'Transfer'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 max-h-[110px] overflow-y-auto pr-1">
                    {tables.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          if (t.status === 'busy' && t.activeOrderId) {
                            const busyOrder = allOrders.find(o => o.id === t.activeOrderId);
                            if (busyOrder) {
                              handleLoadOrder(busyOrder);
                              return;
                            }
                          }
                          setSelectedTableId(t.id);
                        }}
                        className={`h-12 w-full rounded-2xl text-sm font-mono font-black flex flex-col items-center justify-center transition-all cursor-pointer relative border ${
                          selectedTableId === t.id
                            ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white border-transparent shadow-lg scale-102 ring-2 ring-orange-500/40'
                            : t.status === 'busy'
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                            : t.status === 'reserved'
                            ? 'bg-blue-500/25 border-blue-500/45 text-blue-300'
                            : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-200'
                        }`}
                      >
                        {t.number}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Client Loyalty CRM Tag */}
              <div className="mb-4 flex items-center justify-between bg-slate-950/30 border border-slate-850 p-3.5 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-orange-500" />
                  <div>
                    <p className="text-xs font-extrabold text-slate-200">
                      {selectedCustomer ? selectedCustomer.name : (isRtl ? 'عميل صالة افتراضي' : 'Walk-in Table Visitor')}
                    </p>
                    {selectedCustomer && (
                      <p className="text-[10px] text-amber-500 font-bold">
                        {selectedCustomer.loyaltyTier} Tier • {selectedCustomer.points} Points
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCrmOpen(true)}
                  className="text-xs font-black uppercase tracking-wider text-amber-400 hover:text-white bg-slate-900 border border-slate-805 py-2 px-3.5 rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  {selectedCustomer ? (isRtl ? 'تغيير' : 'Change') : (isRtl ? 'ربط عميل ولاء' : 'Link CRM')}
                </button>
              </div>

              {/* Scrollable Cart items list */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 mb-4 border-t border-b border-slate-850/60 py-3">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 font-bold">
                    <Grid className="w-8 h-8 mx-auto stroke-1 mb-2 opacity-40 animate-pulse text-slate-600" />
                    <p className="text-xs">{isRtl ? 'سلة المشتريات فارغة تماماً' : 'No items added. Click cards on right.'}</p>
                  </div>
                ) : (
                  cart.map((item) => {
                    const itemExtrasPrice = item.selectedExtras.reduce((s, e) => s + e.price, 0);
                    const itemTotal = (item.price + itemExtrasPrice) * item.quantity;

                    return (
                      <div key={item.id} className="p-3 rounded-2xl bg-slate-950/40 hover:bg-slate-900/40 border border-slate-850 hover:border-slate-750 transition-all flex items-start justify-between text-xs duration-200">
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-white truncate">
                            {isRtl ? item.nameAr : item.nameEn}
                          </p>
                          
                          {/* extras representation */}
                          {item.selectedExtras.length > 0 && (
                            <p className="text-[9px] text-slate-400 font-sans mt-0.5">
                              + {item.selectedExtras.map(ex => isRtl ? ex.nameAr : ex.nameEn).join(', ')}
                            </p>
                          )}

                          {item.notes && (
                            <span className="text-[9px] text-orange-400 italic block mt-0.5">
                              * {item.notes}
                            </span>
                          )}

                          <p className="text-[11px] text-amber-500 font-extrabold mt-1">
                            {itemTotal.toFixed(2)} {isRtl ? tenant.currencyAr : tenant.currencyEn}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.id, -1)}
                            className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer active:scale-90"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-mono font-black text-amber-500 w-5 text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.id, 1)}
                            className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer active:scale-90"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Calculations and Actions Footer */}
        {activeTab === 'new_order' && (
          <div className="border-t border-slate-850/60 pt-4 space-y-3.5">
            
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between font-medium">
                <span>{isRtl ? 'المجموع الأساسي' : 'Base Subtotal'}:</span>
                <span className="font-mono font-bold text-slate-200">{subtotal.toFixed(2)} {isRtl ? tenant.currencyAr : tenant.currencyEn}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-400 font-extrabold bg-rose-500/10 p-2 rounded-xl border border-rose-500/10">
                  <span>{isRtl ? 'الخصم الترويجي -' : 'Discounts -'}:</span>
                  <span className="font-mono">-{discountAmount.toFixed(2)} {isRtl ? tenant.currencyAr : tenant.currencyEn}</span>
                </div>
              )}
              <div className="flex justify-between font-medium">
                <span>{isRtl ? 'ضريبة القيمة المضافة (١٥٪)' : 'VAT (15%)'}:</span>
                <span className="font-mono font-bold text-slate-200">{taxAmount.toFixed(2)} {isRtl ? tenant.currencyAr : tenant.currencyEn}</span>
              </div>
              {tenant.servicePercent > 0 && (
                <div className="flex justify-between font-medium">
                  <span>{isRtl ? 'رسوم الخدمة والضيافة:' : 'Hospitality Fee:'}</span>
                  <span className="font-mono font-bold text-slate-200">{serviceAmount.toFixed(2)} {isRtl ? tenant.currencyAr : tenant.currencyEn}</span>
                </div>
              )}

              <div className="border-t border-slate-850/60 my-1"></div>

              <div className="flex justify-between text-base font-black text-white">
                <span>{isRtl ? 'المجموع النهائي' : 'GRAND TOTAL'}:</span>
                <span className="font-mono text-amber-500 text-lg shadow-sm tracking-tight">{grandTotal.toFixed(2)} {isRtl ? tenant.currencyAr : tenant.currencyEn}</span>
              </div>
            </div>

            {/* Quick Actions & Submit */}
            <div className="grid grid-cols-2 gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setIsSplitOpen(true)}
                className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-750 hover:border-slate-600 py-3.5 rounded-2xl text-xs font-black text-slate-200 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                <ArrowLeftRight className="w-4 h-4 text-amber-500 shrink-0" />
                {isRtl ? 'تقسيم الفاتورة' : 'Split Bill'}
              </button>
              <button
                type="button"
                onClick={() => setIsPaymentOpen(true)}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 py-3.5 rounded-2xl text-xs font-black text-white active:scale-95 transition-all shadow-[0_4px_20px_rgba(249,115,22,0.3)] cursor-pointer"
              >
                <CreditCard className="w-4 h-4 shrink-0" />
                {isRtl ? 'دفع وتسوية' : 'Pay & Complete'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleCheckOut(false)}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-orange-500/30 text-slate-200 hover:text-white font-black py-4 rounded-2xl active:scale-95 transition-all shadow-md text-xs cursor-pointer"
            >
              <Check className="w-4 h-4 text-orange-500 shrink-0" />
              {isRtl ? 'إرسال للمطبخ (دفع لاحق)' : 'Submit to Kitchen (Pay Later)'}
            </button>
          </div>
        )}
      </div>

      {/* 2. RIGHT COLUMN: PRODUCT CATALOG GRID */}
      <div className="flex-1 flex flex-col justify-between">
        
        {/* Search and Category Nav tabs */}
        <div>
          <div className="flex flex-col md:flex-row gap-3.5 items-center justify-between mb-5">
            
            {/* Search inputs */}
            <div className="relative w-full md:max-w-md">
              <Search className={`absolute top-3 w-4 h-4 text-slate-400 ${isRtl ? 'left-3' : 'right-3'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRtl ? 'ابحث باسم الوجبة، المكون، السعر...' : 'Search for dishes, recipes...'}
                className="w-full bg-[#0d121f]/60 border border-slate-850 text-white pl-4 pr-10 py-2.5 rounded-2xl text-xs focus:outline-none focus:border-orange-500 placeholder-slate-550 font-semibold shadow-inner"
              />
            </div>

            {/* Quick Filter category tabs */}
            <div className="flex gap-2 self-stretch md:self-auto overflow-x-auto pr-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`flex items-center gap-1.5 whitespace-nowrap py-2 px-4 rounded-full text-xs font-black transition-all cursor-pointer border ${selectedCategory === 'all' ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white border-transparent shadow-lg' : 'bg-[#0d121f]/50 border-slate-850 text-slate-400 hover:text-white hover:border-slate-750'}`}
              >
                <Grid className="w-3.5 h-3.5" />
                {isRtl ? 'الكل' : 'All'}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 whitespace-nowrap py-2 px-4 rounded-full text-xs font-black transition-all cursor-pointer border ${selectedCategory === cat.id ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white border-transparent shadow-lg' : 'bg-[#0d121f]/50 border-slate-850 text-slate-400 hover:text-white hover:border-slate-750'}`}
                >
                  <Utensils className="w-3.5 h-3.5" />
                  {isRtl ? cat.nameAr : cat.nameEn}
                </button>
              ))}
            </div>

          </div>

          {/* Cards Grid */}
          {filteredMenuItems.length === 0 ? (
            <div className="text-center py-24 glass-panel bg-[#0d121f]/40 border border-slate-850 rounded-3xl shadow-sm text-slate-400">
              <HelpCircle className="w-12 h-12 mx-auto stroke-1 mb-3.5 text-slate-700 animate-pulse" />
              <p className="text-sm font-extrabold text-slate-400">{isRtl ? 'لم يتم العثور على وجبات مطابقة للبحث' : 'No matching dishes found in branch menu'}</p>
              <p className="text-xs text-slate-400 mt-1">{isRtl ? 'تأكد من كتابة أحرف صحيحة أو تمكين الفئة المناسبة' : 'Verify spelling or change active category'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {filteredMenuItems.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`group glass-panel bg-[#0d121f]/50 hover:bg-[#121829]/65 border border-slate-850 hover:border-orange-500/25 shadow-lg overflow-hidden hover:shadow-2xl active:scale-98 transition-all duration-300 cursor-pointer flex flex-col justify-between ${!item.isAvailable ? 'opacity-40 grayscale pointer-events-none' : ''}`}
                >
                  <div>
                    {/* Food Photo with badge */}
                    <div className="h-32 w-full overflow-hidden relative bg-slate-900/80">
                      <img 
                        src={item.imageUrl} 
                        alt={item.nameEn} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className={`absolute top-2.5 ${isRtl ? 'right-2.5' : 'left-2.5'} bg-slate-950/85 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-800/80 shadow-md`}>
                        <p className="text-[11px] font-mono font-black text-amber-400 leading-none">
                          {item.price.toFixed(2)} <span className="text-[9px] text-slate-400">{isRtl ? tenant.currencyAr : tenant.currencyEn}</span>
                        </p>
                      </div>

                      {/* Out of Stock notice */}
                      {!item.isAvailable && (
                        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center">
                          <p className="text-xs font-black text-white bg-rose-600 border border-rose-500/20 px-3 py-1 rounded-full shadow-lg">
                            {isRtl ? 'غير متوفر' : 'Sold Out'}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <h4 className="font-extrabold text-xs text-white group-hover:text-amber-400 transition duration-200 line-clamp-1">
                        {isRtl ? item.nameAr : item.nameEn}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {isRtl ? item.descriptionAr : item.descriptionEn}
                      </p>
                    </div>
                  </div>

                  {/* Ingredients Indicator Tag */}
                  {item.ingredients && item.ingredients.length > 0 && (
                    <div className="mx-3.5 mb-3.5 p-2 bg-slate-950/50 border border-slate-900 rounded-xl">
                      <div className="flex items-center gap-1.5 overflow-x-auto text-[8px] text-slate-400 font-mono scrollbar-none">
                        <Sliders className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                        <span className="font-bold">{isRtl ? 'الوصفة:' : 'Recipe:'}</span>
                        {item.ingredients.map((ing, ingIdx) => {
                          const iMatch = StorageService.getIngredients(tenant.id).find(g => g.id === ing.ingredientId);
                          return (
                            <span 
                              key={ingIdx} 
                              className={`px-1.5 py-0.5 rounded shrink-0 ${iMatch && iMatch.stock <= iMatch.minStock ? 'bg-rose-950/35 text-rose-400 border border-rose-900/30 font-bold animate-pulse' : 'bg-slate-900/60 border border-slate-850 text-slate-400'}`}
                            >
                              {iMatch ? (isRtl ? iMatch.nameAr : iMatch.nameEn) : 'Ing'} ({ing.quantityNeeded})
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic audio alert button & instructions for physical printer test */}
        <div className="mt-6 bg-[#0d121f]/40 border border-slate-850 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-slate-400 text-xs shadow-inner">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />
            <p className="font-semibold text-[11px] leading-tight text-slate-400">
              {isRtl ? 'محاكي كاشير تفاعلي: جميع الطلبات المسجلة هنا تذهب لحظياً شاشة المطبخ (KDS) وحركات المحاسبة تلقائية.' : 'Full POS simulation: Sent orders update Kitchen Display System (KDS) and post ledger entries.'}
            </p>
          </div>
          <button
            type="button"
            onClick={playChime}
            className="text-[10px] font-black text-amber-500 hover:text-orange-400 bg-slate-950/60 border border-slate-850 px-3.5 py-2 rounded-xl block shadow-md flex items-center gap-1.5 shrink-0 transition active:scale-95 cursor-pointer"
          >
            🔊 {isRtl ? 'اختبار نغمة التنبيه الكهرومغناطيسي' : 'Test electromagnet sound buzzer'}
          </button>
        </div>

      </div>

      {/* =========================================================================
                     MODALS DRAWERS OVERLAYS (STATEFUL DIALOGS)
         ========================================================================= */}

      {/* MODAL 1: EXTENDED MODIFIER MODAL FOR SELECTING EXTRAS */}
      {modifierItem && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-800 text-sm">
                {isRtl ? modifierItem.nameAr : modifierItem.nameEn}
              </h3>
              <button 
                type="button"
                onClick={() => setModifierItem(null)} 
                className="bg-slate-100 text-slate-500 hover:bg-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 bg-slate-50 p-2.5 rounded-xl">
              {isRtl ? modifierItem.descriptionAr : modifierItem.descriptionEn}
            </p>

            {/* Custom Extras Section */}
            {modifierItem.extras && modifierItem.extras.length > 0 && (
              <div className="mb-4">
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  {isRtl ? 'الإضافات والمحسنات المتاحة:' : 'Available extras and modifiers:'}
                </span>
                <div className="space-y-2">
                  {modifierItem.extras.map((ex, exIdx) => {
                    const isAdded = modifierSelectedExtras.some(e => e.nameEn === ex.nameEn);
                    return (
                      <button
                        key={exIdx}
                        type="button"
                        onClick={() => handleToggleExtra(ex)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs ${isAdded ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-4 h-4 rounded-md border flex items-center justify-center ${isAdded ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                            {isAdded && <Check className="w-3 h-3" />}
                          </span>
                          <span>{isRtl ? ex.nameAr : ex.nameEn}</span>
                        </div>
                        <span className="font-mono">+{ex.price.toFixed(2)} {isRtl ? tenant.currencyAr : tenant.currencyEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Notes */}
            <div className="mb-4">
              <span className="text-xs font-bold text-slate-700 block mb-1">
                {isRtl ? 'تعليمات خاصة للطهي والمطبخ:' : 'Cooking preferences (no onions, extra spicy...):'}
              </span>
              <textarea
                value={modifierNotes}
                onChange={(e) => setModifierNotes(e.target.value)}
                placeholder={isRtl ? 'مثال: فلفل حار زيادة، بدون كاتشب...' : 'Example: No onions, well done please...'}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-2.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white resize-none"
                rows={2}
              />
            </div>

            {/* Quantity selection */}
            <div className="flex items-center justify-between bg-slate-100 p-3 rounded-2xl mb-5">
              <span className="text-xs font-bold text-slate-700">{isRtl ? 'الكمية المطلوبة:' : 'Quantity:'}</span>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setModifierQuantity(Math.max(1, modifierQuantity - 1))}
                  className="bg-white p-1 rounded-xl shadow border border-slate-200 text-slate-600 active:scale-[0.9]"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-mono font-bold text-sm text-slate-800">{modifierQuantity}</span>
                <button
                  type="button"
                  onClick={() => setModifierQuantity(modifierQuantity + 1)}
                  className="bg-white p-1 rounded-xl shadow border border-slate-200 text-slate-600 active:scale-[0.9]"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddModifierToCart}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-2xl shadow active:scale-[0.98] transition-all text-xs shrink-0"
            >
              {isRtl ? 'إضافة إلى الطلبية' : 'Add to Order Basket'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: CRM LOYALTY CARD LINK MODAL */}
      {isCrmOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-850 text-sm">
                {isRtl ? 'ربط عميل ولاء أو تسجيل جديد' : 'Link CRM / Register Client'}
              </h3>
              <button type="button" onClick={() => setIsCrmOpen(false)} className="text-slate-500 hover:text-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick search existing */}
            <div className="mb-4">
              <span className="text-xs font-bold text-slate-600 block mb-1">
                {isRtl ? 'ابحث عن عملاء مسجلين سابقاً:' : 'Quick search current users:'}
              </span>
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                {crmCustomers.map((cust) => (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => { setSelectedCustomer(cust); setIsCrmOpen(false); }}
                    className="w-full text-left p-2 rounded-xl text-xs bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 border text-slate-700 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold">{cust.name}</p>
                      <p className="text-[10px] text-slate-500">{cust.phone}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white border border-slate-200">
                      {cust.loyaltyTier}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 my-4 pt-4">
              <span className="text-xs font-bold text-slate-600 block mb-2">
                {isRtl ? 'أو تسجيل عميل جديد بالكامل:' : 'Or sign up new customer:'}
              </span>
              <form onSubmit={handleCreateCustomer} className="space-y-2">
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder={isRtl ? 'الاسم الثلاثي...' : 'Full Name...'}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <input
                  type="tel"
                  required
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder={isRtl ? 'رقم الهاتف (المنطقي)...' : 'Phone number...'}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-xl text-xs transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5 inline mr-1" />
                  {isRtl ? 'تسجيل وربط كارت ولاء' : 'Sign Up Customer'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SPLIT BILL CALCULATOR */}
      {isSplitOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-800 text-sm">
                {isRtl ? 'تقسيم قيمة الفاتورة' : 'Split Bill Calculator'}
              </h3>
              <button type="button" onClick={() => setIsSplitOpen(false)} className="text-slate-500 hover:text-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center py-4 bg-slate-50 rounded-2xl mb-4">
              <p className="text-xs text-slate-500">{isRtl ? 'مجموع الفاتورة الإجمالي:' : 'Total due:'}</p>
              <p className="text-xl font-bold text-emerald-600 font-mono">
                {grandTotal.toFixed(2)} {isRtl ? tenant.currencyAr : tenant.currencyEn}
              </p>
            </div>

            <span className="text-xs font-bold text-slate-700 block mb-2">
              {isRtl ? 'حدد عدد الأشخاص للمشاركة:' : 'Divide between number of customers:'}
            </span>

            <div className="flex items-center justify-around bg-slate-100 py-3 rounded-2xl mb-4">
              <button
                type="button"
                onClick={() => setSplitCount(Math.max(1, splitCount - 1))}
                className="bg-white p-1 rounded-xl text-slate-600 shadow"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-mono font-bold text-lg">{splitCount}</span>
              <button
                type="button"
                onClick={() => setSplitCount(splitCount + 1)}
                className="bg-white p-1 rounded-xl text-slate-600 shadow"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="border-t border-dashed border-gray-200 pt-4 text-center">
              <p className="text-xs text-slate-500">{isRtl ? 'نصيب الفرد الواحد بالدفع:' : 'Per Person amount:'}</p>
              <p className="text-2xl font-black text-slate-800 font-mono mt-1">
                {(grandTotal / splitCount).toFixed(2)} {isRtl ? tenant.currencyAr : tenant.currencyEn}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsSplitOpen(false);
                onAddNotification('تم حساب تقسيم الفاتورة لمقاعد الطاولة', 'Bill split calculation applied', 'info');
              }}
              className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-xs transition"
            >
              {isRtl ? 'تطبيق التقسيم' : 'Dismiss'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: FULL PAYMENT SETTLEMENT MODAL */}
      {isPaymentOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-800 text-sm">
                {isRtl ? 'شاشة سداد العميل والفوترة' : 'Customer Payment Drawer'}
              </h3>
              <button type="button" onClick={() => setIsPaymentOpen(false)} className="text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center py-4 bg-emerald-50 border border-emerald-100 rounded-2xl mb-4">
              <p className="text-[10px] text-emerald-600 font-bold uppercase">{isRtl ? 'المطلوب تحصيله بالكامل' : 'Total Amout Due'}</p>
              <p className="text-2xl font-black text-emerald-800 font-mono">
                {grandTotal.toFixed(2)} {isRtl ? tenant.currencyAr : tenant.currencyEn}
              </p>
            </div>

            {/* Payment Method Selections */}
            <span className="text-xs font-bold text-slate-700 block mb-2">{isRtl ? 'طريقة السداد المعمول بها:' : 'Choose payment mode:'}</span>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-3 flex flex-col items-center gap-1.5 rounded-xl border transition-all ${paymentMethod === 'cash' ? 'bg-slate-800 border-slate-800 text-white font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
              >
                <DollarSign className="w-4 h-4" />
                <span className="text-[10px]">{isRtl ? 'كاش نقدي' : 'Cash'}</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`py-3 flex flex-col items-center gap-1.5 rounded-xl border transition-all ${paymentMethod === 'card' ? 'bg-slate-800 border-slate-800 text-white font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
              >
                <CreditCard className="w-4 h-4" />
                <span className="text-[10px]">{isRtl ? 'جهاز صراف' : 'Card'}</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('wallet')}
                className={`py-3 flex flex-col items-center gap-1.5 rounded-xl border transition-all ${paymentMethod === 'wallet' ? 'bg-slate-800 border-slate-800 text-white font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
              >
                <Wallet className="w-4 h-4" />
                <span className="text-[10px]">{isRtl ? 'محفظة جوال' : 'Wallet'}</span>
              </button>
            </div>

            {/* Change math */}
            {paymentMethod === 'cash' && (
              <div className="mb-4 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">{isRtl ? 'المبلغ المستلم باليد:' : 'Amount Tendered Cash:'}</span>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="e.g. 50, 100, 200..."
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl font-mono text-xs text-slate-800 focus:outline-none"
                />
                
                {Number(amountPaid) >= grandTotal && (
                  <div className="p-2 border border-blue-150 bg-blue-50/50 rounded-xl flex justify-between items-center text-[11px] text-blue-700">
                    <span>{isRtl ? 'المبلغ المتبقي للعميل (الباقي):' : 'Change Due:'}</span>
                    <span className="font-bold underline">{(Number(amountPaid) - grandTotal).toFixed(2)} {isRtl ? tenant.currencyAr : tenant.currencyEn}</span>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => handleCheckOut(true)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-2xl shadow active:scale-[0.98] transition-all text-xs"
            >
              {isRtl ? 'طباعة تذكرة وسداد الفاتورة' : 'Approve Payment & Close order'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 5: TABLE SHIFTING OVERLAY */}
      {isShiftingOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-800 text-sm">
                {isRtl ? 'نقل الطلب لطاولة أخرى' : 'Transfer Table Order'}
              </h3>
              <button type="button" onClick={() => setIsShiftingOpen(false)} className="text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 bg-slate-50 p-2.5 rounded-xl">
              {isRtl ? 'سيتم نقل جميع أصناف المبيعات والبيانات مباشرة إلى طاولة جديدة فارغة.' : 'Transfers active order items securely between tables.'}
            </p>

            <span className="text-xs font-bold text-slate-700 block mb-2">{isRtl ? 'اختر طاولة فارغة مستهدفة:' : 'Choose vacant target table:'}</span>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {tables.filter(t => t.status === 'free').map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setShiftTargetTableId(t.id)}
                  className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${shiftTargetTableId === t.id ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                >
                  {t.number}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleShiftTable}
              disabled={!shiftTargetTableId}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 rounded-xl text-xs transition disabled:opacity-50"
            >
              {isRtl ? 'نقل الآن' : 'Transfer order now'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 6: THERMAL PRINT SIMULATOR ACTIVATED ON CHECKOUT */}
      {selectedReceiptOrder && (
        <ThermalReceipt
          order={selectedReceiptOrder}
          tenant={tenant}
          branch={branch}
          language={language}
          onClose={() => setSelectedReceiptOrder(null)}
        />
      )}

    </div>
  );
}
