import path from 'path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { closeDatabasePool, isDatabaseConfigured, query, testDatabaseConnection } from './db';
import { createResource, deleteResource, getResourceById, getResources, listResource, updateResource } from './crud';
import { loadEnvironment, validateStartupEnvironment } from './env';

loadEnvironment();

const { port, jwtSecret, nodeEnv, corsOrigins, refreshTokenTtlSeconds, passwordResetTokenTtlSeconds, authRateLimitMax, apiRateLimitMax } = validateStartupEnvironment();
const isProduction = nodeEnv === 'production';
const revokedTokens = new Set<string>();
const bootstrapAdminPassword = process.env.RESTOHUB_BOOTSTRAP_ADMIN_PASSWORD?.trim();
const bootstrapAdminEmail = process.env.RESTOHUB_BOOTSTRAP_ADMIN_EMAIL?.trim() ?? 'admin@restohub.local';
const bootstrapAdminUsername = process.env.RESTOHUB_BOOTSTRAP_ADMIN_USERNAME?.trim() ?? 'admin';
const authTokenTtlSeconds = Number.parseInt(process.env.JWT_TTL_SECONDS ?? '43200', 10);
const authTokenIssuer = process.env.JWT_ISSUER?.trim() ?? 'restohub';
const authTokenAudience = process.env.JWT_AUDIENCE?.trim() ?? 'restohub-client';
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
const refreshTokenStore = new Map<string, { employeeId: string; expiresAt: number }>();
const passwordResetTokens = new Map<string, { employeeId: string; expiresAt: number }>();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
export const createApp = () => app;

type AuthenticatedRequest = Request & {
  user?: {
    employeeId: string;
    tenantId: string;
    branchId?: string;
    role: string;
    username: string;
  };
  tokenId?: string;
};

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
  frameguard: { action: 'deny' },
}));
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: apiRateLimitMax, standardHeaders: true, legacyHeaders: false, message: { status: 'error', message: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' } }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use((request, response, next) => {
  if (request.path.startsWith('/api')) {
    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.setHeader('Pragma', 'no-cache');
  }
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'same-origin');
  response.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  if (isProduction) {
    response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

const staticDir = process.env.NODE_ENV === 'production' ? path.join(__dirname, '..', 'dist') : null;

if (staticDir) {
  app.use(express.static(staticDir, {
    maxAge: isProduction ? '1d' : 0,
    immutable: isProduction,
  }));
}

const toCamelCase = (value: string) => value.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());

const isPlainObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const sendError = (response: Response, status: number, message: string, code = 'REQUEST_ERROR') => {
  response.status(status).json({ status: 'error', message, code });
};

const sanitizeString = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  return value.replace(/[<>]/g, '').trim();
};

