/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Tenant,
  Branch,
  Hall,
  Table,
  Category,
  Ingredient,
  MenuItem,
  Order,
  Transaction,
  Employee,
  CustomerCRM,
  Coupon,
  Supplier,
  OrderStatus,
  AuditLog,
  PayrollRecord,
} from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// Production schema removed — kept seed data only.
const INITIAL_TENANTS: Tenant[] = [
  {
    id: "a0000000-0000-0000-0000-000000000001",
    nameAr: "المنصة الرئيسية",
    nameEn: "Main Platform",
    email: "synasma9@gmail.com",
    phone: "0500000000",
    address: "الرياض، المملكة العربية السعودية",
    currencyAr: "ر.س",
    currencyEn: "SAR",
    taxPercent: 15.0,
    servicePercent: 0.0,
    status: "active",
    subscriptionPlan: "enterprise",
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_BRANCHES: Branch[] = [
  {
    id: "b0000001-0000-0000-0000-000000000001",
    tenantId: "a0000000-0000-0000-0000-000000000001",
    nameAr: "الفرع الرئيسي",
    nameEn: "Main Branch",
    city: "Riyadh",
    address: "الرياض",
    phone: "0500000000",
    status: "active",
  },
];

const INITIAL_HALLS: Hall[] = [];
const INITIAL_TABLES: Table[] = [];
const INITIAL_CATEGORIES: Category[] = [];
const INITIAL_INGREDIENTS: Ingredient[] = [];
const INITIAL_SUPPLIERS: Supplier[] = [];
const INITIAL_MENU_ITEMS: MenuItem[] = [];
const INITIAL_CRM: CustomerCRM[] = [];
const INITIAL_COUPONS: Coupon[] = [];

const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: "e0000000-0000-0000-0000-000000000001",
    tenantId: "a0000000-0000-0000-0000-000000000001",
    branchId: "b0000001-0000-0000-0000-000000000001",
    name: "المدير العام",
    email: "synasma9@gmail.com",
    role: "super_admin",
    phone: "0500000000",
    salary: 25000,
    attendanceHistory: [],
    performanceRating: 5.0,
    status: "active",
    username: "synasma9",
    password: "Plmoknijb098.",
  },
];

const INITIAL_TRANSACTIONS: Transaction[] = [];
const INITIAL_ORDERS: Order[] = [];

// Explicit Enterprise DTO Serializers & Deserializers (Zero Runtime Reflection)
const toTenant = (row: Record<string, any>): Tenant => ({
  id: String(row.id || ""),
  nameAr: String(row.name_ar || row.nameAr || ""),
  nameEn: String(row.name_en || row.nameEn || ""),
  logoUrl: row.logo_url || row.logoUrl || undefined,
  email: String(row.email || ""),
  phone: String(row.phone || ""),
  address: String(row.address || ""),
  currencyAr: String(row.currency_ar || row.currencyAr || "ر.س"),
  currencyEn: String(row.currency_en || row.currencyEn || "SAR"),
  taxPercent: Number(row.tax_percent ?? row.taxPercent ?? 15),
  servicePercent: Number(row.service_percent ?? row.servicePercent ?? 0),
  status: (row.status || "active") as "active" | "suspended",
  subscriptionPlan: (row.subscription_plan || row.subscriptionPlan || "pro") as "starter" | "pro" | "enterprise",
  createdAt: String(row.created_at || row.createdAt || new Date().toISOString()),
});

const fromTenant = (t: Tenant): Record<string, any> => ({
  id: t.id,
  name_ar: t.nameAr,
  name_en: t.nameEn,
  logo_url: t.logoUrl ?? null,
  email: t.email,
  phone: t.phone,
  address: t.address,
  currency_ar: t.currencyAr,
  currency_en: t.currencyEn,
  tax_percent: t.taxPercent,
  service_percent: t.servicePercent,
  status: t.status,
  subscription_plan: t.subscriptionPlan,
  created_at: t.createdAt,
});

const toBranch = (row: Record<string, any>): Branch => ({
  id: String(row.id || ""),
  tenantId: String(row.tenant_id || row.tenantId || ""),
  nameAr: String(row.name_ar || row.nameAr || ""),
  nameEn: String(row.name_en || row.nameEn || ""),
  city: String(row.city || ""),
  address: String(row.address || ""),
  phone: String(row.phone || ""),
  status: (row.status || "active") as "active" | "inactive",
});

const fromBranch = (b: Branch): Record<string, any> => ({
  id: b.id,
  tenant_id: b.tenantId,
  name_ar: b.nameAr,
  name_en: b.nameEn,
  city: b.city,
  address: b.address,
  phone: b.phone,
  status: b.status,
});

const toHall = (row: Record<string, any>): Hall => ({
  id: String(row.id || ""),
  branchId: String(row.branch_id || row.branchId || ""),
  nameAr: String(row.name_ar || row.nameAr || ""),
  nameEn: String(row.name_en || row.nameEn || ""),
});

const fromHall = (h: Hall): Record<string, any> => ({
  id: h.id,
  branch_id: h.branchId,
  name_ar: h.nameAr,
  name_en: h.nameEn,
});

const toTable = (row: Record<string, any>): Table => ({
  id: String(row.id || ""),
  hallId: String(row.hall_id || row.hallId || ""),
  number: String(row.number || ""),
  seats: Number(row.seats || 4),
  status: (row.status || "free") as Table["status"],
  qrCodeValue: String(row.qr_code_value || row.qrCodeValue || ""),
  activeOrderId: row.active_order_id || row.activeOrderId || undefined,
});

const fromTable = (t: Table): Record<string, any> => ({
  id: t.id,
  hall_id: t.hallId,
  number: t.number,
  seats: t.seats,
  status: t.status,
  qr_code_value: t.qrCodeValue,
  active_order_id: t.activeOrderId ?? null,
});

const toCategory = (row: Record<string, any>): Category => ({
  id: String(row.id || ""),
  tenantId: String(row.tenant_id || row.tenantId || ""),
  nameAr: String(row.name_ar || row.nameAr || ""),
  nameEn: String(row.name_en || row.nameEn || ""),
  icon: String(row.icon || "utensils"),
  isActive: Boolean(row.is_active ?? row.isActive ?? true),
});

const fromCategory = (c: Category): Record<string, any> => ({
  id: c.id,
  tenant_id: c.tenantId,
  name_ar: c.nameAr,
  name_en: c.nameEn,
  icon: c.icon,
  is_active: c.isActive,
});

const toIngredient = (row: Record<string, any>): Ingredient => ({
  id: String(row.id || ""),
  tenantId: String(row.tenant_id || row.tenantId || ""),
  nameAr: String(row.name_ar || row.nameAr || ""),
  nameEn: String(row.name_en || row.nameEn || ""),
  stock: Number(row.stock || 0),
  minStock: Number(row.min_stock ?? row.minStock ?? 0),
  unitAr: String(row.unit_ar || row.unitAr || ""),
  unitEn: String(row.unit_en || row.unitEn || ""),
  costPerUnit: Number(row.cost_per_unit ?? row.costPerUnit ?? 0),
  supplierId: row.supplier_id || row.supplierId || undefined,
});

const fromIngredient = (i: Ingredient): Record<string, any> => ({
  id: i.id,
  tenant_id: i.tenantId,
  name_ar: i.nameAr,
  name_en: i.nameEn,
  stock: i.stock,
  min_stock: i.minStock,
  unit_ar: i.unitAr,
  unit_en: i.unitEn,
  cost_per_unit: i.costPerUnit,
  supplier_id: i.supplierId ?? null,
});

const toSupplier = (row: Record<string, any>): Supplier => ({
  id: String(row.id || ""),
  tenantId: String(row.tenant_id || row.tenantId || ""),
  name: String(row.name || ""),
  contactPerson: String(row.contact_person || row.contactPerson || ""),
  phone: String(row.phone || ""),
  email: String(row.email || ""),
  address: String(row.address || ""),
});

const fromSupplier = (s: Supplier): Record<string, any> => ({
  id: s.id,
  tenant_id: s.tenantId,
  name: s.name,
  contact_person: s.contactPerson,
  phone: s.phone,
  email: s.email,
  address: s.address,
});

