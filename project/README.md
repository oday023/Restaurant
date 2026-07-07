# RestoHub SaaS ERP

تم نقل المشروع إلى بنية واضحة مقسومة إلى واجهة وخادم، مع إبقاء ملفات قاعدة البيانات ومثال التكامل في الجذر.

## البنية الحالية

- `frontend/`: تطبيق React + Vite + Tailwind الخاص بالواجهة.
- `backend/`: خادم Express + PostgreSQL + JWT + RBAC.
- `schema.sql`: مخطط قاعدة البيانات المعدّل للتشغيل على PostgreSQL.
- `integration-example/`: مثال تكامل مستقل لأدمن المنصة والواجهة المرتبطة به.

## التشغيل

من الجذر يمكنك تشغيل أوامر workspace:

```bash
npm run dev:frontend
npm run dev:backend
npm run build:frontend
npm run db:init
```

أو يمكنك الدخول مباشرة إلى كل جزء:

```bash
cd frontend
npm run dev
```

```bash
cd backend
npm run dev
```

## ملاحظات تنفيذية

- الواجهة ما زالت تعتمد على `StorageService` للحالة المحلية، وهذا مناسب للنماذج الأولية لكنه ليس بديلًا عن API فعلي في الإنتاج.
- الخادم جاهز كطبقة مستقلة لربط PostgreSQL، المصادقة، وسجلات التدقيق.
- إذا أردت نقلًا أعمق إلى قاعدة بيانات فعلية، فالخطوة التالية هي استبدال أي منطق محلي داخل `frontend` باستدعاءات HTTP إلى `backend`.
تشغيل الواجهة
npm run dev:frontend
تشغيل الخادم
npm run dev:backend
تهيئة قاعدة البيانات
npm run db:init