const sanitizePayload = (payload: Record<string, unknown>) => {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (key === 'password' || key === 'passwordHash' || key === 'password_hash' || key === 'token' || key === 'refreshToken') {
      sanitized[key] = value;
      continue;
    }

    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value) ?? '';
    } else if (Array.isArray(value)) {
      sanitized[key] = value.filter((item) => typeof item !== 'string' || sanitizeString(item) !== undefined);
    } else if (isPlainObject(value)) {
      sanitized[key] = sanitizePayload(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

const getValidatedPayload = (request: Request, response: Response) => {
  if (request.body == null || request.body === '') {
    return {} as Record<string, unknown>;
  }

  if (!isPlainObject(request.body)) {
    sendError(response, 400, 'Request body must be a JSON object.', 'INVALID_BODY');
    return null;
  }

  const sanitizedPayload = sanitizePayload(request.body);
  return sanitizedPayload;
};

const validateListQuery = (request: Request, response: Response) => {
  const page = request.query.page;
  const limit = request.query.limit;
  const sortOrder = request.query.sortOrder;

  if (page != null && (typeof page !== 'string' || !/^\d+$/.test(page) || Number(page) < 1)) {
    sendError(response, 400, 'Page must be a positive integer.', 'INVALID_PAGE');
    return false;
  }

  if (limit != null && (typeof limit !== 'string' || !/^\d+$/.test(limit) || Number(limit) < 1 || Number(limit) > 100)) {
    sendError(response, 400, 'Limit must be between 1 and 100.', 'INVALID_LIMIT');
    return false;
  }

  if (sortOrder != null && typeof sortOrder === 'string' && !['asc', 'desc'].includes(sortOrder.toLowerCase())) {
    sendError(response, 400, 'sortOrder must be either asc or desc.', 'INVALID_SORT_ORDER');
    return false;
  }

  return true;
};

const normalizeRole = (role: string | undefined) => {
  const normalized = String(role ?? '').trim().toLowerCase().replace(/\s+/g, '_');
  switch (normalized) {
    case 'super_admin':
    case 'super-admin':
    case 'super admin':
      return 'super_admin';
    case 'company_owner':
    case 'owner':
      return 'owner';
    case 'branch_manager':
    case 'branch-manager':
    case 'manager':
      return 'manager';
    case 'hr':
    case 'hr_manager':
    case 'hr-manager':
    case 'human_resources':
      return 'hr';
    case 'inventory_manager':
    case 'inventory-manager':
      return 'inventory_manager';
    case 'accountant':
      return 'accountant';
    case 'cashier':
      return 'cashier';
    case 'kitchen':
      return 'kitchen';
    case 'waiter':
      return 'waiter';
    case 'customer':
      return 'customer';
    default:
      return 'other';
  }
};

const normalizeEmployeeRow = (row: Record<string, unknown>) => ({
  id: String(row.id ?? ''),
  tenantId: String(row.tenant_id ?? row.tenantId ?? ''),
  branchId: String(row.branch_id ?? row.branchId ?? ''),
  name: String(row.name ?? ''),
  email: String(row.email ?? ''),
  role: String(row.role ?? 'other'),
  phone: String(row.phone ?? ''),
  salary: Number(row.salary ?? 0),
  attendanceHistory: Array.isArray(row.attendance_history) ? row.attendance_history : [],
  performanceRating: Number(row.performance_rating ?? 5),
  status: String(row.status ?? 'active') as 'active' | 'suspended',
  username: String(row.username ?? row.email ?? ''),
  password: undefined,
});

const recordAuditLog = async (request: Request, action: string, beforeValue?: unknown, afterValue?: unknown, employeeId?: string) => {
  try {
    const tenantId = (request as AuthenticatedRequest).user?.tenantId ?? null;
    const username = (request as AuthenticatedRequest).user?.username ?? 'system';
    const ipAddress = request.ip || request.headers['x-forwarded-for']?.toString().split(',')[0] || 'unknown';
    const userAgent = request.get('user-agent') || 'unknown';

    await query(
      `INSERT INTO audit_logs (tenant_id, employee_id, username, action, before_value, after_value, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [tenantId, employeeId ?? null, username, action, JSON.stringify(beforeValue ?? null), JSON.stringify(afterValue ?? null), ipAddress, userAgent],
    );
  } catch {
    // audit logging must never break the main request flow
  }
};

const enforceLoginThrottle = (request: Request, response: Response) => {
  const key = request.ip || 'unknown';
  const now = Date.now();
  const state = loginAttempts.get(key);

  if (!state) {
    loginAttempts.set(key, { count: 1, firstAttempt: now });
    return true;
  }

  if (now - state.firstAttempt > 15 * 60 * 1000) {
    loginAttempts.set(key, { count: 1, firstAttempt: now });
    return true;
  }

  if (state.count >= authRateLimitMax) {
    sendError(response, 429, 'Too many authentication attempts. Please try again later.', 'AUTH_RATE_LIMITED');
    return false;
  }

  loginAttempts.set(key, { count: state.count + 1, firstAttempt: state.firstAttempt });
  return true;
};

const clearLoginThrottle = (request: Request) => {
  const key = request.ip || 'unknown';
  loginAttempts.delete(key);
};

const getCookieValue = (request: Request, cookieName: string) => {
  const rawCookie = request.get('cookie') ?? '';
  const match = rawCookie.split(';').map((value) => value.trim()).find((value) => value.startsWith(`${cookieName}=`));
  if (!match) {
    return undefined;
  }

  return decodeURIComponent(match.slice(cookieName.length + 1));
};

const createSignedToken = (payload: Record<string, unknown>, ttlSeconds: number) => jwt.sign(payload, jwtSecret, {
  expiresIn: ttlSeconds,
  issuer: authTokenIssuer,
  audience: authTokenAudience,
});

const authenticateToken = async (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
  const header = request.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    sendError(response, 401, 'Authentication token missing', 'AUTH_REQUIRED');
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret, {
      issuer: authTokenIssuer,
      audience: authTokenAudience,
    }) as Record<string, unknown>;
    if (!decoded || typeof decoded !== 'object' || typeof decoded.employeeId !== 'string') {
      throw new Error('Invalid token payload');
    }

    const tokenId = typeof decoded.jti === 'string' ? decoded.jti : undefined;
    if (tokenId && revokedTokens.has(tokenId)) {
      sendError(response, 401, 'Authentication session has been revoked.', 'TOKEN_REVOKED');
      return;
    }

    request.user = {
      employeeId: String(decoded.employeeId),
      tenantId: String(decoded.tenantId ?? ''),
      branchId: decoded.branchId ? String(decoded.branchId) : undefined,
      role: normalizeRole(String(decoded.role ?? 'other')),
      username: String(decoded.username ?? ''),
    };
    request.tokenId = tokenId;
    next();
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      sendError(response, 401, 'Authentication token has expired.', 'TOKEN_EXPIRED');
      return;
    }

    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      sendError(response, 401, 'Authentication token is invalid.', 'TOKEN_INVALID');
      return;
    }

    sendError(response, 401, 'Authentication failed.', 'AUTH_FAILED');
  }
};

const ROLE_PERMISSIONS: Record<string, Record<'read' | 'create' | 'update' | 'delete', string[]>> = {
  super_admin: {
    read: ['*'],
    create: ['*'],
    update: ['*'],
    delete: ['*'],
  },
  owner: {
    read: ['*'],
    create: ['*'],
    update: ['*'],
    delete: ['*'],
  },
  manager: {
    read: ['*'],
    create: ['categories', 'menu_items', 'suppliers', 'ingredients', 'orders', 'tables', 'customers_crm', 'coupons', 'halls', 'branches', 'employees', 'payroll_records'],
    update: ['categories', 'menu_items', 'suppliers', 'ingredients', 'orders', 'tables', 'customers_crm', 'coupons', 'halls', 'branches', 'employees', 'payroll_records'],
    delete: ['categories', 'menu_items', 'suppliers', 'ingredients', 'orders', 'tables', 'customers_crm', 'coupons', 'halls', 'branches'],
  },
  accountant: {
    read: ['financial_transactions', 'orders', 'branches', 'tenants', 'employees'],
    create: ['financial_transactions'],
    update: ['financial_transactions'],
    delete: [],
  },
  cashier: {
    read: ['orders', 'customers_crm', 'menu_items', 'categories', 'tables'],
    create: ['orders', 'customers_crm'],
    update: ['orders', 'customers_crm'],
    delete: [],
  },
  waiter: {
    read: ['orders', 'customers_crm', 'menu_items', 'categories', 'tables'],
    create: ['orders', 'customers_crm'],
    update: ['orders', 'customers_crm'],
    delete: [],
  },
  kitchen: {
    read: ['orders', 'order_items', 'menu_items', 'categories', 'tables'],
    create: [],
    update: ['orders'],
    delete: [],
  },
  inventory_manager: {
    read: ['suppliers', 'ingredients', 'menu_items', 'categories', 'orders'],
    create: ['suppliers', 'ingredients', 'menu_items', 'categories'],
    update: ['suppliers', 'ingredients', 'menu_items', 'categories'],
    delete: ['suppliers', 'ingredients', 'menu_items', 'categories'],
  },
  hr: {
    read: ['employees', 'payroll_records', 'branches'],
    create: ['employees', 'payroll_records'],
    update: ['employees', 'payroll_records'],
    delete: [],
  },
  customer: {
    read: ['menu_items', 'categories', 'orders', 'customers_crm'],
    create: ['orders', 'customers_crm'],
    update: ['orders', 'customers_crm'],
    delete: [],
  },
  other: {
    read: [],
    create: [],
    update: [],
    delete: [],
  },
};

const hasPermission = (role: string, action: 'read' | 'create' | 'update' | 'delete', resource: string) => {
  const permissions = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.other;
  const allowed = permissions[action];
  return allowed.includes('*') || allowed.includes(resource);
};

const ensureResourceAuthorization = (request: AuthenticatedRequest, response: Response, resource: string, action: 'read' | 'create' | 'update' | 'delete') => {
  const role = normalizeRole(request.user?.role);
  if (!hasPermission(role, action, resource)) {
    response.status(403).json({ status: 'error', message: 'Access denied for this resource or action.' });
    return false;
  }

  return true;
};

const applyTenantScope = (request: AuthenticatedRequest, resource: string, body?: Record<string, unknown>) => {
  if (!body) return;
  const actorRole = normalizeRole(request.user?.role);
  if (actorRole === 'super_admin' || actorRole === 'owner') {
    return;
  }

  const tenantId = request.user?.tenantId;
  if (!tenantId) {
    throw new Error('Authenticated user missing tenant context');
  }

  const tenantResources = ['branches', 'halls', 'tables', 'categories', 'suppliers', 'ingredients', 'menu_items', 'menu_item_ingredients', 'customers_crm', 'coupons', 'orders', 'order_items', 'financial_transactions', 'employees', 'payroll_records'];
  if (tenantResources.includes(resource)) {
    delete body.tenantId;
    body.tenantId = tenantId;
  }

  const branchResources = ['halls', 'tables', 'orders', 'financial_transactions', 'employees'];
  if (branchResources.includes(resource) && request.user?.branchId) {
    delete body.branchId;
    body.branchId = request.user.branchId;
  }
};

const enforceRoleAssignmentPolicy = (request: AuthenticatedRequest, resource: string, body?: Record<string, unknown>) => {
  if (!body || resource !== 'employees') {
    return;
  }

  const actorRole = normalizeRole(request.user?.role);
  const incomingRole = typeof body.role === 'string' ? normalizeRole(body.role) : undefined;
  if (!incomingRole) {
    return;
  }

  if (actorRole !== 'super_admin' && actorRole !== 'owner') {
    delete body.role;
    return;
  }

  if (incomingRole === 'super_admin' || incomingRole === 'owner') {
    if (actorRole !== 'super_admin') {
      throw new Error('Only super admin can assign privileged roles.');
    }
  }
};

const authenticateOrDeny = async (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
  if (request.path === '/auth/login' || request.path === '/health' || request.path === '/db/test' || request.path === '/resources' || request.path.startsWith('/auth/password-reset')) {
    next();
    return;
  }
  await authenticateToken(request, response, next);
};

const ensureDefaultAuthSeed = async () => {
  if (isProduction || !bootstrapAdminPassword) {
    return;
  }

  try {
    const existing = await query<{ id: string }>('SELECT id FROM employees WHERE username = $1 OR email = $2 LIMIT 1', [bootstrapAdminUsername, bootstrapAdminEmail]);
    if (existing.rows[0]) {
      const passwordHash = await bcrypt.hash(bootstrapAdminPassword, 12);
      await query('UPDATE employees SET password_hash = $1 WHERE id = $2', [passwordHash, existing.rows[0].id]);
      return;
    }

    let tenantId = '';
    const tenantResult = await query<{ id: string }>('SELECT id FROM tenants LIMIT 1');
    if (tenantResult.rows[0]) {
      tenantId = tenantResult.rows[0].id;
    } else {
      const insertedTenant = await query<{ id: string }>(
        `INSERT INTO tenants (name_ar, name_en, email, phone, currency_ar, currency_en, status, subscription_plan, address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        ['افتراضي', 'Default Restaurant', 'info@restohub.local', '0500000000', 'ر.س', 'SAR', 'active', 'pro', '']
      );
      tenantId = insertedTenant.rows[0]?.id ?? '';
    }

    if (!tenantId) {
      return;
    }

    let branchId = '';
    const branchResult = await query<{ id: string }>('SELECT id FROM branches WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    if (branchResult.rows[0]) {
      branchId = branchResult.rows[0].id;
    } else {
      const insertedBranch = await query<{ id: string }>(
        `INSERT INTO branches (tenant_id, name_ar, name_en, city, address, phone, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [tenantId, 'الفرع الافتراضي', 'Default Branch', 'Riyadh', '', '0500000000', 'active']
      );
      branchId = insertedBranch.rows[0]?.id ?? '';
    }

    if (!branchId) {
      return;
    }

    await query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS attendance_history JSONB DEFAULT NULL');
    await query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS performance_rating DECIMAL(3,2) DEFAULT 5.00');
    await query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS username VARCHAR(100)');
    await query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS password_hash TEXT');

    const passwordHash = await bcrypt.hash(bootstrapAdminPassword, 12);
    await query(
      `INSERT INTO employees (tenant_id, branch_id, name, email, role, phone, salary, status, username, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [tenantId, branchId, 'Super Admin', bootstrapAdminEmail, 'super_admin', '0500000000', 25000, 'active', bootstrapAdminUsername, passwordHash],
    );
  } catch (error) {
    console.warn('Default auth seed skipped:', error);
  }
};

app.use('/api', authenticateOrDeny);

app.get('/api/resources', (_request, response) => {
  response.json({ resources: getResources() });
});

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    databaseConfigured: isDatabaseConfigured(),
  });
});

