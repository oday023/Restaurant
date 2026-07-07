/**
 * platformAdminAuth.js
 * -------------------------------------------------------------
 * مثال جاهز للربط بين الباك-إند وقاعدة البيانات لتسجيل دخول
 * "أدمن المنصة" (platform_admins) المضاف في schema.sql.
 *
 * ⚠️ ملاحظة مهمة:
 * لم أتمكن من الوصول إلى الكود الفعلي لمستودعكم على GitHub
 * (المستودع غير عام / لا تتوفر صلاحية شبكة لعمل git clone من هذه البيئة)،
 * لذلك هذا الملف "مثال تكامل" مبني على افتراض بنية شائعة
 * (Node.js + Express + pg). يجب نسخ المنطق هنا إلى ملف الراوتات
 * الفعلي لديكم (مثلاً routes/auth.js أو server/index.js) وتعديل
 * المسارات (imports) لتطابق مشروعكم.
 *
 * يتطلب: npm install express pg jsonwebtoken
 * -------------------------------------------------------------
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const JWT_SECRET = process.env.PLATFORM_ADMIN_JWT_SECRET;
const JWT_EXPIRES_IN = process.env.PLATFORM_ADMIN_JWT_EXPIRES_IN || '8h';
const MAX_FAILED_ATTEMPTS = parseInt(process.env.PLATFORM_ADMIN_MAX_FAILED_ATTEMPTS || '5', 10);
const LOCK_MINUTES = parseInt(process.env.PLATFORM_ADMIN_LOCK_MINUTES || '15', 10);

/**
 * POST /api/platform-admin/login
 * body: { username, password }
 */
router.post('/api/platform-admin/login', async (req, res) => {
  const { username, password } = req.body || {};
  const ip = req.ip;
  const userAgent = req.headers['user-agent'] || null;

  if (!username || !password) {
    return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, full_name, username, role, is_active,
              failed_login_attempts, locked_until,
              (password_hash = crypt($2, password_hash)) AS password_ok
       FROM platform_admins
       WHERE username = $1`,
      [username, password]
    );

    const admin = rows[0];

    // تسجيل محاولة الدخول لاحقاً (نجاح أو فشل)
    const logAttempt = async (success, adminId = null) => {
      await pool.query(
        `INSERT INTO platform_admin_login_audit
           (admin_id, username_tried, success, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [adminId, username, success, ip, userAgent]
      );
    };

    if (!admin) {
      await logAttempt(false);
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    if (!admin.is_active) {
      await logAttempt(false, admin.id);
      return res.status(403).json({ error: 'الحساب موقوف' });
    }

    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      await logAttempt(false, admin.id);
      return res.status(423).json({ error: 'الحساب مقفل مؤقتاً، حاول لاحقاً' });
    }

    if (!admin.password_ok) {
      const attempts = admin.failed_login_attempts + 1;
      const lock = attempts >= MAX_FAILED_ATTEMPTS;
      await pool.query(
        `UPDATE platform_admins
         SET failed_login_attempts = $2,
             locked_until = CASE WHEN $3 THEN NOW() + ($4 || ' minutes')::interval ELSE locked_until END
         WHERE id = $1`,
        [admin.id, attempts, lock, LOCK_MINUTES]
      );
      await logAttempt(false, admin.id);
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    // نجاح: صفّر عداد المحاولات وسجّل وقت الدخول
    await pool.query(
      `UPDATE platform_admins
       SET failed_login_attempts = 0, locked_until = NULL,
           last_login_at = NOW(), last_login_ip = $2
       WHERE id = $1`,
      [admin.id, ip]
    );
    await logAttempt(true, admin.id);

    const token = jwt.sign(
      { sub: admin.id, username: admin.username, role: admin.role, scope: 'platform_admin' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      token,
      admin: { id: admin.id, username: admin.username, fullName: admin.full_name, role: admin.role },
    });
  } catch (err) {
    console.error('platform-admin login error:', err);
    return res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

/**
 * Middleware للتحقق من صلاحية أدمن المنصة على أي راوت محمي
 * استخدم: router.get('/api/platform-admin/tenants', requirePlatformAdmin, handler)
 */
function requirePlatformAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'مطلوب تسجيل الدخول' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.scope !== 'platform_admin') {
      return res.status(403).json({ error: 'صلاحيات غير كافية' });
    }
    req.platformAdmin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'جلسة غير صالحة أو منتهية' });
  }
}

/**
 * مثال: استخدام الفيو vw_platform_overview المضافة في schema.sql
 * لعرض نظرة عامة على كل المطاعم (Tenants) في لوحة أدمن المنصة.
 */
router.get('/api/platform-admin/overview', requirePlatformAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM vw_platform_overview ORDER BY lifetime_revenue DESC`);
    res.json(rows);
  } catch (err) {
    console.error('overview error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

module.exports = { router, requirePlatformAdmin };
