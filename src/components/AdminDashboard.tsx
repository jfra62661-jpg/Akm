import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Settings, CheckCircle, XCircle, Banknote, ExternalLink, RefreshCw, Check, Users, ShieldCheck, X, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditRequest, RequestStatus, User, AppSettings, Withdrawal, PackageRequest, ChargeRequest } from '../types';
import AdminSupport from './AdminSupport';

interface AdminDashboardProps {
  requests: CreditRequest[];
  currentRate: number;
  transferPhone: string;
  onUpdateStatus: (id: number, status: RequestStatus) => void;
  onUpdateSettings: (data: any) => Promise<void>;
}

export default function AdminDashboard({ requests, currentRate, transferPhone, onUpdateStatus, onUpdateSettings }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'requests' | 'withdrawals' | 'packages' | 'charge' | 'settings' | 'users' | 'support'>('charge');
  const [selectedRequest, setSelectedRequest] = useState<CreditRequest | null>(null);
  const [selectedPackageRequest, setSelectedPackageRequest] = useState<PackageRequest | null>(null);
  const [selectedChargeRequest, setSelectedChargeRequest] = useState<ChargeRequest | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [packageRequests, setPackageRequests] = useState<PackageRequest[]>([]);
  const [chargeRequests, setChargeRequests] = useState<ChargeRequest[]>([]);
  const [newRate, setNewRate] = useState(currentRate.toString());
  const [newTransferPhone, setNewTransferPhone] = useState(transferPhone);
  const [minWithdraw, setMinWithdraw] = useState('100000');
  const [winRate, setWinRate] = useState('30');
  const [luckGiftWinRate, setLuckGiftWinRate] = useState('30');
  const [luckGiftMultiplier, setLuckGiftMultiplier] = useState('5');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    if (activeTab === 'users') {
      fetch('/api/admin/users').then(res => res.json()).then(setUsers);
    }
    if (activeTab === 'withdrawals') {
      fetch('/api/admin/withdrawals').then(res => res.json()).then(setWithdrawals);
    }
    if (activeTab === 'packages') {
      fetch('/api/admin/package-requests').then(res => res.json()).then(setPackageRequests);
    }
    if (activeTab === 'charge') {
      fetch('/api/admin/charge-requests').then(res => res.json()).then(setChargeRequests);
    }
    fetch('/api/settings').then(res => res.json()).then(data => {
      setMinWithdraw(data.min_withdraw_points.toString());
      setWinRate(data.win_rate_luck.toString());
      setLuckGiftWinRate(data.luck_gift_win_rate?.toString() || '30');
      setLuckGiftMultiplier(data.luck_gift_multiplier?.toString() || '5');
    });
  }, [activeTab]);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    await onUpdateSettings({ 
      rate: parseInt(newRate), 
      transfer_phone: newTransferPhone,
      min_withdraw_points: parseInt(minWithdraw),
      win_rate_luck: parseInt(winRate),
      luck_gift_win_rate: parseInt(luckGiftWinRate),
      luck_gift_multiplier: parseInt(luckGiftMultiplier)
    });
    setIsUpdating(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleUpdateUser = async (id: number, data: any) => {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    setEditingUser(null);
    fetch('/api/admin/users').then(res => res.json()).then(setUsers);
  };

  const handleUpdateWithdrawal = async (id: number, status: string) => {
    await fetch(`/api/admin/withdrawals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetch('/api/admin/withdrawals').then(res => res.json()).then(setWithdrawals);
  };

  const handleUpdatePackageRequest = async (id: number, status: string) => {
    await fetch(`/api/admin/package-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    setSelectedPackageRequest(null);
    fetch('/api/admin/package-requests').then(res => res.json()).then(setPackageRequests);
  };

  const handleUpdateChargeRequest = async (id: number, status: string) => {
    await fetch(`/api/admin/charge-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    setSelectedChargeRequest(null);
    fetch('/api/admin/charge-requests').then(res => res.json()).then(setChargeRequests);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-black text-gray-900">لوحة التحكم</h2>
        <div className="flex p-1 bg-gray-100 rounded-2xl w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'requests' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
          >
            الطلبات
          </button>
          <button
            onClick={() => setActiveTab('charge')}
            className={`flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'charge' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
          >
            شحن النقاط
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'withdrawals' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
          >
            السحوبات
          </button>
          <button
            onClick={() => setActiveTab('packages')}
            className={`flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'packages' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
          >
            الباقات
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
          >
            المستخدمين
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'support' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
          >
            الدعم الفني
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
          >
            الإعدادات
          </button>
        </div>
      </div>

      {activeTab === 'requests' && (
        <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <h3 className="font-bold">طلبات بيع الرصيد</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-black">
                <tr>
                  <th className="px-6 py-4">المستخدم</th>
                  <th className="px-6 py-4">الكمية</th>
                  <th className="px-6 py-4">المبلغ</th>
                  <th className="px-6 py-4">الحالة</th>
                  <th className="px-6 py-4">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{req.user_phone}</span>
                        <span className="text-[10px] text-gray-400">{new Date(req.created_at).toLocaleString('ar-IQ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold">{req.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">{req.price.toLocaleString()} د.ع</td>
                    <td className="px-6 py-4">
                      {req.status === 'pending' && <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-[10px] font-bold">قيد الانتظار</span>}
                      {req.status === 'accepted' && <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-full text-[10px] font-bold">مقبول</span>}
                      {req.status === 'paid' && <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-[10px] font-bold">تم الدفع</span>}
                      {req.status === 'rejected' && <span className="text-red-600 bg-red-50 px-2 py-1 rounded-full text-[10px] font-bold">مرفوض</span>}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="text-emerald-600 hover:text-emerald-700 font-bold text-xs"
                      >
                        عرض التفاصيل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'withdrawals' && (
        <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <h3 className="font-bold">طلبات سحب الأرباح</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-black">
                <tr>
                  <th className="px-6 py-4">المستخدم</th>
                  <th className="px-6 py-4">النقاط</th>
                  <th className="px-6 py-4">المبلغ</th>
                  <th className="px-6 py-4">المحفظة</th>
                  <th className="px-6 py-4">الحالة</th>
                  <th className="px-6 py-4">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{w.user_phone}</span>
                        <span className="text-[10px] text-gray-400">{new Date(w.created_at).toLocaleString('ar-IQ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold">{w.points.toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">{w.amount.toLocaleString()} د.ع</td>
                    <td className="px-6 py-4 font-mono text-xs">{w.wallet_number}</td>
                    <td className="px-6 py-4">
                      {w.status === 'pending' && <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-[10px] font-bold">قيد الانتظار</span>}
                      {w.status === 'paid' && <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-[10px] font-bold">تم الدفع</span>}
                      {w.status === 'rejected' && <span className="text-red-600 bg-red-50 px-2 py-1 rounded-full text-[10px] font-bold">مرفوض</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {w.status === 'pending' && (
                          <>
                            <button onClick={() => handleUpdateWithdrawal(w.id, 'paid')} className="text-emerald-600 hover:text-emerald-700 font-bold text-xs">تأكيد الدفع</button>
                            <button onClick={() => handleUpdateWithdrawal(w.id, 'rejected')} className="text-red-600 hover:text-red-700 font-bold text-xs">رفض</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'packages' && (
        <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <h3 className="font-bold">طلبات تفعيل الباقات</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-black">
                <tr>
                  <th className="px-6 py-4">المستخدم</th>
                  <th className="px-6 py-4">الباقة</th>
                  <th className="px-6 py-4">السعر</th>
                  <th className="px-6 py-4">الحالة</th>
                  <th className="px-6 py-4">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {packageRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setSelectedPackageRequest(req)}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{req.user_phone}</span>
                        <span className="text-[10px] text-gray-400">{new Date(req.created_at).toLocaleString('ar-IQ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold">{req.package_name}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">{req.package_price?.toLocaleString()} د.ع</td>
                    <td className="px-6 py-4">
                      {req.status === 'pending' && <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-[10px] font-bold">قيد الانتظار</span>}
                      {req.status === 'accepted' && <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-[10px] font-bold">مقبول</span>}
                      {req.status === 'rejected' && <span className="text-red-600 bg-red-50 px-2 py-1 rounded-full text-[10px] font-bold">مرفوض</span>}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setSelectedPackageRequest(req)}
                        className="text-emerald-600 hover:text-emerald-700 font-bold text-xs"
                      >
                        عرض التفاصيل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'charge' && (
        <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <h3 className="font-bold">طلبات شحن النقاط</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-black">
                <tr>
                  <th className="px-6 py-4">رقم المستخدم</th>
                  <th className="px-6 py-4">النقاط المطلوبة</th>
                  <th className="px-6 py-4">المبلغ (د.ع)</th>
                  <th className="px-6 py-4">الحالة</th>
                  <th className="px-6 py-4">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {chargeRequests.map((req) => (
                  <tr key={req.id} onClick={() => setSelectedChargeRequest(req)} className="hover:bg-gray-50/50 cursor-pointer transition-colors">
                    <td className="px-6 py-4 font-bold text-sm">{req.user_phone}</td>
                    <td className="px-6 py-4 font-black">{req.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 font-black text-emerald-600">{req.price.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        req.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                        req.status === 'accepted' ? 'bg-blue-50 text-blue-600' :
                        req.status === 'paid' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {req.status === 'pending' ? 'قيد المراجعة' : req.status === 'accepted' ? 'مقبول' : req.status === 'paid' ? 'تم الدفع' : 'مرفوض'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-bold">{new Date(req.created_at).toLocaleDateString('ar-IQ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'support' && (
        <AdminSupport />
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <h3 className="font-bold">إدارة المستخدمين</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-black">
                <tr>
                  <th className="px-6 py-4">الهاتف / البريد</th>
                  <th className="px-6 py-4">النقاط</th>
                  <th className="px-6 py-4">الباقة</th>
                  <th className="px-6 py-4">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{u.phone}</span>
                        <span className="text-[10px] text-gray-400">{u.email || 'بدون بريد'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black">{u.points.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      {u.package_id ? <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-[10px] font-bold">باقة {u.package_id}</span> : <span className="text-gray-400 text-[10px]">بدون باقة</span>}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setEditingUser(u)}
                        className="text-indigo-600 hover:text-indigo-700 font-bold text-xs"
                      >
                        تعديل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Settings className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold">إعدادات النظام المالية</h3>
              </div>
              {isUpdating && <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />}
            </div>

            <form onSubmit={handleSettingsSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 mr-1">سعر صرف الـ 1,000 آسيا</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={newRate}
                      onChange={(e) => setNewRate(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-5 text-xl font-black text-gray-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                    />
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">د.ع</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 mr-1">رقم استلام الرصيد</label>
                  <input
                    type="text"
                    value={newTransferPhone}
                    onChange={(e) => setNewTransferPhone(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-5 font-mono text-lg font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 mr-1">الحد الأدنى للسحب (نقاط)</label>
                    <input
                      type="number"
                      value={minWithdraw}
                      onChange={(e) => setMinWithdraw(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 font-bold text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 mr-1">نسبة فوز لعبة الحظ %</label>
                    <input
                      type="number"
                      value={winRate}
                      onChange={(e) => setWinRate(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 font-bold text-gray-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 mr-1">نسبة فوز هدية الحظ %</label>
                    <input
                      type="number"
                      value={luckGiftWinRate}
                      onChange={(e) => setLuckGiftWinRate(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 font-bold text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 mr-1">مضاعف فوز هدية الحظ</label>
                    <input
                      type="number"
                      value={luckGiftMultiplier}
                      onChange={(e) => setLuckGiftMultiplier(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 font-bold text-gray-900"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdating}
                className={`w-full font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg ${
                  showSuccess ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-black text-white hover:bg-gray-800 shadow-gray-200'
                } disabled:opacity-50`}
              >
                {showSuccess ? <><Check className="w-5 h-5" /> تم الحفظ</> : <><RefreshCw className={`w-5 h-5 ${isUpdating ? 'animate-spin' : ''}`} /> حفظ الإعدادات</>}
              </button>
            </form>
          </div>

          <div className="bg-emerald-900 text-white rounded-3xl p-8 flex flex-col justify-center items-center text-center">
            <ShieldCheck className="w-16 h-16 text-emerald-400 mb-4" />
            <h3 className="text-xl font-black mb-2">وضع الإدارة الآمن</h3>
            <p className="text-emerald-200 text-sm">جميع التغييرات التي تجريها هنا تنعكس فوراً على جميع المستخدمين. يرجى توخي الحذر عند تعديل نسب الفوز.</p>
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setSelectedRequest(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[2.5rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-2xl font-black mb-1">تفاصيل الطلب #{selectedRequest.id}</h3>
                    <p className="text-gray-400 font-bold text-sm">مرسل من: {selectedRequest.user_phone}</p>
                  </div>
                  <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">المبلغ المطلوب</p>
                      <p className="text-2xl font-black text-emerald-600">{selectedRequest.price.toLocaleString()} د.ع</p>
                      <p className="text-xs text-gray-400 font-bold">مقابل {selectedRequest.amount.toLocaleString()} رصيد</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">رقم المحفظة</p>
                        <p className="font-mono font-bold text-lg">{selectedRequest.wallet_number}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">رقم الحساب البنكي</p>
                        <p className="font-mono font-bold text-lg">{selectedRequest.bank_account}</p>
                      </div>
                    </div>
                  </div>
                  <div className="relative aspect-square rounded-3xl overflow-hidden border border-gray-100 shadow-inner bg-gray-50">
                    <img src={selectedRequest.proof_image} alt="Proof" className="w-full h-full object-contain" />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    onClick={() => { onUpdateStatus(selectedRequest.id, 'accepted'); setSelectedRequest(null); }}
                    className="bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 transition-all text-sm shadow-lg shadow-blue-200"
                  >
                    قبول
                  </button>
                  <button
                    onClick={() => { onUpdateStatus(selectedRequest.id, 'paid'); setSelectedRequest(null); }}
                    className="bg-emerald-600 text-white font-black py-4 rounded-2xl hover:bg-emerald-700 transition-all text-sm shadow-lg shadow-emerald-200"
                  >
                    تم الدفع
                  </button>
                  <button
                    onClick={() => { onUpdateStatus(selectedRequest.id, 'rejected'); setSelectedRequest(null); }}
                    className="bg-red-600 text-white font-black py-4 rounded-2xl hover:bg-red-700 transition-all text-sm shadow-lg shadow-red-200"
                  >
                    رفض
                  </button>
                  <button
                    onClick={() => { onUpdateStatus(selectedRequest.id, 'pending'); setSelectedRequest(null); }}
                    className="bg-gray-100 text-gray-600 font-black py-4 rounded-2xl hover:bg-gray-200 transition-all text-sm"
                  >
                    انتظار
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-black mb-6">تعديل بيانات المستخدم</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">رصيد النقاط</label>
                <input
                  type="number"
                  defaultValue={editingUser.points}
                  id="edit-points"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 font-black"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">الباقة المفعلة</label>
                <select
                  id="edit-package"
                  defaultValue={editingUser.package_id || ''}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 font-bold"
                >
                  <option value="">بدون باقة</option>
                  <option value="1">الباقة البرونزية</option>
                  <option value="2">الباقة الفضية</option>
                  <option value="3">الباقة الذهبية</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleUpdateUser(editingUser.id, {
                    points: parseInt((document.getElementById('edit-points') as HTMLInputElement).value),
                    package_id: (document.getElementById('edit-package') as HTMLSelectElement).value ? parseInt((document.getElementById('edit-package') as HTMLSelectElement).value) : null
                  })}
                  className="flex-1 bg-black text-white font-black py-4 rounded-2xl"
                >
                  حفظ
                </button>
                <button onClick={() => setEditingUser(null)} className="flex-1 bg-gray-100 text-gray-600 font-black py-4 rounded-2xl">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedPackageRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h3 className="text-xl font-black text-gray-900">تفاصيل طلب الباقة #{selectedPackageRequest.id}</h3>
                  <p className="text-sm text-gray-500 mt-1">{new Date(selectedPackageRequest.created_at).toLocaleString('ar-IQ')}</p>
                </div>
                <button onClick={() => setSelectedPackageRequest(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-xs text-gray-500 font-bold mb-1">رقم المستخدم</p>
                    <p className="font-black text-lg" dir="ltr">{selectedPackageRequest.user_phone}</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                    <p className="text-xs text-emerald-600 font-bold mb-1">الباقة المطلوبة</p>
                    <p className="font-black text-lg text-emerald-700">{selectedPackageRequest.package_name}</p>
                    <p className="text-sm text-emerald-600 font-bold mt-1">السعر: {selectedPackageRequest.package_price?.toLocaleString()} د.ع</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <ExternalLink className="w-5 h-5 text-gray-400" />
                    إثبات التحويل
                  </h4>
                  <div className="bg-gray-50 rounded-2xl border border-gray-200 p-2">
                    <img src={selectedPackageRequest.proof_image} alt="Proof" className="w-full rounded-xl" />
                  </div>
                </div>
              </div>

              {selectedPackageRequest.status === 'pending' && (
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                  <button
                    onClick={() => handleUpdatePackageRequest(selectedPackageRequest.id, 'accepted')}
                    className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-black hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    قبول وتفعيل الباقة
                  </button>
                  <button
                    onClick={() => handleUpdatePackageRequest(selectedPackageRequest.id, 'rejected')}
                    className="flex-1 bg-red-100 text-red-600 py-4 rounded-xl font-black hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    رفض الطلب
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Charge Request Modal */}
      <AnimatePresence>
        {selectedChargeRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedChargeRequest(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] max-w-lg w-full overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-black">تفاصيل طلب الشحن #{selectedChargeRequest.id}</h3>
                <button onClick={() => setSelectedChargeRequest(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">رقم المستخدم</p>
                    <p className="font-bold text-gray-900">{selectedChargeRequest.user_phone}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">النقاط المطلوبة</p>
                    <p className="font-black text-indigo-600 text-lg">{selectedChargeRequest.amount.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl col-span-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">المبلغ المحول (د.ع)</p>
                    <p className="font-black text-emerald-600 text-lg">{selectedChargeRequest.price.toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">إثبات التحويل</p>
                  <div className="bg-gray-50 rounded-2xl p-2 border border-gray-100">
                    <img 
                      src={selectedChargeRequest.proof_image} 
                      alt="Proof" 
                      className="w-full h-48 object-contain rounded-xl"
                    />
                  </div>
                </div>

                {selectedChargeRequest.status === 'pending' && (
                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleUpdateChargeRequest(selectedChargeRequest.id, 'accepted')}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      قبول وإضافة النقاط
                    </button>
                    <button
                      onClick={() => handleUpdateChargeRequest(selectedChargeRequest.id, 'rejected')}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" />
                      رفض الطلب
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
