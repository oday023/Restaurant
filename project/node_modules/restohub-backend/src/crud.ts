import bcrypt from 'bcrypt';
import { query } from './db';

type WhereBuilder = (value: string, addValue: (value: unknown) => string) => string;

type ResourceConfig = {
  table: string;
  idColumns: string[];
  writableColumns: string[];
  filters?: Record<string, WhereBuilder>;
  searchFields?: string[];
  sortableColumns?: string[];
};

const resources: Record<string, ResourceConfig> = {
  tenants: {
    table: 'tenants',
    idColumns: ['id'],
    writableColumns: [
      'id',
      'nameAr',
      'nameEn',
      'logoUrl',
      'email',
      'phone',
      'address',
      'currencyAr',
      'currencyEn',
      'taxPercent',
      'servicePercent',
      'status',
      'subscriptionPlan',
      'createdAt',
    ],
  },
  branches: {
    table: 'branches',
    idColumns: ['id'],
    writableColumns: ['id', 'tenantId', 'nameAr', 'nameEn', 'city', 'address', 'phone', 'status', 'createdAt'],
    filters: {
      tenantId: (value, addValue) => `tenant_id = ${addValue(value)}`,
    },
  },
  halls: {
    table: 'halls',
    idColumns: ['id'],
    writableColumns: ['id', 'branchId', 'nameAr', 'nameEn'],
    filters: {
      branchId: (value, addValue) => `branch_id = ${addValue(value)}`,
    },
  },
  tables: {
    table: 'tables',
    idColumns: ['id'],
    writableColumns: ['id', 'hallId', 'number', 'seats', 'status', 'qrCodeValue', 'activeOrderId'],
    filters: {
      hallId: (value, addValue) => `hall_id = ${addValue(value)}`,
      branchId: (value, addValue) => `hall_id IN (SELECT id FROM halls WHERE branch_id = ${addValue(value)})`,
    },
  },
  categories: {
    table: 'categories',
    idColumns: ['id'],
    writableColumns: ['id', 'tenantId', 'nameAr', 'nameEn', 'icon', 'isActive'],
    filters: {
      tenantId: (value, addValue) => `tenant_id = ${addValue(value)}`,
    },
  },
  suppliers: {
    table: 'suppliers',
    idColumns: ['id'],
    writableColumns: ['id', 'tenantId', 'name', 'contactPerson', 'phone', 'email', 'address'],
    filters: {
      tenantId: (value, addValue) => `tenant_id = ${addValue(value)}`,
    },
  },
  ingredients: {
    table: 'ingredients',
    idColumns: ['id'],
    writableColumns: ['id', 'tenantId', 'nameAr', 'nameEn', 'stock', 'minStock', 'unitAr', 'unitEn', 'costPerUnit', 'supplierId'],
    filters: {
      tenantId: (value, addValue) => `tenant_id = ${addValue(value)}`,
    },
  },
  menu_items: {
    table: 'menu_items',
    idColumns: ['id'],
    writableColumns: ['id', 'categoryId', 'nameAr', 'nameEn', 'descriptionAr', 'descriptionEn', 'price', 'imageUrl', 'isAvailable'],
    filters: {
      categoryId: (value, addValue) => `category_id = ${addValue(value)}`,
      tenantId: (value, addValue) => `category_id IN (SELECT id FROM categories WHERE tenant_id = ${addValue(value)})`,
    },
  },
  menu_item_ingredients: {
    table: 'menu_item_ingredients',
    idColumns: ['menuItemId', 'ingredientId'],
    writableColumns: ['menuItemId', 'ingredientId', 'quantityNeeded'],
    filters: {
      menuItemId: (value, addValue) => `menu_item_id = ${addValue(value)}`,
      ingredientId: (value, addValue) => `ingredient_id = ${addValue(value)}`,
    },
  },
  customers_crm: {
    table: 'customers_crm',
    idColumns: ['id'],
    writableColumns: ['id', 'tenantId', 'name', 'phone', 'email', 'points', 'loyaltyTier', 'ordersCount', 'totalSpent', 'createdAt'],
    filters: {
      tenantId: (value, addValue) => `tenant_id = ${addValue(value)}`,
    },
  },
  coupons: {
    table: 'coupons',
    idColumns: ['id'],
    writableColumns: ['id', 'tenantId', 'code', 'discountPercent', 'maxDiscount', 'minOrderValue', 'expiryDate', 'isActive'],
    filters: {
      tenantId: (value, addValue) => `tenant_id = ${addValue(value)}`,
    },
  },
  orders: {
    table: 'orders',
    idColumns: ['id'],
    writableColumns: [
      'id',
      'tenantId',
      'branchId',
      'tableId',
      'hallId',
      'type',
      'status',
      'subtotal',
      'taxAmount',
      'serviceAmount',
      'discountAmount',
      'total',
      'cashierId',
      'waiterId',
      'customerName',
      'customerPhone',
      'deliveryAddress',
      'paymentMethod',
      'paymentStatus',
      'notes',
      'createdAt',
      'updatedAt',
    ],
    filters: {
      tenantId: (value, addValue) => `tenant_id = ${addValue(value)}`,
      branchId: (value, addValue) => `branch_id = ${addValue(value)}`,
      tableId: (value, addValue) => `table_id = ${addValue(value)}`,
      status: (value, addValue) => `status = ${addValue(value)}`,
    },
  },
  order_items: {
    table: 'order_items',
    idColumns: ['id'],
    writableColumns: ['id', 'orderId', 'menuItemId', 'nameAr', 'nameEn', 'quantity', 'price', 'notes', 'selectedExtras'],
    filters: {
      orderId: (value, addValue) => `order_id = ${addValue(value)}`,
    },
  },
  financial_transactions: {
    table: 'financial_transactions',
    idColumns: ['id'],
    writableColumns: ['id', 'tenantId', 'branchId', 'type', 'categoryAr', 'categoryEn', 'amount', 'descriptionAr', 'descriptionEn', 'date', 'referenceOrderId', 'createdBy'],
    filters: {
      tenantId: (value, addValue) => `tenant_id = ${addValue(value)}`,
      branchId: (value, addValue) => `branch_id = ${addValue(value)}`,
    },
  },
  audit_logs: {
    table: 'audit_logs',
    idColumns: ['id'],
    writableColumns: ['id', 'tenantId', 'username', 'action', 'timestamp', 'ip', 'beforeValue', 'afterValue'],
    filters: {
      tenantId: (value, addValue) => `tenant_id = ${addValue(value)}`,
    },
  },
  payroll_records: {
    table: 'payroll_records',
    idColumns: ['id'],
    writableColumns: ['id', 'tenantId', 'employeeId', 'employeeName', 'role', 'month', 'baseSalary', 'advances', 'deductions', 'bonuses', 'netPaid', 'status', 'updatedAt'],
    filters: {
      tenantId: (value, addValue) => `tenant_id = ${addValue(value)}`,
    },
  },
  employees: {
    table: 'employees',
    idColumns: ['id'],
    writableColumns: ['id', 'tenantId', 'branchId', 'name', 'email', 'role', 'phone', 'salary', 'attendanceHistory', 'performanceRating', 'status', 'username', 'passwordHash'],
    filters: {
      tenantId: (value, addValue) => `tenant_id = ${addValue(value)}`,
      branchId: (value, addValue) => `branch_id = ${addValue(value)}`,
    },
  },
};

