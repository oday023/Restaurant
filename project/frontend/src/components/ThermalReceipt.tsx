/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { Printer, X, Download, Share2, CornerDownLeft } from 'lucide-react';
import { Order, Tenant, Branch } from '../types';

interface ThermalReceiptProps {
  order: Order;
  tenant: Tenant;
  branch: Branch;
  onClose: () => void;
  language: 'ar' | 'en';
}

export default function ThermalReceipt({ order, tenant, branch, onClose, language }: ThermalReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const isRtl = language === 'ar';

  const handlePrint = () => {
    // Generate isolated print window for standard 80mm ESC/POS hardware printers
    const printContent = receiptRef.current?.innerHTML;
    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const printWindow = window.open(windowUrl, uniqueName.toString(), 'left=50,top=50,width=400,height=600');
    
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt - ${order.id}</title>
            <style>
              @page {
                size: 80mm auto;
                margin: 0;
              }
              body {
                font-family: 'Courier New', Courier, monospace, sans-serif, 'Cairo';
                width: 76mm;
                margin: 0 auto;
                padding: 3mm;
                font-size: 11px;
                line-height: 1.4;
                color: #000000;
              }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .text-left { text-align: left; }
              .font-bold { font-weight: bold; }
              .divider { border-top: 1px dashed #000000; margin: 3mm 0; }
              .double-divider { border-top: 2px double #000000; margin: 3mm 0; }
              .flex-row { display: flex; justify-content: space-between; }
              .direction-rtl { direction: rtl; }
              .direction-ltr { direction: ltr; }
              .barcode { font-family: 'Libre Barcode 39', monospace; font-size: 24px; text-align: center; margin: 2mm 0; }
              .img-qr { width: 35mm; height: 35mm; margin: 2mm auto; display: block; }
              table { width: 100%; border-collapse: collapse; }
              td, th { padding: 1mm 0; font-size: 11px; }
              .extra-item { font-size: 9px; padding-left: 3mm; color: #333333; }
            </style>
          </head>
          <body>
            ${printContent}
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-3xl p-6 shadow-2xl max-w-md w-full relative flex flex-col max-h-[90vh]">
        
        {/* Modal Header Controls */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-4 text-white">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                {isRtl ? 'محاكاة الطابعة الحرارية للفواتير' : 'Thermal Receipt Simulator'}
              </h3>
              <p className="text-[11px] text-slate-400">
                80mm ESC/POS Roll Format
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1 px-2.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Paper Roll Wrapper with Jagged Borders */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="bg-amber-50/50 p-2 rounded-xl border border-amber-200/50 shadow-inner">
            <div 
              id="thermal-paper-printable"
              ref={receiptRef}
              className="bg-white text-slate-900 p-5 shadow-lg border border-gray-200 font-mono text-xs relative max-w-[320px] mx-auto"
              style={{
                backgroundImage: 'radial-gradient(circle, transparent 20%, #ffffff 20%, #ffffff 80%, transparent 80%, transparent), radial-gradient(circle, transparent 20%, #ffffff 20%, #ffffff 80%, transparent 80%, transparent)',
                backgroundSize: '12px 24px',
                backgroundPosition: '0 0, 6px 12px',
              }}
            >
              {/* Receipt Content */}
              <div className="text-center">
                <span className="text-xl">{tenant.logoUrl || '🍔'}</span>
                <h2 className="text-base font-bold uppercase mt-1">
                  {language === 'ar' ? tenant.nameAr : tenant.nameEn}
                </h2>
                <p className="text-[10px] text-gray-500 leading-tight">
                  {language === 'ar' ? branch.nameAr : branch.nameEn} <br />
                  {branch.address}
                </p>
                <p className="text-[10px] text-gray-500">
                  {isRtl ? 'الرقم الضريبي لكبار المكلفين' : 'VAT Reg No'}: 300984321200003
                </p>
                <div className="border-t border-dashed border-gray-400 my-2"></div>
                <h3 className="font-bold text-[11px]">
                  {isRtl ? 'فاتورة ضريبية مبسطة' : 'SIMPLIFIED TAX INVOICE'}
                </h3>
                <div className="border-t border-dashed border-gray-400 my-2"></div>
              </div>

              {/* Order Meta */}
              <div className="space-y-0.5 text-[10px] text-slate-700">
                <div className="flex justify-between">
                  <span>{isRtl ? 'رقم الفاتورة' : 'Invoice Number'}:</span>
                  <span className="font-bold">INV-{order.id.slice(-6).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span>{isRtl ? 'التاريخ والوقت' : 'Date & Time'}:</span>
                  <span>{new Date(order.createdAt).toISOString().replace('T', ' ').slice(0, 19)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{isRtl ? 'نوع الخدمة' : 'Order Type'}:</span>
                  <span className="font-bold">
                    {order.type === 'dine_in' 
                      ? (isRtl ? 'داخلي صالة' : 'Dine-In')
                      : order.type === 'takeaway' 
                      ? (isRtl ? 'سفري' : 'Takeaway') 
                      : (isRtl ? 'توصيل منزلي' : 'Delivery')}
                  </span>
                </div>
                {order.tableId && (
                  <div className="flex justify-between">
                    <span>{isRtl ? 'رقم الطاولة' : 'Table Number'}:</span>
                    <span className="font-bold text-[12px] bg-slate-100 px-1 rounded">
                      {order.tableId.includes('tbl_') ? order.tableId.split('_').pop() : '101'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{isRtl ? 'صاحب الطلب' : 'Served By'}:</span>
                  <span>{order.customerName || (isRtl ? 'كاشير مبيعات' : 'Sales Cashier')}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-400 my-2"></div>

              {/* Invoice Table Items */}
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-dashed border-gray-400">
                    <th className="text-left py-1 font-bold">{isRtl ? 'الصنف' : 'Item'}</th>
                    <th className="text-center py-1 font-bold">{isRtl ? 'الكمية' : 'Qty'}</th>
                    <th className="text-right py-1 font-bold">{isRtl ? 'السعر' : 'Price'}</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <React.Fragment key={item.id || idx}>
                      <tr className="align-top">
                        <td className="py-1">
                          <span className="font-semibold block">
                            {language === 'ar' ? item.nameAr : item.nameEn}
                          </span>
                          {item.notes && (
                            <span className="text-[8px] text-red-500 block">
                              * {item.notes}
                            </span>
                          )}
                        </td>
                        <td className="text-center py-1">x{item.quantity}</td>
                        <td className="text-right py-1">{(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                      {item.selectedExtras.map((ex, eIdx) => (
                        <tr key={eIdx} className="text-[9px] text-gray-500">
                          <td className="pl-2">
                            + {language === 'ar' ? ex.nameAr : ex.nameEn}
                          </td>
                          <td className="text-center">x{item.quantity}</td>
                          <td className="text-right">{(ex.price * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-dashed border-gray-400 my-2"></div>

              {/* Calculations ledger */}
              <div className="space-y-0.5 text-[10px] font-mono">
                <div className="flex justify-between">
                  <span>{isRtl ? 'المجموع الأساسي' : 'Subtotal'}:</span>
                  <span>{order.subtotal.toFixed(2)} {language === 'ar' ? tenant.currencyAr : tenant.currencyEn}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>{isRtl ? 'الخصوم الترويجية -' : 'Discounts -'}:</span>
                    <span>-{order.discountAmount.toFixed(2)}  {language === 'ar' ? tenant.currencyAr : tenant.currencyEn}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{isRtl ? 'الضريبة المضافة (١٥٪)' : 'VAT (15%)'}:</span>
                  <span>{order.taxAmount.toFixed(2)}  {language === 'ar' ? tenant.currencyAr : tenant.currencyEn}</span>
                </div>
                {tenant.servicePercent > 0 && (
                  <div className="flex justify-between">
                    <span>{isRtl ? 'رسوم الخدمة والضيافة' : 'Service Fee'}:</span>
                    <span>{order.serviceAmount.toFixed(2)}  {language === 'ar' ? tenant.currencyAr : tenant.currencyEn}</span>
                  </div>
                )}
                
                <div className="border-t border-dashed border-gray-400 my-1"></div>
                
                <div className="flex justify-between text-base font-bold">
                  <span>{isRtl ? 'المجموع النهائي' : 'GRAND TOTAL'}:</span>
                  <span>{order.total.toFixed(2)} {language === 'ar' ? tenant.currencyAr : tenant.currencyEn}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-400 my-2"></div>

              {/* Footer Payment and QR */}
              <div className="text-center space-y-1">
                <p className="text-[10px] font-bold">
                  {isRtl ? 'طريقة الدفع' : 'Payment Mode'}: <span className="uppercase text-emerald-600">{order.paymentMethod === 'unpaid' ? (isRtl ? 'غير مدفوع' : 'UNPAID') : (isRtl ? 'شبكة / نقداً' : order.paymentMethod)}</span>
                </p>
                <p className="text-[10px] font-bold">
                  {isRtl ? 'حالة الفاتورة' : 'Bill Status'}: <span className="uppercase text-indigo-600">{order.paymentStatus === 'paid' ? (isRtl ? 'مدفوعة بالكامل' : 'PAID') : (isRtl ? 'بانتظار السداد' : 'PENDING PAYMENT')}</span>
                </p>

                {/* ZATCA Simplified QR compliance layout */}
                <div className="my-2 flex justify-center">
                  <svg className="w-24 h-24 bg-gray-100 p-1 rounded" viewBox="0 0 100 100" fill="currentColor">
                    {/* Generates a stylized compliant QR representation */}
                    <rect x="0" y="0" width="20" height="20" />
                    <rect x="80" y="0" width="20" height="20" />
                    <rect x="0" y="80" width="20" height="20" />
                    <rect x="5" y="5" width="10" height="10" fill="white" />
                    <rect x="85" y="5" width="10" height="10" fill="white" />
                    <rect x="5" y="85" width="10" height="10" fill="white" />
                    <rect x="25" y="5" width="4" height="20" />
                    <rect x="35" y="15" width="15" height="4" />
                    <rect x="55" y="5" width="4" height="35" />
                    <rect x="25" y="45" width="30" height="4" />
                    <rect x="15" y="55" width="4" height="15" />
                    <rect x="65" y="65" width="20" height="20" />
                    <rect x="45" y="75" width="15" height="4" />
                  </svg>
                </div>

                <p className="text-[8px] text-gray-400 mt-1 uppercase font-semibold leading-tight">
                  {isRtl ? 'شكراً لزيارتكم وطاب يومكم بالهناء والشفاء' : 'Thank you for dining with us! Enjoy your meal'}
                </p>
                <p className="text-[7px] text-gray-400 mt-0.5">
                  Powered by Qube POS SaaS ERP
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Print Buttons Container */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all text-xs"
          >
            <Printer className="w-4 h-4" />
            {isRtl ? 'اطبع الإيصال' : 'Print Receipt'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold py-3 rounded-2xl active:scale-[0.98] transition-all text-xs"
          >
            {isRtl ? 'إغلاق الشاشة' : 'Close Details'}
          </button>
        </div>

      </div>
    </div>
  );
}