const toMenuItem = (row: Record<string, any>): MenuItem => ({
  id: String(row.id || ""),
  categoryId: String(row.category_id || row.categoryId || ""),
  nameAr: String(row.name_ar || row.nameAr || ""),
  nameEn: String(row.name_en || row.nameEn || ""),
  descriptionAr: String(row.description_ar || row.descriptionAr || ""),
  descriptionEn: String(row.description_en || row.descriptionEn || ""),
  price: Number(row.price || 0),
  imageUrl: String(row.image_url || row.imageUrl || ""),
  ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
  isAvailable: Boolean(row.is_available ?? row.isAvailable ?? true),
  extras: Array.isArray(row.extras) ? row.extras : [],
});

const fromMenuItem = (m: MenuItem): Record<string, any> => ({
  id: m.id,
  category_id: m.categoryId,
  name_ar: m.nameAr,
  name_en: m.nameEn,
  description_ar: m.descriptionAr,
  description_en: m.descriptionEn,
  price: m.price,
  image_url: m.imageUrl,
  ingredients: m.ingredients,
  is_available: m.isAvailable,
  extras: m.extras,
});

const toOrder = (row: Record<string, any>): Order => ({
  id: String(row.id || ""),
  tenantId: String(row.tenant_id || row.tenantId || ""),
  branchId: String(row.branch_id || row.branchId || ""),
  tableId: row.table_id || row.tableId || undefined,
  hallId: row.hall_id || row.hallId || undefined,
  type: (row.type || "dine_in") as Order["type"],
  status: (row.status || "new") as Order["status"],
  items: Array.isArray(row.items) ? row.items : [],
  subtotal: Number(row.subtotal || 0),
  taxAmount: Number(row.tax_amount ?? row.taxAmount ?? 0),
  serviceAmount: Number(row.service_amount ?? row.serviceAmount ?? 0),
  discountAmount: Number(row.discount_amount ?? row.discountAmount ?? 0),
  total: Number(row.total || 0),
  cashierId: row.cashier_id || row.cashierId || undefined,
  waiterId: row.waiter_id || row.waiterId || undefined,
  customerName: row.customer_name || row.customerName || undefined,
  customerPhone: row.customer_phone || row.customerPhone || undefined,
  deliveryAddress: row.delivery_address || row.deliveryAddress || undefined,
  paymentMethod: (row.payment_method || row.paymentMethod || "unpaid") as Order["paymentMethod"],
  paymentStatus: (row.payment_status || row.paymentStatus || "unpaid") as Order["paymentStatus"],
  notes: row.notes || undefined,
  createdAt: String(row.created_at || row.createdAt || new Date().toISOString()),
  updatedAt: String(row.updated_at || row.updatedAt || new Date().toISOString()),
});

const fromOrder = (o: Order): Record<string, any> => ({
  id: o.id,
  tenant_id: o.tenantId,
  branch_id: o.branchId,
  table_id: o.tableId ?? null,
  hall_id: o.hallId ?? null,
  type: o.type,
  status: o.status,
  items: o.items,
  subtotal: o.subtotal,
  tax_amount: o.taxAmount,
  service_amount: o.serviceAmount,
  discount_amount: o.discountAmount,
  total: o.total,
  cashier_id: o.cashierId ?? null,
  waiter_id: o.waiterId ?? null,
  customer_name: o.customerName ?? null,
  customer_phone: o.customerPhone ?? null,
  delivery_address: o.deliveryAddress ?? null,
  payment_method: o.paymentMethod,
  payment_status: o.paymentStatus,
  notes: o.notes ?? null,
  created_at: o.createdAt,
  updated_at: o.updatedAt,
});

const toTransaction = (row: Record<string, any>): Transaction => ({
  id: String(row.id || ""),
  tenantId: String(row.tenant_id || row.tenantId || ""),
  branchId: String(row.branch_id || row.branchId || ""),
  type: (row.type || "income") as Transaction["type"],
  categoryAr: String(row.category_ar || row.categoryAr || ""),
  categoryEn: String(row.category_en || row.categoryEn || ""),
  amount: Number(row.amount || 0),
  descriptionAr: String(row.description_ar || row.descriptionAr || ""),
  descriptionEn: String(row.description_en || row.descriptionEn || ""),
  date: String(row.date || new Date().toISOString()),
  referenceOrderId: row.reference_order_id || row.referenceOrderId || undefined,
  createdBy: String(row.created_by || row.createdBy || "system"),
});

const fromTransaction = (tx: Transaction): Record<string, any> => ({
  id: tx.id,
  tenant_id: tx.tenantId,
  branch_id: tx.branchId,
  type: tx.type,
  category_ar: tx.categoryAr,
  category_en: tx.categoryEn,
  amount: tx.amount,
  description_ar: tx.descriptionAr,
  description_en: tx.descriptionEn,
  date: tx.date,
  reference_order_id: tx.referenceOrderId ?? null,
  created_by: tx.createdBy,
});

const toEmployee = (row: Record<string, any>): Employee => ({
  id: String(row.id || ""),
  tenantId: String(row.tenant_id || row.tenantId || ""),
  branchId: String(row.branch_id || row.branchId || ""),
  name: String(row.name || row.full_name || ""),
  email: String(row.email || ""),
  role: (row.role || "other") as Employee["role"],
  phone: String(row.phone || ""),
  salary: Number(row.salary || 0),
  attendanceHistory: Array.isArray(row.attendance_history || row.attendanceHistory) ? (row.attendance_history || row.attendanceHistory) : [],
  performanceRating: Number(row.performance_rating ?? row.performanceRating ?? 5),
  status: (row.status || (row.is_active === false ? "suspended" : "active")) as "active" | "suspended",
  username: String(row.username || row.email || ""),
});

const fromEmployee = (e: Employee): Record<string, any> => ({
  id: e.id,
  tenant_id: e.tenantId,
  branch_id: e.branchId,
  name: e.name,
  email: e.email,
  role: e.role,
  phone: e.phone,
  salary: e.salary,
  attendance_history: e.attendanceHistory,
  performance_rating: e.performanceRating,
  status: e.status,
  username: e.username ?? e.email,
});

const toCustomerCRM = (row: Record<string, any>): CustomerCRM => ({
  id: String(row.id || ""),
  tenantId: String(row.tenant_id || row.tenantId || ""),
  name: String(row.name || ""),
  phone: String(row.phone || ""),
  email: row.email || undefined,
  points: Number(row.points || 0),
  loyaltyTier: (row.loyalty_tier || row.loyaltyTier || "Bronze") as CustomerCRM["loyaltyTier"],
  ordersCount: Number(row.orders_count ?? row.ordersCount ?? 0),
  totalSpent: Number(row.total_spent ?? row.totalSpent ?? 0),
  createdAt: String(row.created_at || row.createdAt || new Date().toISOString()),
});

const fromCustomerCRM = (c: CustomerCRM): Record<string, any> => ({
  id: c.id,
  tenant_id: c.tenantId,
  name: c.name,
  phone: c.phone,
  email: c.email ?? null,
  points: c.points,
  loyalty_tier: c.loyaltyTier,
  orders_count: c.ordersCount,
  total_spent: c.totalSpent,
  created_at: c.createdAt,
});

const toCoupon = (row: Record<string, any>): Coupon => ({
  id: String(row.id || ""),
  tenantId: String(row.tenant_id || row.tenantId || ""),
  code: String(row.code || ""),
  discountPercent: Number(row.discount_percent ?? row.discountPercent ?? 0),
  maxDiscount: row.max_discount ?? row.maxDiscount ?? undefined,
  minOrderValue: Number(row.min_order_value ?? row.minOrderValue ?? 0),
  expiryDate: String(row.expiry_date || row.expiryDate || ""),
  isActive: Boolean(row.is_active ?? row.isActive ?? true),
});

const fromCoupon = (c: Coupon): Record<string, any> => ({
  id: c.id,
  tenant_id: c.tenantId,
  code: c.code,
  discount_percent: c.discountPercent,
  max_discount: c.maxDiscount ?? null,
  min_order_value: c.minOrderValue,
  expiry_date: c.expiryDate,
  is_active: c.isActive,
});

const toPayrollRecord = (row: Record<string, any>): PayrollRecord => ({
  id: String(row.id || ""),
  tenantId: String(row.tenant_id || row.tenantId || ""),
  employeeId: String(row.employee_id || row.employeeId || ""),
  employeeName: String(row.employee_name || row.employeeName || ""),
  role: String(row.role || ""),
  month: String(row.month || ""),
  baseSalary: Number(row.base_salary ?? row.baseSalary ?? 0),
  advances: Number(row.advances || 0),
  deductions: Number(row.deductions || 0),
  bonuses: Number(row.bonuses || 0),
  netPaid: Number(row.net_paid ?? row.netPaid ?? 0),
  status: (row.status || "draft") as "draft" | "paid",
  updatedAt: String(row.updated_at || row.updatedAt || new Date().toISOString()),
});

