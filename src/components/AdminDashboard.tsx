import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Settings, CheckCircle, XCircle, Banknote, ExternalLink, RefreshCw, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditRequest, RequestStatus } from '../types';

interface AdminDashboardProps {
  requests: CreditRequest[];
  currentRate: number;
  transferPhone: string;
  onUpdateStatus: (id: number, status: RequestStatus) => void;
  onUpdateSettings: (data: { rate?: number; transfer_phone?: string }) => Promise<void>;
}

export default function AdminDashboard({ requests, currentRate, transferPhone, onUpdateStatus, onUpdateSettings }: AdminDashboardProps) {
  const [newRate, setNewRate] = useState(currentRate.toString());
  const [newTransferPhone, setNewTransferPhone] = useState(transferPhone);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Sync state when props change (e.g. after initial load or broadcast)
  useEffect(() => {
    setNewRate(currentRate.toString());
  }, [currentRate]);

  useEffect(() => {
    setNewTransferPhone(transferPhone);
  }, [transferPhone]);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await onUpdateSettings({ 
        rate: parseInt(newRate),
        transfer_phone: newTransferPhone
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Admin Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-black/5 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">إحصائيات سريعة</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-400 font-bold uppercase mb-1">المعلقة</p>
              <p className="text-2xl font-black text-amber-600">{requests.filter(r => r.status === 'pending').length}</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-400 font-bold uppercase mb-1">المقبولة</p>
              <p className="text-2xl font-black text-blue-600">{requests.filter(r => r.status === 'accepted').length}</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-400 font-bold uppercase mb-1">المدفوعة</p>
              <p className="text-2xl font-black text-emerald-600">{requests.filter(r => r.status === 'paid').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gray-50 text-gray-600 rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">إعدادات النظام</h3>
          </div>
          <form onSubmit={handleSettingsSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 mr-1">سعر الـ 1000 آسيا</label>
              <input
                type="number"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 mr-1">رقم تحويل الرصيد</label>
              <input
                type="text"
                value={newTransferPhone}
                onChange={(e) => setNewTransferPhone(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={isUpdating}
              className={`w-full font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2 ${
                showSuccess ? 'bg-emerald-600 text-white' : 'bg-black text-white hover:bg-gray-800'
              } disabled:opacity-50`}
            >
              {isUpdating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : showSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {showSuccess ? 'تم التحديث بنجاح' : 'تحديث الإعدادات'}
            </button>
          </form>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
          <h3 className="text-lg font-bold">إدارة الطلبات</h3>
          <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
            إجمالي الطلبات: {requests.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <th className="px-6 py-4">التاريخ</th>
                <th className="px-6 py-4">المستخدم</th>
                <th className="px-6 py-4">الكمية (آسيا)</th>
                <th className="px-6 py-4">المبلغ المستحق</th>
                <th className="px-6 py-4">المحفظة/البنك</th>
                <th className="px-6 py-4 text-center">الإثبات</th>
                <th className="px-6 py-4">الحالة</th>
                <th className="px-6 py-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400 italic">
                    لا توجد طلبات حالياً
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-emerald-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-500">
                        {new Date(req.created_at).toLocaleDateString('ar-IQ')}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {new Date(req.created_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-700">{req.user_phone}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-black text-gray-900">{req.amount.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-emerald-600 font-black">{req.price.toLocaleString()} د.ع</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-600 mb-1">
                        محفظة: {req.wallet_number}
                      </div>
                      <div className="font-mono text-[10px] bg-blue-50 px-2 py-0.5 rounded text-blue-600">
                        بنك: {req.bank_account}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedImage(req.proof_image)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors text-xs font-bold"
                      >
                        <ExternalLink className="w-3 h-3" />
                        عرض
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        req.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                        req.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          req.status === 'pending' ? 'bg-amber-500' :
                          req.status === 'accepted' ? 'bg-blue-500' :
                          req.status === 'paid' ? 'bg-emerald-500' :
                          'bg-red-500'
                        }`}></span>
                        {req.status === 'pending' ? 'قيد المراجعة' :
                         req.status === 'accepted' ? 'مقبول' :
                         req.status === 'paid' ? 'تم الدفع' : 'مرفوض'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        {req.status === 'pending' && (
                          <>
                            <button
                              onClick={() => onUpdateStatus(req.id, 'accepted')}
                              className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm shadow-blue-100"
                              title="قبول الطلب"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onUpdateStatus(req.id, 'rejected')}
                              className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm shadow-red-100"
                              title="رفض الطلب"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {req.status === 'accepted' && (
                          <button
                            onClick={() => onUpdateStatus(req.id, 'paid')}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 text-xs font-bold"
                          >
                            <Banknote className="w-4 h-4" />
                            تأكيد الدفع
                          </button>
                        )}
                        {req.status === 'paid' && (
                          <span className="text-emerald-500">
                            <CheckCircle className="w-5 h-5" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="max-w-3xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <img src={selectedImage} alt="Proof" className="w-full h-auto max-h-[80vh] object-contain" />
            <div className="p-4 text-center">
              <button
                onClick={() => setSelectedImage(null)}
                className="bg-black text-white px-8 py-2 rounded-xl font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