app.get('/api/db/test', async (_request, response) => {
  try {
    const result = await testDatabaseConnection();
    response.json({
      status: 'ok',
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown PostgreSQL connection error';
    response.status(500).json({
      status: 'error',
      message,
    });
  }
});

app.post('/api/auth/login', async (request, response) => {
  try {
    const payload = getValidatedPayload(request, response);
    if (!payload) {
      return;
    }

    if (!enforceLoginThrottle(request, response)) {
      return;
    }

    const username = typeof payload.username === 'string' ? payload.username.trim() : '';
    const password = typeof payload.password === 'string' ? payload.password.trim() : '';
    if (!username || !password) {
      sendError(response, 400, 'Username and password are required.', 'INVALID_CREDENTIALS');
      return;
    }

    const result = await query<Record<string, unknown>>(
      `SELECT id, tenant_id, branch_id, name, email, role, phone, salary, attendance_history, performance_rating, status, username, password_hash
       FROM employees WHERE username = $1 OR email = $1 LIMIT 1`,
      [username],
    );

    const row = result.rows[0];
    const storedHash = typeof row?.password_hash === 'string' ? row.password_hash : null;
    if (!row || !storedHash) {
      await recordAuditLog(request, 'LOGIN_FAILED', null, { username }, undefined);
      response.status(401).json({ status: 'error', message: 'Invalid username or password.' });
      return;
    }

    const passwordOk = await bcrypt.compare(password, storedHash);
    if (!passwordOk) {
      await recordAuditLog(request, 'LOGIN_FAILED', null, { username }, String(row.id));
      response.status(401).json({ status: 'error', message: 'Invalid username or password.' });
      return;
    }

    const employee = normalizeEmployeeRow(row);
    const accessToken = createSignedToken({
      jti: randomUUID(),
      employeeId: employee.id,
      tenantId: employee.tenantId,
      branchId: employee.branchId,
      role: employee.role,
      username: employee.username,
    }, authTokenTtlSeconds);
    const refreshToken = randomUUID();
    refreshTokenStore.set(refreshToken, {
      employeeId: employee.id,
      expiresAt: Date.now() + refreshTokenTtlSeconds * 1000,
    });

    clearLoginThrottle(request);
    await recordAuditLog(request, 'LOGIN_SUCCESS', null, { username: employee.username }, employee.id);

    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: refreshTokenTtlSeconds * 1000,
      path: '/',
    });

    response.json({
      token: accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + authTokenTtlSeconds * 1000).toISOString(),
      user: employee,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown auth error';
    sendError(response, 500, 'Authentication failed. Please try again later.', 'AUTH_FAILED');
    console.error('Authentication failed:', message);
  }
});

app.post('/api/auth/logout', authenticateToken, async (request: AuthenticatedRequest, response: Response) => {
  if (request.tokenId) {
    revokedTokens.add(request.tokenId);
  }

  const refreshToken = request.cookies?.refreshToken;
  if (typeof refreshToken === 'string') {
    refreshTokenStore.delete(refreshToken);
  }

  response.clearCookie('refreshToken', { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' });
  await recordAuditLog(request as Request, 'LOGOUT', null, { revokedToken: Boolean(request.tokenId) }, request.user?.employeeId);
  response.json({ status: 'ok', message: 'Session revoked.' });
});

app.post('/api/auth/refresh', async (request: AuthenticatedRequest, response: Response) => {
  const refreshToken = getCookieValue(request, 'refreshToken') || (typeof request.body?.refreshToken === 'string' ? request.body.refreshToken : undefined);
  if (typeof refreshToken !== 'string' || !refreshToken) {
    sendError(response, 401, 'Refresh token missing.', 'REFRESH_TOKEN_MISSING');
    return;
  }

  const tokenRecord = refreshTokenStore.get(refreshToken);
  if (!tokenRecord || tokenRecord.expiresAt < Date.now()) {
    refreshTokenStore.delete(refreshToken);
    sendError(response, 401, 'Refresh token expired or invalid.', 'REFRESH_TOKEN_INVALID');
    return;
  }

  const result = await query<Record<string, unknown>>(
    `SELECT id, tenant_id, branch_id, name, email, role, phone, salary, attendance_history, performance_rating, status, username, password_hash FROM employees WHERE id = $1 LIMIT 1`,
    [tokenRecord.employeeId],
  );

  const row = result.rows[0];
  if (!row) {
    refreshTokenStore.delete(refreshToken);
    sendError(response, 401, 'User no longer exists.', 'USER_NOT_FOUND');
    return;
  }

  const employee = normalizeEmployeeRow(row);
  const accessToken = createSignedToken({ jti: randomUUID(), employeeId: employee.id, tenantId: employee.tenantId, branchId: employee.branchId, role: employee.role, username: employee.username }, authTokenTtlSeconds);
  response.json({ token: accessToken, expiresAt: new Date(Date.now() + authTokenTtlSeconds * 1000).toISOString(), user: employee });
});

app.post('/api/auth/password-reset/request', async (request: Request, response: Response) => {
  try {
    const payload = getValidatedPayload(request, response);
    if (!payload) return;
    const email = sanitizeString(payload.email);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      sendError(response, 400, 'A valid email address is required.', 'INVALID_EMAIL');
      return;
    }

    const result = await query<Record<string, unknown>>('SELECT id FROM employees WHERE email = $1 LIMIT 1', [email]);
    if (result.rows[0]) {
      const token = randomUUID();
      passwordResetTokens.set(token, { employeeId: String(result.rows[0].id), expiresAt: Date.now() + passwordResetTokenTtlSeconds * 1000 });
      await recordAuditLog(request, 'PASSWORD_RESET_REQUESTED', null, { email }, String(result.rows[0].id));
    }

    response.status(202).json({ status: 'ok', message: 'If the address exists, a reset link has been sent.' });
  } catch {
    sendError(response, 500, 'Password reset request failed.', 'PASSWORD_RESET_FAILED');
  }
});

app.post('/api/auth/password-reset/confirm', async (request: Request, response: Response) => {
  try {
    const payload = getValidatedPayload(request, response);
    if (!payload) return;
    const token = sanitizeString(payload.token);
    const password = typeof payload.password === 'string' ? payload.password : '';

    if (!token || password.length < 8) {
      sendError(response, 400, 'A valid reset token and password are required.', 'INVALID_RESET');
      return;
    }

    const resetEntry = passwordResetTokens.get(token);
    if (!resetEntry || resetEntry.expiresAt < Date.now()) {
      passwordResetTokens.delete(token);
      sendError(response, 401, 'Password reset token is invalid or expired.', 'RESET_TOKEN_INVALID');
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await query('UPDATE employees SET password_hash = $1 WHERE id = $2', [passwordHash, resetEntry.employeeId]);
    passwordResetTokens.delete(token);
    await recordAuditLog(request, 'PASSWORD_RESET_CONFIRMED', null, { employeeId: resetEntry.employeeId }, resetEntry.employeeId);
    response.json({ status: 'ok', message: 'Password updated successfully.' });
  } catch {
    sendError(response, 500, 'Password reset confirmation failed.', 'PASSWORD_RESET_FAILED');
  }
});

app.get('/api/auth/me', authenticateToken, async (request: AuthenticatedRequest, response) => {
  try {
    const result = await query<Record<string, unknown>>(
      `SELECT id, tenant_id, branch_id, name, email, role, phone, salary, attendance_history, performance_rating, status, username, password_hash
       FROM employees WHERE id = $1 LIMIT 1`,
      [request.user?.employeeId],
    );

    if (!result.rows[0]) {
      sendError(response, 404, 'Employee not found', 'USER_NOT_FOUND');
      return;
    }

    response.json({ user: normalizeEmployeeRow(result.rows[0]) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown auth error';
    sendError(response, 500, message, 'AUTH_FAILED');
  }
});

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(port, () => {
    console.log(`PostgreSQL bridge server running on http://localhost:${port}`);
    void ensureDefaultAuthSeed();
  });

  const shutdown = async () => {
    server.close();
    await closeDatabasePool();
  };

  process.on('SIGINT', () => {
    void shutdown().finally(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    void shutdown().finally(() => process.exit(0));
  });
}

app.get('/api/menu_item_ingredients/:menuItemId/:ingredientId', async (request: AuthenticatedRequest, response: Response) => {
  try {
    if (!ensureResourceAuthorization(request, response, 'menu_item_ingredients', 'read')) {
      return;
    }

    const row = await getResourceById('menu_item_ingredients', [request.params.menuItemId, request.params.ingredientId]);
    if (!row) {
      sendError(response, 404, 'Row not found', 'ROW_NOT_FOUND');
      return;
    }

    response.json(row);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown read error';
    sendError(response, 400, message, 'READ_FAILED');
  }
});

app.put('/api/menu_item_ingredients/:menuItemId/:ingredientId', async (request: AuthenticatedRequest, response: Response) => {
  try {
    if (!ensureResourceAuthorization(request, response, 'menu_item_ingredients', 'update')) {
      return;
    }

    const payload = getValidatedPayload(request, response);
    if (!payload) {
      return;
    }

    applyTenantScope(request, 'menu_item_ingredients', payload);
    const row = await updateResource('menu_item_ingredients', [request.params.menuItemId, request.params.ingredientId], payload);
    if (!row) {
      sendError(response, 404, 'Row not found', 'ROW_NOT_FOUND');
      return;
    }

    response.json(row);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown update error';
    sendError(response, 400, message, 'UPDATE_FAILED');
  }
});

app.delete('/api/menu_item_ingredients/:menuItemId/:ingredientId', async (request: AuthenticatedRequest, response: Response) => {
  try {
    if (!ensureResourceAuthorization(request, response, 'menu_item_ingredients', 'delete')) {
      return;
    }

    const row = await deleteResource('menu_item_ingredients', [request.params.menuItemId, request.params.ingredientId]);
    if (!row) {
      sendError(response, 404, 'Row not found', 'ROW_NOT_FOUND');
      return;
    }

    response.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown delete error';
    sendError(response, 400, message, 'DELETE_FAILED');
  }
});

app.get('/api/:resource', async (request: AuthenticatedRequest, response: Response) => {
  try {
    const resource = request.params.resource;
    if (!getResources().includes(resource)) {
      sendError(response, 404, 'Resource not found.', 'RESOURCE_NOT_FOUND');
      return;
    }

    if (!ensureResourceAuthorization(request, response, resource, 'read')) {
      return;
    }

    if (!validateListQuery(request, response)) {
      return;
    }

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(request.query)) {
      if (typeof value === 'string') {
        searchParams.set(key, value);
      }
    }

    if (request.user?.role !== 'super_admin' && request.user?.role !== 'owner' && !searchParams.has('tenantId')) {
      searchParams.set('tenantId', request.user?.tenantId ?? '');
    }

    if (request.user?.role !== 'super_admin' && request.user?.role !== 'owner' && request.user?.branchId && ['halls', 'tables', 'orders', 'financial_transactions', 'employees'].includes(resource) && !searchParams.has('branchId')) {
      searchParams.set('branchId', request.user.branchId);
    }

    const result = await listResource(resource, searchParams);
    response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown read error';
    sendError(response, 400, message, 'READ_FAILED');
  }
});

app.get('/api/:resource/:id', async (request: AuthenticatedRequest, response: Response) => {
  try {
    const resource = request.params.resource;
    if (!getResources().includes(resource)) {
      sendError(response, 404, 'Resource not found.', 'RESOURCE_NOT_FOUND');
      return;
    }

    if (!ensureResourceAuthorization(request, response, resource, 'read')) {
      return;
    }

    const row = await getResourceById(resource, [request.params.id]);
    if (!row) {
      sendError(response, 404, 'Row not found', 'ROW_NOT_FOUND');
      return;
    }

    if (request.user?.role !== 'super_admin' && request.user?.role !== 'owner' && typeof row.tenantId === 'string' && request.user?.tenantId !== row.tenantId) {
      sendError(response, 403, 'Access denied for this resource.', 'FORBIDDEN');
      return;
    }

    if (request.user?.role !== 'super_admin' && request.user?.role !== 'owner' && typeof row.branchId === 'string' && request.user?.branchId && request.user.branchId !== row.branchId) {
      sendError(response, 403, 'Access denied for this branch.', 'FORBIDDEN');
      return;
    }

    response.json(row);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown read error';
    sendError(response, 400, message, 'READ_FAILED');
  }
});

if (staticDir) {
  app.get('*', (_request, response) => {
    response.sendFile(path.join(staticDir, 'index.html'));
  });
}

app.post('/api/:resource', async (request: AuthenticatedRequest, response: Response) => {
  try {
    const resource = request.params.resource;
    if (!getResources().includes(resource)) {
      sendError(response, 404, 'Resource not found.', 'RESOURCE_NOT_FOUND');
      return;
    }

    if (!ensureResourceAuthorization(request, response, resource, 'create')) {
      return;
    }

    const payload = getValidatedPayload(request, response);
    if (!payload) {
      return;
    }

    enforceRoleAssignmentPolicy(request, resource, payload);
    applyTenantScope(request, resource, payload);
    const row = await createResource(resource, payload);
    response.status(201).json(row);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown create error';
    sendError(response, 400, message, 'CREATE_FAILED');
  }
});

app.put('/api/:resource/:id', async (request: AuthenticatedRequest, response: Response) => {
  try {
    const resource = request.params.resource;
    if (!getResources().includes(resource)) {
      sendError(response, 404, 'Resource not found.', 'RESOURCE_NOT_FOUND');
      return;
    }

    if (!ensureResourceAuthorization(request, response, resource, 'update')) {
      return;
    }

    const payload = getValidatedPayload(request, response);
    if (!payload) {
      return;
    }

    enforceRoleAssignmentPolicy(request, resource, payload);
    applyTenantScope(request, resource, payload);
    const row = await updateResource(resource, [request.params.id], payload);
    if (!row) {
      sendError(response, 404, 'Row not found', 'ROW_NOT_FOUND');
      return;
    }

    response.json(row);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown update error';
    sendError(response, 400, message, 'UPDATE_FAILED');
  }
});

app.delete('/api/:resource/:id', async (request: AuthenticatedRequest, response: Response) => {
  try {
    const resource = request.params.resource;
    if (!getResources().includes(resource)) {
      sendError(response, 404, 'Resource not found.', 'RESOURCE_NOT_FOUND');
      return;
    }

    if (!ensureResourceAuthorization(request, response, resource, 'delete')) {
      return;
    }

    const row = await getResourceById(resource, [request.params.id]);
    if (!row) {
      sendError(response, 404, 'Row not found', 'ROW_NOT_FOUND');
      return;
    }

    if (request.user?.role !== 'super_admin' && request.user?.role !== 'owner' && typeof row.tenantId === 'string' && request.user?.tenantId !== row.tenantId) {
      sendError(response, 403, 'Access denied for this resource.', 'FORBIDDEN');
      return;
    }

    if (request.user?.role !== 'super_admin' && request.user?.role !== 'owner' && typeof row.branchId === 'string' && request.user?.branchId && request.user.branchId !== row.branchId) {
      sendError(response, 403, 'Access denied for this branch.', 'FORBIDDEN');
      return;
    }

    const deletedRow = await deleteResource(resource, [request.params.id]);
    if (!deletedRow) {
      sendError(response, 404, 'Row not found', 'ROW_NOT_FOUND');
      return;
    }

    response.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown delete error';
    sendError(response, 400, message, 'DELETE_FAILED');
  }
});