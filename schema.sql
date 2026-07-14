-- ============================================================
--  RestoHub SaaS ERP — PostgreSQL Full Production Schema
--  مبني بالكامل على تحليل الكود الفعلي لمشروع:
--  github.com/oday023/restohub-saas-erp
--  يشمل: كل الجداول + RLS + Indexes + Triggers + Views + Seed
--
--  الإصدار المعدّل (v2) — إضافات:
--    • جدول platform_admins لأدمن المنصة (مستقل عن الـ tenants)
--    • حساب أدمن منصة ثابت: odaisayedissa (كلمة المرور مشفّرة bcrypt)
--    • جدول platform_admin_login_audit لتتبع محاولات الدخول
--    • pg_trgm + فهارس بحث تقريبي سريع على القائمة والعملاء
--    • فيو vw_platform_overview: نظرة عامة على كل المطاعم للأدمن
-- ============================================================

-- ========================
--  EXTENSIONS
-- ========================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- تحسين: بحث سريع وتقريبي (fuzzy search)

-- ========================
--  CLEANUP (للتشغيل النظيف)
-- ========================
DROP TABLE IF EXISTS platform_admin_login_audit CASCADE;
DROP TABLE IF EXISTS platform_admins          CASCADE;
DROP TABLE IF EXISTS audit_logs              CASCADE;
DROP TABLE IF EXISTS payroll_records         CASCADE;
DROP TABLE IF EXISTS attendance_records      CASCADE;
DROP TABLE IF EXISTS financial_transactions  CASCADE;
DROP TABLE IF EXISTS order_items             CASCADE;
DROP TABLE IF EXISTS orders                  CASCADE;
DROP TABLE IF EXISTS coupons                 CASCADE;
DROP TABLE IF EXISTS customers_crm           CASCADE;
DROP TABLE IF EXISTS menu_item_extras        CASCADE;
DROP TABLE IF EXISTS menu_item_ingredients   CASCADE;
DROP TABLE IF EXISTS menu_items              CASCADE;
DROP TABLE IF EXISTS ingredients             CASCADE;
DROP TABLE IF EXISTS suppliers               CASCADE;
DROP TABLE IF EXISTS categories              CASCADE;
DROP TABLE IF EXISTS tables                  CASCADE;
DROP TABLE IF EXISTS halls                   CASCADE;
DROP TABLE IF EXISTS branches                CASCADE;
DROP TABLE IF EXISTS employees               CASCADE;
DROP TABLE IF EXISTS tenants                 CASCADE;

