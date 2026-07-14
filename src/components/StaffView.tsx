/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Users, UserPlus, Calendar, DollarSign, ShieldAlert, Check, X, Star, HelpCircle, Trash2, Key, Coins, Briefcase, Award, TrendingDown, ClipboardList
} from 'lucide-react';
import { Employee, Role, PayrollRecord, Transaction } from '../types';
import { StorageService } from '../services/db';

interface StaffViewProps {
  tenantId: string;
  language: 'ar' | 'en';
  onAddNotification: (msgAr: string, msgEn: string, type: 'info' | 'success' | 'warning') => void;
  currentUserRole?: Role; // Passed to enforce role security
}

export default function StaffView({ tenantId, language, onAddNotification, currentUserRole = 'owner' }: StaffViewProps) {
  const isRtl = language === 'ar';

  const [employees, setEmployees] = useState<Employee[]>(() => StorageService.getEmployees(tenantId));
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(() => StorageService.getPayrollRecords(tenantId));
  const [subTab, setSubTab] = useState<'directory' | 'payroll'>('directory');

  // Salary advance states
  const [advanceInputEmpId, setAdvanceInputEmpId] = useState<string | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState<string>('');

  // Visual clock-in simulation state
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');

  // Form states for creating a new employee
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<Role>('waiter');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpSalary, setNewEmpSalary] = useState('');
  const [newEmpUsername, setNewEmpUsername] = useState('');
  const [newEmpPassword, setNewEmpPassword] = useState('');
  const [needsCredentials, setNeedsCredentials] = useState(true);

  // Payroll Editing modal states
  const [editingPayroll, setEditingPayroll] = useState<PayrollRecord | null>(null);
  const [editBaseSalary, setEditBaseSalary] = useState('');
  const [editAdvances, setEditAdvances] = useState('');
  const [editDeductions, setEditDeductions] = useState('');
  const [editBonuses, setEditBonuses] = useState('');

  // Check if current user is allowed to edit payroll/salaries (Owners, HR, and Super Admin only)
  const isAuthorizedForPayroll = useMemo(() => {
    return ['super_admin', 'owner', 'hr_manager'].includes(currentUserRole);
  }, [currentUserRole]);

  const handleDeleteEmployee = async (empId: string) => {
    const matched = employees.find(e => e.id === empId);
    if (matched?.role === 'owner' || matched?.role === 'super_admin') {
      onAddNotification(
        'لا يمكن إزالة الحسابات الرئاسية الفائقة للأونر والمشرف!',
        'Cannot delete core Owner or Super Admin accounts!',
        'warning'
      );
      return;
    }

    await StorageService.deleteEmployee(empId);
    setEmployees(StorageService.getEmployees(tenantId));
    
    // Refresh payroll as well since employee was deleted
    StorageService.clearCache('payroll_records');
    setPayrollRecords(StorageService.getPayrollRecords(tenantId));

    onAddNotification(
      'تم إزالة حساب الموظف من سجل النظام بنجاح',
      'Employee account deleted successfully from the roster',
      'info'
    );
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) {
      onAddNotification(
        'يرجى إدخال اسم الموظف لإكمال الحساب',
        'Please enter employee name to create the account',
        'warning'
      );
      return;
    }

    if (needsCredentials && (!newEmpUsername.trim() || !newEmpPassword.trim())) {
      onAddNotification(
        'يرجى إدخال اسم المستخدم وكلمة المرور لتخصيص حساب دخول للنظام',
        'Please enter username and password to assign system credentials',
        'warning'
      );
      return;
    }

    const usernameClean = needsCredentials ? newEmpUsername.trim().toLowerCase() : undefined;
    
    if (usernameClean) {
      const usernameTaken = employees.some(emp => emp.username?.toLowerCase() === usernameClean);
      if (usernameTaken) {
        onAddNotification(
          'اسم المستخدم هذا مستخدم بالفعل من قبل موظف آخر! يرجى كتابة اسم مستخدم فريد.',
          'This username is already taken by another employee! Please write a unique username.',
          'warning'
        );
        return;
      }
    }

    const newEmp: Employee = {
      id: `emp_${Date.now()}`,
      tenantId,
      branchId: 'b1_1', // Riyadh branch default
      name: newEmpName.trim(),
      email: newEmpEmail.trim() || (usernameClean ? `${usernameClean}@shawarmagrill.com` : 'staff@shawarmagrill.com'),
      role: newEmpRole,
      phone: newEmpPhone.trim() || '0500000000',
      salary: parseFloat(newEmpSalary) || 3500,
      attendanceHistory: [],
      performanceRating: 5.0,
      status: 'active',
      username: usernameClean,
    };

    const createdEmployee = await StorageService.createEmployeeWithPassword(newEmp, needsCredentials ? newEmpPassword.trim() : undefined);
    setEmployees(StorageService.getEmployees(tenantId));
    setEmployees(StorageService.getEmployees(tenantId));
    
    // Force payroll refresh to include new employee
    StorageService.clearCache('payroll_records');
    setPayrollRecords(StorageService.getPayrollRecords(tenantId));

    if (needsCredentials && usernameClean) {
      onAddNotification(
        `تم إنشاء حساب الموظف "${newEmpName}" بنجاح! يمكنه الآن استخدام اسم المستخدم (${usernameClean}) وصلاحياته هي (${newEmpRole}).`,
        `Employee "${newEmpName}" account created successfully! They can now login with (${usernameClean}) as (${newEmpRole}).`,
        'success'
      );
    } else {
      onAddNotification(
        `تم تسجيل الموظف الميداني "${newEmpName}" بنجاح في سجلات الحضور والرواتب.`,
        `Field staff "${newEmpName}" registered successfully for roster & payroll.`,
        'success'
      );
    }

    // Reset Form fields
    setNewEmpName('');
    setNewEmpRole('waiter');
    setNewEmpEmail('');
    setNewEmpPhone('');
    setNewEmpSalary('');
    setNewEmpUsername('');
    setNewEmpPassword('');
    setNeedsCredentials(true);
    setShowAddForm(false);
  };

  const handlePunchCheckIn = async (empId: string, action: 'in' | 'out') => {
    const matched = employees.find(e => e.id === empId);
    if (!matched) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const todayStr = new Date().toISOString().slice(0, 10);

    const recordIdx = matched.attendanceHistory.findIndex(h => h.date === todayStr);

    if (action === 'in') {
      if (recordIdx >= 0) {
        onAddNotification('الموظف سجل حضور بالفعل لهذا اليوم مسبقاً', 'Employee has already clocked in today', 'warning');
        return;
      }
      matched.attendanceHistory.unshift({
        date: todayStr,
        checkIn: timeStr,
        status: 'present'
      });
      onAddNotification(
        `أهلاً بك! تم تسجيل بصمة الحضور لـ ${matched.name} عند الساعة ${timeStr}`,
        `Welcome! Attendance check-in punched for ${matched.name} at ${timeStr}`,
        'success'
      );
    } else {
      if (recordIdx < 0) {
        onAddNotification('لم يتم تسجيل دخول للموظف اليوم لإتمام الخروج!', 'No clock-in record found for this employee today to checkout', 'warning');
        return;
      }
      matched.attendanceHistory[recordIdx].checkOut = timeStr;
      onAddNotification(
        `مع السلامة! تم تسجيل بصمة انصراف لـ ${matched.name} عند الساعة ${timeStr}`,
        `Good bye! checkout punched out for ${matched.name} at ${timeStr}`,
        'info'
      );
    }

    await StorageService.saveEmployee(matched);
    setEmployees(StorageService.getEmployees(tenantId));
  };

  const handleLogSalaryAdvance = async (empId: string, amount: number) => {
    if (amount <= 0) {
      onAddNotification(
        'يرجى إدخال مبلغ سلفة صالح أكبر من صفر',
        'Please enter a valid advance amount greater than zero',
        'warning'
      );
      return;
    }

    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;

    const existingPayroll = payrollRecords.find((rec) => rec.employeeId === empId);
    const currentPayroll: PayrollRecord = existingPayroll ?? {
      id: `pay_${Date.now()}`,
      tenantId,
      employeeId: emp.id,
      employeeName: emp.name,
      role: emp.role,
      month: new Date().toISOString().slice(0, 7),
      baseSalary: emp.salary,
      advances: 0,
      deductions: 0,
      bonuses: 0,
      netPaid: emp.salary,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    };

    const updatedPayroll: PayrollRecord = {
      ...currentPayroll,
      advances: currentPayroll.advances + amount,
      netPaid: currentPayroll.baseSalary - (currentPayroll.advances + amount) - currentPayroll.deductions + currentPayroll.bonuses,
      updatedAt: new Date().toISOString(),
    };

    await StorageService.savePayrollRecord(updatedPayroll);
    setPayrollRecords(StorageService.getPayrollRecords(tenantId));

    onAddNotification(
      `تم تسجيل سلفة بقيمة ${amount.toFixed(2)} ر.س للموظف "${emp.name}" بنجاح`,
      `Logged salary advance of ${amount.toFixed(2)} SAR for employee "${emp.name}" successfully`,
      'success'
    );
  };

  // Safe payroll modifications
  const handleOpenEditPayroll = (rec: PayrollRecord) => {
    if (!isAuthorizedForPayroll) {
      onAddNotification(
        'غير مصرح! تعديل الرواتب مسموح لمالك المنشأة وشؤون الموظفين فقط.',
        'Unauthorized! Salary configuration is locked for HR Managers and Owners only.',
        'warning'
      );
      return;
    }
    setEditingPayroll(rec);
    setEditBaseSalary(rec.baseSalary.toString());
    setEditAdvances(rec.advances.toString());
    setEditDeductions(rec.deductions.toString());
    setEditBonuses(rec.bonuses.toString());
  };

  const handleSavePayrollEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayroll) return;

    const base = parseFloat(editBaseSalary) || 0;
    const adv = parseFloat(editAdvances) || 0;
    const ded = parseFloat(editDeductions) || 0;
    const bon = parseFloat(editBonuses) || 0;

    const oldRecord = { ...editingPayroll };

    const updatedRecord: PayrollRecord = {
      ...editingPayroll,
      baseSalary: base,
      advances: adv,
      deductions: ded,
      bonuses: bon,
      netPaid: base - adv - ded + bon,
      updatedAt: new Date().toISOString()
    };

    await StorageService.savePayrollRecord(updatedRecord);
    setPayrollRecords(StorageService.getPayrollRecords(tenantId));

    // Audit Log salary changes!
    await StorageService.addAuditLog(
      tenantId,
      'HR System Manager',
      `Modified Payroll Record for Employee ${editingPayroll.employeeName}: Base: ${base}, Adv: ${adv}, Ded: ${ded}, Bon: ${bon}`,
      oldRecord,
      updatedRecord
    );

    // If base salary was changed, synchronize back to Employee roster!
    const rosterEmps = StorageService.getEmployees(tenantId);
    const empIdx = rosterEmps.findIndex(emp => emp.id === editingPayroll.employeeId);
    if (empIdx >= 0 && rosterEmps[empIdx].salary !== base) {
      rosterEmps[empIdx].salary = base;
      await StorageService.saveEmployee(rosterEmps[empIdx]);
      setEmployees(StorageService.getEmployees(tenantId));
    }

    setEditingPayroll(null);
    onAddNotification(
      'تم تحديث قيم الراتب والمسيرات مع تسجيل تعديل آمن بالأرشيف',
      'Salary record updated successfully and written to system audit log',
      'success'
    );
  };

  // Post wage payment to Accounting general ledger!
  const handleProcessWagePayout = async (rec: PayrollRecord) => {
    if (!isAuthorizedForPayroll) {
      onAddNotification(
        'غير مصرح! صرف الرواتب يتطلب صلاحيات الأونر أو المدير المسؤول.',
        'Unauthorized! Process payroll requires Owner or HR Manager clearance.',
        'warning'
      );
      return;
    }

    if (rec.status === 'paid') {
      onAddNotification(
        'تم صرف راتب هذا الموظف بالفعل لهذا الشهر!',
        'This payroll record is already processed & paid!',
        'warning'
      );
      return;
    }

    const updated: PayrollRecord = {
      ...rec,
      status: 'paid',
      updatedAt: new Date().toISOString()
    };

    // Update state & storage
    await StorageService.savePayrollRecord(updated);
    setPayrollRecords(StorageService.getPayrollRecords(tenantId));

    // INTEGRATION WITH ACCOUNTING: Post debit expense entry inside Cash Ledger!
    const payoutTx: Transaction = {
      id: `tx_wage_${Date.now()}`,
      tenantId,
      branchId: 'b1_1',
      type: 'expense',
      categoryAr: 'رواتب وأجور الموظفين',
      categoryEn: 'Employee wages & allowances',
      amount: rec.netPaid,
      descriptionAr: `صرف الراتب الشهري الصافي للموظف ${rec.employeeName} (${rec.role}) - شهر يونيو ٢٠٢٦`,
      descriptionEn: `Salary payout for ${rec.employeeName} (${rec.role}) - Net Paid: ${rec.netPaid} SAR`,
      date: new Date().toISOString(),
      createdBy: 'مدير شؤون الموظفين السحابي'
    };

    await StorageService.addTransaction(payoutTx);

    // Audit Trail logging
    await StorageService.addAuditLog(
      tenantId,
      'HR System Manager',
      `Processed monthly wage payroll payout of ${rec.netPaid} SAR for Employee ${rec.employeeName}`,
      rec,
      updated
    );

    onAddNotification(
      `تم صرف الراتب وتسجيل قيد مصروف محاسبي بقيمة ${rec.netPaid} ر.س بالخزينة`,
      `Payroll approved! Expense entry for ${rec.netPaid} SAR posted to Ledger successfully`,
      'success'
    );
  };

  const rbacMatrix = [
    { module: isRtl ? 'لوحة المبيعات POS الكاشير' : 'POS Sales Terminal', owner: true, manager: true, cashier: true, waiter: true, kitchen: false, accountant: false },
    { module: isRtl ? 'شاشة المطبخ الذكية KDS' : 'Kitchen KDS monitor', owner: true, manager: true, cashier: false, waiter: false, kitchen: true, accountant: false },
    { module: isRtl ? 'أرصدة المستودعات والمكونات' : 'Material Inventory logs', owner: true, manager: true, cashier: false, waiter: false, kitchen: false, accountant: false },
    { module: isRtl ? 'التقارير المحاسبية والمصاريف' : 'Financial ledger logs', owner: true, manager: false, cashier: false, waiter: false, kitchen: false, accountant: true },
    { module: isRtl ? 'إدارة الطاولات وملصقات QR' : 'Tables, Halls & QR tags', owner: true, manager: true, cashier: true, waiter: true, kitchen: false, accountant: false },
    { module: isRtl ? 'رواتب الموظفين والوظائف' : 'Staff Wages & Biometrics', owner: true, manager: false, cashier: false, waiter: false, kitchen: false, accountant: false, hr: true },
  ];

  return (
    <div className="space-y-6 text-slate-200 animate-fade-in select-none">
      
      {/* Tab Nav Selector */}
      <div className="glass-panel bg-[#0d121f]/50 border border-slate-800/80 p-5 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.4)] flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl">
            <Users className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-xs uppercase tracking-wider">
              {isRtl ? 'إدارة الموارد البشرية والرواتب (HR & Payroll)' : 'Human Capital & Corporate Payroll'}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {isRtl ? 'إدارة ملفات الموظفين وصرف الرواتب بالتكامل مع الحسابات' : 'Monitor staff rosters, payroll ledgers, and secure general ledger integrations'}
            </p>
          </div>
        </div>

        {/* Sub-tab Pill Row */}
        <div className="flex p-1 bg-[#111827] border border-slate-800/80 rounded-2xl self-start sm:self-auto gap-1">
          <button
            onClick={() => setSubTab('directory')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${subTab === 'directory' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-900/70'}`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>{isRtl ? 'دليل الموظفين' : 'Staff Roster'}</span>
          </button>
          <button
            onClick={() => setSubTab('payroll')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${subTab === 'payroll' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-900/70'}`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>{isRtl ? 'مسير الرواتب والأجور' : 'Payroll Sheet'}</span>
          </button>
        </div>
      </div>

      {/* RENDER VIEW ACCORDING TO SUB-TAB */}
      {subTab === 'directory' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Employee Directory Column */}
          <div className="glass-panel bg-[#0d121f]/50 border border-slate-800/80 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] lg:col-span-2 space-y-4">
            <div className="pb-3 border-b border-slate-850/60 mb-2 font-sans flex justify-between items-center flex-wrap gap-2">
              <div>
                <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">{isRtl ? 'قائمة طاقم العمل والشركاء' : 'Corporate Roster & System Roles'}</h4>
                <p className="text-[9px] text-slate-400">{isRtl ? 'عرض وتحديث طاقم العمل وتفاصيل حساباتهم الموحدة' : 'Manage system profiles, logins and base salary configurations'}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="py-1.5 px-3.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10px] font-black cursor-pointer transition active:scale-95 shadow-sm flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {isRtl ? 'إنشاء حساب موظف' : 'Register Staff Account'}
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleCreateEmployee} className="p-5 bg-[#090d16] border border-slate-800 rounded-3xl space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-850/60">
                  <UserPlus className="w-4 h-4 text-orange-500" />
                  <h5 className="font-extrabold text-xs text-white">
                    {isRtl ? 'تسجيل موظف جديد وتخصيص صلاحيات مصفوفة الأمان' : 'Register New Employee & Grant Credentials'}
                  </h5>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">{isRtl ? 'اسم الموظف كامل *' : 'Employee Full Name *'}</label>
                    <input
                      type="text"
                      required
                      value={newEmpName}
                      onChange={(e) => {
                        setNewEmpName(e.target.value);
                        if (!newEmpUsername) {
                          const proposed = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                          setNewEmpUsername(proposed);
                        }
                      }}
                      placeholder={isRtl ? 'مثال: وسام المصري' : 'e.g. Wesam Al-Masri'}
                      className="w-full text-xs font-bold p-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-white focus:outline-none focus:border-orange-500 font-sans"
                    />
                  </div>

                  <div>
                    <label htmlFor="new-emp-role" className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">{isRtl ? 'الدور الوظيفي / الصلاحية *' : 'Functional Role / Clearance *'}</label>
                    <select
                      id="new-emp-role"
                      value={newEmpRole}
                      onChange={(e) => {
                        const r = e.target.value as Role;
                        setNewEmpRole(r);
                        // Automatically set needs credentials to true for system roles, false for auxiliary roles
                        const isSystemRole = ['owner', 'manager', 'cashier', 'waiter', 'kitchen', 'accountant', 'hr_manager', 'inventory_manager'].includes(r);
                        setNeedsCredentials(isSystemRole);
                      }}
                      className="w-full text-xs font-bold p-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-white focus:outline-none focus:border-orange-500 font-sans"
                    >
                      <option value="waiter" className="bg-[#090d16]">{isRtl ? 'خدمة الصالة / الويتر (Waiter)' : 'Waiter / Hall staff'}</option>
                      <option value="kitchen" className="bg-[#090d16]">{isRtl ? 'طاقم المطبخ والطهاة (Kitchen)' : 'Kitchen staff / Chef'}</option>
                      <option value="cashier" className="bg-[#090d16]">{isRtl ? 'محاسب مبيعات / كاشير (Cashier)' : 'Cashier / POS staff'}</option>
                      <option value="manager" className="bg-[#090d16]">{isRtl ? 'مدير الفرع والمشرف (Manager)' : 'Branch Manager'}</option>
                      <option value="accountant" className="bg-[#090d16]">{isRtl ? 'محاسب عام (Accountant)' : 'Accountant'}</option>
                      <option value="hr_manager" className="bg-[#090d16]">{isRtl ? 'مدير الموارد البشرية (HR Manager)' : 'HR Manager'}</option>
                      <option value="inventory_manager" className="bg-[#090d16]">{isRtl ? 'أمين مستودع (Inventory)' : 'Inventory Manager'}</option>
                      <option value="owner" className="bg-[#090d16]">{isRtl ? 'مالك المطعم (Owner)' : 'Owner / Administrator'}</option>
                      <option value="cleaner" className="bg-[#090d16]">{isRtl ? 'عامل تنظيفات وخدمات مساندة (Cleaner)' : 'Cleaner / Auxiliary Staff'}</option>
                      <option value="security" className="bg-[#090d16]">{isRtl ? 'حارس أمن وحماية (Security)' : 'Security Guard'}</option>
                      <option value="other" className="bg-[#090d16]">{isRtl ? 'خدمات عامة أخرى (Other)' : 'Other General Services'}</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 flex items-center gap-2.5 p-3 bg-slate-950/40 border border-slate-850 rounded-xl">
                    <input
                      type="checkbox"
                      id="needsCredentialsCheck"
                      checked={needsCredentials}
                      onChange={(e) => setNeedsCredentials(e.target.checked)}
                      className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500 border-slate-800 cursor-pointer"
                    />
                    <label htmlFor="needsCredentialsCheck" className="text-xs font-bold text-slate-300 cursor-pointer select-none">
                      {isRtl ? 'تفعيل حساب دخول رقمي لهذا الموظف (اسم مستخدم وكلمة مرور)' : 'Enable digital system login credentials for this employee (username & password)'}
                    </label>
                  </div>

                  {needsCredentials ? (
                    <>
                      <div>
                        <label htmlFor="new-emp-username" className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">{isRtl ? 'اسم المستخدم للدخول الموحد *' : 'Unique Login Username *'}</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2.5 text-orange-500 font-extrabold">@</span>
                          <input
                            id="new-emp-username"
                            type="text"
                            required
                            value={newEmpUsername}
                            onChange={(e) => setNewEmpUsername(e.target.value.replace(/\s+/g, ''))}
                            placeholder="wesam"
                            className="w-full text-xs font-mono font-bold pl-7 pr-2.5 py-2 bg-slate-950/40 border border-slate-850 rounded-xl text-white focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="new-emp-password" className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">{isRtl ? 'كلمة المرور للدخول *' : 'Login Password *'}</label>
                        <input
                          id="new-emp-password"
                          type="text"
                          required
                          value={newEmpPassword}
                          onChange={(e) => setNewEmpPassword(e.target.value)}
                          placeholder="123"
                          className="w-full text-xs font-mono font-bold p-2 bg-slate-950/40 border border-slate-850 rounded-xl text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="sm:col-span-2 p-3 bg-amber-500/5 border border-amber-500/15 rounded-2xl text-[10px] text-amber-400 font-medium font-sans">
                      {isRtl ? '💡 تم تعطيل حساب الدخول الرقمي لهذا الموظف. سيتم حفظ بياناته في سجلات طاقم العمل والرواتب والمستحقات، دون تفعيل وصول لنقاط البيع.' : '💡 Digital login is disabled for this employee. Their details will be stored for payroll and attendance sheets.'}
                    </div>
                  )}

                  <div>
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">{isRtl ? 'رقم الهاتف' : 'Phone Number'}</label>
                    <input
                      type="text"
                      value={newEmpPhone}
                      onChange={(e) => setNewEmpPhone(e.target.value)}
                      placeholder="0500000000"
                      className="w-full text-xs font-bold p-2 bg-slate-950/40 border border-slate-850 rounded-xl text-white focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">{isRtl ? 'الراتب الأساسي الشهري (ريال)' : 'Monthly Base Salary (SAR)'}</label>
                    <input
                      type="number"
                      value={newEmpSalary}
                      onChange={(e) => setNewEmpSalary(e.target.value)}
                      placeholder="3500"
                      className="w-full text-xs font-bold p-2 bg-slate-950/40 border border-slate-850 rounded-xl text-white focus:outline-none focus:border-orange-500 font-mono font-black"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">{isRtl ? 'البريد الإلكتروني (اختياري)' : 'Email address (Optional)'}</label>
                    <input
                      type="email"
                      value={newEmpEmail}
                      onChange={(e) => setNewEmpEmail(e.target.value)}
                      placeholder="name@restaurant.com"
                      className="w-full text-xs font-bold p-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="py-1.5 px-3 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850 rounded-xl text-[10px] font-black cursor-pointer transition"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="py-1.5 px-4 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white rounded-xl text-[10px] font-black cursor-pointer shadow-md transition active:scale-95"
                  >
                    {isRtl ? 'حفظ الموظف وإنشاء الحساب' : 'Save Employee & Create Account'}
                  </button>
                </div>
              </form>
            )}

            {/* List display */}
            <div className="space-y-3.5">
              {employees.map((emp) => {
                const empPayroll = payrollRecords.find((r) => r.employeeId === emp.id);
                return (
                  <div key={emp.id} className="p-4 rounded-3xl bg-[#090d16]/40 border border-slate-850 hover:border-slate-750 hover:bg-[#0c101d]/60 shadow-[0_4px_20px_rgba(0,0,0,0.2)] transition duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fadeIn">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        <h5 className="font-extrabold text-xs text-white flex items-center gap-1.5">
                          <span>{emp.name}</span>
                          <span className="text-[8px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-black uppercase tracking-wider">
                            {emp.role.replace('_', ' ')}
                          </span>
                        </h5>
                      </div>
                      
                      <div className="text-[10px] text-slate-350 font-medium space-y-0.5 font-mono">
                        <p>Email: <span className="text-slate-400">{emp.email}</span></p>
                        <p>Base Salary: <span className="font-bold text-slate-300">{emp.salary.toFixed(2)} SAR</span></p>
                        {emp.username ? (
                          <div className="mt-1.5 inline-flex items-center gap-1.5 bg-slate-950 border border-slate-900 p-2 rounded-xl text-[9px] text-slate-300">
                            <Key className="w-3 h-3 text-orange-500 shrink-0" />
                            <span>UN: <span className="text-orange-400 font-black">{emp.username}</span></span>
                          </div>
                        ) : (
                          <div className="mt-1.5 inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-xl text-[9px] font-black uppercase text-amber-400">
                            <span>{isRtl ? 'لا يملك حساب دخول بالنظام' : 'No System Login'}</span>
                          </div>
                        )}
                      </div>

                      {/* Advances Display & Log Input */}
                      <div className="pt-2">
                        {empPayroll && empPayroll.advances > 0 && (
                          <div className="mb-2 inline-block">
                            <span className="text-[9px] font-black bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded-lg">
                              {isRtl ? `السلف المسجلة هذا الشهر: ${empPayroll.advances.toFixed(2)} ر.س` : `Monthly Advances: ${empPayroll.advances.toFixed(2)} SAR`}
                            </span>
                          </div>
                        )}

                        {advanceInputEmpId === emp.id ? (
                          <div className="flex items-center gap-2 mt-1 animate-fadeIn">
                            <input
                              type="number"
                              value={advanceAmount}
                              onChange={(e) => setAdvanceAmount(e.target.value)}
                              placeholder={isRtl ? 'مبلغ السلفة (ريال)...' : 'Advance amount (SAR)...'}
                              className="bg-slate-950 border border-slate-850 px-2.5 py-1.5 rounded-xl text-xs text-white font-mono max-w-[130px] focus:outline-none focus:border-orange-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                handleLogSalaryAdvance(emp.id, parseFloat(advanceAmount) || 0);
                                setAdvanceInputEmpId(null);
                                setAdvanceAmount('');
                              }}
                              className="py-1.5 px-3 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white rounded-xl text-[9px] font-black cursor-pointer transition active:scale-95"
                            >
                              {isRtl ? 'تأكيد' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setAdvanceInputEmpId(null)}
                              className="text-slate-400 hover:text-white text-[10px] cursor-pointer"
                            >
                              {isRtl ? 'إلغاء' : 'Cancel'}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setAdvanceInputEmpId(emp.id);
                              setAdvanceAmount('');
                            }}
                            className="mt-1 text-[9px] font-black uppercase text-amber-500 hover:text-orange-400 bg-slate-950/60 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 px-2.5 py-1.5 rounded-xl transition cursor-pointer inline-flex items-center gap-1"
                          >
                            <Coins className="w-3 h-3 text-amber-500" />
                            <span>{isRtl ? 'تسجيل سلفة مالية' : 'Log Salary Advance'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                  {emp.role !== 'owner' && emp.role !== 'super_admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(isRtl ? `هل أنت متأكد من حذف حساب الموظف "${emp.name}"؟` : `Are you sure you want to delete employee "${emp.name}"?`)) {
                          handleDeleteEmployee(emp.id);
                        }
                      }}
                      className="p-2 bg-slate-900 border border-slate-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-xl cursor-pointer transition self-end sm:self-auto active:scale-90"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                );
              })}
            </div>
          </div>

          {/* Right Gating Panel */}
          <div className="glass-panel bg-[#0d121f]/50 border border-slate-800/80 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-5">
            <div className="pb-3 border-b border-slate-850/60 flex gap-1.5 items-center">
              <ShieldAlert className="w-4.5 h-4.5 text-orange-500 shrink-0" />
              <div>
                <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">{isRtl ? 'مصفوفة الصلاحيات الرقمية' : 'Security RBAC Matrix'}</h4>
                <p className="text-[9px] text-slate-400">{isRtl ? 'الصلاحيات المعززة لكل موظف في المنظومة' : 'Authorized actions per organizational level'}</p>
              </div>
            </div>

            <div className="space-y-3.5">
              {rbacMatrix.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-[#090d16]/40 rounded-2xl border border-slate-850 space-y-2">
                  <span className="text-xs font-extrabold text-slate-300 block">{item.module}</span>
                  <div className="flex gap-1.5 flex-wrap text-[8px] font-mono text-slate-400 font-bold">
                    <span className={`px-1.5 py-0.5 rounded border ${item.owner ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-950 border-slate-900 text-slate-700 line-through'}`}>Owner</span>
                    <span className={`px-1.5 py-0.5 rounded border ${item.manager ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-950 border-slate-900 text-slate-700 line-through'}`}>Manager</span>
                    <span className={`px-1.5 py-0.5 rounded border ${item.cashier ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-slate-950 border-slate-900 text-slate-700 line-through'}`}>Cashier</span>
                    <span className={`px-1.5 py-0.5 rounded border ${item.waiter ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-slate-950 border-slate-900 text-slate-700 line-through'}`}>Waiter</span>
                    <span className={`px-1.5 py-0.5 rounded border ${item.kitchen ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-slate-950 border-slate-900 text-slate-700 line-through'}`}>Kitchen</span>
                    {item.accountant && <span className="px-1.5 py-0.5 rounded border bg-amber-500/10 border-amber-500/20 text-amber-400">Accountant</span>}
                    {item.hr && <span className="px-1.5 py-0.5 rounded border bg-teal-500/10 border-teal-500/20 text-teal-400">HR</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}



      {subTab === 'payroll' && (
        <div className="glass-panel bg-[#0d121f]/50 border border-slate-800/80 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-6">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-850/60 pb-4">
            <div>
              <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">{isRtl ? 'مسير الرواتب الموحد والمستحقات والبدلات' : 'Wages, Deductions & Payout Ledger'}</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">{isRtl ? 'تعديل آمن للرواتب، البدلات، الخصومات وصرف الأجور بالتكامل مع الحسابات العامة' : 'Review employee wage slips, configure bonuses/advances, and trigger double-entry bank payouts'}</p>
            </div>

            <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-[10px] text-slate-400 font-mono font-black flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-orange-500" />
              <span>PAYROLL MONTH: JUNE 2026</span>
            </div>
          </div>

          {/* Secure lock alert if user is cashier or waiter */}
          {!isAuthorizedForPayroll && (
            <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl flex items-start gap-3 text-rose-200 text-xs font-sans">
              <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-rose-450 uppercase tracking-wider">{isRtl ? 'شاشة الرواتب مقفلة بموجب الأمان والمستويات العليا' : 'Wage Ledger Locked under Secure RBAC Policy'}</p>
                <p className="opacity-80 mt-0.5">
                  {isRtl 
                    ? 'أنت مسجل حالياً بحساب لا يملك الصلاحية الكافية لمشاهدة الرواتب أو تعديلها أو صرفها. يرجى الدخول بحساب شؤون الموظفين (hr) أو المالك (ali) لإدارتها.' 
                    : 'Your active role cannot view or edit salaries. Log in as Owner (ali) or HR Manager (hr) to process.'
                  }
                </p>
              </div>
            </div>
          )}

          {isAuthorizedForPayroll && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 font-extrabold border-b border-slate-850/60 text-left text-[10px] uppercase tracking-wider">
                    <th className="pb-3 font-sans">{isRtl ? 'الموظف' : 'Employee'}</th>
                    <th className="pb-3 font-sans text-center">{isRtl ? 'الراتب الأساسي' : 'Base Salary'}</th>
                    <th className="pb-3 font-sans text-center text-amber-500">{isRtl ? 'سلف ومسحوبات' : 'Advances'}</th>
                    <th className="pb-3 font-sans text-center text-rose-500">{isRtl ? 'خصومات جزاءات' : 'Deductions'}</th>
                    <th className="pb-3 font-sans text-center text-emerald-500">{isRtl ? 'بدلات وحوافز' : 'Bonuses'}</th>
                    <th className="pb-3 font-sans text-center font-bold text-white">{isRtl ? 'صافي الراتب' : 'Net Salary'}</th>
                    <th className="pb-3 font-sans text-center">{isRtl ? 'حالة الصرف' : 'Status'}</th>
                    <th className="pb-3 font-sans text-right">{isRtl ? 'الإجراء' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRecords.map((rec) => (
                    <tr key={rec.id} className="border-b border-slate-900/60 hover:bg-[#0c101d]/30 transition duration-150">
                      <td className="py-3.5">
                        <p className="font-extrabold text-white text-xs">{rec.employeeName}</p>
                        <span className="text-[8px] bg-slate-950 text-slate-400 border border-slate-900 font-black px-1.5 py-0.5 rounded uppercase mt-0.5 inline-block">{rec.role}</span>
                      </td>
                      <td className="text-center font-mono text-slate-300 font-bold">{rec.baseSalary.toFixed(2)} SAR</td>
                      <td className="text-center font-mono text-amber-500 font-bold">-{rec.advances.toFixed(2)} SAR</td>
                      <td className="text-center font-mono text-rose-500 font-bold">-{rec.deductions.toFixed(2)} SAR</td>
                      <td className="text-center font-mono text-emerald-500 font-bold">+{rec.bonuses.toFixed(2)} SAR</td>
                      <td className="text-center font-mono font-bold text-orange-400 bg-slate-950/40 border border-slate-850 p-2 rounded-xl">{rec.netPaid.toFixed(2)} SAR</td>
                      <td className="text-center">
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase ${
                          rec.status === 'paid' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        }`}>
                          {rec.status === 'paid' ? (isRtl ? 'تم الصرف بنجاح' : 'Paid & Posted') : (isRtl ? 'مسودة معلقة' : 'Draft Pending')}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleOpenEditPayroll(rec)}
                            disabled={rec.status === 'paid'}
                            className={`p-1.5 px-2.5 rounded-xl border text-[10px] font-black cursor-pointer transition flex items-center gap-1 ${
                              rec.status === 'paid'
                                ? 'bg-slate-950 border-slate-900 text-slate-650 cursor-not-allowed'
                                : 'bg-slate-900 border-slate-800 hover:bg-slate-850 text-slate-300 hover:text-white'
                            }`}
                          >
                            {isRtl ? 'تعديل بنود' : 'Configure'}
                          </button>
                          <button
                            onClick={() => handleProcessWagePayout(rec)}
                            disabled={rec.status === 'paid'}
                            className={`p-1.5 px-3.5 rounded-xl font-black text-[10px] cursor-pointer transition flex items-center gap-1.5 active:scale-95 ${
                              rec.status === 'paid'
                                ? 'bg-emerald-500/5 text-emerald-500/40 cursor-not-allowed border border-emerald-500/10'
                                : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow'
                            }`}
                          >
                            <Coins className="w-3 h-3 text-white" />
                            <span>{rec.status === 'paid' ? (isRtl ? 'تم الصرف' : 'Paid') : (isRtl ? 'صرف فوري' : 'Disburse')}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* EDIT PAYROLL MODAL DIALOG */}
          {editingPayroll && (
            <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn">
              <div className="glass-panel bg-[#0d121f] rounded-3xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.8)] border border-slate-800 max-w-sm w-full space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-850/60">
                  <div>
                    <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">
                      {isRtl ? 'تعديل مسير راتب الموظف' : 'Configure Wage Allowances'}
                    </h4>
                    <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{editingPayroll.employeeName}</p>
                  </div>
                  <button type="button" onClick={() => setEditingPayroll(null)} className="text-slate-300 hover:text-white text-lg cursor-pointer">
                    &times;
                  </button>
                </div>

                <form onSubmit={handleSavePayrollEdit} className="space-y-4 text-xs font-sans">
                  
                  <div>
                    <label className="block font-extrabold text-slate-400 uppercase tracking-wider mb-1">{isRtl ? 'الراتب الأساسي (ريال):' : 'Base Monthly Salary (SAR):'}</label>
                    <input
                      type="number"
                      required
                      value={editBaseSalary}
                      onChange={(e) => setEditBaseSalary(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-850 px-3 py-2 rounded-xl text-xs font-mono font-extrabold text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block font-extrabold text-amber-500 uppercase tracking-wider mb-1">{isRtl ? 'سلفيات وسحوبات الموظف (-):' : 'Advances / Withdrawals (-):'}</label>
                    <input
                      type="number"
                      value={editAdvances}
                      onChange={(e) => setEditAdvances(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-850 px-3 py-2 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block font-extrabold text-rose-500 uppercase tracking-wider mb-1">{isRtl ? 'خصومات وجزاءات الغياب (-):' : 'Deductions & Late Penalties (-):'}</label>
                    <input
                      type="number"
                      value={editDeductions}
                      onChange={(e) => setEditDeductions(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-850 px-3 py-2 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block font-extrabold text-emerald-500 uppercase tracking-wider mb-1">{isRtl ? 'بدلات وحوافز إضافية (+):' : 'Bonuses & Sourcing Allowances (+):'}</label>
                    <input
                      type="number"
                      value={editBonuses}
                      onChange={(e) => setEditBonuses(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-850 px-3 py-2 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  {/* live net calculation preview */}
                  <div className="p-3 bg-orange-500/5 border border-orange-500/15 rounded-xl flex justify-between items-center text-[10px] font-extrabold text-orange-400">
                    <span>{isRtl ? 'صافي الراتب المتوقع صرفه:' : 'Simulated Net Payout:'}</span>
                    <span className="font-mono text-xs font-black text-orange-400">
                      {((parseFloat(editBaseSalary) || 0) - (parseFloat(editAdvances) || 0) - (parseFloat(editDeductions) || 0) + (parseFloat(editBonuses) || 0)).toFixed(2)} SAR
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black py-2.5 rounded-xl transition shadow-md active:scale-95 cursor-pointer"
                  >
                    {isRtl ? 'حفظ مسار الأجور وتحديث الأرشيف' : 'Save Slip Changes & Log'}
                  </button>

                </form>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