const fromPayrollRecord = (p: PayrollRecord): Record<string, any> => ({
  id: p.id,
  tenant_id: p.tenantId,
  employee_id: p.employeeId,
  employee_name: p.employeeName,
  role: p.role,
  month: p.month,
  base_salary: p.baseSalary,
  advances: p.advances,
  deductions: p.deductions,
  bonuses: p.bonuses,
  net_paid: p.netPaid,
  status: p.status,
  updated_at: p.updatedAt,
});

const toAuditLog = (row: Record<string, any>): AuditLog => ({
  id: String(row.id || ""),
  tenantId: String(row.tenant_id || row.tenantId || ""),
  username: String(row.username || ""),
  action: String(row.action || ""),
  timestamp: String(row.timestamp || row.created_at || new Date().toISOString()),
  ip: String(row.ip || row.ip_address || "127.0.0.1"),
  beforeValue: typeof row.before_value === "string" ? row.before_value : (row.before_value ? JSON.stringify(row.before_value) : undefined),
  afterValue: typeof row.after_value === "string" ? row.after_value : (row.after_value ? JSON.stringify(row.after_value) : undefined),
});

const resourceMappers: Record<string, { toDto: (row: any) => any; fromDto: (dto: any) => any }> = {
  tenants: { toDto: toTenant, fromDto: fromTenant },
  branches: { toDto: toBranch, fromDto: fromBranch },
  halls: { toDto: toHall, fromDto: fromHall },
  tables: { toDto: toTable, fromDto: fromTable },
  categories: { toDto: toCategory, fromDto: fromCategory },
  ingredients: { toDto: toIngredient, fromDto: fromIngredient },
  suppliers: { toDto: toSupplier, fromDto: fromSupplier },
  menu_items: { toDto: toMenuItem, fromDto: fromMenuItem },
  orders: { toDto: toOrder, fromDto: fromOrder },
  financial_transactions: { toDto: toTransaction, fromDto: fromTransaction },
  employees: { toDto: toEmployee, fromDto: fromEmployee },
  customers_crm: { toDto: toCustomerCRM, fromDto: fromCustomerCRM },
  coupons: { toDto: toCoupon, fromDto: fromCoupon },
  payroll_records: { toDto: toPayrollRecord, fromDto: fromPayrollRecord },
  audit_logs: { toDto: toAuditLog, fromDto: (a: any) => a },
};

const safeReadColumnsByResource: Record<string, string> = {
  tenants: 'id, name_ar, name_en, logo_url, email, phone, address, currency_ar, currency_en, tax_percent, service_percent, status, subscription_plan, created_at, updated_at',
  branches: 'id, tenant_id, name_ar, name_en, city, address, phone, status, created_at, updated_at',
  halls: 'id, branch_id, name_ar, name_en, created_at',
  tables: 'id, hall_id, number, seats, status, qr_code_value, active_order_id, created_at, updated_at',
  categories: 'id, tenant_id, name_ar, name_en, icon, is_active, sort_order, created_at',
  ingredients: 'id, tenant_id, name_ar, name_en, stock, min_stock, unit_ar, unit_en, cost_per_unit, supplier_id, created_at, updated_at',
  suppliers: 'id, tenant_id, name, contact_person, phone, email, address, created_at',
  menu_items: 'id, category_id, name_ar, name_en, description_ar, description_en, price, image_url, is_available, created_at, updated_at',
  orders: 'id, tenant_id, branch_id, table_id, hall_id, cashier_id, waiter_id, customer_crm_id, coupon_id, type, status, subtotal, tax_amount, service_amount, discount_amount, total, customer_name, customer_phone, delivery_address, payment_method, payment_status, notes, created_at, updated_at',
  financial_transactions: 'id, tenant_id, branch_id, type, category_ar, category_en, amount, description_ar, description_en, date, reference_order_id, created_by, created_at',
  employees: 'id, tenant_id, branch_id, name, email, username, role, phone, salary, attendance_history, performance_rating, status, created_at, updated_at',
  customers_crm: 'id, tenant_id, name, phone, email, points, loyalty_tier, orders_count, total_spent, created_at, updated_at',
  coupons: 'id, tenant_id, code, discount_percent, max_discount, min_order_value, expiry_date, is_active, created_at',
  payroll_records: 'id, tenant_id, employee_id, employee_name, role, month, base_salary, advances, deductions, bonuses, net_paid, status, paid_at, updated_at',
  audit_logs: 'id, tenant_id, employee_id, username, action, before_value, after_value, ip_address, user_agent, created_at',
  platform_admins: 'id, full_name, username, email, role, is_active, failed_login_attempts, locked_until, last_login_at, last_login_ip, created_at, updated_at',
};

// Pure Supabase Backend-as-a-Service Repository
export class StorageService {
  private static bootstrapPromise: Promise<void> | null = null;
  private static apiCache: Record<string, unknown> = {};

  private static async readFromApi<T>(resource: string, fallback?: T): Promise<T> {
    if (isSupabaseConfigured && supabase) {
      try {
        const selectColumns = safeReadColumnsByResource[resource] || 'id';
        const { data, error } = await supabase.from(resource).select(selectColumns);
        if (!error && data) {
          const mapper = resourceMappers[resource]?.toDto || ((x: any) => x);
          return data.map(mapper) as T;
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn(`Supabase read failed for ${resource}:`, err);
        }
      }
    }
    return fallback as T;
  }

  private static async writeToApi<T extends { id?: string }>(resource: string, payload: T, fallback?: T): Promise<T> {
    if (isSupabaseConfigured && supabase) {
      try {
        const mapper = resourceMappers[resource]?.fromDto || ((x: any) => x);
        const payloadSnake = mapper(payload);
        const { data, error } = await supabase.from(resource).upsert(payloadSnake).select().single();
        if (!error && data) {
          const toMapper = resourceMappers[resource]?.toDto || ((x: any) => x);
          return toMapper(data) as T;
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn(`Supabase write failed for ${resource}:`, err);
        }
      }
    }
    return (fallback !== undefined ? fallback : payload) as T;
  }

