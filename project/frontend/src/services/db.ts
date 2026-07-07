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
import { api } from './api';

interface AuthResponse {
  token: string;
  expiresAt: string;
  user: Employee;
}

// Production schema removed — kept seed data only.
const INITIAL_TENANTS: Tenant[] = [
  {
    id: 't1',
    nameAr: 'شاورما وجريل الفاخر',
    nameEn: 'Shawarma & Grill Premium',
    logoUrl: '🍔',
    email: 'info@shawarmagrill.com',
    phone: '920005432',
    address: 'شارع التحلية، الرياض، المملكة العربية السعودية',
    currencyAr: 'ر.س',
    currencyEn: 'SAR',
    taxPercent: 15.0,
    servicePercent: 0.0,
    status: 'active',
    subscriptionPlan: 'pro',
    createdAt: '2026-01-10T12:00:00Z',
  },
  {
    id: 't2',
    nameAr: 'قصر الضيافة الشرقية',
    nameEn: 'Eastern Hospitality Palace',
    logoUrl: '🕌',
    email: 'contact@easternpalace.sa',
    phone: '920008877',
    address: 'طريق الأمير محمد بن عبدالعزيز، جدة، المملكة العربية السعودية',
    currencyAr: 'ر.س',
    currencyEn: 'SAR',
    taxPercent: 15.0,
    servicePercent: 5.0, // Hospitality fine dining service fee
    status: 'active',
    subscriptionPlan: 'enterprise',
    createdAt: '2026-02-15T12:00:00Z',
  },
];

const INITIAL_BRANCHES: Branch[] = [
  // Tenant 1
  { id: 'b1_1', tenantId: 't1', nameAr: 'فرع السليمانية - الرياض', nameEn: 'Al-Sulaimania Branch - Riyadh', city: 'Riyadh', address: 'طريق الملك عبدالعزيز، حي السليمانية', phone: '0112445566', status: 'active' },
  { id: 'b1_2', tenantId: 't1', nameAr: 'فرع الحزام الذهبي - الخبر', nameEn: 'Golden Belt Branch - Khobar', city: 'Khobar', address: 'طريق الأمير فيصل بن فهد', phone: '0138992211', status: 'active' },
  // Tenant 2
  { id: 'b2_1', tenantId: 't2', nameAr: 'الفرع الرئيسي - جدة', nameEn: 'Main Branch - Jeddah', city: 'Jeddah', address: 'شارع الأندلس، الحمراء', phone: '0126554433', status: 'active' },
];

const INITIAL_HALLS: Hall[] = [
  // Branch 1_1
  { id: 'h1_1_main', branchId: 'b1_1', nameAr: 'الصالة الرئيسية', nameEn: 'Main Hall' },
  { id: 'h1_1_family', branchId: 'b1_1', nameAr: 'صالة العائلات', nameEn: 'Family Section' },
  { id: 'h1_1_outdoor', branchId: 'b1_1', nameAr: 'الجلسات الخارجية', nameEn: 'Outdoor Terrace' },
  // Branch 2_1
  { id: 'h2_1_royal', branchId: 'b2_1', nameAr: 'القاعة الملكية VIP', nameEn: 'Royal VIP Suite' },
  { id: 'h2_1_garden', branchId: 'b2_1', nameAr: 'جلسات النافورة والحديقة', nameEn: 'Fountain Garden' },
];