-- ============================================================
--  1. TENANTS (المطاعم / العملاء SaaS)
-- ============================================================
CREATE TABLE tenants (
    id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar           VARCHAR(255)  NOT NULL,
    name_en           VARCHAR(255)  NOT NULL,
    logo_url          TEXT,
    email             VARCHAR(255)  UNIQUE NOT NULL,
    phone             VARCHAR(50),
    address           TEXT,
    currency_ar       VARCHAR(10)   DEFAULT 'ر.س',
    currency_en       VARCHAR(10)   DEFAULT 'SAR',
    tax_percent       DECIMAL(5,2)  DEFAULT 15.00,
    service_percent   DECIMAL(5,2)  DEFAULT 0.00,
    status            VARCHAR(50)   DEFAULT 'active'
                          CHECK (status IN ('active','suspended')),
    subscription_plan VARCHAR(50)   DEFAULT 'pro'
                          CHECK (subscription_plan IN ('starter','pro','enterprise')),
    created_at        TIMESTAMPTZ   DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_tenants_email  ON tenants(email);
CREATE INDEX idx_tenants_status ON tenants(status);

-- ============================================================
--  2. BRANCHES (الفروع)
-- ============================================================
CREATE TABLE branches (
    id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name_ar     VARCHAR(255)  NOT NULL,
    name_en     VARCHAR(255)  NOT NULL,
    city        VARCHAR(100)  NOT NULL,
    address     TEXT,
    phone       VARCHAR(50),
    status      VARCHAR(50)   DEFAULT 'active'
                    CHECK (status IN ('active','inactive')),
    created_at  TIMESTAMPTZ   DEFAULT NOW(),
    updated_at  TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_branches_tenant ON branches(tenant_id);
CREATE INDEX idx_branches_status ON branches(status);

-- ============================================================
--  3. EMPLOYEES (الموظفون) — قبل halls لأن halls قد تحتاجه مستقبلاً
-- ============================================================
CREATE TABLE employees (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id           UUID          NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name                VARCHAR(255)  NOT NULL,
    email               VARCHAR(255)  NOT NULL,
    auth_user_id        UUID,                   -- Supabase Auth user ID linked to this employee
    username            VARCHAR(100),
    password_hash       TEXT,                    -- bcrypt hash، لا تخزن كلمة المرور نصاً
    role                VARCHAR(50)   NOT NULL
                            CHECK (role IN (
                              'super_admin','owner','manager','accountant',
                              'cashier','waiter','kitchen','inventory_manager',
                              'hr_manager','customer','cleaner','security','other'
                            )),
    phone               VARCHAR(50),
    salary              DECIMAL(12,2) DEFAULT 0.00,
    performance_rating  DECIMAL(3,2)  DEFAULT 5.00
                            CHECK (performance_rating BETWEEN 0 AND 5),
    status              VARCHAR(50)   DEFAULT 'active'
                            CHECK (status IN ('active','suspended')),
    created_at          TIMESTAMPTZ   DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   DEFAULT NOW(),
    UNIQUE (tenant_id, username)
);

CREATE INDEX idx_employees_tenant         ON employees(tenant_id);
CREATE INDEX idx_employees_branch         ON employees(branch_id);
CREATE INDEX idx_employees_role           ON employees(role);
CREATE INDEX idx_employees_username       ON employees(tenant_id, username);
CREATE INDEX idx_employees_auth_user_id   ON employees(auth_user_id);

-- ============================================================
--  3-B. LOGIN ATTEMPTS (قفل محاولات الدخول الفاشلة على مستوى السيرفر)
-- ============================================================
CREATE TABLE login_attempts (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    username       TEXT          NOT NULL,
    ip_address     VARCHAR(45),
    success        BOOLEAN       NOT NULL DEFAULT FALSE,
    attempted_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_login_attempts_username_time ON login_attempts(username, attempted_at DESC);
CREATE INDEX idx_login_attempts_ip_time        ON login_attempts(ip_address, attempted_at DESC);

CREATE OR REPLACE FUNCTION public.check_login_attempt_lock(
    p_username text,
    p_ip_address text DEFAULT 'unknown'
)
RETURNS TABLE (
    is_allowed boolean,
    attempts_count integer,
    lockout_seconds integer,
    locked_until timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_recent_count integer;
    v_last_failure timestamptz;
    v_locked_until timestamptz;
BEGIN
    DELETE FROM public.login_attempts
    WHERE attempted_at < NOW() - INTERVAL '60 seconds';

    SELECT COUNT(*), MAX(attempted_at)
    INTO v_recent_count, v_last_failure
    FROM public.login_attempts
    WHERE lower(username) = lower(p_username)
      AND success = FALSE
      AND attempted_at >= NOW() - INTERVAL '60 seconds';

    IF COALESCE(v_recent_count, 0) >= 5 THEN
        v_locked_until := v_last_failure + INTERVAL '60 seconds';
        RETURN QUERY
        SELECT FALSE,
               v_recent_count,
               GREATEST(0, EXTRACT(EPOCH FROM (v_locked_until - NOW()))::integer),
               v_locked_until;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT TRUE,
           COALESCE(v_recent_count, 0),
           0,
           NULL::timestamptz;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_login_attempt(
    p_username text,
    p_ip_address text DEFAULT 'unknown',
    p_success boolean DEFAULT FALSE
)
RETURNS TABLE (
    is_allowed boolean,
    attempts_count integer,
    lockout_seconds integer,
    locked_until timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.login_attempts (username, ip_address, success, attempted_at)
    VALUES (lower(p_username), p_ip_address, p_success, NOW());

    RETURN QUERY
    SELECT * FROM public.check_login_attempt_lock(p_username, p_ip_address);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_login_attempt_lock(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, text, boolean) TO anon, authenticated;

-- ============================================================
--  4. ATTENDANCE RECORDS (سجلات الحضور والغياب)
--     مُخرجة من JSONB داخل employees → جدول مستقل أفضل
-- ============================================================
CREATE TABLE attendance_records (
    id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id  UUID          NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    tenant_id    UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    work_date    DATE          NOT NULL,
    check_in     TIMESTAMPTZ,
    check_out    TIMESTAMPTZ,
    status       VARCHAR(20)   DEFAULT 'present'
                     CHECK (status IN ('present','absent','late','holiday')),
    notes        TEXT,
    created_at   TIMESTAMPTZ   DEFAULT NOW(),
    UNIQUE (employee_id, work_date)
);

CREATE INDEX idx_attendance_employee ON attendance_records(employee_id);
CREATE INDEX idx_attendance_date     ON attendance_records(work_date);
CREATE INDEX idx_attendance_tenant   ON attendance_records(tenant_id);

-- ============================================================
--  5. PAYROLL RECORDS (الرواتب والمستحقات)
-- ============================================================
CREATE TABLE payroll_records (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id     UUID          NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    employee_name   VARCHAR(255)  NOT NULL,     -- snapshot لحفظ الاسم وقت الصرف
    role            VARCHAR(50)   NOT NULL,
    month           VARCHAR(7)    NOT NULL,      -- e.g. '2026-06'
    base_salary     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    advances        DECIMAL(12,2) DEFAULT 0.00,
    deductions      DECIMAL(12,2) DEFAULT 0.00,
    bonuses         DECIMAL(12,2) DEFAULT 0.00,
    net_paid        DECIMAL(12,2) GENERATED ALWAYS AS
                        (base_salary - advances - deductions + bonuses) STORED,
    status          VARCHAR(20)   DEFAULT 'draft'
                        CHECK (status IN ('draft','paid')),
    paid_at         TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ   DEFAULT NOW(),
    UNIQUE (employee_id, month)
);

CREATE INDEX idx_payroll_tenant   ON payroll_records(tenant_id);
CREATE INDEX idx_payroll_employee ON payroll_records(employee_id);
CREATE INDEX idx_payroll_month    ON payroll_records(month);
CREATE INDEX idx_payroll_status   ON payroll_records(status);

-- ============================================================
--  6. HALLS (الصالات / الأقسام)
-- ============================================================
CREATE TABLE halls (
    id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id   UUID          NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name_ar     VARCHAR(255)  NOT NULL,
    name_en     VARCHAR(255)  NOT NULL,
    created_at  TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_halls_branch ON halls(branch_id);

-- ============================================================
--  7. TABLES (الطاولات)
-- ============================================================
CREATE TABLE tables (
    id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    hall_id          UUID          NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
    number           VARCHAR(50)   NOT NULL,
    seats            INT           DEFAULT 4,
    status           VARCHAR(50)   DEFAULT 'free'
                         CHECK (status IN ('free','reserved','busy','cleaning')),
    qr_code_value    TEXT,
    active_order_id  UUID,         -- FK مُضاف لاحقاً بعد جدول orders
    created_at       TIMESTAMPTZ   DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_tables_hall   ON tables(hall_id);
CREATE INDEX idx_tables_status ON tables(status);

-- ============================================================
--  8. CATEGORIES (تصنيفات القائمة)
-- ============================================================
CREATE TABLE categories (
    id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name_ar     VARCHAR(255)  NOT NULL,
    name_en     VARCHAR(255)  NOT NULL,
    icon        VARCHAR(100)  DEFAULT 'Utensils',   -- lucide icon name
    is_active   BOOLEAN       DEFAULT TRUE,
    sort_order  SMALLINT      DEFAULT 0,
    created_at  TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_categories_tenant ON categories(tenant_id);
CREATE INDEX idx_categories_active ON categories(tenant_id, is_active);

-- ============================================================
--  9. SUPPLIERS (الموردون)
-- ============================================================
CREATE TABLE suppliers (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(255)  NOT NULL,
    contact_person  VARCHAR(100),
    phone           VARCHAR(50),
    email           VARCHAR(255),
    address         TEXT,
    created_at      TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_suppliers_tenant ON suppliers(tenant_id);

-- ============================================================
--  10. INGREDIENTS (المواد الخام / المخزون)
-- ============================================================
CREATE TABLE ingredients (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name_ar         VARCHAR(255)  NOT NULL,
    name_en         VARCHAR(255)  NOT NULL,
    stock           DECIMAL(12,2) DEFAULT 0.00,
    min_stock       DECIMAL(12,2) DEFAULT 0.00,   -- حد التنبيه
    unit_ar         VARCHAR(50)   NOT NULL,        -- كيلو / لتر / حبة
    unit_en         VARCHAR(50)   NOT NULL,        -- kg / liter / piece
    cost_per_unit   DECIMAL(12,2) DEFAULT 0.00,
    supplier_id     UUID          REFERENCES suppliers(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ   DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_ingredients_tenant   ON ingredients(tenant_id);
CREATE INDEX idx_ingredients_supplier ON ingredients(supplier_id);
-- فهرس للتنبيهات: مواد دون الحد الأدنى
CREATE INDEX idx_ingredients_low_stock ON ingredients(tenant_id)
    WHERE stock <= min_stock;

-- ============================================================
--  11. MENU ITEMS (أصناف القائمة)
-- ============================================================
CREATE TABLE menu_items (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id     UUID          NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name_ar         VARCHAR(255)  NOT NULL,
    name_en         VARCHAR(255)  NOT NULL,
    description_ar  TEXT,
    description_en  TEXT,
    price           DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    image_url       TEXT,
    is_available    BOOLEAN       DEFAULT TRUE,
    created_at      TIMESTAMPTZ   DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_menu_items_category  ON menu_items(category_id);
CREATE INDEX idx_menu_items_available ON menu_items(category_id, is_available);
-- تحسين: بحث سريع تقريبي بالاسم (عربي/إنجليزي) للقائمة، بدل LIKE '%...%' البطيء
CREATE INDEX idx_menu_items_name_ar_trgm ON menu_items USING gin (name_ar gin_trgm_ops);
CREATE INDEX idx_menu_items_name_en_trgm ON menu_items USING gin (name_en gin_trgm_ops);

-- ============================================================
--  12. MENU ITEM EXTRAS (الإضافات والمحسنات)
--      مُخرجة من JSONB extras[] في MenuItem → جدول مستقل
-- ============================================================
CREATE TABLE menu_item_extras (
    id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID          NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    name_ar      VARCHAR(255)  NOT NULL,
    name_en      VARCHAR(255)  NOT NULL,
    price        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    is_active    BOOLEAN       DEFAULT TRUE,
    sort_order   SMALLINT      DEFAULT 0
);

CREATE INDEX idx_extras_menu_item ON menu_item_extras(menu_item_id);

-- ============================================================
--  13. MENU ITEM INGREDIENTS (وصفات المكونات — علاقة M2M)
-- ============================================================
CREATE TABLE menu_item_ingredients (
    menu_item_id      UUID          NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    ingredient_id     UUID          NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity_needed   DECIMAL(10,3) NOT NULL,   -- الكمية المُخصومة عند البيع
    PRIMARY KEY (menu_item_id, ingredient_id)
);

CREATE INDEX idx_mii_ingredient ON menu_item_ingredients(ingredient_id);

-- ============================================================
--  14. CUSTOMERS CRM (عملاء الولاء والنقاط)
-- ============================================================
CREATE TABLE customers_crm (
    id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name          VARCHAR(255)  NOT NULL,
    phone         VARCHAR(50)   NOT NULL,
    email         VARCHAR(255),
    points        INTEGER       DEFAULT 0,
    loyalty_tier  VARCHAR(50)   DEFAULT 'Bronze'
                      CHECK (loyalty_tier IN ('Bronze','Silver','Gold','VIP')),
    orders_count  INTEGER       DEFAULT 0,
    total_spent   DECIMAL(12,2) DEFAULT 0.00,
    created_at    TIMESTAMPTZ   DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   DEFAULT NOW(),
    UNIQUE (tenant_id, phone)
);

CREATE INDEX idx_crm_tenant ON customers_crm(tenant_id);
CREATE INDEX idx_crm_phone  ON customers_crm(tenant_id, phone);
CREATE INDEX idx_crm_tier   ON customers_crm(tenant_id, loyalty_tier);
-- تحسين: بحث سريع تقريبي باسم العميل (لاستخدامه في شاشة الكاشير/CRM)
CREATE INDEX idx_crm_name_trgm ON customers_crm USING gin (name gin_trgm_ops);

-- ============================================================
--  15. COUPONS (قسائم الخصم)
-- ============================================================
CREATE TABLE coupons (
    id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id         UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code              VARCHAR(50)   NOT NULL,
    discount_percent  DECIMAL(5,2)  NOT NULL CHECK (discount_percent BETWEEN 0 AND 100),
    max_discount      DECIMAL(12,2),
    min_order_value   DECIMAL(12,2) DEFAULT 0.00,
    expiry_date       TIMESTAMPTZ   NOT NULL,
    is_active         BOOLEAN       DEFAULT TRUE,
    created_at        TIMESTAMPTZ   DEFAULT NOW(),
    UNIQUE (tenant_id, code)
);

CREATE INDEX idx_coupons_tenant ON coupons(tenant_id);
CREATE INDEX idx_coupons_active ON coupons(tenant_id, is_active);

-- ============================================================
--  16. ORDERS (الطلبات)
-- ============================================================
CREATE TABLE orders (
    id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id         UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id         UUID          NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    table_id          UUID          REFERENCES tables(id) ON DELETE SET NULL,
    hall_id           UUID          REFERENCES halls(id) ON DELETE SET NULL,
    cashier_id        UUID          REFERENCES employees(id) ON DELETE SET NULL,
    waiter_id         UUID          REFERENCES employees(id) ON DELETE SET NULL,
    customer_crm_id   UUID          REFERENCES customers_crm(id) ON DELETE SET NULL,
    coupon_id         UUID          REFERENCES coupons(id) ON DELETE SET NULL,
    type              VARCHAR(50)   NOT NULL
                          CHECK (type IN ('dine_in','takeaway','delivery')),
    status            VARCHAR(50)   DEFAULT 'new'
                          CHECK (status IN ('new','preparing','ready','delivered','cancelled')),
    subtotal          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_amount        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    service_amount    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_amount   DECIMAL(12,2) DEFAULT 0.00,
    total             DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    customer_name     VARCHAR(255),
    customer_phone    VARCHAR(50),
    delivery_address  TEXT,
    payment_method    VARCHAR(50)   DEFAULT 'unpaid'
                          CHECK (payment_method IN ('cash','card','wallet','unpaid')),
    payment_status    VARCHAR(50)   DEFAULT 'unpaid'
                          CHECK (payment_status IN ('paid','unpaid','refunded')),
    notes             TEXT,
    created_at        TIMESTAMPTZ   DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_orders_tenant     ON orders(tenant_id);
CREATE INDEX idx_orders_branch     ON orders(branch_id);
CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_orders_table      ON orders(table_id);
CREATE INDEX idx_orders_cashier    ON orders(cashier_id);
CREATE INDEX idx_orders_type       ON orders(type);
CREATE INDEX idx_orders_created    ON orders(created_at DESC);
CREATE INDEX idx_orders_payment    ON orders(tenant_id, payment_status);

-- الآن نضيف FK للطاولة بعد إنشاء جدول orders
ALTER TABLE tables
    ADD CONSTRAINT fk_active_order
    FOREIGN KEY (active_order_id) REFERENCES orders(id) ON DELETE SET NULL;

-- ============================================================
--  17. ORDER ITEMS (تفاصيل الطلبات — snapshot محفوظ)
-- ============================================================
CREATE TABLE order_items (
    id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id         UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id     UUID          REFERENCES menu_items(id) ON DELETE SET NULL,
    name_ar          VARCHAR(255)  NOT NULL,  -- snapshot اسم الصنف وقت الطلب
    name_en          VARCHAR(255)  NOT NULL,
    quantity         INTEGER       NOT NULL CHECK (quantity > 0),
    unit_price       DECIMAL(12,2) NOT NULL,  -- snapshot السعر وقت الطلب
    extras_amount    DECIMAL(12,2) DEFAULT 0.00,
    total_price      DECIMAL(12,2) GENERATED ALWAYS AS
                         (quantity * (unit_price + extras_amount)) STORED,
    selected_extras  JSONB         DEFAULT '[]'::jsonb,
    -- [{nameAr, nameEn, price}]
    notes            TEXT,
    created_at       TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_order_items_order     ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item ON order_items(menu_item_id);

-- ============================================================
--  18. FINANCIAL TRANSACTIONS (دفتر الحسابات العام)
-- ============================================================
CREATE TABLE financial_transactions (
    id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id            UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id            UUID          NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    type                 VARCHAR(50)   NOT NULL
                             CHECK (type IN ('income','expense')),
    category_ar          VARCHAR(100)  NOT NULL,
    category_en          VARCHAR(100)  NOT NULL,
    amount               DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    description_ar       TEXT,
    description_en       TEXT,
    date                 TIMESTAMPTZ   DEFAULT NOW(),
    reference_order_id   UUID          REFERENCES orders(id) ON DELETE SET NULL,
    created_by           UUID          REFERENCES employees(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_transactions_tenant ON financial_transactions(tenant_id);
CREATE INDEX idx_transactions_branch ON financial_transactions(branch_id);
CREATE INDEX idx_transactions_type   ON financial_transactions(type);
CREATE INDEX idx_transactions_date   ON financial_transactions(tenant_id, date DESC);
CREATE INDEX idx_transactions_order  ON financial_transactions(reference_order_id);

-- ============================================================
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--  19-B. PLATFORM_ADMINS (أدمن منصة SaaS — فوق كل الـ tenants)
--        منفصل عن جدول employees لأنه ليس تابعاً لأي مطعم/tenant
--        بل يدير المنصة بأكملها (كل المطاعم المشتركة).
-- ============================================================
CREATE TABLE platform_admins (
    id                     UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name              VARCHAR(255)  NOT NULL,
    username               VARCHAR(100)  NOT NULL UNIQUE,
    email                  VARCHAR(255)  UNIQUE,
    password_hash          TEXT          NOT NULL,   -- bcrypt عبر pgcrypto
    role                   VARCHAR(50)   NOT NULL DEFAULT 'platform_super_admin'
                               CHECK (role IN ('platform_super_admin','platform_support')),
    is_active              BOOLEAN       NOT NULL DEFAULT TRUE,
    failed_login_attempts  SMALLINT      NOT NULL DEFAULT 0,
    locked_until           TIMESTAMPTZ,
    last_login_at          TIMESTAMPTZ,
    last_login_ip          VARCHAR(45),
    created_at             TIMESTAMPTZ   DEFAULT NOW(),
    updated_at             TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_platform_admins_username ON platform_admins(username);
CREATE INDEX idx_platform_admins_active   ON platform_admins(is_active);

CREATE TRIGGER trg_platform_admins_updated_at
    BEFORE UPDATE ON platform_admins FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE FUNCTION public.create_employee_with_password(
    p_tenant_id uuid,
    p_branch_id uuid,
    p_name text,
    p_email text,
    p_username text,
    p_password text,
    p_role text,
    p_phone text,
    p_salary numeric,
    p_performance_rating numeric,
    p_status text
)
RETURNS TABLE (
    id uuid,
    tenant_id uuid,
    branch_id uuid,
    name text,
    email text,
    username text,
    role text,
    phone text,
    salary numeric,
    performance_rating numeric,
    status text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_employee_id uuid;
BEGIN
    INSERT INTO public.employees (
        tenant_id,
        branch_id,
        name,
        email,
        username,
        password_hash,
        role,
        phone,
        salary,
        performance_rating,
        status
    ) VALUES (
        p_tenant_id,
        p_branch_id,
        p_name,
        p_email,
        p_username,
        crypt(p_password, gen_salt('bf')),
        p_role,
        p_phone,
        COALESCE(p_salary, 0),
        COALESCE(p_performance_rating, 5),
        COALESCE(p_status, 'active')
    ) RETURNING id INTO v_employee_id;

    RETURN QUERY
    SELECT e.id,
           e.tenant_id,
           e.branch_id,
           e.name,
           e.email,
           e.username,
           e.role,
           e.phone,
           e.salary,
           e.performance_rating,
           e.status,
           e.created_at,
           e.updated_at
    FROM public.employees e
    WHERE e.id = v_employee_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_employee_with_password(uuid, uuid, text, text, text, text, text, text, numeric, numeric, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.verify_employee_login(p_username text, p_password text)
RETURNS TABLE (
    id uuid,
    tenant_id uuid,
    branch_id uuid,
    name text,
    email text,
    username text,
    role text,
    phone text,
    salary numeric,
    performance_rating numeric,
    status text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_employee RECORD;
BEGIN
    SELECT e.id, e.tenant_id, e.branch_id, e.name, e.email, e.username, e.role, e.phone,
           e.salary, e.performance_rating, e.status, e.created_at, e.updated_at
    INTO v_employee
    FROM public.employees e
    WHERE e.status = 'active'
      AND (e.username = p_username OR e.email = p_username)
      AND e.password_hash IS NOT NULL
      AND crypt(p_password, e.password_hash) = e.password_hash
    ORDER BY e.created_at DESC
    LIMIT 1;

    IF v_employee IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT v_employee.id,
           v_employee.tenant_id,
           v_employee.branch_id,
           v_employee.name,
           v_employee.email,
           v_employee.username,
           v_employee.role,
           v_employee.phone,
           v_employee.salary,
           v_employee.performance_rating,
           v_employee.status,
           v_employee.created_at,
           v_employee.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_platform_admin_login(p_username text, p_password text)
RETURNS TABLE (
    id uuid,
    full_name text,
    username text,
    email text,
    role text,
    is_active boolean,
    last_login_at timestamptz,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin RECORD;
BEGIN
    SELECT pa.id, pa.full_name, pa.username, pa.email, pa.role, pa.is_active, pa.last_login_at, pa.created_at
    INTO v_admin
    FROM public.platform_admins pa
    WHERE pa.is_active = TRUE
      AND (pa.username = p_username OR pa.email = p_username)
      AND crypt(p_password, pa.password_hash) = pa.password_hash
    ORDER BY pa.created_at DESC
    LIMIT 1;

    IF v_admin IS NULL THEN
        RETURN;
    END IF;

    UPDATE public.platform_admins
    SET last_login_at = NOW(), failed_login_attempts = 0
    WHERE id = v_admin.id;

    RETURN QUERY
    SELECT v_admin.id,
           v_admin.full_name,
           v_admin.username,
           v_admin.email,
           v_admin.role,
           v_admin.is_active,
           v_admin.last_login_at,
           v_admin.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_employee_login(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_platform_admin_login(text, text) TO anon, authenticated;

-- تفعيل RLS دون أي Policy عامة: بذلك لا يقدر عليه سوى الاتصال
-- بصلاحية service_role من الباك-إند فقط (وليس عبر anon/authenticated)
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- ============================================================
--  19-C. PLATFORM ADMIN LOGIN AUDIT (سجل محاولات دخول أدمن المنصة)
-- ============================================================
CREATE TABLE platform_admin_login_audit (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id       UUID          REFERENCES platform_admins(id) ON DELETE SET NULL,
    username_tried VARCHAR(100)  NOT NULL,
    success        BOOLEAN       NOT NULL,
    ip_address     VARCHAR(45),
    user_agent     TEXT,
    created_at     TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_pa_login_audit_admin    ON platform_admin_login_audit(admin_id);
CREATE INDEX idx_pa_login_audit_created  ON platform_admin_login_audit(created_at DESC);

ALTER TABLE platform_admin_login_audit ENABLE ROW LEVEL SECURITY;

-- ============================================================
--  19. AUDIT LOGS (سجل التدقيق والأمان)
-- ============================================================
CREATE TABLE audit_logs (
    id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id   UUID          REFERENCES employees(id) ON DELETE SET NULL,
    username      VARCHAR(100)  NOT NULL,
    action        TEXT          NOT NULL,
    before_value  JSONB,
    after_value   JSONB,
    ip_address    VARCHAR(45),
    user_agent    TEXT,
    created_at    TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant    ON audit_logs(tenant_id);
CREATE INDEX idx_audit_employee  ON audit_logs(employee_id);
CREATE INDEX idx_audit_created   ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_action    ON audit_logs(action);

-- ============================================================
--  AUTO-UPDATE TRIGGER لـ updated_at
-- ============================================================


CREATE TRIGGER trg_tenants_updated_at
    BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_branches_updated_at
    BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_employees_updated_at
    BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_tables_updated_at
    BEFORE UPDATE ON tables FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_menu_items_updated_at
    BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_ingredients_updated_at
    BEFORE UPDATE ON ingredients FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_crm_updated_at
    BEFORE UPDATE ON customers_crm FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_payroll_updated_at
    BEFORE UPDATE ON payroll_records FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
--  TRIGGER: تحديث رصيد المخزون عند تحريك الطلب لـ "preparing"
-- ============================================================
CREATE OR REPLACE FUNCTION fn_deduct_ingredients_on_preparing()
RETURNS TRIGGER AS $$
DECLARE
    v_item        RECORD;
    v_recipe      RECORD;
BEGIN
    -- فقط عند تغيير الحالة إلى preparing
    IF NEW.status = 'preparing' AND (OLD.status IS NULL OR OLD.status <> 'preparing') THEN
        FOR v_item IN
            SELECT oi.menu_item_id, oi.quantity
            FROM order_items oi
            WHERE oi.order_id = NEW.id
        LOOP
            FOR v_recipe IN
                SELECT mii.ingredient_id, mii.quantity_needed
                FROM menu_item_ingredients mii
                WHERE mii.menu_item_id = v_item.menu_item_id
            LOOP
                UPDATE ingredients
                SET stock = GREATEST(0, stock - (v_recipe.quantity_needed * v_item.quantity))
                WHERE id = v_recipe.ingredient_id;
            END LOOP;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deduct_ingredients
    AFTER UPDATE OF status ON orders
    FOR EACH ROW EXECUTE FUNCTION fn_deduct_ingredients_on_preparing();

-- ============================================================
--  TRIGGER: تحديث نقاط الولاء عند تسليم الطلب
-- ============================================================
CREATE OR REPLACE FUNCTION fn_update_loyalty_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
    v_points_gained INTEGER;
BEGIN
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status <> 'delivered')
       AND NEW.customer_phone IS NOT NULL
       AND NEW.payment_status = 'paid'
    THEN
        v_points_gained := FLOOR(NEW.total / 10);  -- نقطة لكل 10 ريال

        INSERT INTO customers_crm (tenant_id, name, phone, points, loyalty_tier, orders_count, total_spent)
        VALUES (
            NEW.tenant_id,
            COALESCE(NEW.customer_name, 'عميل نقدي'),
            NEW.customer_phone,
            v_points_gained,
            'Bronze',
            1,
            NEW.total
        )
        ON CONFLICT (tenant_id, phone) DO UPDATE
            SET points       = customers_crm.points + v_points_gained,
                orders_count = customers_crm.orders_count + 1,
                total_spent  = customers_crm.total_spent + NEW.total,
                loyalty_tier = CASE
                    WHEN customers_crm.total_spent + NEW.total >= 2500 THEN 'VIP'
                    WHEN customers_crm.total_spent + NEW.total >= 1000 THEN 'Gold'
                    WHEN customers_crm.total_spent + NEW.total >= 400  THEN 'Silver'
                    ELSE 'Bronze'
                END,
                updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_loyalty_on_delivery
    AFTER UPDATE OF status ON orders
    FOR EACH ROW EXECUTE FUNCTION fn_update_loyalty_on_delivery();

-- ============================================================
--  TRIGGER: تسجيل معاملة مالية تلقائياً عند تسليم الطلب
-- ============================================================
CREATE OR REPLACE FUNCTION fn_auto_income_transaction()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'delivered'
       AND (OLD.status IS NULL OR OLD.status <> 'delivered')
       AND NEW.payment_status = 'paid'
    THEN
        INSERT INTO financial_transactions (
            tenant_id, branch_id, type, category_ar, category_en,
            amount, description_ar, description_en,
            date, reference_order_id, created_by
        ) VALUES (
            NEW.tenant_id,
            NEW.branch_id,
            'income',
            'مبيعات طلبات الطعام',
            'Food Orders Sales',
            NEW.total,
            'طلبية رقم ' || UPPER(RIGHT(NEW.id::text, 6)) || ' - ' ||
                CASE NEW.type WHEN 'dine_in' THEN 'داخلي صالة' WHEN 'takeaway' THEN 'سفري' ELSE 'توصيل' END,
            'Order #' || UPPER(RIGHT(NEW.id::text, 6)) || ' - ' || NEW.type,
            NOW(),
            NEW.id,
            NEW.cashier_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_income
    AFTER UPDATE OF status ON orders
    FOR EACH ROW EXECUTE FUNCTION fn_auto_income_transaction();

-- ============================================================
--  TRIGGER: تحديث حالة الطاولة تلقائياً مع الطلب
-- ============================================================
CREATE OR REPLACE FUNCTION fn_sync_table_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'dine_in' AND NEW.table_id IS NOT NULL THEN
        IF NEW.status IN ('new','preparing','ready') THEN
            UPDATE tables SET status = 'busy', active_order_id = NEW.id,
                              updated_at = NOW()
            WHERE id = NEW.table_id;

        ELSIF NEW.status = 'delivered' THEN
            UPDATE tables SET status = 'cleaning', active_order_id = NULL,
                              updated_at = NOW()
            WHERE id = NEW.table_id;

        ELSIF NEW.status = 'cancelled' THEN
            UPDATE tables SET status = 'free', active_order_id = NULL,
                              updated_at = NOW()
            WHERE id = NEW.table_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_table_status
    AFTER INSERT OR UPDATE OF status ON orders
    FOR EACH ROW EXECUTE FUNCTION fn_sync_table_status();

-- ============================================================
--  ROW LEVEL SECURITY (Supabase Multi-Tenant Isolation)
-- ============================================================
ALTER TABLE tenants               ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches              ENABLE ROW LEVEL SECURITY;
ALTER TABLE halls                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables                ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_extras      ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers_crm         ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons               ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees             ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs            ENABLE ROW LEVEL SECURITY;

-- Helper function: استخراج tenant_id من JWT
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
    SELECT (auth.jwt()->>'jwt_tenant_id')::uuid;
$$ LANGUAGE sql STABLE;

-- Supabase Auth Hook: inject tenant claim into access token claims
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    claims jsonb;
    tenant_id uuid;
    emp_role text;
BEGIN
    SELECT e.tenant_id, e.role
    INTO tenant_id, emp_role
    FROM public.employees e
    WHERE e.auth_user_id = (event->>'user_id')::uuid
    ORDER BY e.created_at DESC
    LIMIT 1;

    claims := coalesce(event->'claims', '{}'::jsonb);

    IF tenant_id IS NOT NULL THEN
        claims := jsonb_set(claims, '{jwt_tenant_id}', to_jsonb(tenant_id::text));
    END IF;

    IF emp_role IS NOT NULL THEN
        claims := jsonb_set(claims, '{jwt_role}', to_jsonb(emp_role));
    END IF;

    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
END;
$$;

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- Tenant isolation policies
CREATE POLICY rls_tenants ON tenants
    FOR ALL USING (id = current_tenant_id());

CREATE POLICY rls_branches ON branches
    FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY rls_halls ON halls
    FOR ALL USING (branch_id IN (
        SELECT id FROM branches WHERE tenant_id = current_tenant_id()
    ));

CREATE POLICY rls_tables ON tables
    FOR ALL USING (hall_id IN (
        SELECT h.id FROM halls h
        JOIN branches b ON h.branch_id = b.id
        WHERE b.tenant_id = current_tenant_id()
    ));

CREATE POLICY rls_categories ON categories
    FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY rls_suppliers ON suppliers
    FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY rls_ingredients ON ingredients
    FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY rls_menu_items ON menu_items
    FOR ALL USING (category_id IN (
        SELECT id FROM categories WHERE tenant_id = current_tenant_id()
    ));

CREATE POLICY rls_menu_item_extras ON menu_item_extras
    FOR ALL USING (menu_item_id IN (
        SELECT mi.id FROM menu_items mi
        JOIN categories c ON mi.category_id = c.id
        WHERE c.tenant_id = current_tenant_id()
    ));

CREATE POLICY rls_menu_item_ingredients ON menu_item_ingredients
    FOR ALL USING (menu_item_id IN (
        SELECT mi.id FROM menu_items mi
        JOIN categories c ON mi.category_id = c.id
        WHERE c.tenant_id = current_tenant_id()
    ));

CREATE POLICY rls_customers_crm ON customers_crm
    FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY rls_coupons ON coupons
    FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY rls_orders ON orders
    FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY rls_order_items ON order_items
    FOR ALL USING (order_id IN (
        SELECT id FROM orders WHERE tenant_id = current_tenant_id()
    ));

CREATE POLICY rls_financial_transactions ON financial_transactions
    FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY rls_employees ON employees
    FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY rls_attendance ON attendance_records
    FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY rls_payroll ON payroll_records
    FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY rls_audit_logs ON audit_logs
    FOR ALL USING (tenant_id = current_tenant_id());

-- قائمة QR المتاحة للعموم (بدون تسجيل دخول)
CREATE POLICY rls_public_menu_items ON menu_items
    FOR SELECT TO anon
    USING (is_available = TRUE AND category_id IN (
        SELECT id FROM categories WHERE is_active = TRUE
    ));

CREATE POLICY rls_public_categories ON categories
    FOR SELECT TO anon USING (is_active = TRUE);

CREATE POLICY rls_public_insert_orders ON orders
    FOR INSERT TO anon WITH CHECK (TRUE);

CREATE POLICY rls_public_insert_order_items ON order_items
    FOR INSERT TO anon WITH CHECK (TRUE);

-- ============================================================
--  VIEWS مفيدة
-- ============================================================

-- لوحة الداشبورد: إحصائيات سريعة لكل فرع
CREATE OR REPLACE VIEW vw_branch_daily_summary AS
SELECT
    o.tenant_id,
    o.branch_id,
    b.name_ar                           AS branch_name_ar,
    b.name_en                           AS branch_name_en,
    DATE(o.created_at)                  AS sale_date,
    COUNT(*)                            AS total_orders,
    SUM(o.total)                        AS total_revenue,
    SUM(o.tax_amount)                   AS total_tax,
    SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_orders,
    SUM(CASE WHEN o.payment_method = 'cash' THEN o.total ELSE 0 END) AS cash_revenue,
    SUM(CASE WHEN o.payment_method = 'card' THEN o.total ELSE 0 END) AS card_revenue
FROM orders o
JOIN branches b ON o.branch_id = b.id
WHERE o.status <> 'cancelled'
GROUP BY o.tenant_id, o.branch_id, b.name_ar, b.name_en, DATE(o.created_at);

-- القائمة الكاملة مع التصنيفات والإضافات
CREATE OR REPLACE VIEW vw_menu_full AS
SELECT
    mi.id,
    mi.name_ar,
    mi.name_en,
    mi.description_ar,
    mi.description_en,
    mi.price,
    mi.image_url,
    mi.is_available,
    c.name_ar   AS category_ar,
    c.name_en   AS category_en,
    c.icon      AS category_icon,
    c.tenant_id,
    COALESCE(
        json_agg(
            json_build_object(
                'id', e.id,
                'nameAr', e.name_ar,
                'nameEn', e.name_en,
                'price', e.price
            )
        ) FILTER (WHERE e.id IS NOT NULL),
        '[]'
    ) AS extras
FROM menu_items mi
JOIN categories c ON mi.category_id = c.id
LEFT JOIN menu_item_extras e ON mi.id = e.menu_item_id AND e.is_active = TRUE
GROUP BY mi.id, c.id;

-- KDS: الطلبات قيد التنفيذ للمطبخ
CREATE OR REPLACE VIEW vw_kds_active_orders AS
SELECT
    o.id,
    o.status,
    o.type,
    o.created_at,
    o.notes,
    t.number    AS table_number,
    h.name_ar   AS hall_ar,
    json_agg(json_build_object(
        'nameAr', oi.name_ar,
        'nameEn', oi.name_en,
        'quantity', oi.quantity,
        'notes', oi.notes,
        'extras', oi.selected_extras
    ) ORDER BY oi.created_at) AS items
FROM orders o
LEFT JOIN tables t  ON o.table_id = t.id
LEFT JOIN halls h   ON o.hall_id = h.id
JOIN order_items oi ON o.id = oi.order_id
WHERE o.status IN ('new','preparing')
GROUP BY o.id, t.number, h.name_ar;

-- المخزون دون الحد الأدنى (تنبيهات)
CREATE OR REPLACE VIEW vw_low_stock_alerts AS
SELECT
    i.id,
    i.tenant_id,
    i.name_ar,
    i.name_en,
    i.stock,
    i.min_stock,
    i.unit_ar,
    i.unit_en,
    i.cost_per_unit,
    s.name        AS supplier_name,
    s.phone       AS supplier_phone,
    (i.min_stock - i.stock) AS deficit
FROM ingredients i
LEFT JOIN suppliers s ON i.supplier_id = s.id
WHERE i.stock <= i.min_stock
ORDER BY deficit DESC;

-- ملخص الرواتب الشهرية لكل tenant
CREATE OR REPLACE VIEW vw_payroll_summary AS
SELECT
    pr.tenant_id,
    pr.month,
    COUNT(*)                AS total_employees,
    SUM(pr.base_salary)     AS total_base,
    SUM(pr.advances)        AS total_advances,
    SUM(pr.deductions)      AS total_deductions,
    SUM(pr.bonuses)         AS total_bonuses,
    SUM(pr.net_paid)        AS total_net,
    COUNT(*) FILTER (WHERE pr.status = 'paid')  AS paid_count,
    COUNT(*) FILTER (WHERE pr.status = 'draft') AS draft_count
FROM payroll_records pr
GROUP BY pr.tenant_id, pr.month;

-- لوحة أدمن المنصة: نظرة عامة عبر كل المطاعم المشتركين (Tenants)
CREATE OR REPLACE VIEW vw_platform_overview AS
SELECT
    t.id                                    AS tenant_id,
    t.name_ar,
    t.name_en,
    t.status,
    t.subscription_plan,
    COUNT(DISTINCT b.id)                    AS branches_count,
    COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') AS active_employees_count,
    COALESCE(SUM(o.total) FILTER (WHERE o.status <> 'cancelled'), 0) AS lifetime_revenue,
    COUNT(o.id) FILTER (WHERE o.status <> 'cancelled')      AS lifetime_orders,
    t.created_at
FROM tenants t
LEFT JOIN branches b   ON b.tenant_id = t.id
LEFT JOIN employees e  ON e.tenant_id = t.id
LEFT JOIN orders o     ON o.tenant_id = t.id
GROUP BY t.id;

-- ============================================================
-- ============================================================
--  CLEAN PRODUCTION INITIAL SEED (البيانات التأسيسية النظيفة للإنتاج)
-- ============================================================

-- 1. أدمن المنصة السيادي (SaaS Platform Super Admin)
-- WARNING: This default super-admin seed is for initial setup only.
-- Change the password immediately after the first production run via the platform admin UI or a direct password update command.
INSERT INTO platform_admins (id, full_name, username, email, password_hash, role, is_active)
VALUES (
  'c0000001-0000-0000-0000-000000000001',
  'المدير العام',
  'odaisayedissa@gmail.com',
  'odaisayedissa@gmail.com',
  crypt('oday2003', gen_salt('bf')),
  'platform_super_admin',
  TRUE
) ON CONFLICT (username) DO NOTHING;

-- 2. المستأجر التأسيسي الرئيسي (Main Tenant)
INSERT INTO tenants (id, name_ar, name_en, email, phone, address, currency_ar, currency_en, tax_percent, service_percent, status, subscription_plan)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'المنصة الرئيسية',
  'Main Platform',
  'synasma9@gmail.com',
  '0500000000',
  'الرياض، المملكة العربية السعودية',
  'ر.س',
  'SAR',
  15.00,
  0.00,
  'active',
  'enterprise'
) ON CONFLICT (id) DO NOTHING;

-- 3. الفرع التأسيسي (Main Branch)
INSERT INTO branches (id, tenant_id, name_ar, name_en, city, address, phone, status)
VALUES (
  'b0000001-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'الفرع الرئيسي',
  'Main Branch',
  'Riyadh',
  'الرياض',
  '0500000000',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- 4. حساب مدير النظام داخل المطعم الرئيسي (Super Admin Employee)
INSERT INTO employees (id, tenant_id, branch_id, name, email, username, password_hash, role, phone, salary, status)
VALUES (
  'e0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'b0000001-0000-0000-0000-000000000001',
  'المدير العام',
  'synasma9@gmail.com',
  'synasma9',
  crypt('Plmoknijb098.', gen_salt('bf')),
  'super_admin',
  '0500000000',
  25000.00,
  'active'
) ON CONFLICT (id) DO NOTHING;
