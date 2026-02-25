import React, { useState, useEffect } from 'react';
import { Send, History, Wallet, Image as ImageIcon, CheckCircle2, Clock, XCircle, Banknote } from 'lucide-react';
import { motion } from 'motion/react';
import { CreditRequest } from '../types';

interface UserDashboardProps {
  rate: number;
  transferPhone: string;
  onSubmit: (data: any) => void;
  requests: CreditRequest[];
}

export default function UserDashboard({ rate, transferPhone, onSubmit, requests }: UserDashboardProps) {
  const [amount, setAmount] = useState<string>('');
  const [wallet, setWallet] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [image, setImage] = useState<string | null>(null);

  const calculatedPrice = amount ? Math.floor((parseInt(amount) * rate) / 1000) : 0;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !wallet || !bankAccount || !image) return;
    onSubmit({
      amount: parseInt(amount),
      price: calculatedPrice,
      wallet_number: wallet,
      bank_account: bankAccount,
      proof_image: image
    });
    setAmount('');
    setWallet('');
    setBankAccount('');
    setImage(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-xs font-bold"><Clock className="w-3 h-3" /> قيد المراجعة</span>;
      case 'accepted': return <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full text-xs font-bold"><CheckCircle2 className="w-3 h-3" /> مقبول</span>;
      case 'paid': return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-bold"><Banknote className="w-3 h-3" /> تم الدفع</span>;
      case 'rejected': return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-bold"><XCircle className="w-3 h-3" /> مرفوض</span>;
      default: return null;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Request Form */}
      <div className="md:col-span-2 space-y-6">
        <div className="bg-white rounded-3xl shadow-sm border border-black/5 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Send className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">إرسال طلب بيع رصيد</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4">
              <p className="text-amber-800 text-sm font-bold mb-1">يرجى تحويل الرصيد إلى هذا الرقم:</p>
              <p className="text-2xl font-black text-amber-900 font-mono text-center tracking-widest">{transferPhone}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 mr-1">كمية الرصيد (آسيا)</label>
                <input
                  type="number"
                  required
                  placeholder="مثلاً: 100000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 mr-1">السعر المستحق (دينار)</label>
                <div className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl py-3 px-4 text-emerald-700 font-bold">
                  {calculatedPrice.toLocaleString()} د.ع
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 mr-1">رقم المحفظة (ZainCash / SuperKey)</label>
                <div className="relative">
                  <Wallet className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="07XXXXXXXXX"
                    value={wallet}
                    onChange={(e) => setWallet(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pr-11 pl-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 mr-1">رقم الحساب البنكي</label>
                <div className="relative">
                  <Banknote className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="رقم الحساب"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pr-11 pl-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 mr-1">إثبات التحويل (صورة)</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="proof-upload"
                />
                <label
                  htmlFor="proof-upload"
                  className="flex flex-col items-center justify-center w-full h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors overflow-hidden"
                >
                  {image ? (
                    <img src={image} alt="Proof" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">اضغط لرفع صورة الإثبات</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
            >
              إرسال الطلب
            </button>
          </form>
        </div>

        {/* Info Card */}
        <div className="bg-emerald-900 text-white rounded-3xl p-6 relative overflow-hidden">
          <div className="relative z-10">
            <h4 className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-2">التسعيرة الحالية</h4>
            <p className="text-2xl font-bold mb-1">كل 1,000 رصيد آسيا</p>
            <p className="text-4xl font-black text-emerald-400">{rate} د.ع</p>
          </div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-800 rounded-full blur-3xl opacity-50"></div>
        </div>
      </div>

      {/* History */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <History className="w-5 h-5 text-gray-400" />
          <h3 className="font-bold">طلباتي السابقة</h3>
        </div>
        
        {requests.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-black/5">
            <p className="text-gray-400 text-sm italic">لا توجد طلبات سابقة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-lg">{req.amount.toLocaleString()} آسيا</span>
                  {getStatusBadge(req.status)}
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>{req.price.toLocaleString()} د.ع</span>
                  <span>{new Date(req.created_at).toLocaleDateString('ar-IQ')}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