const INITIAL_TABLES: Table[] = [
  // Branch 1_1, Hall Main
  { id: 'tbl_1_1', hallId: 'h1_1_main', number: '101', seats: 2, status: 'free', qrCodeValue: 'qr_tbl_1_1' },
  { id: 'tbl_1_2', hallId: 'h1_1_main', number: '102', seats: 4, status: 'busy', qrCodeValue: 'qr_tbl_1_2' },
  { id: 'tbl_1_3', hallId: 'h1_1_main', number: '103', seats: 4, status: 'reserved', qrCodeValue: 'qr_tbl_1_3' },
  { id: 'tbl_1_4', hallId: 'h1_1_main', number: '104', seats: 6, status: 'cleaning', qrCodeValue: 'qr_tbl_1_4' },
  { id: 'tbl_1_5', hallId: 'h1_1_main', number: '105', seats: 8, status: 'free', qrCodeValue: 'qr_tbl_1_5' },

  // Branch 1_1, Family
  { id: 'tbl_1_10', hallId: 'h1_1_family', number: 'F1', seats: 6, status: 'free', qrCodeValue: 'qr_tbl_1_10' },
  { id: 'tbl_1_11', hallId: 'h1_1_family', number: 'F2', seats: 4, status: 'busy', qrCodeValue: 'qr_tbl_1_11' },
  { id: 'tbl_1_12', hallId: 'h1_1_family', number: 'F3', seats: 8, status: 'free', qrCodeValue: 'qr_tbl_1_12' },

  // Branch 2_1, Royal
  { id: 'tbl_2_1', hallId: 'h2_1_royal', number: 'R-1', seats: 12, status: 'busy', qrCodeValue: 'qr_tbl_2_1' },
  { id: 'tbl_2_2', hallId: 'h2_1_royal', number: 'R-2', seats: 8, status: 'free', qrCodeValue: 'qr_tbl_2_2' },
  // Branch 2_1, Garden
  { id: 'tbl_2_10', hallId: 'h2_1_garden', number: 'G1', seats: 4, status: 'free', qrCodeValue: 'qr_tbl_2_10' },
];

const INITIAL_CATEGORIES: Category[] = [
  // Tenant 1
  { id: 'c1_burgers', tenantId: 't1', nameAr: 'شاورما وبيرجر', nameEn: 'Shawarma & Burgers', icon: 'Flame', isActive: true },
  { id: 'c1_pizza', tenantId: 't1', nameAr: 'بيتزا نابولي', nameEn: 'Napoli Pizza', icon: 'Pizza', isActive: true },
  { id: 'c1_sides', tenantId: 't1', nameAr: 'المقبلات والجوانب', nameEn: 'Sides & Appetizers', icon: 'Layers', isActive: true },
  { id: 'c1_drinks', tenantId: 't1', nameAr: 'المشروبات الباردة', nameEn: 'Cold Drinks', icon: 'CupSoda', isActive: true },

  // Tenant 2
  { id: 'c2_oriental', tenantId: 't2', nameAr: 'المشويات الشرقية واللحوم', nameEn: 'Oriental Grills & Meat', icon: 'Flame', isActive: true },
  { id: 'c2_appetizer', tenantId: 't2', nameAr: 'المازات والمغمسات', nameEn: 'Mezze & Appetizers', icon: 'Salad', isActive: true },
  { id: 'c2_traditional', tenantId: 't2', nameAr: 'الأكلات الشعبية والكبسة', nameEn: 'Traditional Rice & Kabsa', icon: 'Beef', isActive: true },
  { id: 'c2_drinks', tenantId: 't2', nameAr: 'الكوكتيلات والعصائر الفريش', nameEn: 'Cocktails & Fresh Juices', icon: 'Grape', isActive: true },
];

const INITIAL_INGREDIENTS: Ingredient[] = [
  // Tenant 1 (Burger/Pizza Ingredients for deduction test)
  { id: 'ing1_cheese', tenantId: 't1', nameAr: 'جبنة موزاريلا بلدي', nameEn: 'Mozzarella Cheese', stock: 45.5, minStock: 10.0, unitAr: 'كيلو', unitEn: 'kg', costPerUnit: 25.0, supplierId: 'sup1_1' },
  { id: 'ing1_beef', tenantId: 't1', nameAr: 'لحم بقري مفروم ممتاز', nameEn: 'Ground Premium Beef', stock: 85.0, minStock: 15.0, unitAr: 'كيلو', unitEn: 'kg', costPerUnit: 35.0, supplierId: 'sup1_2' },
  { id: 'ing1_chicken', tenantId: 't1', nameAr: 'صدور دجاج متبلة شاورما', nameEn: 'Marinated Chicken Breast', stock: 120.0, minStock: 20.0, unitAr: 'كيلو', unitEn: 'kg', costPerUnit: 18.0, supplierId: 'sup1_2' },
  { id: 'ing1_flour', tenantId: 't1', nameAr: 'طحين أبيض فاخر (مخابز)', nameEn: 'Premium White Flour', stock: 250.0, minStock: 50.0, unitAr: 'كيلو', unitEn: 'kg', costPerUnit: 3.50, supplierId: 'sup1_1' },
  { id: 'ing1_tomato_sauce', tenantId: 't1', nameAr: 'صلصة طماطم سرية للبيتزا', nameEn: 'Craft Pizza Tomato Sauce', stock: 60.0, minStock: 12.0, unitAr: 'لتر', unitEn: 'liter', costPerUnit: 8.0, supplierId: 'sup1_1' },
  { id: 'ing1_potato', tenantId: 't1', nameAr: 'أصابع بطاطس بلجيكية حبات', nameEn: 'Fries Potatoes Belgian', stock: 150.0, minStock: 30.0, unitAr: 'كيلو', unitEn: 'kg', costPerUnit: 6.0, supplierId: 'sup1_1' },

  // Tenant 2
  { id: 'ing2_rice', tenantId: 't2', nameAr: 'أرز بسمتي هندي عنبر', nameEn: 'Indian Basmati Amber Rice', stock: 500.0, minStock: 80.0, unitAr: 'كيلو', unitEn: 'kg', costPerUnit: 9.0, supplierId: 'sup2_1' },
  { id: 'ing2_lamb', tenantId: 't2', nameAr: 'لحوم غنم حرشية طازجة', nameEn: 'Fresh Lamb Meat', stock: 95.0, minStock: 15.0, unitAr: 'كيلو', unitEn: 'kg', costPerUnit: 48.0, supplierId: 'sup2_2' },
];

