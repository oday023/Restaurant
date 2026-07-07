/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'ar' | 'en';

export type Role = 'super_admin' | 'owner' | 'manager' | 'accountant' | 'cashier' | 'waiter' | 'kitchen' | 'inventory_manager' | 'hr_manager' | 'customer' | 'cleaner' | 'security' | 'other';

export interface Tenant {
  id: string;
  nameAr: string;
  nameEn: string;
  logoUrl?: string;
  email: string;
  phone: string;
  address: string;
  currencyAr: string;
  currencyEn: string;
  taxPercent: number;
  servicePercent: number;
  status: 'active' | 'suspended';
  subscriptionPlan: 'starter' | 'pro' | 'enterprise';
  createdAt: string;
}

export interface Branch {
  id: string;
  tenantId: string;
  nameAr: string;
  nameEn: string;
  city: string;
  address: string;
  phone: string;
  status: 'active' | 'inactive';
}

export interface Hall {
  id: string;
  branchId: string;
  nameAr: string;
  nameEn: string;
}

export type TableStatus = 'free' | 'reserved' | 'busy' | 'cleaning';

export interface Table {
  id: string;
  hallId: string;
  number: string;
  seats: number;
  status: TableStatus;
  qrCodeValue: string;
  activeOrderId?: string;
}

export interface Category {
  id: string;
  tenantId: string;
  nameAr: string;
  nameEn: string;
  icon: string; // lucide icon name
  isActive: boolean;
}

export interface Ingredient {
  id: string;
  tenantId: string;
  nameAr: string;
  nameEn: string;
  stock: number; // current quantity available
  minStock: number; // warning threshold
  unitAr: string; // e.g. "كيلو", "لتر", "حبة"
  unitEn: string; // e.g. "kg", "liter", "piece"
  costPerUnit: number;
  supplierId?: string;
}

export interface MenuItemIngredient {
  ingredientId: string;
  quantityNeeded: number; // quantity subtracted on sale
}

export interface MenuItemExtra {
  nameAr: string;
  nameEn: string;
  price: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  price: number;
  imageUrl: string;
  ingredients: MenuItemIngredient[];
  isAvailable: boolean;
  extras: MenuItemExtra[];
}

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type OrderType = 'dine_in' | 'takeaway' | 'delivery';

export interface OrderItem {
  id: string;
  menuItemId: string;
  nameAr: string;
  nameEn: string;
  quantity: number;
  price: number;
  notes?: string;
  selectedExtras: MenuItemExtra[];
}

export interface Order {
  id: string;
  tenantId: string;
  branchId: string;
  tableId?: string; // empty if delivery / takeaway
  hallId?: string;
  type: OrderType;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  taxAmount: number;
  serviceAmount: number;
  discountAmount: number;
  total: number;
  cashierId?: string;
  waiterId?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  paymentMethod: 'cash' | 'card' | 'wallet' | 'unpaid';
  paymentStatus: 'paid' | 'unpaid' | 'refunded';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  tenantId: string;
  branchId: string;
  type: TransactionType;
  categoryAr: string;
  categoryEn: string;
  amount: number;
  descriptionAr: string;
  descriptionEn: string;
  date: string;
  referenceOrderId?: string;
  createdBy: string;
}

export interface AttendanceRecord {
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'holiday';
}

export interface Employee {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  email: string;
  role: Role;
  phone: string;
  salary: number;
  attendanceHistory: AttendanceRecord[];
  performanceRating: number; // out of 5
  status: 'active' | 'suspended';
  username?: string;
  password?: string;
}

export interface CustomerCRM {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email?: string;
  points: number;
  loyaltyTier: 'Bronze' | 'Silver' | 'Gold' | 'VIP';
  ordersCount: number;
  totalSpent: number;
  createdAt: string;
}

export interface Coupon {
  id: string;
  tenantId: string;
  code: string;
  discountPercent: number; // e.g. 15 for 15%
  maxDiscount?: number;
  minOrderValue: number;
  expiryDate: string;
  isActive: boolean;
}

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  username: string;
  action: string;
  timestamp: string;
  ip: string;
  beforeValue?: string;
  afterValue?: string;
}

export interface PayrollRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  role: string;
  month: string; // e.g. "2026-06"
  baseSalary: number;
  advances: number;
  deductions: number;
  bonuses: number;
  netPaid: number;
  status: 'draft' | 'paid';
  updatedAt: string;
}