const camelToSnake = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();

const toCamelCase = (value: string) => value.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());

const isPlainObject = (value: unknown) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeRow = (row: Record<string, unknown>) => {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    if (['password', 'password_hash', 'passwordHash'].includes(key)) {
      continue;
    }

    const normalizedKey = toCamelCase(key);
    if (normalizedKey === 'passwordHash' || normalizedKey === 'password') {
      continue;
    }

    if (Array.isArray(value)) {
      output[normalizedKey] = value.map((item) => (isPlainObject(item) ? normalizeRow(item as Record<string, unknown>) : item));
    } else if (isPlainObject(value)) {
      output[normalizedKey] = normalizeRow(value as Record<string, unknown>);
    } else {
      output[normalizedKey] = value;
    }
  }

  return output;
};

const getConfig = (resource: string) => {
  const config = resources[resource];
  if (!config) {
    throw new Error(`Unsupported resource: ${resource}`);
  }

  return config;
};

const normalizeEmployeePayload = (payload: Record<string, unknown>) => {
  const nextPayload = { ...payload };

  if (typeof nextPayload.password === 'string' && nextPayload.password.length > 0 && typeof nextPayload.passwordHash !== 'string') {
    nextPayload.passwordHash = bcrypt.hashSync(nextPayload.password, 10);
    delete nextPayload.password;
  }

  return nextPayload;
};

const buildWhere = (resource: ResourceConfig, searchParams: URLSearchParams) => {
  const clauses: string[] = [];
  const values: unknown[] = [];

  const addValue = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };

  for (const [key, value] of searchParams.entries()) {
    if (['page', 'limit', 'sortBy', 'sortOrder', 'search'].includes(key)) continue;
    if (!resource.filters?.[key]) continue;
    clauses.push(resource.filters[key](value, addValue));
  }

  const search = searchParams.get('search')?.trim();
  if (search) {
    const searchFields = resource.searchFields ?? ['nameAr', 'nameEn', 'name', 'code', 'email', 'phone', 'descriptionAr', 'descriptionEn'];
    const searchClauses = searchFields.map((field) => `${camelToSnake(field)} ILIKE ${addValue(`%${search}%`)}`);
    clauses.push(`(${searchClauses.join(' OR ')})`);
  }

  return {
    clause: clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
};