const INITIAL_SUPPLIERS: Supplier[] = [
  // Tenant 1
  { id: 'sup1_1', tenantId: 't1', name: 'الشركة الشاملة لتوزيع الأغذية', contactPerson: 'أبو أحمد', phone: '0599111222', email: 'orders@shamel-food.sa', address: 'المنطقة الصناعية، الرياض' },
  { id: 'sup1_2', tenantId: 't1', name: 'مزارع كافية الطازجة للحوم والدواجن', contactPerson: 'م. تركي القحطاني', phone: '0502233445', email: 'turki@kafiafarms.sa', address: 'الخرج، منطقة الرياض' },
  // Tenant 2
  { id: 'sup2_1', tenantId: 't2', name: 'شركة رواء للمواد التموينية والأرز', contactPerson: 'سليم شاهين', phone: '0555432109', email: 'salim@rewaa-rice.com', address: 'ميناء جدة الإسلامي، جدة' },
  { id: 'sup2_2', tenantId: 't2', name: 'مسالخ نجد الحديثة', contactPerson: 'عبدالعزيز الحميد', phone: '0566778899', email: 'hamid@najd-slaughters.com', address: 'جنوب جدة، حي الصفاء' },
];

const INITIAL_MENU_ITEMS: MenuItem[] = [
  // Tenant 1: Burgers & Shawarma (c1_burgers)
  {
    id: 'm1_burger_beef',
    categoryId: 'c1_burgers',
    nameAr: 'برو برجر كلاسيك دبل بقري',
    nameEn: 'Double Pro-Burger Beef Classic',
    descriptionAr: 'شريحتان من اللحم البلدي الطازج المشوي على اللهب، جبنة هولندية، خبز البطاطس الطري، صوص كلاسيكي خاص',
    descriptionEn: 'Two freshly flame-grilled premium beef patties, real Dutch melted cheese, soft brioche potato bun, and our signature sauce.',
    price: 32.0,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80',
    ingredients: [
      { ingredientId: 'ing1_beef', quantityNeeded: 0.22 }, // 220g Beef
      { ingredientId: 'ing1_cheese', quantityNeeded: 0.04 }, // 40g Cheese
    ],
    isAvailable: true,
    extras: [
      { nameAr: 'شريحة جبن إضافية', nameEn: 'Extra Cheese Slice', price: 3.5 },
      { nameAr: 'شريحة لحم بقري (بفتيك)', nameEn: 'Extra Beef Patty', price: 9.0 },
      { nameAr: 'مخلل هلابينو حار', nameEn: 'Spicy Jalapeno', price: 2.0 },
    ],
  },
  {
    id: 'm1_shawarma_chicken',
    categoryId: 'c1_burgers',
    nameAr: 'شاورما الدجاج العربي الفاخر',
    nameEn: 'Premium Arabic Chicken Shawarma',
    descriptionAr: 'شاورما دجاج متبل على الطريقة الأصلية، صوص الثوم المبتكر، مخلل مقرمش وبطاطس أصابع ملفوف بخبز الصاج المحمص',
    descriptionEn: 'Traditional seasoned cut chicken shawarma, garlic cream aioli, crisp pickles, wrapped in golden-toasted saj bread.',
    price: 18.0,
    imageUrl: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&auto=format&fit=crop&q=80',
    ingredients: [
      { ingredientId: 'ing1_chicken', quantityNeeded: 0.15 }, // 150g Chicken
      { ingredientId: 'ing1_potato', quantityNeeded: 0.05 }, // 50g Potato
    ],
    isAvailable: true,
    extras: [
      { nameAr: 'زيادة ثومية دبل', nameEn: 'Double Garlic Sauce', price: 1.5 },
      { nameAr: 'إضافة جبنة موزاريلًا ذايبة', nameEn: 'Melted Mozzarella Inside', price: 3.0 },
    ],
  },

  // Tenant 1: Pizzas (c1_pizza)
  {
    id: 'm1_pizza_marg',
    categoryId: 'c1_pizza',
    nameAr: 'بيتزا مارغريتا نابولي الأصلية',
    nameEn: 'Original Napoli Margherita Pizza',
    descriptionAr: 'عجين نابولي المخمر لمدة ٤٨ ساعة، صلصة طماطم سان مارزانو، موزاريلا بلدي من قشطة الحليب، أوراق ريحان فريش، زيت زيتون بكر',
    descriptionEn: '48-hours fermented dough, rich San Marzano tomato base, direct cow milk mozzarella, fresh basil, and extra virgin olive oil.',
    price: 36.0,
    imageUrl: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&auto=format&fit=crop&q=80',
    ingredients: [
      { ingredientId: 'ing1_flour', quantityNeeded: 0.18 }, // 180g Flour
      { ingredientId: 'ing1_tomato_sauce', quantityNeeded: 0.12 }, // 120ml Tomato sauce
      { ingredientId: 'ing1_cheese', quantityNeeded: 0.14 }, // 140g Mozzarella cheese
    ],
    isAvailable: true,
    extras: [
      { nameAr: 'أطراف محشية بالجبن', nameEn: 'Cheese Stuffed Crust', price: 6.0 },
      { nameAr: 'فطر فريش بري', nameEn: 'Wild Fresh Mushroom', price: 4.0 },
    ],
  },

  // Tenant 1: Sides (c1_sides)
  {
    id: 'm1_fries_classic',
    categoryId: 'c1_sides',
    nameAr: 'بطاطس بلجيكية مبهرة مقرمشة',
    nameEn: 'Crispi Belgian Fries Seasoned',
    descriptionAr: 'أصابع بطاطس مقلية ذهبية مبهرة بهارات تكساس الخاصة، تقدم مع صوص الكوكتيل المجاني',
    descriptionEn: 'Crispy fried golden Belgian potatoes, sprinkled with our unique Texas seasoning. Served with cocktail sauce.',
    price: 10.0,
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&auto=format&fit=crop&q=80',
    ingredients: [
      { ingredientId: 'ing1_potato', quantityNeeded: 0.22 }, // 220g Potatoes
    ],
    isAvailable: true,
    extras: [
      { nameAr: 'سوس الجبنة الشيدر السائل', nameEn: 'Liquid Cheddar Cheese Sauce', price: 3.0 },
    ],
  },

  // Tenant 1: Drinks (c1_drinks)
  {
    id: 'm1_cola',
    categoryId: 'c1_drinks',
    nameAr: 'كولا بارد بالثلج والليمون',
    nameEn: 'Cold Cola with Lime & Ice',
    descriptionAr: 'علبة بيبسي كولا باردة ومنعشة تقدم مع كاس ثلج وشريحة ليمون منعشة',
    descriptionEn: 'Chilled Pepsi Cola can served with a splash of fresh lemon and crushed frozen ice.',
    price: 5.5,
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=80',
    ingredients: [],
    isAvailable: true,
    extras: [],
  },

  // Tenant 2: Grills & Traditional (c2_oriental)
  {
    id: 'm2_kabsa_lamb',
    categoryId: 'c2_traditional',
    nameAr: 'كبسة لحم غنم نعيمي هرفي',
    nameEn: 'Lamb Kabsa Naeimi Premium',
    descriptionAr: 'أرز بسمتي هندي مطبوخ على مرق لحم الهرفي مع خلطة بهارات الكبسة الفاخرة، مكسرات محمصة وصوص الدقوس الحار',
    descriptionEn: 'Premium basmati rice baked inside local Harfi lamb broth, spiced with luxury Kabsa herbs, loaded with toasted nuts & spicy Daqqous sauce.',
    price: 78.0,
    imageUrl: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=400&auto=format&fit=crop&q=80',
    ingredients: [
      { ingredientId: 'ing2_rice', quantityNeeded: 0.35 }, // 350g Rice
      { ingredientId: 'ing2_lamb', quantityNeeded: 0.4 }, // 400g Lamb
    ],
    isAvailable: true,
    extras: [
      { nameAr: 'أرز ميز مزة إضافي', nameEn: 'Extra Basmati Rice Layer', price: 10.0 },
      { nameAr: 'مكسرات محمصة مشكلة', nameEn: 'Toasted Almonds & Pine Nuts', price: 5.0 },
    ],
  },
  {
    id: 'm2_grill_shish',
    categoryId: 'c2_oriental',
    nameAr: 'شيش طاووق رويال على الفحم',
    nameEn: 'Royal Charcoal Shish Taouk Platter',
    descriptionAr: 'صدور دجاج متبلة بزيت الخردل وبهارات الشرق الفخمة، تشوى على الفحم، تقدم مع صوج الثوم الحار والأرز والبطاطس المقرمشة والأناناس المشوي',
    descriptionEn: 'Tender chicken cubes marinated in mustard oils, grilled perfectly over live coal. Served with garlic cream, fries & grilled pineapple.',
    price: 45.0,
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80',
    ingredients: [],
    isAvailable: true,
    extras: [],
  },
];