  private static async deleteFromApi(resource: string, id: string) {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from(resource).delete().eq("id", id);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn(`Supabase delete failed for ${resource}:`, err);
        }
      }
    }
  }

  private static get<T>(key: string, initial: T): T {
    if (this.apiCache[key] !== undefined) {
      return this.apiCache[key] as T;
    }
    return initial;
  }

  private static setApiCache<T>(key: string, value: T) {
    this.apiCache[key] = value;
  }

  private static getAuthToken(): string | null {
    if (typeof window === "undefined") {
      return null;
    }
    return window.localStorage.getItem("restohub_token");
  }

  private static getClientIpAddress(): string {
    if (typeof window === "undefined") {
      return (import.meta as ImportMeta & { env?: { VITE_CLIENT_IP?: string } }).env?.VITE_CLIENT_IP || "unknown";
    }
    return (import.meta as ImportMeta & { env?: { VITE_CLIENT_IP?: string } }).env?.VITE_CLIENT_IP || window.location.hostname || "unknown";
  }

  private static getEdgeFunctionUrl(): string | null {
    const supabaseUrl = (import.meta as ImportMeta & { env?: { VITE_SUPABASE_URL?: string } }).env?.VITE_SUPABASE_URL || '';
    if (!supabaseUrl.trim()) {
      return null;
    }

    try {
      const url = new URL(supabaseUrl);
      const host = url.hostname.replace(/\.supabase\.co$/i, '.functions.supabase.co');
      return `https://${host}/mint-session`;
    } catch {
      return null;
    }
  }

  private static async mintSupabaseSession(username: string, password: string): Promise<{ ok: boolean; email?: string; authUserId?: string }> {
    const edgeFunctionUrl = this.getEdgeFunctionUrl();
    if (!edgeFunctionUrl) {
      return { ok: false };
    }

    try {
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Unable to mint the Supabase session.');
      }

      const payload = (await response.json()) as { ok?: boolean; email?: string; authUserId?: string };
      return { ok: Boolean(payload.ok), email: payload.email, authUserId: payload.authUserId };
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('Supabase edge session mint failed:', err);
      }
      return { ok: false };
    }
  }

  private static createSessionToken(payload: Record<string, unknown>): string {
    const encodeSegment = (value: unknown) => {
      const json = JSON.stringify(value);
      const bytes = new TextEncoder().encode(json);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    };

    const header = encodeSegment({ alg: "HS256", typ: "JWT" });
    const body = encodeSegment(payload);
    const secret = (import.meta as ImportMeta & { env?: { VITE_JWT_SECRET?: string } }).env?.VITE_JWT_SECRET || "restohub-dev-secret";
    const signature = encodeSegment(`${header}.${body}.${secret}`);
    return `${header}.${body}.${signature}`;
  }

  private static persistSessionToken(payload: Record<string, unknown>) {
    if (typeof window === "undefined") {
      return;
    }
    const token = this.createSessionToken(payload);
    window.localStorage.setItem("restohub_token", token);
    window.localStorage.setItem("restohub_session", JSON.stringify(payload));
  }

  public static async restoreSession(): Promise<Employee | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          const { data: empData } = await supabase.from("employees").select("*").eq("email", session.user.email).single();
          if (empData) {
            const emp = toEmployee(empData);
            this.set("employees", [emp]);
            await this.loadProtectedData(emp);
            return emp;
          }
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn("Supabase restoreSession failed:", err);
        }
      }
    }
    return null;
  }

  private static async loadProtectedData(employee: Employee) {
    const payloadResources = [
      ["tenants", "tenants"],
      ["branches", "branches"],
      ["halls", "halls"],
      ["tables", "tables"],
      ["categories", "categories"],
      ["suppliers", "suppliers"],
      ["ingredients", "ingredients"],
      ["menu_items", "menu_items"],
      ["orders", "orders"],
      ["transactions", "financial_transactions"],
      ["employees", "employees"],
      ["crm", "customers_crm"],
      ["coupons", "coupons"],
      ["payroll_records", "payroll_records"],
      ["audit_logs", "audit_logs"],
    ] as const;

    await Promise.all(
      payloadResources.map(async ([cacheKey, resource]) => {
        const data = await this.readFromApi<unknown[]>(resource, []);
        this.setApiCache(cacheKey, data);
      }),
    );

    const employees = this.getEmployees(employee.tenantId);
    const hasCurrent = employees.some((item) => item.id === employee.id);
    if (!hasCurrent) {
      employees.unshift(employee);
      this.set("employees", employees);
    }
  }

  public static async getLoginLockStatus(username: string): Promise<{ isLocked: boolean; attemptsCount: number; lockoutSeconds: number; lockedUntil: string | null }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('check_login_attempt_lock', {
          p_username: username.trim().toLowerCase(),
          p_ip_address: this.getClientIpAddress(),
        });

        if (!error && data) {
          const row = Array.isArray(data) ? data[0] : data;
          return {
            isLocked: row?.is_allowed === false,
            attemptsCount: Number(row?.attempts_count || 0),
            lockoutSeconds: Number(row?.lockout_seconds || 0),
            lockedUntil: row?.locked_until || null,
          };
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('Login lock check failed:', err);
        }
      }
    }

    return { isLocked: false, attemptsCount: 0, lockoutSeconds: 0, lockedUntil: null };
  }

  public static async recordLoginAttempt(username: string, success: boolean): Promise<{ isLocked: boolean; attemptsCount: number; lockoutSeconds: number; lockedUntil: string | null }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('record_login_attempt', {
          p_username: username.trim().toLowerCase(),
          p_ip_address: this.getClientIpAddress(),
          p_success: success,
        });

        if (!error && data) {
          const row = Array.isArray(data) ? data[0] : data;
          return {
            isLocked: row?.is_allowed === false,
            attemptsCount: Number(row?.attempts_count || 0),
            lockoutSeconds: Number(row?.lockout_seconds || 0),
            lockedUntil: row?.locked_until || null,
          };
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('Login attempt recording failed:', err);
        }
      }
    }

    return { isLocked: false, attemptsCount: 0, lockoutSeconds: 0, lockedUntil: null };
  }

  public static async login(username: string, password: string): Promise<Employee> {
    const normalizedUsername = username.trim().toLowerCase();
    const lockStatus = await this.getLoginLockStatus(normalizedUsername);
    if (lockStatus.isLocked) {
      throw new Error(`Too many failed attempts. Please wait ${lockStatus.lockoutSeconds} seconds.`);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('verify_employee_login', {
          p_username: normalizedUsername,
          p_password: password,
        });

        if (error) {
          const failedLockStatus = await this.recordLoginAttempt(normalizedUsername, false);
          if (failedLockStatus.isLocked) {
            throw new Error(`Too many failed attempts. Please wait ${failedLockStatus.lockoutSeconds} seconds.`);
          }
          throw new Error(error.message || 'Invalid username or password.');
        }

        const employeeRow = Array.isArray(data) ? data[0] : data;
        if (employeeRow) {
          const emp = toEmployee(employeeRow);
          await this.recordLoginAttempt(normalizedUsername, true);

          const minted = await this.mintSupabaseSession(normalizedUsername, password);
          if (minted.ok && minted.email) {
            const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
              email: minted.email,
              password,
            });
            if (signInError) {
              throw new Error(signInError.message || 'Unable to create a real Supabase session.');
            }
            if (!authData.session) {
              throw new Error('Supabase did not return a valid signed session.');
            }
          }

          this.set('employees', [emp]);
          this.persistSessionToken({
            sub: emp.id,
            email: emp.email,
            role: emp.role,
            username: emp.username || emp.email,
            tenant_id: emp.tenantId,
            jwt_tenant_id: emp.tenantId,
          });
          await this.loadProtectedData(emp);
          return emp;
        }

        const failedLockStatus = await this.recordLoginAttempt(normalizedUsername, false);
        if (failedLockStatus.isLocked) {
          throw new Error(`Too many failed attempts. Please wait ${failedLockStatus.lockoutSeconds} seconds.`);
        }
        throw new Error('Invalid username or password.');
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('RPC employee login failed, falling back to Supabase auth:', err);
        }
        if (err instanceof Error && err.message.includes('Too many failed attempts')) {
          throw err;
        }
      }

      try {
        let loginEmail = normalizedUsername;

        if (!normalizedUsername.includes('@')) {
          const { data: employeeMatch, error: lookupError } = await supabase
            .from('employees')
            .select('email')
            .or(`username.eq.${normalizedUsername},email.eq.${normalizedUsername}`)
            .limit(1)
            .single();

          if (!lookupError && employeeMatch?.email) {
            loginEmail = employeeMatch.email;
          }
        }

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });

        if (authError) {
          const failedLockStatus = await this.recordLoginAttempt(normalizedUsername, false);
          if (failedLockStatus.isLocked) {
            throw new Error(`Too many failed attempts. Please wait ${failedLockStatus.lockoutSeconds} seconds.`);
          }
          throw new Error(authError.message || 'Invalid username or password.');
        }

        if (authData?.user) {
          const { data: empData, error: empError } = await supabase
            .from('employees')
            .select('id, tenant_id, branch_id, name, email, username, role, phone, salary, attendance_history, performance_rating, status, created_at, updated_at')
            .or(`username.eq.${normalizedUsername},email.eq.${loginEmail}`)
            .limit(1)
            .single();

          if (empError) {
            const failedLockStatus = await this.recordLoginAttempt(normalizedUsername, false);
            if (failedLockStatus.isLocked) {
              throw new Error(`Too many failed attempts. Please wait ${failedLockStatus.lockoutSeconds} seconds.`);
            }
            throw new Error(empError.message || 'Unable to load employee profile.');
          }

          if (empData) {
            const emp = toEmployee(empData);
            await this.recordLoginAttempt(normalizedUsername, true);
            this.set('employees', [emp]);
            this.persistSessionToken({
              sub: emp.id,
              email: emp.email,
              role: emp.role,
              username: emp.username || emp.email,
              tenant_id: emp.tenantId,
              jwt_tenant_id: emp.tenantId,
            });
            await this.loadProtectedData(emp);
            return emp;
          }
        }

        const failedLockStatus = await this.recordLoginAttempt(normalizedUsername, false);
        if (failedLockStatus.isLocked) {
          throw new Error(`Too many failed attempts. Please wait ${failedLockStatus.lockoutSeconds} seconds.`);
        }
        throw new Error('Invalid username or password.');
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('Supabase auth login failed:', err);
        }
        if (err instanceof Error && err.message.includes('Too many failed attempts')) {
          throw err;
        }
        throw err instanceof Error ? err : new Error('Invalid username or password.');
      }
    }

    // Demo / Offline fallback only: used when Supabase is not configured at all.
    const emps = this.get<Employee[]>("employees", INITIAL_EMPLOYEES);
    const matched = emps.find((e) => e.username === username || e.email === username);

    if (!matched) {
      throw new Error("Invalid username or password.");
    }

    const passwordMatches =
      matched.password !== undefined &&
      matched.password !== null &&
      String(matched.password) === String(password);

    if (!passwordMatches) {
      throw new Error("Invalid username or password.");
    }

    this.set("employees", [matched]);
    this.persistSessionToken({
      sub: matched.id,
      email: matched.email,
      role: matched.role,
      username: matched.username || matched.email,
      tenant_id: matched.tenantId,
      jwt_tenant_id: matched.tenantId,
    });
    await this.loadProtectedData(matched);
    return matched;
  }

  public static async loginPlatformAdmin(username: string, password: string): Promise<Record<string, unknown>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('verify_platform_admin_login', {
          p_username: username,
          p_password: password,
        });

        if (error) {
          throw new Error(error.message || 'Invalid platform admin credentials.');
        }

        const adminRow = Array.isArray(data) ? data[0] : data;
        if (adminRow) {
          this.persistSessionToken({
            sub: adminRow.id,
            email: adminRow.email,
            role: adminRow.role,
            username: adminRow.username,
            tenant_id: null,
            jwt_tenant_id: null,
          });
          return adminRow as Record<string, unknown>;
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('Platform admin RPC login failed:', err);
        }
        throw err instanceof Error ? err : new Error('Invalid platform admin credentials.');
      }
    }

    throw new Error('Platform admin login is unavailable without the RPC function.');
  }

  public static async logout() {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn("Supabase signOut error:", err);
        }
      }
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("restohub_token");
      window.localStorage.removeItem("restohub_session");
    }
  }

  public static async bootstrapFromApi() {
    if (this.bootstrapPromise) {
      return this.bootstrapPromise;
    }

    this.bootstrapPromise = (async () => {
      const resources = [
        ["tenants", "tenants"],
        ["branches", "branches"],
        ["halls", "halls"],
        ["tables", "tables"],
        ["categories", "categories"],
        ["suppliers", "suppliers"],
        ["ingredients", "ingredients"],
        ["menu_items", "menu_items"],
        ["orders", "orders"],
        ["transactions", "financial_transactions"],
        ["employees", "employees"],
        ["crm", "customers_crm"],
        ["coupons", "coupons"],
      ] as const;

      await Promise.all(resources.map(async ([storageKey, resource]) => {
        const payload = await this.readFromApi<unknown[]>(resource, []);
        this.setApiCache(storageKey, payload);
      }));
    })();

    return this.bootstrapPromise;
  }

  private static set<T>(key: string, value: T) {
    this.apiCache[key] = value;
  }

  public static clearCache(key: string) {
    delete this.apiCache[key];
  }

  private static updateList<T>(key: string, initial: T[], updater: (list: T[]) => T[]) {
    const current = this.get<T[]>(key, initial);
    const updated = updater([...current]);
    this.set(key, updated);
    return updated;
  }

  private static deleteFromList<T>(key: string, initial: T[], predicate: (item: T) => boolean) {
    return this.updateList(key, initial, (list) => list.filter((item) => !predicate(item)));
  }

  // Reload seed datasets to factory defaults
  public static resetToFactoryDefaults() {
    this.set('tenants', INITIAL_TENANTS);
    this.set('branches', INITIAL_BRANCHES);
    this.set('halls', INITIAL_HALLS);
    this.set('tables', INITIAL_TABLES);
    this.set('categories', INITIAL_CATEGORIES);
    this.set('ingredients', INITIAL_INGREDIENTS);
    this.set('menu_items', INITIAL_MENU_ITEMS);
    this.set('orders', INITIAL_ORDERS);
    this.set('transactions', INITIAL_TRANSACTIONS);
    this.set('employees', INITIAL_EMPLOYEES);
    this.set('crm', INITIAL_CRM);
    this.set('coupons', INITIAL_COUPONS);
    this.set('suppliers', INITIAL_SUPPLIERS);
  }

  // Public Accessors to state arrays
  public static getTenants(): Tenant[] {
    return this.get<Tenant[]>('tenants', INITIAL_TENANTS);
  }

  public static async loadTenantsFromApi(): Promise<Tenant[]> {
    return this.readFromApi<Tenant[]>('tenants');
  }

  public static getBranches(tenantId?: string): Branch[] {
    const list = this.get<Branch[]>('branches', INITIAL_BRANCHES);
    return tenantId ? list.filter((b) => b.tenantId === tenantId) : list;
  }

  public static async loadBranchesFromApi(tenantId?: string): Promise<Branch[]> {
    const list = await this.readFromApi<Branch[]>('branches');
    return tenantId ? list.filter((b) => b.tenantId === tenantId) : list;
  }

  public static async loadIngredientsFromApi(tenantId?: string): Promise<Ingredient[]> {
    const list = await this.readFromApi<Ingredient[]>('ingredients');
    return tenantId ? list.filter((i) => i.tenantId === tenantId) : list;
  }

  public static async loadSuppliersFromApi(tenantId?: string): Promise<Supplier[]> {
    const list = await this.readFromApi<Supplier[]>('suppliers');
    return tenantId ? list.filter((s) => s.tenantId === tenantId) : list;
  }

  public static async loadMenuItemsFromApi(tenantId?: string): Promise<MenuItem[]> {
    const list = await this.readFromApi<MenuItem[]>('menu_items');
    return tenantId ? list.filter((item) => {
      const cats = this.getCategories(tenantId);
      const catIds = cats.map((c) => c.id);
      return catIds.includes(item.categoryId);
    }) : list;
  }

  public static async loadOrdersFromApi(tenantId?: string, branchId?: string): Promise<Order[]> {
    const list = await this.readFromApi<Order[]>('orders');
    if (!tenantId && !branchId) {
      return list;
    }
    return list.filter((order) => {
      if (tenantId && order.tenantId !== tenantId) return false;
      if (branchId && order.branchId !== branchId) return false;
      return true;
    });
  }

  public static async loadHallsFromApi(branchId?: string): Promise<Hall[]> {
    const list = await this.readFromApi<Hall[]>('halls');
    this.set('halls', list);
    this.setApiCache('halls', list);
    return branchId ? list.filter((hall) => hall.branchId === branchId) : list;
  }

  public static async loadTablesFromApi(branchId?: string): Promise<Table[]> {
    const list = await this.readFromApi<Table[]>('tables');
    this.set('tables', list);
    this.setApiCache('tables', list);
    return branchId ? list.filter((table) => {
      const halls = this.getHalls(branchId);
      const hallIds = halls.map((h) => h.id);
      return hallIds.includes(table.hallId);
    }) : list;
  }

  public static async loadCRMFromApi(tenantId?: string): Promise<CustomerCRM[]> {
    const list = await this.readFromApi<CustomerCRM[]>('customers_crm');
    this.set('crm', list);
    this.setApiCache('crm', list);
    return tenantId ? list.filter((crm) => crm.tenantId === tenantId) : list;
  }

  public static getHalls(branchId?: string): Hall[] {
    const list = this.get<Hall[]>('halls', INITIAL_HALLS);
    if (!branchId) return list;
    return list.filter((h) => h.branchId === branchId);
  }

  public static getTables(branchId?: string): Table[] {
    const list = this.get<Table[]>('tables', INITIAL_TABLES);
    if (!branchId) return list;
    const halls = this.getHalls(branchId);
    const hallIds = halls.map((h) => h.id);
    return list.filter((t) => hallIds.includes(t.hallId));
  }

  public static updateTables(tables: Table[]) {
    const all = this.get<Table[]>('tables', INITIAL_TABLES);
    const updated = all.map((t) => {
      const match = tables.find((ut) => ut.id === t.id);
      return match ? match : t;
    });
    this.set('tables', updated);
    return updated;
  }

  public static getCategories(tenantId?: string): Category[] {
    const list = this.get<Category[]>('categories', INITIAL_CATEGORIES);
    return tenantId ? list.filter((c) => c.tenantId === tenantId) : list;
  }

  public static getIngredients(tenantId?: string): Ingredient[] {
    const list = this.get<Ingredient[]>('ingredients', INITIAL_INGREDIENTS);
    return tenantId ? list.filter((i) => i.tenantId === tenantId) : list;
  }

  public static getSuppliers(tenantId?: string): Supplier[] {
    const list = this.get<Supplier[]>('suppliers', INITIAL_SUPPLIERS);
    return tenantId ? list.filter((s) => s.tenantId === tenantId) : list;
  }

  public static getMenuItems(tenantId?: string): MenuItem[] {
    const items = this.get<MenuItem[]>('menu_items', INITIAL_MENU_ITEMS);
    if (!tenantId) return items;
    const cats = this.getCategories(tenantId);
    const catIds = cats.map((c) => c.id);
    return items.filter((item) => catIds.includes(item.categoryId));
  }

  public static getOrders(tenantId?: string, branchId?: string): Order[] {
    let list = this.get<Order[]>('orders', INITIAL_ORDERS);
    if (tenantId) {
      list = list.filter((o) => o.tenantId === tenantId);
    }
    if (branchId) {
      list = list.filter((o) => o.branchId === branchId);
    }
    return list;
  }

  public static getTransactions(tenantId?: string, branchId?: string): Transaction[] {
    let list = this.get<Transaction[]>('transactions', INITIAL_TRANSACTIONS);
    if (tenantId) {
      list = list.filter((t) => t.tenantId === tenantId);
    }
    if (branchId) {
      list = list.filter((t) => t.branchId === branchId);
    }
    return list;
  }

  public static getEmployees(tenantId?: string): Employee[] {
    const list = this.get<Employee[]>('employees', INITIAL_EMPLOYEES);
    return tenantId ? list.filter((e) => e.tenantId === tenantId) : list;
  }

  public static getCRM(tenantId?: string): CustomerCRM[] {
    const list = this.get<CustomerCRM[]>('crm', INITIAL_CRM);
    return tenantId ? list.filter((c) => c.tenantId === tenantId) : list;
  }

  public static getCoupons(tenantId?: string): Coupon[] {
    const list = this.get<Coupon[]>('coupons', INITIAL_COUPONS);
    return tenantId ? list.filter((c) => c.tenantId === tenantId) : list;
  }

  // Mutators & Adders
  public static async saveTenant(tenant: Tenant) {
    const saved = await this.writeToApi('tenants', tenant, tenant);
    const list = this.getTenants();
    const idx = list.findIndex(t => t.id === saved.id);
    if (idx >= 0) list[idx] = saved;
    else list.push(saved);
    this.set('tenants', list);
    return saved;
  }

  public static async saveBranch(branch: Branch) {
    const saved = await this.writeToApi('branches', branch, branch);
    const list = this.getBranches();
    const idx = list.findIndex(b => b.id === saved.id);
    if (idx >= 0) list[idx] = saved;
    else list.push(saved);
    this.set('branches', list);
    return saved;
  }

  public static async saveCategory(cat: Category) {
    const saved = await this.writeToApi('categories', cat, cat);
    const list = this.getCategories();
    const idx = list.findIndex(c => c.id === saved.id);
    if (idx >= 0) list[idx] = saved;
    else list.push(saved);
    this.set('categories', list);
    return saved;
  }

  public static async saveHall(hall: Hall) {
    const saved = await this.writeToApi('halls', hall, hall);
    const list = this.getHalls();
    const idx = list.findIndex((item) => item.id === saved.id);
    if (idx >= 0) list[idx] = saved;
    else list.push(saved);
    this.set('halls', list);
    return saved;
  }

  public static async saveTable(table: Table) {
    const saved = await this.writeToApi('tables', table, table);
    const list = this.get<Table[]>('tables', INITIAL_TABLES);
    const idx = list.findIndex((item) => item.id === saved.id);
    if (idx >= 0) list[idx] = saved;
    else list.push(saved);
    this.set('tables', list);
    return saved;
  }

  public static async saveTables(tables: Table[]) {
    const savedList = await Promise.all(tables.map((table) => this.writeToApi('tables', table, table)));
    const updated = this.updateTables(savedList);
    return updated;
  }

  public static async saveMenuItem(item: MenuItem) {
    const saved = await this.writeToApi('menu_items', item, item);
    const list = this.get<MenuItem[]>('menu_items', INITIAL_MENU_ITEMS);
    const idx = list.findIndex(i => i.id === saved.id);
    if (idx >= 0) list[idx] = saved;
    else list.push(saved);
    this.set('menu_items', list);
    return saved;
  }

  public static async createEmployeeWithPassword(emp: Employee, password?: string): Promise<Employee> {
    if (isSupabaseConfigured && supabase && password) {
      try {
        const { data, error } = await supabase.rpc('create_employee_with_password', {
          p_tenant_id: emp.tenantId,
          p_branch_id: emp.branchId,
          p_name: emp.name,
          p_email: emp.email,
          p_username: emp.username ?? null,
          p_password: password,
          p_role: emp.role,
          p_phone: emp.phone,
          p_salary: emp.salary,
          p_performance_rating: emp.performanceRating,
          p_status: emp.status,
        });

        if (!error && data) {
          const created = toEmployee(Array.isArray(data) ? data[0] : data);
          const list = this.getEmployees();
          const idx = list.findIndex((item) => item.id === created.id);
          if (idx >= 0) list[idx] = created;
          else list.push(created);
          this.set('employees', list);
          await this.addAuditLog(created.tenantId, 'system', `Created Employee via RPC #${created.name} (${created.role})`, null, created);
          return created;
        }

        if (error) {
          console.warn('create_employee_with_password RPC failed:', error.message);
        }
      } catch (err) {
        console.warn('create_employee_with_password RPC error:', err);
      }
    }

    const saved = await this.writeToApi('employees', emp, emp);
    const list = this.getEmployees();
    const idx = list.findIndex((item) => item.id === saved.id);
    if (idx >= 0) list[idx] = saved;
    else list.push(saved);
    this.set('employees', list);
    await this.addAuditLog(saved.tenantId, 'system', `Created Employee #${saved.name} (${saved.role})`, null, saved);
    return saved;
  }

  public static async saveEmployee(emp: Employee) {
    const saved = await this.writeToApi('employees', emp, emp);
    const list = this.getEmployees();
    const idx = list.findIndex(e => e.id === saved.id);
    let oldEmp: Employee | undefined;
    if (idx >= 0) {
      oldEmp = { ...list[idx] };
      list[idx] = saved;
    } else {
      list.push(saved);
    }
    this.set('employees', list);

    if (oldEmp) {
      await this.addAuditLog(saved.tenantId, 'system', `Updated Employee #${saved.name} (${saved.role})`, oldEmp, saved);
    } else {
      await this.addAuditLog(saved.tenantId, 'system', `Created Employee #${saved.name} (${saved.role})`, null, saved);
    }

    return saved;
  }

  public static async saveCRM(crm: CustomerCRM) {
    const saved = await this.writeToApi('customers_crm', crm, crm);
    const list = this.getCRM();
    const idx = list.findIndex(c => c.id === saved.id);
    if (idx >= 0) list[idx] = saved;
    else list.push(saved);
    this.set('crm', list);
    return saved;
  }

  public static async saveCoupon(coupon: Coupon) {
    const saved = await this.writeToApi('coupons', coupon, coupon);
    const list = this.getCoupons();
    const idx = list.findIndex(c => c.id === saved.id);
    if (idx >= 0) list[idx] = saved;
    else list.push(saved);
    this.set('coupons', list);
    return saved;
  }

  public static async saveIngredient(ing: Ingredient) {
    const saved = await this.writeToApi('ingredients', ing, ing);
    const list = this.getIngredients();
    const idx = list.findIndex(i => i.id === saved.id);
    let oldIng: Ingredient | undefined;
    if (idx >= 0) {
      oldIng = { ...list[idx] };
      list[idx] = saved;
    } else {
      list.push(saved);
    }
    this.set('ingredients', list);

    await this.addAuditLog(saved.tenantId, 'system', `Updated Stock/Cost for raw material Ingredient #${saved.nameEn || saved.nameAr} (Stock: ${saved.stock}, Cost: ${saved.costPerUnit} SAR)`, oldIng, saved);
    return saved;
  }

  public static async saveSupplier(supplier: Supplier) {
    const saved = await this.writeToApi('suppliers', supplier, supplier);
    const list = this.getSuppliers();
    const idx = list.findIndex(s => s.id === saved.id);
    if (idx >= 0) list[idx] = saved;
    else list.push(saved);
    this.set('suppliers', list);
    return saved;
  }

  public static async saveOrder(order: Order, deductStockOnPreparing = true): Promise<Order> {
    const list = this.get<Order[]>('orders', INITIAL_ORDERS);
    const idx = list.findIndex((o) => o.id === order.id);

    let oldStatus: OrderStatus | undefined;
    if (idx >= 0) {
      oldStatus = list[idx].status;
    }

    const orderToPersist = idx >= 0 ? { ...order, updatedAt: new Date().toISOString() } : order;
    const saved = await this.writeToApi('orders', orderToPersist, orderToPersist);
    if (idx >= 0) {
      list[idx] = saved;
    } else {
      list.push(saved);
    }
    this.set('orders', list);

    if (deductStockOnPreparing && saved.status === 'preparing' && oldStatus !== 'preparing') {
      await this.deductIngredientsForOrder(saved);
    }

    if (saved.status === 'delivered' && oldStatus !== 'delivered' && saved.customerPhone) {
      await this.addLoyaltyPointsForOrder(saved);
    }

    if (saved.status === 'delivered' && oldStatus !== 'delivered' && saved.paymentStatus === 'paid') {
      await this.addTransaction({
        id: `tx_${Date.now()}`,
        tenantId: saved.tenantId,
        branchId: saved.branchId,
        type: 'income',
        categoryAr: 'مبيعات طلبات الطعام',
        categoryEn: 'Food orders direct sales',
        amount: saved.total,
        descriptionAr: `طلبية مبيعات رقم ${saved.id.slice(-6).toUpperCase()} - نوع: ${saved.type === 'dine_in' ? 'داخلي صالة' : saved.type === 'takeaway' ? 'سفري جاهز' : 'توصيل منزلي'}`,
        descriptionEn: `Order sales ref #${saved.id.slice(-6).toUpperCase()} - Type: ${saved.type}`,
        date: new Date().toISOString(),
        referenceOrderId: saved.id,
        createdBy: saved.cashierId || 'System Auto',
      });
    }

    if (saved.type === 'dine_in' && saved.tableId) {
      const allTables = this.get<Table[]>('tables', INITIAL_TABLES);
      const tableIdx = allTables.findIndex((t) => t.id === saved.tableId);
      if (tableIdx >= 0) {
        const updatedTable = { ...allTables[tableIdx] };
        if (saved.status === 'delivered') {
          updatedTable.status = 'cleaning';
          updatedTable.activeOrderId = undefined;
        } else if (saved.status === 'cancelled') {
          updatedTable.status = 'free';
          updatedTable.activeOrderId = undefined;
        } else {
          updatedTable.status = 'busy';
          updatedTable.activeOrderId = saved.id;
        }
        allTables[tableIdx] = updatedTable;
        this.set('tables', allTables);
        await this.saveTable(updatedTable);
      }
    }

    return saved;
  }

  // Add loyalty points to customer record
  private static async addLoyaltyPointsForOrder(order: Order) {
    const crmList = this.getCRM(order.tenantId);
    let customer = crmList.find((c) => c.phone === order.customerPhone);
    const pointsGained = Math.floor(order.total / 10); // 1 point for every 10 SAR spent

    if (customer) {
      customer.points += pointsGained;
      customer.ordersCount += 1;
      customer.totalSpent += order.total;
      if (customer.totalSpent >= 2500) customer.loyaltyTier = 'VIP';
      else if (customer.totalSpent >= 1000) customer.loyaltyTier = 'Gold';
      else if (customer.totalSpent >= 400) customer.loyaltyTier = 'Silver';
      await this.saveCRM(customer);
    } else {
      const newCust: CustomerCRM = {
        id: `crm_${Date.now()}`,
        tenantId: order.tenantId,
        name: order.customerName || 'عميل نقدي صالة',
        phone: order.customerPhone!,
        points: pointsGained,
        loyaltyTier: pointsGained > 40 ? 'Silver' : 'Bronze',
        ordersCount: 1,
        totalSpent: order.total,
        createdAt: new Date().toISOString(),
      };
      await this.saveCRM(newCust);
    }
  }

  // Dynamic automatic deduction of raw materials ingredients on item sale
  private static async deductIngredientsForOrder(order: Order) {
    const menuItems = this.getMenuItems(order.tenantId);
    const currentIngredients = this.getIngredients(order.tenantId);

    for (const item of order.items) {
      const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
      if (menuItem && menuItem.ingredients && menuItem.ingredients.length > 0) {
        for (const recipeItem of menuItem.ingredients) {
          const ingId = recipeItem.ingredientId;
          const ingredient = currentIngredients.find((i) => i.id === ingId);
          if (ingredient) {
            const totalDeduction = recipeItem.quantityNeeded * item.quantity;
            ingredient.stock = Math.max(0, ingredient.stock - totalDeduction);
            await this.saveIngredient(ingredient);
          }
        }
      }
    }
  }

  // Cash ledger inserts
  public static async addTransaction(tx: Transaction) {
    const saved = await this.writeToApi('financial_transactions', tx as Transaction & { id?: string }, tx as Transaction & { id?: string });
    const list = this.get<Transaction[]>('transactions', INITIAL_TRANSACTIONS);
    list.unshift(saved);
    this.set('transactions', list);
    await this.addAuditLog(saved.tenantId, 'system', `Recorded Financial Transaction: ${saved.type === 'income' ? 'Income' : 'Expense'} - ${saved.descriptionEn || saved.descriptionAr} (${saved.amount} SAR)`, null, saved);
    return saved;
  }

  public static async deleteTenant(tenantId: string) {
    try {
      await this.deleteFromApi('tenants', tenantId);
    } catch (error) {
      console.warn(`Failed to delete tenant ${tenantId}`, error);
      return;
    }

    this.deleteFromList('tenants', INITIAL_TENANTS, (tenant) => tenant.id === tenantId);
    this.deleteFromList('branches', INITIAL_BRANCHES, (branch) => branch.tenantId === tenantId);
    this.deleteFromList('halls', INITIAL_HALLS, (hall) => {
      const branch = this.getBranches().find((item) => item.id === hall.branchId);
      return branch?.tenantId === tenantId;
    });
    this.deleteFromList('tables', INITIAL_TABLES, (table) => {
      const hall = this.getHalls().find((item) => item.id === table.hallId);
      const branch = hall ? this.getBranches().find((item) => item.id === hall.branchId) : null;
      return branch?.tenantId === tenantId;
    });
    this.deleteFromList('categories', INITIAL_CATEGORIES, (category) => category.tenantId === tenantId);
    this.deleteFromList('suppliers', INITIAL_SUPPLIERS, (supplier) => supplier.tenantId === tenantId);
    this.deleteFromList('ingredients', INITIAL_INGREDIENTS, (ingredient) => ingredient.tenantId === tenantId);
    this.deleteFromList('menu_items', INITIAL_MENU_ITEMS, (menuItem) => {
      const category = this.getCategories().find((item) => item.id === menuItem.categoryId);
      return category?.tenantId === tenantId;
    });
    this.deleteFromList('orders', INITIAL_ORDERS, (order) => order.tenantId === tenantId);
    this.deleteFromList('transactions', INITIAL_TRANSACTIONS, (transaction) => transaction.tenantId === tenantId);
    this.deleteFromList('employees', INITIAL_EMPLOYEES, (employee) => employee.tenantId === tenantId);
    this.deleteFromList('crm', INITIAL_CRM, (customer) => customer.tenantId === tenantId);
    this.deleteFromList('coupons', INITIAL_COUPONS, (coupon) => coupon.tenantId === tenantId);
  }

  public static async deleteBranch(branchId: string) {
    try {
      await this.deleteFromApi('branches', branchId);
    } catch (error) {
      console.warn(`Failed to delete branch ${branchId}`, error);
      return;
    }

    const hallIds = this.getHalls(branchId).map((hall) => hall.id);
    this.deleteFromList('branches', INITIAL_BRANCHES, (branch) => branch.id === branchId);
    this.deleteFromList('halls', INITIAL_HALLS, (hall) => hall.branchId === branchId);
    this.deleteFromList('tables', INITIAL_TABLES, (table) => hallIds.includes(table.hallId));
    this.deleteFromList('orders', INITIAL_ORDERS, (order) => order.branchId === branchId);
    this.deleteFromList('transactions', INITIAL_TRANSACTIONS, (transaction) => transaction.branchId === branchId);
    this.deleteFromList('employees', INITIAL_EMPLOYEES, (employee) => employee.branchId === branchId);
  }

  public static async deleteHall(hallId: string) {
    try {
      await this.deleteFromApi('halls', hallId);
    } catch (error) {
      console.warn(`Failed to delete hall ${hallId}`, error);
      return;
    }

    const tableIds = this.getTables().filter((table) => table.hallId === hallId).map((table) => table.id);
    this.deleteFromList('halls', INITIAL_HALLS, (hall) => hall.id === hallId);
    this.deleteFromList('tables', INITIAL_TABLES, (table) => table.hallId === hallId);

    const orders = this.get<Order[]>('orders', INITIAL_ORDERS).map((order) => {
      if (order.hallId !== hallId && !tableIds.includes(order.tableId ?? '')) {
        return order;
      }

      return {
        ...order,
        hallId: order.hallId === hallId ? undefined : order.hallId,
        tableId: tableIds.includes(order.tableId ?? '') ? undefined : order.tableId,
        updatedAt: new Date().toISOString(),
      };
    });

    this.set('orders', orders);
  }

  public static async deleteTable(tableId: string) {
    try {
      await this.deleteFromApi('tables', tableId);
    } catch (error) {
      console.warn(`Failed to delete table ${tableId}`, error);
      return;
    }

    this.deleteFromList('tables', INITIAL_TABLES, (table) => table.id === tableId);

    const orders = this.get<Order[]>('orders', INITIAL_ORDERS).map((order) => {
      if (order.tableId !== tableId) return order;
      return {
        ...order,
        tableId: undefined,
        updatedAt: new Date().toISOString(),
      };
    });

    this.set('orders', orders);
  }

  public static async deleteCategory(categoryId: string) {
    try {
      await this.deleteFromApi('categories', categoryId);
    } catch (error) {
      console.warn(`Failed to delete category ${categoryId}`, error);
      return;
    }

    this.deleteFromList('categories', INITIAL_CATEGORIES, (category) => category.id === categoryId);
    this.deleteFromList('menu_items', INITIAL_MENU_ITEMS, (menuItem) => menuItem.categoryId === categoryId);
  }

  public static async deleteSupplier(supplierId: string) {
    try {
      await this.deleteFromApi('suppliers', supplierId);
    } catch (error) {
      console.warn(`Failed to delete supplier ${supplierId}`, error);
      return;
    }

    this.deleteFromList('suppliers', INITIAL_SUPPLIERS, (supplier) => supplier.id === supplierId);
    this.deleteFromList('ingredients', INITIAL_INGREDIENTS, (ingredient) => ingredient.supplierId === supplierId);
  }

  public static async deleteIngredient(ingredientId: string) {
    try {
      await this.deleteFromApi('ingredients', ingredientId);
    } catch (error) {
      console.warn(`Failed to delete ingredient ${ingredientId}`, error);
      return;
    }

    this.deleteFromList('ingredients', INITIAL_INGREDIENTS, (ingredient) => ingredient.id === ingredientId);
  }

  public static async deleteMenuItem(menuItemId: string) {
    try {
      await this.deleteFromApi('menu_items', menuItemId);
    } catch (error) {
      console.warn(`Failed to delete menu item ${menuItemId}`, error);
      return;
    }

    this.deleteFromList('menu_items', INITIAL_MENU_ITEMS, (menuItem) => menuItem.id === menuItemId);
  }

  public static async deleteEmployee(employeeId: string) {
    try {
      await this.deleteFromApi('employees', employeeId);
    } catch (error) {
      console.warn(`Failed to delete employee ${employeeId}`, error);
      return;
    }

    const emps = this.getEmployees();
    const target = emps.find(e => e.id === employeeId);
    this.deleteFromList('employees', INITIAL_EMPLOYEES, (employee) => employee.id === employeeId);
    if (target) {
      await this.addAuditLog(target.tenantId, 'system', `Deleted Employee #${target.name} (${target.role})`, target, null);
    }
  }

  public static async deleteCRM(customerId: string) {
    try {
      await this.deleteFromApi('customers_crm', customerId);
    } catch (error) {
      console.warn(`Failed to delete CRM customer ${customerId}`, error);
      return;
    }

    this.deleteFromList('crm', INITIAL_CRM, (customer) => customer.id === customerId);
  }

  public static async deleteCoupon(couponId: string) {
    try {
      await this.deleteFromApi('coupons', couponId);
    } catch (error) {
      console.warn(`Failed to delete coupon ${couponId}`, error);
      return;
    }

    this.deleteFromList('coupons', INITIAL_COUPONS, (coupon) => coupon.id === couponId);
  }

  public static async deleteOrder(orderId: string) {
    try {
      await this.deleteFromApi('orders', orderId);
    } catch (error) {
      console.warn(`Failed to delete order ${orderId}`, error);
      return;
    }

    this.deleteFromList('orders', INITIAL_ORDERS, (order) => order.id === orderId);
    this.deleteFromList('transactions', INITIAL_TRANSACTIONS, (transaction) => transaction.referenceOrderId === orderId);
    const tables = this.get<Table[]>('tables', INITIAL_TABLES).map((table) => {
      if (table.activeOrderId !== orderId) return table;
      return { ...table, activeOrderId: undefined, status: 'free' };
    });
    this.set('tables', tables);
  }

  public static async deleteTransaction(transactionId: string) {
    try {
      await this.deleteFromApi('financial_transactions', transactionId);
    } catch (error) {
      console.warn(`Failed to delete transaction ${transactionId}`, error);
      return;
    }

    this.deleteFromList('transactions', INITIAL_TRANSACTIONS, (transaction) => transaction.id === transactionId);
  }

  public static getAuditLogs(tenantId?: string): AuditLog[] {
    const list = this.get<AuditLog[]>('audit_logs', []);
    return tenantId ? list.filter((l) => l.tenantId === tenantId) : list;
  }

  public static async addAuditLog(tenantId: string, username: string, action: string, before?: any, after?: any) {
    const list = this.get<AuditLog[]>('audit_logs', []);
    // Generate UUID v4-like string for compatibility with database UUID type
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    const newLog: AuditLog = {
      id: generateUUID(),
      tenantId,
      username,
      action,
      timestamp: new Date().toISOString(),
      ip: '192.168.1.110',
      beforeValue: before ? (typeof before === 'string' ? before : JSON.stringify(before)) : undefined,
      afterValue: after ? (typeof after === 'string' ? after : JSON.stringify(after)) : undefined,
    };
    const saved = await this.writeToApi('audit_logs', newLog, newLog);
    list.unshift(saved);
    this.set('audit_logs', list);
    return saved;
  }

  public static async savePayrollRecord(record: PayrollRecord) {
    const savedRecord = await this.writeToApi('payroll_records', record, record);
    const list = this.getPayrollRecords();
    const idx = list.findIndex((p) => p.id === savedRecord.id);
    if (idx >= 0) {
      list[idx] = savedRecord;
    } else {
      list.push(savedRecord);
    }
    this.set('payroll_records', list);
    return savedRecord;
  }

  public static getPayrollRecords(tenantId?: string): PayrollRecord[] {
    const list = this.get<PayrollRecord[]>('payroll_records', []);
    if (list.length === 0) {
      const emps = this.getEmployees(tenantId);
      const generated: PayrollRecord[] = emps.map((emp, index) => {
        const adv = emp.salary > 5000 ? 500 : 0;
        const bon = emp.salary > 8000 ? 1000 : 200;
        const ded = emp.role === 'kitchen' ? 100 : 0;
        return {
          id: `pay_${Date.now()}_${index}`,
          tenantId: emp.tenantId,
          employeeId: emp.id,
          employeeName: emp.name,
          role: emp.role,
          month: '2026-06',
          baseSalary: emp.salary,
          advances: adv,
          deductions: ded,
          bonuses: bon,
          netPaid: emp.salary - adv - ded + bon,
          status: 'draft',
          updatedAt: new Date().toISOString(),
        };
      });
      this.set('payroll_records', generated);
      return generated;
    }
    return tenantId ? list.filter((p) => p.tenantId === tenantId) : list;
  }
}

