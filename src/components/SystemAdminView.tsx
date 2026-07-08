/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Database,
  Plus,
  PencilLine,
  Trash2,
  Search,
  ShieldCheck,
  Layers3,
  Store,
  MapPinned,
  Table2,
  Tags,
  Truck,
  Beef,
  MenuSquare,
  Users,
  BadgePercent,
  Receipt,
  Wallet,
  RefreshCw,
  AlertCircle,
  Check,
  Settings2,
} from 'lucide-react';
import {
  Tenant,
  Branch,
  Hall,
  Table,
  Category,
  Supplier,
  Ingredient,
  MenuItem,
  Employee,
  CustomerCRM,
  Coupon,
  Order,
  Transaction,
  Role,
  TableStatus,
  OrderType,
  OrderStatus,
  TransactionType,
} from '../types';
import { StorageService } from '../services/db';

type Language = 'ar' | 'en';
type EntityKey =
  | 'tenants'
  | 'branches'
  | 'halls'
  | 'tables'
  | 'categories'
  | 'suppliers'
  | 'ingredients'
  | 'menu_items'
  | 'employees'
  | 'customers_crm'
  | 'coupons'
  | 'orders'
  | 'transactions';

type FieldType = 'text' | 'number' | 'textarea' | 'select' | 'boolean' | 'date';

type Option = { value: string; labelAr: string; labelEn: string };

type FieldConfig = {
  key: string;
  labelAr: string;
  labelEn: string;
  type: FieldType;
  required?: boolean;
  placeholderAr?: string;
  placeholderEn?: string;
  options?: (ctx: AdminContext) => Option[];
};

class AdminFieldFactory {
  static text(key: string, labelAr: string, labelEn: string, overrides: Partial<FieldConfig> = {}): FieldConfig {
    return { key, labelAr, labelEn, type: 'text', ...overrides };
  }

  static textarea(key: string, labelAr: string, labelEn: string, overrides: Partial<FieldConfig> = {}): FieldConfig {
    return { key, labelAr, labelEn, type: 'textarea', ...overrides };
  }

  static number(key: string, labelAr: string, labelEn: string, overrides: Partial<FieldConfig> = {}): FieldConfig {
    return { key, labelAr, labelEn, type: 'number', ...overrides };
  }

  static select(
    key: string,
    labelAr: string,
    labelEn: string,
    options: FieldConfig['options'],
    overrides: Partial<FieldConfig> = {}
  ): FieldConfig {
    return { key, labelAr, labelEn, type: 'select', ...overrides, options };
  }

  static statusSelect(
    key: string,
    labelAr: string,
    labelEn: string,
    values: Option[],
    overrides: Partial<FieldConfig> = {}
  ): FieldConfig {
    return this.select(key, labelAr, labelEn, () => values, overrides);
  }

  static activeInactiveStatus(key = 'status'): FieldConfig {
    return this.statusSelect(key, 'الحالة', 'Status', [
      { value: 'active', labelAr: 'نشط', labelEn: 'Active' },
      { value: 'inactive', labelAr: 'غير نشط', labelEn: 'Inactive' },
    ]);
  }

  static activeSuspendedStatus(key = 'status'): FieldConfig {
    return this.statusSelect(key, 'الحالة', 'Status', [
      { value: 'active', labelAr: 'نشط', labelEn: 'Active' },
      { value: 'suspended', labelAr: 'موقوف', labelEn: 'Suspended' },
    ]);
  }
}

type AdminContext = {
  tenants: Tenant[];
  branches: Branch[];
  halls: Hall[];
  tables: Table[];
  categories: Category[];
  suppliers: Supplier[];
  ingredients: Ingredient[];
  menuItems: MenuItem[];
  employees: Employee[];
  customers: CustomerCRM[];
  coupons: Coupon[];
  orders: Order[];
  transactions: Transaction[];
};

type EntityConfig = {
  key: EntityKey;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  icon: React.ElementType;
  allowCreate: boolean;
  allowEdit: boolean;
  allowDelete: boolean;
  fields: FieldConfig[];
  getItems: (ctx: AdminContext) => Array<Record<string, any>>;
  createBlank: (ctx: AdminContext) => Record<string, any>;
  save: (record: Record<string, any>) => Promise<Record<string, any> | void>;
  remove: (id: string) => Promise<void>;
  getId: (record: Record<string, any>) => string;
};

interface SystemAdminViewProps {
  language: Language;
  onAddNotification: (msgAr: string, msgEn: string, type: 'info' | 'success' | 'warning') => void;
}