const INITIAL_CRM: CustomerCRM[] = [
  { id: 'crm_1', tenantId: 't1', name: 'سناء الحربي', phone: '0551122334', email: 'sanaa@gmail.com', points: 340, loyaltyTier: 'Gold', ordersCount: 12, totalSpent: 420.0, createdAt: '2026-03-01T15:00:00Z' },
  { id: 'crm_2', tenantId: 't1', name: 'أحمد صالح الشمراني', phone: '0509988776', email: 'ahmad@outlook.com', points: 1400, loyaltyTier: 'VIP', ordersCount: 38, totalSpent: 1250.0, createdAt: '2026-01-20T11:30:00Z' },
  { id: 'crm_3', tenantId: 't2', name: 'خالد بن فيصل', phone: '0543322110', email: 'khaled@vip.com', points: 790, loyaltyTier: 'VIP', ordersCount: 8, totalSpent: 850.0, createdAt: '2026-04-10T19:00:00Z' },
];

const INITIAL_COUPONS: Coupon[] = [
  { id: 'cp_10', tenantId: 't1', code: 'PROMO10', discountPercent: 10, maxDiscount: 20, minOrderValue: 50, expiryDate: '2026-12-31', isActive: true },
  { id: 'cp_20', tenantId: 't1', code: 'RAMADAN', discountPercent: 20, maxDiscount: 50, minOrderValue: 100, expiryDate: '2026-12-31', isActive: true },
  { id: 'cp_vip', tenantId: 't2', code: 'EASTERNVIP', discountPercent: 15, maxDiscount: 200, minOrderValue: 200, expiryDate: '2026-12-31', isActive: true },
];

