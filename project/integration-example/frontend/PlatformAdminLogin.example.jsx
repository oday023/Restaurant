/**
 * PlatformAdminLogin.example.jsx
 * -------------------------------------------------------------
 * مثال React لصفحة تسجيل دخول أدمن المنصة، يتصل بالراوت الخلفي
 * الموجود في: integration-example/backend/platformAdminAuth.js
 *
 * ⚠️ نفس ملاحظة الباك-إند: هذا مثال جاهز للدمج، وليس معدّلاً مباشرة
 * داخل مشروعكم الفعلي لأنني لم أتمكن من الوصول لمستودعكم الخاص.
 * انسخ الفكرة/الكود إلى صفحة اللوجن الحالية في src/pages أو المكان المناسب.
 * -------------------------------------------------------------
 */
import { useState } from 'react';

export default function PlatformAdminLogin({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/platform-admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'فشل تسجيل الدخول');
        return;
      }
      // خزّن التوكن (اختر التخزين المناسب لمشروعكم: httpOnly cookie أفضل أمنياً)
      localStorage.setItem('platform_admin_token', data.token);
      onSuccess?.(data.admin);
    } catch (err) {
      setError('تعذّر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 360, margin: '0 auto' }}>
      <h2>تسجيل دخول أدمن المنصة</h2>
      <input
        type="text"
        placeholder="اسم المستخدم"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="كلمة المرور"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? '...جاري الدخول' : 'دخول'}
      </button>
    </form>
  );
}