const makeId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`;

const optionLabel = (option: Option, isRtl: boolean) => (isRtl ? option.labelAr : option.labelEn);

const toDraftValue = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

const parseDraftValue = (field: FieldConfig, value: string) => {
  if (field.type === 'number') {
    return value === '' ? 0 : Number(value);
  }

  if (field.type === 'boolean') {
    return value === 'true';
  }

  return value;
};

const emptyDraftFor = (fields: FieldConfig[], ctx?: AdminContext) => {
  const draft: Record<string, string> = {};
  fields.forEach((field) => {
    if (field.type === 'boolean') {
      draft[field.key] = 'true';
    } else if (field.type === 'select') {
      draft[field.key] = field.options?.(ctx ?? ({} as AdminContext))?.[0]?.value ?? '';
    } else {
      draft[field.key] = '';
    }
  });
  return draft;
};

const buildAdminContext = (): AdminContext => ({
  tenants: StorageService.getTenants(),
  branches: StorageService.getBranches(),
  halls: StorageService.getHalls(),
  tables: StorageService.getTables(),
  categories: StorageService.getCategories(),
  suppliers: StorageService.getSuppliers(),
  ingredients: StorageService.getIngredients(),
  menuItems: StorageService.getMenuItems(),
  employees: StorageService.getEmployees(),
  customers: StorageService.getCRM(),
  coupons: StorageService.getCoupons(),
  orders: StorageService.getOrders(),
  transactions: StorageService.getTransactions(),
});

const getEntityConfigs = (ctx: AdminContext): EntityConfig[] => [
  {
    key: 'tenants',
    titleAr: 'المطاعم المستأجرة',
    titleEn: 'Tenants',
    descriptionAr: 'إدارة العلامات التجارية والإعدادات العامة والضرائب',
    descriptionEn: 'Manage brands, pricing, taxes and tenant-level settings',
    icon: Store,
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    getItems: () => ctx.tenants,
    getId: (record) => record.id,
    createBlank: () => ({
      id: makeId('ten'),
      nameAr: '',
      nameEn: '',
      logoUrl: '',
      email: '',
      phone: '',
      address: '',
      currencyAr: 'ل.س',
      currencyEn: 'SAR',
      taxPercent: 15,
      servicePercent: 0,
      status: 'active',
      subscriptionPlan: 'pro',
      createdAt: new Date().toISOString(),
    }),
    save: (record) => StorageService.saveTenant(record as Tenant),
    remove: (id) => StorageService.deleteTenant(id),
    fields: [
      AdminFieldFactory.text('nameAr', 'الاسم بالعربية', 'Arabic name', { required: true }),
      AdminFieldFactory.text('nameEn', 'الاسم بالإنجليزية', 'English name', { required: true }),
      AdminFieldFactory.text('logoUrl', 'الشعار', 'Logo URL / File path', {
        placeholderAr: 'مثال: /uploads/logo.png أو https://...',
        placeholderEn: 'e.g. /uploads/logo.png or https://...',
      }),
      AdminFieldFactory.text('email', 'البريد', 'Email', { required: true }),
      AdminFieldFactory.text('phone', 'الهاتف', 'Phone'),
      AdminFieldFactory.textarea('address', 'العنوان', 'Address'),
      AdminFieldFactory.select('currencyCode', 'العملة', 'Currency', () => [
        { value: 'SAR', labelAr: 'ل.س', labelEn: 'SAR' },
        { value: 'TRY', labelAr: 'ل.ت', labelEn: 'TRY' },
        { value: 'USD', labelAr: 'دولار', labelEn: 'USD' },
      ], { required: true }),
      AdminFieldFactory.number('taxPercent', 'نسبة الضريبة', 'Tax %'),
      AdminFieldFactory.number('servicePercent', 'نسبة الخدمة', 'Service %'),
      AdminFieldFactory.activeSuspendedStatus('status'),
      AdminFieldFactory.select('subscriptionPlan', 'الباقة', 'Plan', () => [
        { value: 'starter', labelAr: 'free', labelEn: 'Starter' },
        { value: 'pro', labelAr: 'pro', labelEn: 'Pro' },
        { value: 'enterprise', labelAr: 'pro plus', labelEn: 'Enterprise' },
      ]),
    ],
  },
  {
    key: 'branches',
    titleAr: 'الفروع',
    titleEn: 'Branches',
    descriptionAr: 'الفروع التابعة لكل مطعم',
    descriptionEn: 'Branch locations per tenant',
    icon: MapPinned,
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    getItems: () => ctx.branches,
    getId: (record) => record.id,
    createBlank: () => ({
      id: makeId('br'),
      tenantId: ctx.tenants[0]?.id ?? '',
      nameAr: '',
      nameEn: '',
      city: '',
      address: '',
      phone: '',
      status: 'active',
    }),
    save: (record) => StorageService.saveBranch(record as Branch),
    remove: (id) => StorageService.deleteBranch(id),
    fields: [
      AdminFieldFactory.select('tenantId', 'المطعم', 'Tenant', (currentCtx) => currentCtx.tenants.map((tenant) => ({ value: tenant.id, labelAr: tenant.nameAr, labelEn: tenant.nameEn })), { required: true }),
      AdminFieldFactory.text('nameAr', 'اسم الفرع بالعربية', 'Arabic branch name', { required: true }),
      AdminFieldFactory.text('nameEn', 'اسم الفرع بالإنجليزية', 'English branch name', { required: true }),
      AdminFieldFactory.text('city', 'المدينة', 'City', { required: true }),
      AdminFieldFactory.textarea('address', 'العنوان', 'Address'),
      AdminFieldFactory.text('phone', 'الهاتف', 'Phone'),
      AdminFieldFactory.activeInactiveStatus('status'),
    ],
  },
  {
    key: 'halls',
    titleAr: 'الصالات',
    titleEn: 'Halls',
    descriptionAr: 'تقسيمات الجلوس داخل الفرع',
    descriptionEn: 'Dining sections inside each branch',
    icon: Layers3,
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    getItems: () => ctx.halls,
    getId: (record) => record.id,
    createBlank: () => ({
      id: makeId('hall'),
      branchId: ctx.branches[0]?.id ?? '',
      nameAr: '',
      nameEn: '',
    }),
    save: (record) => StorageService.saveHall(record as Hall),
    remove: (id) => StorageService.deleteHall(id),
    fields: [
      AdminFieldFactory.select('branchId', 'الفرع', 'Branch', (currentCtx) => currentCtx.branches.map((branch) => ({ value: branch.id, labelAr: branch.nameAr, labelEn: branch.nameEn })), { required: true }),
      AdminFieldFactory.text('nameAr', 'اسم الصالة بالعربية', 'Arabic hall name', { required: true }),
      AdminFieldFactory.text('nameEn', 'اسم الصالة بالإنجليزية', 'English hall name', { required: true }),
    ],
  },
  {
    key: 'tables',
    titleAr: 'الطاولات',
    titleEn: 'Tables',
    descriptionAr: 'الطاولات وحالتها وQR',
    descriptionEn: 'Tables, seats and QR references',
    icon: Table2,
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    getItems: () => ctx.tables,
    getId: (record) => record.id,
    createBlank: () => ({
      id: makeId('tbl'),
      hallId: ctx.halls[0]?.id ?? '',
      number: '',
      seats: 4,
      status: 'free',
      qrCodeValue: `qr_${Date.now()}`,
      activeOrderId: '',
    }),
    save: (record) => StorageService.saveTable(record as Table),
    remove: (id) => StorageService.deleteTable(id),
    fields: [
      {
        key: 'hallId',
        labelAr: 'الصالة',
        labelEn: 'Hall',
        type: 'select',
        required: true,
        options: () => ctx.halls.map((hall) => ({ value: hall.id, labelAr: hall.nameAr, labelEn: hall.nameEn })),
      },
      { key: 'number', labelAr: 'رقم الطاولة', labelEn: 'Table number', type: 'text', required: true },
      { key: 'seats', labelAr: 'عدد المقاعد', labelEn: 'Seats', type: 'number', required: true },
      {
        key: 'status',
        labelAr: 'الحالة',
        labelEn: 'Status',
        type: 'select',
        options: () => [
          { value: 'free', labelAr: 'فارغة', labelEn: 'Free' },
          { value: 'reserved', labelAr: 'محجوزة', labelEn: 'Reserved' },
          { value: 'busy', labelAr: 'مشغولة', labelEn: 'Busy' },
          { value: 'cleaning', labelAr: 'تنظيف', labelEn: 'Cleaning' },
        ],
      },
      { key: 'qrCodeValue', labelAr: 'قيمة QR', labelEn: 'QR value', type: 'text' },
      { key: 'activeOrderId', labelAr: 'الطلب النشط', labelEn: 'Active order', type: 'text' },
    ],
  },
  {
    key: 'categories',
    titleAr: 'التصنيفات',
    titleEn: 'Categories',
    descriptionAr: 'تصنيفات قائمة الطعام',
    descriptionEn: 'Menu category management',
    icon: Tags,
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    getItems: () => ctx.categories,
    getId: (record) => record.id,
    createBlank: () => ({
      id: makeId('cat'),
      tenantId: ctx.tenants[0]?.id ?? '',
      nameAr: '',
      nameEn: '',
      icon: 'Tag',
      isActive: true,
    }),
    save: (record) => StorageService.saveCategory(record as Category),
    remove: (id) => StorageService.deleteCategory(id),
    fields: [
      {
        key: 'tenantId',
        labelAr: 'المطعم',
        labelEn: 'Tenant',
        type: 'select',
        required: true,
        options: () => ctx.tenants.map((tenant) => ({ value: tenant.id, labelAr: tenant.nameAr, labelEn: tenant.nameEn })),
      },
      { key: 'nameAr', labelAr: 'الاسم بالعربية', labelEn: 'Arabic name', type: 'text', required: true },
      { key: 'nameEn', labelAr: 'الاسم بالإنجليزية', labelEn: 'English name', type: 'text', required: true },
      { key: 'icon', labelAr: 'الأيقونة', labelEn: 'Icon', type: 'text' },
      { key: 'isActive', labelAr: 'نشط', labelEn: 'Active', type: 'boolean' },
    ],
  },
  {
    key: 'suppliers',
    titleAr: 'الموردون',
    titleEn: 'Suppliers',
    descriptionAr: 'جهات التوريد للمخزون',
    descriptionEn: 'Inventory supplier records',
    icon: Truck,
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    getItems: () => ctx.suppliers,
    getId: (record) => record.id,
    createBlank: () => ({
      id: makeId('sup'),
      tenantId: ctx.tenants[0]?.id ?? '',
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
    }),
    save: (record) => StorageService.saveSupplier(record as Supplier),
    remove: (id) => StorageService.deleteSupplier(id),
    fields: [
      {
        key: 'tenantId',
        labelAr: 'المطعم',
        labelEn: 'Tenant',
        type: 'select',
        required: true,
        options: () => ctx.tenants.map((tenant) => ({ value: tenant.id, labelAr: tenant.nameAr, labelEn: tenant.nameEn })),
      },
      { key: 'name', labelAr: 'اسم المورد', labelEn: 'Supplier name', type: 'text', required: true },
      { key: 'contactPerson', labelAr: 'جهة الاتصال', labelEn: 'Contact person', type: 'text' },
      { key: 'phone', labelAr: 'الهاتف', labelEn: 'Phone', type: 'text' },
      { key: 'email', labelAr: 'البريد', labelEn: 'Email', type: 'text' },
      { key: 'address', labelAr: 'العنوان', labelEn: 'Address', type: 'textarea' },
    ],
  },
  {
    key: 'ingredients',
    titleAr: 'المواد الخام',
    titleEn: 'Ingredients',
    descriptionAr: 'المخزون والحد الأدنى والتكلفة',
    descriptionEn: 'Stock balances and procurement controls',
    icon: Beef,
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    getItems: () => ctx.ingredients,
    getId: (record) => record.id,
    createBlank: () => ({
      id: makeId('ing'),
      tenantId: ctx.tenants[0]?.id ?? '',
      nameAr: '',
      nameEn: '',
      stock: 0,
      minStock: 0,
      unitAr: '',
      unitEn: '',
      costPerUnit: 0,
      supplierId: '',
    }),
    save: (record) => StorageService.saveIngredient(record as Ingredient),
    remove: (id) => StorageService.deleteIngredient(id),
    fields: [
      {
        key: 'tenantId',
        labelAr: 'المطعم',
        labelEn: 'Tenant',
        type: 'select',
        required: true,
        options: () => ctx.tenants.map((tenant) => ({ value: tenant.id, labelAr: tenant.nameAr, labelEn: tenant.nameEn })),
      },
      { key: 'nameAr', labelAr: 'الاسم بالعربية', labelEn: 'Arabic name', type: 'text', required: true },
      { key: 'nameEn', labelAr: 'الاسم بالإنجليزية', labelEn: 'English name', type: 'text', required: true },
      { key: 'stock', labelAr: 'الرصيد', labelEn: 'Stock', type: 'number' },
      { key: 'minStock', labelAr: 'حد الأمان', labelEn: 'Minimum stock', type: 'number' },
      { key: 'unitAr', labelAr: 'الوحدة بالعربية', labelEn: 'Arabic unit', type: 'text', required: true },
      { key: 'unitEn', labelAr: 'الوحدة بالإنجليزية', labelEn: 'English unit', type: 'text', required: true },
      { key: 'costPerUnit', labelAr: 'تكلفة الوحدة', labelEn: 'Unit cost', type: 'number' },
      {
        key: 'supplierId',
        labelAr: 'المورد',
        labelEn: 'Supplier',
        type: 'select',
        options: () => [{ value: '', labelAr: 'غير محدد', labelEn: 'Unassigned' }, ...ctx.suppliers.map((supplier) => ({ value: supplier.id, labelAr: supplier.name, labelEn: supplier.name }))],
      },
    ],
  },
  {
    key: 'menu_items',
    titleAr: 'الأصناف',
    titleEn: 'Menu items',
    descriptionAr: 'الأصناف المباعة في POS و QR',
    descriptionEn: 'Sellable dishes for POS and QR ordering',
    icon: MenuSquare,
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    getItems: () => ctx.menuItems,
    getId: (record) => record.id,
    createBlank: () => ({
      id: makeId('item'),
      categoryId: ctx.categories[0]?.id ?? '',
      nameAr: '',
      nameEn: '',
      descriptionAr: '',
      descriptionEn: '',
      price: 0,
      imageUrl: '',
      isAvailable: true,
      ingredients: [],
      extras: [],
    }),
    save: (record) => StorageService.saveMenuItem(record as MenuItem),
    remove: (id) => StorageService.deleteMenuItem(id),
    fields: [
      {
        key: 'categoryId',
        labelAr: 'التصنيف',
        labelEn: 'Category',
        type: 'select',
        required: true,
        options: () => ctx.categories.map((category) => ({ value: category.id, labelAr: category.nameAr, labelEn: category.nameEn })),
      },
      { key: 'nameAr', labelAr: 'الاسم بالعربية', labelEn: 'Arabic name', type: 'text', required: true },
      { key: 'nameEn', labelAr: 'الاسم بالإنجليزية', labelEn: 'English name', type: 'text', required: true },
      { key: 'descriptionAr', labelAr: 'الوصف بالعربية', labelEn: 'Arabic description', type: 'textarea' },
      { key: 'descriptionEn', labelAr: 'الوصف بالإنجليزية', labelEn: 'English description', type: 'textarea' },
      { key: 'price', labelAr: 'السعر', labelEn: 'Price', type: 'number', required: true },
      { key: 'imageUrl', labelAr: 'رابط الصورة', labelEn: 'Image URL', type: 'text' },
      { key: 'isAvailable', labelAr: 'متوفر', labelEn: 'Available', type: 'boolean' },
    ],
  },
  {
    key: 'employees',
    titleAr: 'الموظفون',
    titleEn: 'Employees',
    descriptionAr: 'الطقم الوظيفي والرواتب والأدوار',
    descriptionEn: 'Staff, salaries and roles',
    icon: Users,
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    getItems: () => ctx.employees,
    getId: (record) => record.id,
    createBlank: () => ({
      id: makeId('emp'),
      tenantId: ctx.tenants[0]?.id ?? '',
      branchId: ctx.branches[0]?.id ?? '',
      name: '',
      email: '',
      role: 'cashier',
      phone: '',
      salary: 0,
      attendanceHistory: [],
      performanceRating: 5,
      status: 'active',
    }),
    save: (record) => StorageService.saveEmployee(record as Employee),
    remove: (id) => StorageService.deleteEmployee(id),
    fields: [
      {
        key: 'tenantId',
        labelAr: 'المطعم',
        labelEn: 'Tenant',
        type: 'select',
        required: true,
        options: () => ctx.tenants.map((tenant) => ({ value: tenant.id, labelAr: tenant.nameAr, labelEn: tenant.nameEn })),
      },
      {
        key: 'branchId',
        labelAr: 'الفرع',
        labelEn: 'Branch',
        type: 'select',
        required: true,
        options: () => ctx.branches.map((branch) => ({ value: branch.id, labelAr: branch.nameAr, labelEn: branch.nameEn })),
      },
      { key: 'name', labelAr: 'الاسم', labelEn: 'Name', type: 'text', required: true },
      { key: 'email', labelAr: 'البريد', labelEn: 'Email', type: 'text', required: true },
      {
        key: 'role',
        labelAr: 'الدور',
        labelEn: 'Role',
        type: 'select',
        options: () => [
          { value: 'owner', labelAr: 'مالك', labelEn: 'Owner' },
          { value: 'manager', labelAr: 'مدير', labelEn: 'Manager' },
          { value: 'cashier', labelAr: 'كاشير', labelEn: 'Cashier' },
          { value: 'waiter', labelAr: 'ويتر', labelEn: 'Waiter' },
          { value: 'kitchen', labelAr: 'مطبخ', labelEn: 'Kitchen' },
          { value: 'super_admin', labelAr: 'مشرف', labelEn: 'Super Admin' },
          { value: 'customer', labelAr: 'عميل', labelEn: 'Customer' },
        ],
      },
      { key: 'phone', labelAr: 'الهاتف', labelEn: 'Phone', type: 'text' },
      { key: 'salary', labelAr: 'الراتب', labelEn: 'Salary', type: 'number' },
      { key: 'performanceRating', labelAr: 'التقييم', labelEn: 'Rating', type: 'number' },
      {
        key: 'status',
        labelAr: 'الحالة',
        labelEn: 'Status',
        type: 'select',
        options: () => [
          { value: 'active', labelAr: 'نشط', labelEn: 'Active' },
          { value: 'suspended', labelAr: 'موقوف', labelEn: 'Suspended' },
        ],
      },
    ],
  },
  {
    key: 'customers_crm',
    titleAr: 'العملاء',
    titleEn: 'CRM customers',
    descriptionAr: 'الولاء والنقاط والإنفاق التراكمي',
    descriptionEn: 'Customer loyalty and spending profile',
    icon: BadgePercent,
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    getItems: () => ctx.customers,
    getId: (record) => record.id,
    createBlank: () => ({
      id: makeId('crm'),
      tenantId: ctx.tenants[0]?.id ?? '',
      name: '',
      phone: '',
      email: '',
      points: 0,
      loyaltyTier: 'Bronze',
      ordersCount: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
    }),
    save: (record) => StorageService.saveCRM(record as CustomerCRM),
    remove: (id) => StorageService.deleteCRM(id),
    fields: [
      {
        key: 'tenantId',
        labelAr: 'المطعم',
        labelEn: 'Tenant',
        type: 'select',
        required: true,
        options: () => ctx.tenants.map((tenant) => ({ value: tenant.id, labelAr: tenant.nameAr, labelEn: tenant.nameEn })),
      },
      { key: 'name', labelAr: 'الاسم', labelEn: 'Name', type: 'text', required: true },
      { key: 'phone', labelAr: 'الهاتف', labelEn: 'Phone', type: 'text', required: true },
      { key: 'email', labelAr: 'البريد', labelEn: 'Email', type: 'text' },
      { key: 'points', labelAr: 'النقاط', labelEn: 'Points', type: 'number' },
      {
        key: 'loyaltyTier',
        labelAr: 'الدرجة',
        labelEn: 'Tier',
        type: 'select',
        options: () => [
          { value: 'Bronze', labelAr: 'برونز', labelEn: 'Bronze' },
          { value: 'Silver', labelAr: 'فضي', labelEn: 'Silver' },
          { value: 'Gold', labelAr: 'ذهبي', labelEn: 'Gold' },
          { value: 'VIP', labelAr: 'VIP', labelEn: 'VIP' },
        ],
      },
      { key: 'ordersCount', labelAr: 'عدد الطلبات', labelEn: 'Orders count', type: 'number' },
      { key: 'totalSpent', labelAr: 'إجمالي الإنفاق', labelEn: 'Total spent', type: 'number' },
    ],
  },
  {
    key: 'coupons',
    titleAr: 'الكوبونات',
    titleEn: 'Coupons',
    descriptionAr: 'أكواد الخصم والعروض',
    descriptionEn: 'Discount and promo codes',
    icon: Wallet,
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    getItems: () => ctx.coupons,
    getId: (record) => record.id,
    createBlank: () => ({
      id: makeId('cp'),
      tenantId: ctx.tenants[0]?.id ?? '',
      code: '',
      discountPercent: 0,
      maxDiscount: 0,
      minOrderValue: 0,
      expiryDate: new Date().toISOString().slice(0, 10),
      isActive: true,
    }),
    save: (record) => StorageService.saveCoupon(record as Coupon),
    remove: (id) => StorageService.deleteCoupon(id),
    fields: [
      {
        key: 'tenantId',
        labelAr: 'المطعم',
        labelEn: 'Tenant',
        type: 'select',
        required: true,
        options: () => ctx.tenants.map((tenant) => ({ value: tenant.id, labelAr: tenant.nameAr, labelEn: tenant.nameEn })),
      },
      { key: 'code', labelAr: 'الكود', labelEn: 'Code', type: 'text', required: true },
      { key: 'discountPercent', labelAr: 'نسبة الخصم', labelEn: 'Discount %', type: 'number', required: true },
      { key: 'maxDiscount', labelAr: 'أقصى خصم', labelEn: 'Max discount', type: 'number' },
      { key: 'minOrderValue', labelAr: 'الحد الأدنى', labelEn: 'Minimum order', type: 'number' },
      { key: 'expiryDate', labelAr: 'تاريخ الانتهاء', labelEn: 'Expiry date', type: 'date', required: true },
      { key: 'isActive', labelAr: 'نشط', labelEn: 'Active', type: 'boolean' },
    ],
  },
  {
    key: 'orders',
    titleAr: 'الطلبات',
    titleEn: 'Orders',
    descriptionAr: 'سجل الطلبات وحالتها ومود الدفع',
    descriptionEn: 'Order history, status and payment tracking',
    icon: Receipt,
    allowCreate: false,
    allowEdit: true,
    allowDelete: true,
    getItems: () => ctx.orders,
    getId: (record) => record.id,
    createBlank: () => ({
      id: makeId('ord'),
      tenantId: ctx.tenants[0]?.id ?? '',
      branchId: ctx.branches[0]?.id ?? '',
      tableId: '',
      hallId: '',
      type: 'dine_in',
      status: 'new',
      items: [],
      subtotal: 0,
      taxAmount: 0,
      serviceAmount: 0,
      discountAmount: 0,
      total: 0,
      cashierId: '',
      waiterId: '',
      customerName: '',
      customerPhone: '',
      deliveryAddress: '',
      paymentMethod: 'unpaid',
      paymentStatus: 'unpaid',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    save: (record) => StorageService.saveOrder(record as Order, false),
    remove: (id) => StorageService.deleteOrder(id),
    fields: [
      {
        key: 'tenantId',
        labelAr: 'المطعم',
        labelEn: 'Tenant',
        type: 'select',
        required: true,
        options: () => ctx.tenants.map((tenant) => ({ value: tenant.id, labelAr: tenant.nameAr, labelEn: tenant.nameEn })),
      },
      {
        key: 'branchId',
        labelAr: 'الفرع',
        labelEn: 'Branch',
        type: 'select',
        required: true,
        options: () => ctx.branches.map((branch) => ({ value: branch.id, labelAr: branch.nameAr, labelEn: branch.nameEn })),
      },
      {
        key: 'tableId',
        labelAr: 'الطاولة',
        labelEn: 'Table',
        type: 'select',
        options: () => [{ value: '', labelAr: 'غير محدد', labelEn: 'Unassigned' }, ...ctx.tables.map((table) => ({ value: table.id, labelAr: table.number, labelEn: table.number }))],
      },
      {
        key: 'hallId',
        labelAr: 'الصالة',
        labelEn: 'Hall',
        type: 'select',
        options: () => [{ value: '', labelAr: 'غير محدد', labelEn: 'Unassigned' }, ...ctx.halls.map((hall) => ({ value: hall.id, labelAr: hall.nameAr, labelEn: hall.nameEn }))],
      },
      {
        key: 'type',
        labelAr: 'نوع الطلب',
        labelEn: 'Order type',
        type: 'select',
        options: () => [
          { value: 'dine_in', labelAr: 'داخل الصالة', labelEn: 'Dine in' },
          { value: 'takeaway', labelAr: 'سفري', labelEn: 'Takeaway' },
          { value: 'delivery', labelAr: 'توصيل', labelEn: 'Delivery' },
        ],
      },
      {
        key: 'status',
        labelAr: 'الحالة',
        labelEn: 'Status',
        type: 'select',
        options: () => [
          { value: 'new', labelAr: 'جديد', labelEn: 'New' },
          { value: 'preparing', labelAr: 'قيد التحضير', labelEn: 'Preparing' },
          { value: 'ready', labelAr: 'جاهز', labelEn: 'Ready' },
          { value: 'delivered', labelAr: 'تم التسليم', labelEn: 'Delivered' },
          { value: 'cancelled', labelAr: 'ملغي', labelEn: 'Cancelled' },
        ],
      },
      { key: 'subtotal', labelAr: 'الإجمالي الفرعي', labelEn: 'Subtotal', type: 'number' },
      { key: 'taxAmount', labelAr: 'الضريبة', labelEn: 'Tax', type: 'number' },
      { key: 'serviceAmount', labelAr: 'الخدمة', labelEn: 'Service', type: 'number' },
      { key: 'discountAmount', labelAr: 'الخصم', labelEn: 'Discount', type: 'number' },
      { key: 'total', labelAr: 'الإجمالي', labelEn: 'Total', type: 'number' },
      { key: 'cashierId', labelAr: 'الكاشير', labelEn: 'Cashier', type: 'text' },
      { key: 'waiterId', labelAr: 'الويتر', labelEn: 'Waiter', type: 'text' },
      { key: 'customerName', labelAr: 'اسم العميل', labelEn: 'Customer name', type: 'text' },
      { key: 'customerPhone', labelAr: 'هاتف العميل', labelEn: 'Customer phone', type: 'text' },
      { key: 'deliveryAddress', labelAr: 'عنوان التوصيل', labelEn: 'Delivery address', type: 'textarea' },
      {
        key: 'paymentMethod',
        labelAr: 'طريقة الدفع',
        labelEn: 'Payment method',
        type: 'select',
        options: () => [
          { value: 'cash', labelAr: 'نقدي', labelEn: 'Cash' },
          { value: 'card', labelAr: 'بطاقة', labelEn: 'Card' },
          { value: 'wallet', labelAr: 'محفظة', labelEn: 'Wallet' },
          { value: 'unpaid', labelAr: 'غير مدفوع', labelEn: 'Unpaid' },
        ],
      },
      {
        key: 'paymentStatus',
        labelAr: 'حالة الدفع',
        labelEn: 'Payment status',
        type: 'select',
        options: () => [
          { value: 'paid', labelAr: 'مدفوع', labelEn: 'Paid' },
          { value: 'unpaid', labelAr: 'غير مدفوع', labelEn: 'Unpaid' },
          { value: 'refunded', labelAr: 'مسترجع', labelEn: 'Refunded' },
        ],
      },
      { key: 'notes', labelAr: 'ملاحظات', labelEn: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'transactions',
    titleAr: 'الحركات المالية',
    titleEn: 'Transactions',
    descriptionAr: 'الإيرادات والمصروفات والسندات',
    descriptionEn: 'Income, expense and ledger entries',
    icon: Wallet,
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    getItems: () => ctx.transactions,
    getId: (record) => record.id,
    createBlank: () => ({
      id: makeId('tx'),
      tenantId: ctx.tenants[0]?.id ?? '',
      branchId: ctx.branches[0]?.id ?? '',
      type: 'income',
      categoryAr: '',
      categoryEn: '',
      amount: 0,
      descriptionAr: '',
      descriptionEn: '',
      date: new Date().toISOString(),
      referenceOrderId: '',
      createdBy: '',
    }),
    save: (record) => StorageService.addTransaction(record as Transaction),
    remove: (id) => StorageService.deleteTransaction(id),
    fields: [
      {
        key: 'tenantId',
        labelAr: 'المطعم',
        labelEn: 'Tenant',
        type: 'select',
        required: true,
        options: () => ctx.tenants.map((tenant) => ({ value: tenant.id, labelAr: tenant.nameAr, labelEn: tenant.nameEn })),
      },
      {
        key: 'branchId',
        labelAr: 'الفرع',
        labelEn: 'Branch',
        type: 'select',
        required: true,
        options: () => ctx.branches.map((branch) => ({ value: branch.id, labelAr: branch.nameAr, labelEn: branch.nameEn })),
      },
      {
        key: 'type',
        labelAr: 'النوع',
        labelEn: 'Type',
        type: 'select',
        options: () => [
          { value: 'income', labelAr: 'دخل', labelEn: 'Income' },
          { value: 'expense', labelAr: 'مصروف', labelEn: 'Expense' },
        ],
      },
      { key: 'categoryAr', labelAr: 'الفئة بالعربية', labelEn: 'Arabic category', type: 'text', required: true },
      { key: 'categoryEn', labelAr: 'الفئة بالإنجليزية', labelEn: 'English category', type: 'text', required: true },
      { key: 'amount', labelAr: 'المبلغ', labelEn: 'Amount', type: 'number', required: true },
      { key: 'descriptionAr', labelAr: 'الوصف بالعربية', labelEn: 'Arabic description', type: 'textarea', required: true },
      { key: 'descriptionEn', labelAr: 'الوصف بالإنجليزية', labelEn: 'English description', type: 'textarea', required: true },
      { key: 'date', labelAr: 'التاريخ', labelEn: 'Date', type: 'date' },
      {
        key: 'referenceOrderId',
        labelAr: 'مرجع الطلب',
        labelEn: 'Order reference',
        type: 'select',
        options: () => [{ value: '', labelAr: 'غير محدد', labelEn: 'Unassigned' }, ...ctx.orders.map((order) => ({ value: order.id, labelAr: order.id, labelEn: order.id }))],
      },
      { key: 'createdBy', labelAr: 'أنشأه', labelEn: 'Created by', type: 'text', required: true },
    ],
  },
];

const fieldValue = (record: Record<string, any> | null, field: FieldConfig) => {
  if (!record) return '';
  if (field.key === 'currencyCode') {
    const code = String(record.currencyEn || record.currencyAr || '').toUpperCase();
    if (code === 'TRY' || code === 'ل.ت') return 'TRY';
    if (code === 'USD' || code === 'دولار') return 'USD';
    return 'SAR';
  }
  return toDraftValue(record[field.key]);
};

export default function SystemAdminView({ language, onAddNotification }: SystemAdminViewProps) {
  const isRtl = language === 'ar';
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeEntity, setActiveEntity] = useState<EntityKey>('tenants');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [panel, setPanel] = useState<'manage' | 'overview'>('manage');

  const context = useMemo(() => buildAdminContext(), [refreshKey]);
  const configs = useMemo(() => getEntityConfigs(context), [context]);
  const currentConfig = configs.find((config) => config.key === activeEntity) ?? configs[0];
  const currentItems = useMemo(() => currentConfig.getItems(context), [currentConfig, context]);

  useEffect(() => {
    const selected = editingId ? currentItems.find((item) => currentConfig.getId(item) === editingId) ?? null : null;
    if (selected) {
      const nextDraft: Record<string, string> = {};
      currentConfig.fields.forEach((field) => {
        nextDraft[field.key] = fieldValue(selected, field);
      });
      setDraft(nextDraft);
    } else {
      setDraft(emptyDraftFor(currentConfig.fields));
    }
  }, [activeEntity, currentConfig, currentItems, editingId, refreshKey]);

  const filteredItems = useMemo(() => {
    const lowered = searchQuery.trim().toLowerCase();
    if (!lowered) return currentItems;
    return currentItems.filter((item) => Object.values(item).some((value) => toDraftValue(value).toLowerCase().includes(lowered)));
  }, [currentItems, searchQuery]);

  const handleNew = () => {
    setEditingId(null);
    setDraft(emptyDraftFor(currentConfig.fields, context));
  };

  const handleEdit = (record: Record<string, any>) => {
    setEditingId(currentConfig.getId(record));
    const nextDraft: Record<string, string> = {};
    currentConfig.fields.forEach((field) => {
      nextDraft[field.key] = fieldValue(record, field);
    });
    setDraft(nextDraft);
  };

  const handleDelete = async (record: Record<string, any>) => {
    if (!window.confirm(isRtl ? 'هل تريد حذف هذا السجل؟' : 'Delete this record?')) return;
    await currentConfig.remove(currentConfig.getId(record));
    setEditingId(null);
    setRefreshKey((value) => value + 1);
    onAddNotification(
      isRtl ? 'تم حذف السجل بنجاح' : 'Record deleted successfully',
      isRtl ? 'Record deleted successfully' : 'تم حذف السجل بنجاح',
      'success',
    );
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    const record = editingId ? currentItems.find((item) => currentConfig.getId(item) === editingId) : null;
    const base = record ? { ...record } : currentConfig.createBlank(context);

    for (const field of currentConfig.fields) {
      const rawValue = draft[field.key] ?? '';
      if (field.required && String(rawValue).trim() === '') {
        onAddNotification(
          isRtl ? `حقل ${field.labelAr} مطلوب` : `${field.labelEn} is required`,
          isRtl ? `${field.labelEn} is required` : `حقل ${field.labelAr} مطلوب`,
          'warning',
        );
        return;
      }

      if (field.key === 'currencyCode') {
        const code = rawValue.toUpperCase();
        base.currencyEn = code;
        base.currencyAr = code === 'TRY' ? 'ل.ت' : code === 'USD' ? 'دولار' : 'ل.س';
        continue;
      }

      base[field.key] = parseDraftValue(field, rawValue);
    }

    delete (base as Record<string, unknown>).currencyCode;

    if (!base.id) {
      base.id = makeId(currentConfig.key.slice(0, 3));
    }

    const saved = await currentConfig.save(base);
    if (saved) {
      setEditingId(currentConfig.getId(saved));
    }
    setRefreshKey((value) => value + 1);
    onAddNotification(
      isRtl ? 'تم حفظ التغييرات' : 'Changes saved successfully',
      isRtl ? 'Changes saved successfully' : 'تم حفظ التغييرات',
      'success',
    );
  };

  const overviewCards = [
    { key: 'tenants', count: context.tenants.length, labelAr: 'مطاعم', labelEn: 'Tenants', icon: Store },
    { key: 'branches', count: context.branches.length, labelAr: 'فروع', labelEn: 'Branches', icon: MapPinned },
    { key: 'menuItems', count: context.menuItems.length, labelAr: 'أصناف', labelEn: 'Menu items', icon: MenuSquare },
    { key: 'orders', count: context.orders.length, labelAr: 'طلبات', labelEn: 'Orders', icon: Receipt },
    { key: 'employees', count: context.employees.length, labelAr: 'موظفون', labelEn: 'Employees', icon: Users },
    { key: 'transactions', count: context.transactions.length, labelAr: 'حركات مالية', labelEn: 'Transactions', icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-[#111827] text-white rounded-[2rem] p-6 md:p-7 shadow-[0_10px_24px_rgba(0,0,0,0.24)] border border-slate-800 overflow-hidden relative">
        <div className="absolute inset-0 opacity-25 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.22),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.2),_transparent_30%)]" />
        <div className="relative flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-emerald-200">
              <ShieldCheck className="w-4 h-4" />
              {isRtl ? 'لوحة إدارة النظام' : 'System control center'}
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              {isRtl ? 'إدارة كاملة للإضافة والتعديل والحذف' : 'Full add, edit and delete operations'}
            </h2>
            <p className="text-sm text-slate-200 leading-7 max-w-2xl">
              {isRtl
                ? 'هذه الشاشة مخصصة لإدارة بيانات النظام الأساسية مباشرة من الواجهة، مع ترجمة واضحة للعربية والإنجليزية، ودعم تغيير السجلات وحذفها بشكل منظم.'
                : 'This screen is built to manage the core system data directly from the UI, with clear Arabic/English translation and structured record editing and deletion.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[240px]">
            <button
              type="button"
              onClick={() => setPanel('manage')}
              className={`rounded-2xl px-4 py-3 text-sm font-bold transition border ${panel === 'manage' ? 'bg-orange-600 text-white border-orange-600 shadow-sm' : 'bg-slate-900/70 border-slate-800 text-slate-200 hover:bg-slate-800'}`}
            >
              {isRtl ? 'الإدارة' : 'Manage'}
            </button>
            <button
              type="button"
              onClick={() => setPanel('overview')}
              className={`rounded-2xl px-4 py-3 text-sm font-bold transition border ${panel === 'overview' ? 'bg-orange-600 text-white border-orange-600 shadow-sm' : 'bg-slate-900/70 border-slate-800 text-slate-200 hover:bg-slate-800'}`}
            >
              {isRtl ? 'الملخص' : 'Overview'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {overviewCards.map((card) => {
          const CardIcon = card.icon;
          return (
            <div key={card.key} className="bg-[#111827] rounded-3xl border border-slate-800 p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black tracking-[0.22em] uppercase text-slate-400">{isRtl ? card.labelAr : card.labelEn}</p>
                <p className="text-2xl font-black text-white mt-1">{card.count}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900 text-orange-500 border border-slate-800">
                <CardIcon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {panel === 'overview' ? (
        <div className="bg-[#111827] rounded-[2rem] border border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <Settings2 className="w-5 h-5 text-orange-500" />
            <div>
              <h3 className="text-sm font-black text-white">{isRtl ? 'ملخص الإدارة' : 'Management summary'}</h3>
              <p className="text-[11px] text-slate-400">{isRtl ? 'نظرة سريعة على النظام والبيانات الأساسية' : 'Quick view of the system and core data sets'}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-3xl border border-slate-800 bg-[#0d131c] p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{isRtl ? 'الوحدات القابلة للتعديل' : 'Editable modules'}</p>
              <p className="mt-2 text-sm text-slate-300 leading-7">
                {isRtl
                  ? 'العمليات الأساسية متاحة على: المطاعم، الفروع، الصالات، الطاولات، التصنيفات، الموردين، المواد الخام، الأصناف، الموظفين، العملاء، الكوبونات، الحركات المالية.'
                  : 'Core operations are available for tenants, branches, halls, tables, categories, suppliers, ingredients, menu items, employees, customers, coupons, and financial transactions.'}
              </p>
            </div>
            <div className="rounded-3xl border border-orange-500/20 bg-orange-500/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">{isRtl ? 'القيود المهمة' : 'Important rules'}</p>
              <ul className="mt-2 space-y-2 text-sm text-slate-200 leading-6">
                <li>{isRtl ? 'الطلبات قابلة للتعديل والحذف من هنا، لكن إنشاؤها الرئيسي يظل من POS / QR.' : 'Orders can be edited and deleted here, while their primary creation flow remains in POS / QR.'}</li>
                <li>{isRtl ? 'العلاقات المركبة مثل الوصفات والحضور ما زالت مخزنة داخلياً وتحتاج قرار تطبيع لاحق.' : 'Composite relations such as recipes and attendance are still embedded and need a later normalization decision.'}</li>
                <li>{isRtl ? 'الواجهة الآن ثنائية اللغة بشكل أوضح، مع تقليل النصوص المختلطة.' : 'The interface is now more clearly bilingual, with fewer mixed-language labels.'}</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6">
          <aside className="bg-[#111827] rounded-[2rem] border border-slate-800 shadow-sm p-4 space-y-3 max-h-[78vh] overflow-y-auto">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Database className="w-4.5 h-4.5 text-orange-500" />
              <div>
                <p className="text-xs font-black text-white">{isRtl ? 'الكيانات' : 'Entities'}</p>
                <p className="text-[10px] text-slate-400">{isRtl ? 'اختر الجدول المراد تعديله' : 'Pick the table you want to manage'}</p>
              </div>
            </div>

            <div className="space-y-2">
              {configs.map((config) => {
                const ConfigIcon = config.icon;
                const active = config.key === activeEntity;
                return (
                  <button
                    key={config.key}
                    type="button"
                    onClick={() => {
                      setActiveEntity(config.key);
                      setEditingId(null);
                      setSearchQuery('');
                    }}
                    className={`w-full text-left rounded-2xl px-3 py-3 border transition ${active ? 'bg-orange-600 border-orange-600 text-white shadow-sm' : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-800'}`}
                  >
                    <div className="flex items-center gap-2">
                      <ConfigIcon className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-300' : 'text-emerald-600'}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate">{isRtl ? config.titleAr : config.titleEn}</p>
                        <p className={`text-[10px] mt-0.5 truncate ${active ? 'text-slate-300' : 'text-slate-400'}`}>{isRtl ? config.descriptionAr : config.descriptionEn}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="space-y-5">
            <div className="bg-[#111827] rounded-[2rem] border border-slate-800 shadow-sm p-5">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-white">{isRtl ? currentConfig.titleAr : currentConfig.titleEn}</h3>
                  <p className="text-[11px] text-slate-400 mt-1">{isRtl ? currentConfig.descriptionAr : currentConfig.descriptionEn}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={isRtl ? 'بحث سريع...' : 'Quick search...'}
                      className="w-full sm:w-72 rounded-2xl border border-slate-800 bg-slate-900/70 py-2.5 pl-9 pr-4 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleNew}
                    disabled={!currentConfig.allowCreate}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                  >
                    <Plus className="w-4 h-4" />
                    {isRtl ? 'سجل جديد' : 'New record'}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-5">
              <div className="bg-[#111827] rounded-[2rem] border border-slate-800 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800 bg-[#0f1724] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-white">{isRtl ? 'السجلات الحالية' : 'Current records'}</p>
                    <p className="text-[10px] text-slate-400">{filteredItems.length} {isRtl ? 'سجل' : 'rows'}</p>
                  </div>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setDraft(emptyDraftFor(currentConfig.fields));
                      }}
                      className="text-xs font-bold text-slate-400 hover:text-white"
                    >
                      {isRtl ? 'إلغاء التعديل' : 'Cancel edit'}
                    </button>
                  )}
                </div>

                <div className="max-h-[62vh] overflow-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="sticky top-0 bg-[#111827] z-10">
                      <tr className="text-slate-400 text-xs uppercase tracking-[0.18em]">
                        <th className="px-5 py-3 text-left">{isRtl ? 'السجل' : 'Record'}</th>
                        <th className="px-5 py-3 text-left">{isRtl ? 'تفاصيل مختصرة' : 'Quick details'}</th>
                        <th className="px-5 py-3 text-right">{isRtl ? 'إجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredItems.map((record) => {
                        const id = currentConfig.getId(record);
                        const isActive = editingId === id;
                        const summaryFields = currentConfig.fields.slice(0, 3);
                        return (
                          <tr key={id} className={isActive ? 'bg-orange-500/10' : 'bg-[#111827]'}>
                            <td className="px-5 py-4 align-top">
                              <div className="font-black text-white">{id}</div>
                              <div className="text-[11px] text-slate-400 mt-1">{isRtl ? currentConfig.titleAr : currentConfig.titleEn}</div>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <div className="flex flex-wrap gap-2">
                                {summaryFields.map((field) => {
                                  const options = field.options?.(context) ?? [];
                                  const raw = record[field.key];
                                  const label = options.find((option) => option.value === String(raw));
                                  const display = label ? optionLabel(label, isRtl) : toDraftValue(raw);
                                  return (
                                    <span key={field.key} className="inline-flex max-w-full items-center rounded-full border border-slate-800 bg-slate-900/70 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                                      <span className="opacity-60 me-1">{isRtl ? field.labelAr : field.labelEn}:</span>
                                      <span className="truncate">{display}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="px-5 py-4 align-top text-right">
                              <div className="inline-flex flex-wrap items-center justify-end gap-2">
                                {currentConfig.allowEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(record)}
                                    className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-800"
                                  >
                                    <PencilLine className="w-3.5 h-3.5" />
                                    {isRtl ? 'تعديل' : 'Edit'}
                                  </button>
                                )}
                                {currentConfig.allowDelete && (
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(record)}
                                    className="inline-flex items-center gap-1 rounded-xl border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    {isRtl ? 'حذف' : 'Delete'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredItems.length === 0 && (
                        <tr>
                          <td className="px-5 py-12 text-center text-slate-400" colSpan={3}>
                            {isRtl ? 'لا توجد سجلات مطابقة' : 'No matching records'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-[#111827] rounded-[2rem] border border-slate-800 shadow-sm p-5">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                  <div className="p-2.5 rounded-2xl bg-slate-900 text-orange-500 border border-slate-800">
                    <PencilLine className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">{editingId ? (isRtl ? 'تعديل السجل' : 'Edit record') : (isRtl ? 'إضافة سجل' : 'Create record')}</h4>
                    <p className="text-[10px] text-slate-400 mt-1">{isRtl ? 'استخدم الحقول أدناه للحفظ السريع' : 'Use the fields below for quick save operations'}</p>
                  </div>
                </div>

                <form onSubmit={handleSave} className="mt-4 space-y-3.5 max-h-[66vh] overflow-y-auto pr-1">
                  {currentConfig.fields.map((field) => {
                    const options = field.options?.(context) ?? [];
                    const label = isRtl ? field.labelAr : field.labelEn;
                    const placeholder = isRtl ? field.placeholderAr ?? label : field.placeholderEn ?? label;

                    return (
                      <div key={field.key}>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          {label}
                          {field.required && <span className="text-rose-500 ms-1">*</span>}
                        </label>

                        {field.type === 'textarea' ? (
                          <textarea
                            rows={4}
                            value={draft[field.key] ?? ''}
                            onChange={(event) => setDraft((value) => ({ ...value, [field.key]: event.target.value }))}
                            placeholder={placeholder}
                            className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-orange-500/30"
                          />
                        ) : field.type === 'select' ? (
                          <select
                            value={draft[field.key] ?? ''}
                            onChange={(event) => setDraft((value) => ({ ...value, [field.key]: event.target.value }))}
                            aria-label={label}
                            title={label}
                            className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500/30"
                          >
                            {options.map((option) => (
                              <option key={option.value} value={option.value}>
                                {optionLabel(option, isRtl)}
                              </option>
                            ))}
                          </select>
                        ) : field.type === 'boolean' ? (
                          <select
                            value={draft[field.key] ?? 'false'}
                            onChange={(event) => setDraft((value) => ({ ...value, [field.key]: event.target.value }))}
                            aria-label={label}
                            title={label}
                            className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500/30"
                          >
                            <option value="true">{isRtl ? 'نعم' : 'Yes'}</option>
                            <option value="false">{isRtl ? 'لا' : 'No'}</option>
                          </select>
                        ) : (
                          <input
                            type={field.type}
                            value={draft[field.key] ?? ''}
                            onChange={(event) => setDraft((value) => ({ ...value, [field.key]: event.target.value }))}
                            placeholder={placeholder}
                            className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-orange-500/30"
                          />
                        )}
                      </div>
                    );
                  })}

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="submit"
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-orange-600 px-4 py-3 text-sm font-black text-white hover:bg-orange-500"
                    >
                      <Check className="w-4 h-4" />
                      {editingId ? (isRtl ? 'حفظ التعديل' : 'Save changes') : (isRtl ? 'إنشاء السجل' : 'Create record')}
                    </button>
                  </div>

                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-[11px] leading-6 text-amber-200">
                    <div className="flex items-center gap-2 font-bold mb-1">
                      <AlertCircle className="w-4 h-4" />
                      {isRtl ? 'ملاحظة' : 'Note'}
                    </div>
                    {isRtl
                      ? 'بعض البيانات التشغيلية مثل تفاصيل عناصر الطلب أو وصفات المكونات ما زالت مركبة داخل السجل الرئيسي، لذلك هذا المركز يدير الجداول الأساسية أولاً.'
                      : 'Some operational data such as order item details or recipe components are still embedded inside parent records, so this center manages the primary tables first.'}
                  </div>
                </form>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