const INITIAL_EMPLOYEES: Employee[] = [
  // Super Admin of SaaS platform
  { id: 'emp_super_admin', tenantId: 't1', branchId: 'b1_1', name: 'سوبر أدمن المنصة (Super Admin)', email: 'admin@resto-erp.com', role: 'super_admin', phone: '0500000001', salary: 25000, attendanceHistory: [], performanceRating: 5.0, status: 'active', username: 'admin' },
  // Tenant 1 Al-Sulaimania Branch
  { id: 'emp1_owner', tenantId: 't1', branchId: 'b1_1', name: 'علي بن حسن الفاخر', email: 'ali@shawarmagrill.com', role: 'owner', phone: '0501111111', salary: 15000, attendanceHistory: [], performanceRating: 5.0, status: 'active', username: 'ali' },
  { id: 'emp1_manager', tenantId: 't1', branchId: 'b1_1', name: 'أحمد رأفت (مدير الفرع)', email: 'ahmed@shawarmagrill.com', role: 'manager', phone: '0502222222', salary: 8500, attendanceHistory: [], performanceRating: 4.8, status: 'active', username: 'ahmed' },
  { id: 'emp1_cashier', tenantId: 't1', branchId: 'b1_1', name: 'ساهر العتيبي (محاسب مبيعات)', email: 'saher@shawarmagrill.com', role: 'cashier', phone: '0503333333', salary: 4500, attendanceHistory: [], performanceRating: 4.5, status: 'active', username: 'saher' },
  { id: 'emp1_waiter', tenantId: 't1', branchId: 'b1_1', name: 'وسام المصري (مضيف صالة)', email: 'wesam@shawarmagrill.com', role: 'waiter', phone: '0504444444', salary: 3800, attendanceHistory: [], performanceRating: 4.2, status: 'active', username: 'wesam' },
  { id: 'emp1_kitchen', tenantId: 't1', branchId: 'b1_1', name: 'الشيف محمد الطايفي (رئيس طهاة)', email: 'chef.mohamad@shawarmagrill.com', role: 'kitchen', phone: '0505555555', salary: 7000, attendanceHistory: [], performanceRating: 4.9, status: 'active', username: 'chef' },
  { id: 'emp1_accountant', tenantId: 't1', branchId: 'b1_1', name: 'خالد المحاسب (Accountant)', email: 'khaled@shawarmagrill.com', role: 'accountant', phone: '0506666666', salary: 6500, attendanceHistory: [], performanceRating: 4.7, status: 'active', username: 'finance' },
  { id: 'emp1_hr', tenantId: 't1', branchId: 'b1_1', name: 'ماجد شؤون الموظفين (HR Manager)', email: 'majed@shawarmagrill.com', role: 'hr_manager', phone: '0507777777', salary: 6000, attendanceHistory: [], performanceRating: 4.6, status: 'active', username: 'hr' },
  { id: 'emp1_inventory', tenantId: 't1', branchId: 'b1_1', name: 'فراس المستودعات (Inventory)', email: 'firas@shawarmagrill.com', role: 'inventory_manager', phone: '0508888888', salary: 5500, attendanceHistory: [], performanceRating: 4.5, status: 'active', username: 'stock' },
  // Tenant 2 Main Jeddah Branch
  { id: 'emp2_owner', tenantId: 't2', branchId: 'b2_1', name: 'الشيخ عبدالمحسن الكوهجي', email: 'ceo@easternpalace.sa', role: 'owner', phone: '0555555555', salary: 40000, attendanceHistory: [], performanceRating: 5.0, status: 'active', username: 'mohsen' },
  { id: 'emp2_kitchen', tenantId: 't2', branchId: 'b2_1', name: 'شيف فهد السليماني', email: 'fahad@easternpalace.sa', role: 'kitchen', phone: '0554443322', salary: 12000, attendanceHistory: [], performanceRating: 4.9, status: 'active', username: 'fahad' },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  // Tenant 1
  { id: 'tx_1', tenantId: 't1', branchId: 'b1_1', type: 'income', categoryAr: 'مبيعات الكاشير', categoryEn: 'POS Sales Credit', amount: 1250.0, descriptionAr: 'إيراد المبيعات اليومية لفترة الصباح', descriptionEn: 'Morning session sales revenues accumulated', date: '2026-06-13T10:00:00Z', createdBy: 'ساهر العتيبي' },
  { id: 'tx_2', tenantId: 't1', branchId: 'b1_1', type: 'expense', categoryAr: 'فواتير الموردين ومشتريات', categoryEn: 'Suppliers Procurement', amount: 350.0, descriptionAr: 'شراء بطاطس واجبنة موزاريلا حليب طازج من شركة الشاملة', descriptionEn: 'Sourced premium French fries and mozzarella blocks', date: '2026-06-12T15:30:00Z', createdBy: 'أحمد رأفت' },
  { id: 'tx_3', tenantId: 't1', branchId: 'b1_1', type: 'expense', categoryAr: 'صيانة ومصروفات تشغيلية', categoryEn: 'Operational Maintenance', amount: 180.0, descriptionAr: 'تغيير فلاتر زيت القلي وتعبئة دبة الغاز الاحتياطية', descriptionEn: 'Fries oil filter swap & refill cylinder butane gas', date: '2026-06-11T12:00:00Z', createdBy: 'أحمد رأفت' },
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord_1',
    tenantId: 't1',
    branchId: 'b1_1',
    tableId: 'tbl_1_2',
    hallId: 'h1_1_main',
    type: 'dine_in',
    status: 'preparing',
    items: [
      {
        id: 'oi_1',
        menuItemId: 'm1_burger_beef',
        nameAr: 'برو برجر كلاسيك دبل بقري',
        nameEn: 'Double Pro-Burger Beef Classic',
        quantity: 2,
        price: 32.0,
        selectedExtras: [{ nameAr: 'شريحة جبن إضافية', nameEn: 'Extra Cheese Slice', price: 3.5 }],
        notes: 'الرجاء الإكثار من صوص البرجر السري ولحم من غير بصل',
      },
      {
        id: 'oi_2',
        menuItemId: 'm1_fries_classic',
        nameAr: 'بطاطس بلجيكية مبهرة مقرمشة',
        nameEn: 'Crispi Belgian Fries Seasoned',
        quantity: 1,
        price: 10.0,
        selectedExtras: [],
      },
    ],
    subtotal: 81.0, // (32+3.5)*2 + 10
    taxAmount: 12.15, // 15%
    serviceAmount: 0.0,
    discountAmount: 0.0,
    total: 93.15,
    cashierId: 'emp1_cashier',
    waiterId: 'emp1_waiter',
    paymentMethod: 'unpaid',
    paymentStatus: 'unpaid',
    createdAt: '2026-06-13T21:10:00-07:00',
    updatedAt: '2026-06-13T21:12:00-07:00',
  },
  {
    id: 'ord_2',
    tenantId: 't1',
    branchId: 'b1_1',
    tableId: 'tbl_1_11',
    hallId: 'h1_1_family',
    type: 'dine_in',
    status: 'ready',
    items: [
      {
        id: 'oi_3',
        menuItemId: 'm1_pizza_marg',
        nameAr: 'بيتزا مارغريتا نابولي الأصلية',
        nameEn: 'Original Napoli Margherita Pizza',
        quantity: 1,
        price: 36.0,
        selectedExtras: [],
        notes: 'تأكيد نضج الأطراف بشكل ذهبي',
      },
      {
        id: 'oi_4',
        menuItemId: 'm1_cola',
        nameAr: 'كولا بارد بالثلج والليمون',
        nameEn: 'Cold Cola with Lime & Ice',
        quantity: 2,
        price: 5.5,
        selectedExtras: [],
      },
    ],
    subtotal: 47.0, // 36 + 11
    taxAmount: 7.05,
    serviceAmount: 0.0,
    discountAmount: 5.0, // RAMADAN code applied
    total: 49.05,
    cashierId: 'emp1_cashier',
    waiterId: 'emp1_waiter',
    paymentMethod: 'card',
    paymentStatus: 'paid',
    createdAt: '2026-06-13T20:45:00-07:00',
    updatedAt: '2026-06-13T20:55:00-07:00',
  },
];

