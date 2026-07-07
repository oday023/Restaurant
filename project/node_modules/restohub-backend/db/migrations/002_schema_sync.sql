CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS menu_item_extras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order SMALLINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  work_date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  employee_id UUID,
  username VARCHAR(255) NOT NULL,
  action TEXT NOT NULL,
  before_value JSONB,
  after_value JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  employee_name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  month VARCHAR(20) NOT NULL,
  base_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  advances DECIMAL(12,2) DEFAULT 0.00,
  deductions DECIMAL(12,2) DEFAULT 0.00,
  bonuses DECIMAL(12,2) DEFAULT 0.00,
  net_paid DECIMAL(12,2),
  status VARCHAR(50) DEFAULT 'draft',
  paid_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE menu_item_extras
  ADD COLUMN IF NOT EXISTS menu_item_id UUID,
  ADD COLUMN IF NOT EXISTS name_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS price DECIMAL(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sort_order SMALLINT DEFAULT 0;

ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS employee_id UUID,
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS work_date DATE,
  ADD COLUMN IF NOT EXISTS check_in TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_out TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'present',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS employee_id UUID,
  ADD COLUMN IF NOT EXISTS username VARCHAR(255),
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS before_value JSONB,
  ADD COLUMN IF NOT EXISTS after_value JSONB,
  ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50),
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS ip VARCHAR(50);

UPDATE audit_logs
SET timestamp = COALESCE(timestamp, created_at, NOW())
WHERE timestamp IS NULL AND created_at IS NOT NULL;

UPDATE audit_logs
SET ip = COALESCE(ip, ip_address)
WHERE ip IS NULL AND ip_address IS NOT NULL;

ALTER TABLE payroll_records
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS employee_id UUID,
  ADD COLUMN IF NOT EXISTS employee_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS role VARCHAR(100),
  ADD COLUMN IF NOT EXISTS month VARCHAR(20),
  ADD COLUMN IF NOT EXISTS base_salary DECIMAL(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS advances DECIMAL(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS deductions DECIMAL(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS bonuses DECIMAL(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS net_paid DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'menu_item_extras'
      AND constraint_name = 'fk_menu_item_extras_menu_item'
  ) THEN
    ALTER TABLE menu_item_extras
      ADD CONSTRAINT fk_menu_item_extras_menu_item
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'attendance_records'
      AND constraint_name = 'fk_attendance_records_employee'
  ) THEN
    ALTER TABLE attendance_records
      ADD CONSTRAINT fk_attendance_records_employee
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'attendance_records'
      AND constraint_name = 'fk_attendance_records_tenant'
  ) THEN
    ALTER TABLE attendance_records
      ADD CONSTRAINT fk_attendance_records_tenant
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'audit_logs'
      AND constraint_name = 'fk_audit_logs_tenant'
  ) THEN
    ALTER TABLE audit_logs
      ADD CONSTRAINT fk_audit_logs_tenant
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'audit_logs'
      AND constraint_name = 'fk_audit_logs_employee'
  ) THEN
    ALTER TABLE audit_logs
      ADD CONSTRAINT fk_audit_logs_employee
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'payroll_records'
      AND constraint_name = 'fk_payroll_records_tenant'
  ) THEN
    ALTER TABLE payroll_records
      ADD CONSTRAINT fk_payroll_records_tenant
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'payroll_records'
      AND constraint_name = 'fk_payroll_records_employee'
  ) THEN
    ALTER TABLE payroll_records
      ADD CONSTRAINT fk_payroll_records_employee
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'orders'
      AND constraint_name = 'fk_orders_cashier_employee'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT fk_orders_cashier_employee
      FOREIGN KEY (cashier_id) REFERENCES employees(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'orders'
      AND constraint_name = 'fk_orders_waiter_employee'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT fk_orders_waiter_employee
      FOREIGN KEY (waiter_id) REFERENCES employees(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'financial_transactions'
      AND constraint_name = 'fk_financial_transactions_created_by'
  ) THEN
    ALTER TABLE financial_transactions
      ADD CONSTRAINT fk_financial_transactions_created_by
      FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_menu_item_extras_menu_item_id ON menu_item_extras(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_id ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_tenant_date ON attendance_records(tenant_id, work_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created_at ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_records_employee_month ON payroll_records(employee_id, month);
CREATE INDEX IF NOT EXISTS idx_orders_cashier_id ON orders(cashier_id);
CREATE INDEX IF NOT EXISTS idx_orders_waiter_id ON orders(waiter_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON financial_transactions(created_by);