const buildIdClause = (idColumns: string[], values: string[]) => {
  if (idColumns.length !== values.length) {
    throw new Error('Identifier count does not match the resource configuration.');
  }

  return idColumns.map((column, index) => `${column} = $${index + 1}`).join(' AND ');
};

export const listResource = async (resource: string, queryString: URLSearchParams) => {
  const config = getConfig(resource);
  const where = buildWhere(config, queryString);
  const page = Number.parseInt(queryString.get('page') ?? '1', 10);
  const limit = Number.parseInt(queryString.get('limit') ?? '20', 10);
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;
  const offset = (safePage - 1) * safeLimit;
  const sortBy = queryString.get('sortBy')?.trim();
  const sortOrder = queryString.get('sortOrder')?.trim().toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const sortableColumns = config.sortableColumns ?? ['id', 'createdAt', 'updatedAt', 'nameAr', 'nameEn', 'name', 'status', 'price', 'amount', 'total', 'tenantId', 'branchId', 'email', 'phone', 'code', 'month', 'date'];
  const normalizedSortBy = sortBy && sortableColumns.includes(sortBy) ? sortBy : null;
  const orderBy = normalizedSortBy ? `${camelToSnake(normalizedSortBy)} ${sortOrder}` : `${camelToSnake(config.idColumns[0] ?? 'id')} DESC`;

  const result = await query<Record<string, unknown>>(
    `SELECT *, COUNT(*) OVER()::int AS total_count FROM ${config.table}${where.clause} ORDER BY ${orderBy} LIMIT $${where.values.length + 1} OFFSET $${where.values.length + 2}`,
    [...where.values, safeLimit, offset],
  );

  const rows = result.rows as Array<Record<string, unknown> & { total_count?: number }>;
  const total = rows.length > 0 ? rows[0].total_count ?? 0 : 0;
  return {
    data: rows.map((row) => {
      const { total_count, ...rest } = row;
      return normalizeRow(rest);
    }),
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil((total || 1) / safeLimit)),
      sortBy: normalizedSortBy,
      sortOrder: sortOrder.toLowerCase(),
    },
  };
};

export const getResourceById = async (resource: string, idValues: string[]) => {
  const config = getConfig(resource);
  const whereClause = buildIdClause(config.idColumns, idValues);
  const result = await query<Record<string, unknown>>(`SELECT * FROM ${config.table} WHERE ${whereClause} LIMIT 1`, idValues);
  return result.rows[0] ? normalizeRow(result.rows[0]) : null;
};

export const createResource = async (resource: string, payload: Record<string, unknown>) => {
  const config = getConfig(resource);
  const normalizedPayload = resource === 'employees' ? normalizeEmployeePayload(payload) : payload;
  const columns = config.writableColumns.filter((column) => normalizedPayload[column] !== undefined);

  if (columns.length === 0) {
    throw new Error(`No writable fields provided for ${resource}`);
  }

  const values = columns.map((column) => normalizedPayload[column]);
  const columnSql = columns.map(camelToSnake).join(', ');
  const placeholderSql = columns.map((_column, index) => `$${index + 1}`).join(', ');
  const result = await query<Record<string, unknown>>(
    `INSERT INTO ${config.table} (${columnSql}) VALUES (${placeholderSql}) RETURNING *`,
    values,
  );

  return normalizeRow(result.rows[0]);
};

export const updateResource = async (resource: string, idValues: string[], payload: Record<string, unknown>) => {
  const config = getConfig(resource);
  const normalizedPayload = resource === 'employees' ? normalizeEmployeePayload(payload) : payload;
  const columns = config.writableColumns.filter((column) => column !== 'id' && normalizedPayload[column] !== undefined);

  if (columns.length === 0) {
    throw new Error(`No writable fields provided for ${resource}`);
  }

  const values = columns.map((column) => normalizedPayload[column]);
  const setClause = columns.map((column, index) => `${camelToSnake(column)} = $${index + 1}`).join(', ');
  const whereOffset = columns.length;
  const whereClause = config.idColumns
    .map((column, index) => `${column} = $${whereOffset + index + 1}`)
    .join(' AND ');

  const result = await query<Record<string, unknown>>(
    `UPDATE ${config.table} SET ${setClause} WHERE ${whereClause} RETURNING *`,
    [...values, ...idValues],
  );

  return result.rows[0] ? normalizeRow(result.rows[0]) : null;
};

export const deleteResource = async (resource: string, idValues: string[]) => {
  const config = getConfig(resource);
  const whereClause = buildIdClause(config.idColumns, idValues);
  const result = await query<Record<string, unknown>>(
    `DELETE FROM ${config.table} WHERE ${whereClause} RETURNING *`,
    idValues,
  );

  return result.rows[0] ? normalizeRow(result.rows[0]) : null;
};

export const getResources = () => Object.keys(resources);