// Helper to fully load initial DB records or retrieve them secure and persistent from LocalStorage
export class StorageService {
  private static bootstrapPromise: Promise<void> | null = null;
  private static apiCache: Record<string, unknown> = {};

  private static async readFromApi<T>(resource: string, _fallback?: T): Promise<T> {
    try {
      const data = await api.get<T | { rows?: T[]; data?: T; [key: string]: unknown }>(`/${resource}`);
      if (Array.isArray(data)) {
        return data as T;
      }
      if (data && typeof data === 'object') {
        if ('rows' in data && Array.isArray((data as { rows?: unknown[] }).rows)) {
          return (data as { rows: T }).rows;
        }
        if ('data' in data && Array.isArray((data as { data?: unknown }).data)) {
          return (data as { data: T }).data;
        }
      }
      return data as T;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(`API unavailable for ${resource}`, error);
      }
      throw error instanceof Error ? new Error(`${resource}: ${error.message}`) : new Error(`API request failed for ${resource}`);
    }
  }

  private static async writeToApi<T extends { id?: string }>(resource: string, payload: T, _fallback?: T): Promise<T> {
    const id = payload?.id;

    const createPayload = async () => {
      try {
        const created = await api.post<T>(`/${resource}`, payload);
        if (created !== undefined) {
          return created;
        }
        throw new Error(`API create returned no data for ${resource}`);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(`API create failed for ${resource}`, error);
        }
        throw error instanceof Error ? new Error(`${resource}: ${error.message}`) : new Error(`API create failed for ${resource}`);
      }
    };

    if (typeof id === 'string' && id.trim()) {
      try {
        const updated = await api.put<T>(`/${resource}/${id}`, payload);
        if (updated !== undefined) {
          return updated;
        }
        return await createPayload();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(`API update failed for ${resource}/${id}`, error);
        }
        throw error instanceof Error ? new Error(`${resource}: ${error.message}`) : new Error(`API update failed for ${resource}/${id}`);
      }
    }

    return await createPayload();
  }

  private static async deleteFromApi(resource: string, id: string) {
    try {
      await api.delete(`/${resource}/${id}`);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(`API delete failed for ${resource}/${id}`, error);
      }
      throw error instanceof Error ? new Error(`${resource}: ${error.message}`) : new Error(`API delete failed for ${resource}/${id}`);
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
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem('restohub_token');
  }

  public static async restoreSession(): Promise<Employee | null> {
    const token = this.getAuthToken();
    if (!token) {
      return null;
    }

    try {
      const result = await api.get<{ user: Employee }>('/auth/me');
      if (!result || typeof result !== 'object' || !('user' in result)) {
        throw new Error('Invalid session response');
      }

      const employee = result.user;
      this.set('employees', [employee]);
      await this.loadProtectedData(employee);
      return employee;
    } catch (error) {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('restohub_token');
      }
      if (import.meta.env.DEV) {
        console.warn('Failed to restore session from stored token.', error);
      }
      return null;
    }
  }

  private static async loadProtectedData(employee: Employee) {
    const payloadResources = [
      ['tenants', 'tenants'],
      ['branches', 'branches'],
      ['halls', 'halls'],
      ['tables', 'tables'],
      ['categories', 'categories'],
      ['suppliers', 'suppliers'],
      ['ingredients', 'ingredients'],
      ['menu_items', 'menu_items'],
      ['orders', 'orders'],
      ['transactions', 'financial_transactions'],
      ['employees', 'employees'],
      ['crm', 'customers_crm'],
      ['coupons', 'coupons'],
      ['payroll_records', 'payroll_records'],
      ['audit_logs', 'audit_logs'],
    ] as const;

    await Promise.all(
      payloadResources.map(async ([cacheKey, resource]) => {
        const data = await this.readFromApi<unknown[]>(resource, []);
        this.setApiCache(cacheKey, data);
      }),
    );

    // Keep the current authenticated employee available within the cache.
    const employees = this.getEmployees(employee.tenantId);
    const hasCurrent = employees.some((item) => item.id === employee.id);
    if (!hasCurrent) {
      employees.unshift(employee);
      this.set('employees', employees);
    }
  }

  public static async login(username: string, password: string): Promise<Employee> {
    const response = await api.post<AuthResponse>('/auth/login', { username, password });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('restohub_token', response.token);
    }

    const employee = response.user;
    this.set('employees', [employee]);
    await this.loadProtectedData(employee);
    return employee;
  }

  public static async logout() {
    const token = this.getAuthToken();
    if (token) {
      try {
        await api.post('/auth/logout', {});
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Failed to revoke server session during logout.', error);
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('restohub_token');
    }
  }

  public static async bootstrapFromApi() {
    if (this.bootstrapPromise) {
      return this.bootstrapPromise;
    }

    this.bootstrapPromise = (async () => {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('No auth token found; cannot bootstrap API data.');
      }

      const resources = [
        ['tenants', 'tenants'],
        ['branches', 'branches'],
        ['halls', 'halls'],
        ['tables', 'tables'],
        ['categories', 'categories'],
        ['suppliers', 'suppliers'],
        ['ingredients', 'ingredients'],
        ['menu_items', 'menu_items'],
        ['orders', 'orders'],
        ['transactions', 'financial_transactions'],
        ['employees', 'employees'],
        ['crm', 'customers_crm'],
        ['coupons', 'coupons'],
      ] as const;

      await Promise.all(resources.map(async ([storageKey, resource]) => {
        const payload = await api.get<unknown | { rows?: unknown[]; data?: unknown[] }>(`/${resource}`);
        if (Array.isArray(payload)) {
          this.setApiCache(storageKey, payload);
          this.set(storageKey, payload);
          return;
        }

        if (payload && typeof payload === 'object') {
          if ('rows' in payload && Array.isArray((payload as { rows?: unknown[] }).rows)) {
            this.setApiCache(storageKey, (payload as { rows: unknown[] }).rows);
            this.set(storageKey, (payload as { rows: unknown[] }).rows);
            return;
          }
          if ('data' in payload && Array.isArray((payload as { data?: unknown[] }).data)) {
            this.setApiCache(storageKey, (payload as { data: unknown[] }).data);
            this.set(storageKey, (payload as { data: unknown[] }).data);
            return;
          }
        }

        throw new Error(`Unexpected API response shape for ${resource}`);
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

