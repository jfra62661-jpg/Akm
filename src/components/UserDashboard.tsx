import React, { useState, useEffect } from 'react';
import { Send, History, Wallet, Image as ImageIcon, CheckCircle2, Clock, XCircle, Banknote, Coins, Gift, Zap, Gamepad2, Package as PackageIcon, ArrowUpRight, User as UserIcon, Moon, Sun, Globe, Mic, CreditCard, Star, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { CreditRequest, User, Package } from '../types';
import Games from './Games';
import Rooms from './Rooms';

interface UserDashboardProps {
  user: User;
  rate: number;
  transferPhone: string;
  onSubmit: (data: any) => void;
  requests: CreditRequest[];
  onUpdateUser: (data: Partial<User>) => void;
}

export default function UserDashboard({ user, rate, transferPhone, onSubmit, requests, onUpdateUser }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'rooms' | 'charge' | 'new' | 'packages' | 'withdraw' | 'history' | 'games' | 'search'>('profile');
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'paid' | 'rejected'>('all');
  const [amount, setAmount] = useState<string>('');
  const [wallet, setWallet] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [withdrawPoints, setWithdrawPoints] = useState('');
  const [withdrawWallet, setWithdrawWallet] = useState('');
  const [minWithdraw, setMinWithdraw] = useState(100000);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [myCounters, setMyCounters] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [counters, setCounters] = useState<any[]>([]);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState('');

  const fetchCounters = async () => {
    try {
      const res = await fetch('/api/my-counters');
      setCounters(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'packages') {
      fetchCounters();
    }
  }, [activeTab]);

  const handleBuyCounter = async (pkg: Package) => {
    if (!confirm(`هل أنت متأكد من شراء ${pkg.name} مقابل ${pkg.price.toLocaleString()} نقطة؟`)) return;
    
    try {
      const res = await fetch('/api/counters/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: pkg.id })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert('تم شراء العداد بنجاح!');
        onUpdateUser({ points: data.newPoints, package_id: pkg.id });
        fetchCounters();
      }
    } catch (e) {
      alert('حدث خطأ أثناء الشراء');
    }
  };

  const handleClaimCounter = async (counterId: number) => {
    try {
      const res = await fetch(`/api/counters/${counterId}/claim`, { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert(`تم جمع ${data.reward.toLocaleString()} نقطة بنجاح!`);
        onUpdateUser({ points: user.points + data.reward });
        fetchCounters();
      }
    } catch (e) {
      alert('حدث خطأ أثناء الجمع');
    }
  };
  const [miningTimeLeft, setMiningTimeLeft] = useState<string | null>(null);
  const [canCollect, setCanCollect] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [packageProof, setPackageProof] = useState<string | null>(null);
  const [packageLoading, setPackageLoading] = useState(false);
  
  // Profile states
  const [profileName, setProfileName] = useState(user.name || '');
  const [profileAvatar, setProfileAvatar] = useState(user.avatar || '');
  const [profileTheme, setProfileTheme] = useState(user.theme || 'light');
  const [profileLanguage, setProfileLanguage] = useState(user.language || 'ar');
  const [profileLoading, setProfileLoading] = useState(false);

  // Charge states
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeProof, setChargeProof] = useState<string | null>(null);
  const [chargeLoading, setChargeLoading] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setSearchLoading(false);
    }
  };

  const filteredRequests = requests.filter(req => filter === 'all' || req.status === filter);
  const filteredWithdrawals = withdrawals.filter(w => filter === 'all' || w.status === filter);
  const calculatedPrice = amount ? Math.floor((parseInt(amount) * rate) / 1000) : 0;

  useEffect(() => {
    fetch('/api/packages').then(res => res.json()).then(setPackages);
    fetch('/api/my-counters').then(res => res.json()).then(setMyCounters);
    fetch('/api/settings').then(res => res.json()).then(data => setMinWithdraw(data.min_withdraw_points));
    if (activeTab === 'history') {
      fetch('/api/my-requests').then(res => res.json()).then(data => {/* handled by prop */});
      fetch('/api/my-withdrawals').then(res => res.json()).then(setWithdrawals);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!user.mining_start) {
      setMiningTimeLeft(null);
      setCanCollect(false);
      return;
    }

    const interval = setInterval(() => {
      const start = new Date(user.mining_start!).getTime();
      const now = new Date().getTime();
      const diff = now - start;
      const total = 24 * 60 * 60 * 1000;

      if (diff >= total) {
        setCanCollect(true);
        setMiningTimeLeft(null);
        clearInterval(interval);
      } else {
        const remaining = total - diff;
        const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((remaining / 1000 / 60) % 60);
        const seconds = Math.floor((remaining / 1000) % 60);
        setMiningTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        setCanCollect(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user.mining_start]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    
    if (parseInt(withdrawPoints) > user.points) {
      setWithdrawError('رصيد النقاط غير كافٍ');
      return;
    }
    
    setWithdrawLoading(true);
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: parseInt(withdrawPoints), wallet_number: withdrawWallet })
      });
      const data = await res.json();
      if (data.error) {
        setWithdrawError(data.error);
      } else {
        onUpdateUser({ points: user.points - parseInt(withdrawPoints) });
        setWithdrawPoints('');
        setWithdrawWallet('');
        setActiveTab('history');
      }
    } catch (e) {
      setWithdrawError('حدث خطأ أثناء معالجة الطلب');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleStartMining = async () => {
    setClaimLoading(true);
    setClaimError('');
    try {
      const res = await fetch('/api/mining/start', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        setClaimError(data.error);
      } else {
        onUpdateUser({ mining_start: data.mining_start });
      }
    } catch (e) {
      setClaimError('خطأ في الاتصال');
    } finally {
      setClaimLoading(false);
    }
  };

  const handleCollectMining = async () => {
    setClaimLoading(true);
    setClaimError('');
    try {
      const res = await fetch('/api/mining/collect', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        setClaimError(data.error);
      } else {
        onUpdateUser({ points: data.points, mining_start: null });
        alert(`تم جمع ${data.reward} نقطة بنجاح!`);
      }
    } catch (e) {
      setClaimError('خطأ في الاتصال');
    } finally {
      setClaimLoading(false);
    }
  };

  const handleBuyPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage || !packageProof) return;
    
    setPackageLoading(true);
    try {
      const res = await fetch('/api/package-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: selectedPackage.id, proof_image: packageProof })
      });
      const data = await res.json();
      if (data.success) {
        alert('تم إرسال طلب تفعيل الباقة بنجاح. يرجى انتظار موافقة الإدارة.');
        setSelectedPackage(null);
        setPackageProof(null);
        setActiveTab('history');
      }
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء إرسال الطلب');
    } finally {
      setPackageLoading(false);
    }
  };

  const handlePackageProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPackageProof(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName, avatar: profileAvatar, theme: profileTheme, language: profileLanguage })
      });
      if (res.ok) {
        onUpdateUser({ name: profileName, avatar: profileAvatar, theme: profileTheme, language: profileLanguage });
        alert('تم تحديث الملف الشخصي بنجاح');
      }
    } catch (e) {
      alert('حدث خطأ أثناء التحديث');
    } finally {
      setProfileLoading(false);
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
    setActiveTab('history');
  };

  const handleChargeImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setChargeProof(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chargeAmount || !chargeProof) return;
    setChargeLoading(true);
    try {
      const res = await fetch('/api/charge-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseInt(chargeAmount),
          price: Math.floor((parseInt(chargeAmount) * rate) / 1000),
          proof_image: chargeProof
        })
      });
      if (res.ok) {
        alert('تم إرسال طلب الشحن بنجاح');
        setChargeAmount('');
        setChargeProof(null);
        setActiveTab('history');
      }
    } catch (e) {
      alert('حدث خطأ أثناء الإرسال');
    } finally {
      setChargeLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-[10px] font-bold uppercase"><Clock className="w-3 h-3" /> قيد المراجعة</span>;
      case 'accepted': return <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full text-[10px] font-bold uppercase"><CheckCircle2 className="w-3 h-3" /> مقبول</span>;
      case 'paid': return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-[10px] font-bold uppercase"><Banknote className="w-3 h-3" /> تم الدفع</span>;
      case 'rejected': return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-[10px] font-bold uppercase"><XCircle className="w-3 h-3" /> مرفوض</span>;
      default: return null;
    }
  };

  const userLevel = Math.floor(Math.sqrt((user.spent_points || 0) / 1000)) + 1;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-24">
      {/* Header for non-profile tabs */}
      {activeTab !== 'profile' && (
        <div className="bg-white p-4 sticky top-0 z-40 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900">
            {activeTab === 'rooms' && 'الغرف الصوتية'}
            {activeTab === 'charge' && 'شحن الرصيد'}
            {activeTab === 'new' && 'بيع الرصيد'}
            {activeTab === 'packages' && 'العدادات'}
            {activeTab === 'withdraw' && 'سحب الأرباح'}
            {activeTab === 'history' && 'السجل'}
            {activeTab === 'games' && 'الألعاب'}
            {activeTab === 'search' && 'البحث عن مستخدمين'}
          </h2>
          {activeTab === 'rooms' && (
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700">
              إنشاء غرفة
            </button>
          )}
        </div>
      )}

      <div className="p-4 space-y-6">
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-black/5 flex flex-col items-center">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-50 bg-gray-100">
                  {user.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <UserIcon className="w-12 h-12" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-amber-400 text-amber-900 text-[10px] font-black px-2 py-1 rounded-full border-2 border-white flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  LVL {userLevel}
                </div>
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-1">{user.name || 'مستخدم جديد'}</h2>
              <p className="text-sm text-gray-500 font-bold font-mono bg-gray-100 px-3 py-1 rounded-full">ID: {user.id}</p>
            </div>

            {/* Balances */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-600 text-white rounded-[1.5rem] p-5 shadow-lg shadow-emerald-600/20 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 text-emerald-100 text-xs font-bold mb-1">
                    <Coins className="w-4 h-4" />
                    رصيد النقاط
                  </div>
                  <div className="text-2xl font-black mb-1">{user.points.toLocaleString()}</div>
                </div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500 rounded-full blur-2xl opacity-50"></div>
              </div>

              <div className="bg-indigo-600 text-white rounded-[1.5rem] p-5 shadow-lg shadow-indigo-600/20 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 text-indigo-100 text-xs font-bold mb-1">
                    <Star className="w-4 h-4" />
                    النقاط المصروفة
                  </div>
                  <div className="text-2xl font-black mb-1">{(user.spent_points || 0).toLocaleString()}</div>
                </div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500 rounded-full blur-2xl opacity-50"></div>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setActiveTab('charge')} className="bg-white p-4 rounded-2xl shadow-sm border border-black/5 flex flex-col items-center gap-3 hover:border-indigo-500 transition-colors">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
                <span className="font-bold text-gray-700 text-sm">شحن الرصيد</span>
              </button>
              
              <button onClick={() => setActiveTab('new')} className="bg-white p-4 rounded-2xl shadow-sm border border-black/5 flex flex-col items-center gap-3 hover:border-emerald-500 transition-colors">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                  <Send className="w-6 h-6" />
                </div>
                <span className="font-bold text-gray-700 text-sm">بيع الرصيد</span>
              </button>

              <button onClick={() => setActiveTab('packages')} className="bg-white p-4 rounded-2xl shadow-sm border border-black/5 flex flex-col items-center gap-3 hover:border-amber-500 transition-colors">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
                  <PackageIcon className="w-6 h-6" />
                </div>
                <span className="font-bold text-gray-700 text-sm">العدادات</span>
              </button>

              <button onClick={() => setActiveTab('withdraw')} className="bg-white p-4 rounded-2xl shadow-sm border border-black/5 flex flex-col items-center gap-3 hover:border-blue-500 transition-colors">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <span className="font-bold text-gray-700 text-sm">سحب الأرباح</span>
              </button>

              <button onClick={() => setActiveTab('history')} className="bg-white p-4 rounded-2xl shadow-sm border border-black/5 flex flex-col items-center gap-3 hover:border-gray-500 transition-colors col-span-2">
                <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-full flex items-center justify-center">
                  <History className="w-6 h-6" />
                </div>
                <span className="font-bold text-gray-700 text-sm">السجل</span>
              </button>
            </div>

            {/* Mining Section */}
            <div className="bg-white rounded-[2rem] p-6 border border-black/5 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">العداد المجاني</h4>
                  <p className="text-lg font-bold">1,000 نقطة مجانية</p>
                </div>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                  <Gift className="w-6 h-6" />
                </div>
              </div>
              
              {!user.mining_start ? (
                <button
                  onClick={handleStartMining}
                  disabled={claimLoading}
                  className="w-full bg-amber-500 text-white font-black py-3 rounded-2xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-200 disabled:opacity-50"
                >
                  {claimLoading ? 'جاري التشغيل...' : 'تشغيل العداد'}
                </button>
              ) : canCollect ? (
                <button
                  onClick={handleCollectMining}
                  disabled={claimLoading}
                  className="w-full bg-emerald-500 text-white font-black py-3 rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
                >
                  {claimLoading ? 'جاري الجمع...' : 'جمع المكافأة'}
                </button>
              ) : (
                <div className="w-full bg-gray-100 text-gray-600 font-black py-3 rounded-2xl text-center flex items-center justify-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-mono text-lg tracking-widest">{miningTimeLeft}</span>
                </div>
              )}
              {claimError && <p className="text-[10px] text-red-500 mt-2 text-center font-bold">{claimError}</p>}
            </div>

            {/* Profile Settings */}
            <div className="bg-white rounded-[2rem] p-6 border border-black/5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-6">إعدادات الحساب</h3>
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">الاسم</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">تغيير الصورة</label>
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="w-full text-sm" />
                </div>
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="w-full bg-gray-900 text-white font-black py-3 rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50"
                >
                  {profileLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'new' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-black/5 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Send className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold">إرسال طلب بيع رصيد</h3>
              </div>

              <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 mb-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-400"></div>
                <h4 className="text-amber-900 font-black text-lg mb-2">الخطوة 1: تحويل الرصيد</h4>
                <p className="text-amber-800 text-sm font-bold mb-4">قم بتحويل رصيد آسيا سيل إلى الرقم التالي:</p>
                <div className="bg-white py-4 px-6 rounded-2xl inline-block shadow-sm border border-amber-100 mb-4">
                  <p className="text-3xl font-black text-amber-600 font-mono tracking-widest" dir="ltr">{transferPhone}</p>
                </div>
                <p className="text-xs text-amber-700/80 font-bold">تأكد من أخذ لقطة شاشة (سكرين شوت) لرسالة نجاح التحويل.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                  <h4 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                    <span className="bg-gray-100 text-gray-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                    تفاصيل التحويل
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 mr-1">كمية الرصيد المحول (آسيا)</label>
                      <input
                        type="number"
                        required
                        placeholder="مثلاً: 100000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-5 text-lg font-black focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 mr-1">المبلغ الذي ستستلمه (دينار)</label>
                      <div className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-2xl py-4 px-5 text-emerald-700 font-black text-xl flex items-center justify-between">
                        <span>{calculatedPrice.toLocaleString()}</span>
                        <span className="text-sm">د.ع</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                    <span className="bg-gray-100 text-gray-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                    معلومات الاستلام
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 mr-1">رقم المحفظة (ZainCash / SuperKey)</label>
                      <div className="relative">
                        <Wallet className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          required
                          placeholder="07XXXXXXXXX"
                          value={wallet}
                          onChange={(e) => setWallet(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pr-12 pl-4 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 mr-1">رقم الحساب البنكي</label>
                      <div className="relative">
                        <Banknote className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          required
                          placeholder="رقم الحساب"
                          value={bankAccount}
                          onChange={(e) => setBankAccount(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pr-12 pl-4 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                    <span className="bg-gray-100 text-gray-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span>
                    إثبات التحويل
                  </h4>
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
                      className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-3xl cursor-pointer transition-all overflow-hidden ${
                        image 
                          ? 'border-emerald-500 bg-emerald-50/30' 
                          : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-emerald-400'
                      }`}
                    >
                      {image ? (
                        <div className="relative w-full h-full group">
                          <img src={image} alt="Proof" className="w-full h-full object-contain p-2" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white font-bold bg-black/50 px-4 py-2 rounded-xl backdrop-blur-sm">تغيير الصورة</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-gray-500">
                          <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                            <ImageIcon className="w-8 h-8 text-emerald-500" />
                          </div>
                          <span className="font-bold text-gray-700 mb-1">اضغط هنا لرفع صورة الإثبات</span>
                          <span className="text-xs text-gray-400">يجب أن تكون الصورة واضحة وتظهر رقم التحويل</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className="bg-blue-50 text-blue-800 p-4 rounded-2xl text-sm font-bold flex items-start gap-3">
                  <div className="mt-0.5">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="mb-1 text-blue-900">ماذا سيحدث بعد الإرسال؟</p>
                    <p className="text-blue-700/80 text-xs leading-relaxed">
                      سيتم مراجعة طلبك من قبل الإدارة للتأكد من وصول الرصيد. بعد القبول، سيتم تحويل المبلغ إلى حسابك البنكي أو محفظتك في أقرب وقت ممكن. يمكنك متابعة حالة الطلب من قسم "السجل".
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!amount || !wallet || !bankAccount || !image}
                  className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  تأكيد وإرسال الطلب
                </button>
              </form>
            </div>

            {/* Withdrawal Section moved to its own tab */}
          </div>

          <div className="space-y-6">
            <div className="bg-emerald-900 text-white rounded-3xl p-6 relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="text-emerald-300 text-[10px] font-black uppercase tracking-widest mb-2">التسعيرة الحالية</h4>
                <p className="text-xl font-bold mb-1">كل 1,000 رصيد آسيا</p>
                <p className="text-3xl font-black text-emerald-400">{rate} د.ع</p>
              </div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-800 rounded-full blur-3xl opacity-50"></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'withdraw' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-black/5 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold">سحب الأرباح (النقاط)</h3>
              </div>

              {!user.package_id && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-sm font-bold flex items-center gap-2">
                  <XCircle className="w-5 h-5 shrink-0" />
                  عذراً، ميزة سحب الأرباح متاحة فقط للمشتركين في باقات التطوير. يرجى تفعيل باقة من قسم "الباقات".
                </div>
              )}

              <div className="bg-indigo-50 text-indigo-800 p-4 rounded-2xl mb-6 text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                الحد الأدنى للسحب هو {minWithdraw.toLocaleString()} نقطة (تساوي {(minWithdraw * 0.25).toLocaleString()} د.ع)
              </div>

              <form onSubmit={handleWithdraw} className="space-y-6">
                {withdrawError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold text-center">
                    {withdrawError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 mr-1">كمية النقاط للسحب</label>
                    <input
                      type="number"
                      required
                      min={minWithdraw}
                      placeholder={`الحد الأدنى: ${minWithdraw}`}
                      value={withdrawPoints}
                      onChange={(e) => setWithdrawPoints(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 mr-1">المبلغ المستحق (دينار)</label>
                    <div className="w-full bg-indigo-50 border border-indigo-100 rounded-2xl py-3 px-4 text-indigo-700 font-bold">
                      {(parseInt(withdrawPoints) * 0.25 || 0).toLocaleString()} د.ع
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 mr-1">رقم المحفظة (ZainCash / SuperKey)</label>
                  <input
                    type="text"
                    required
                    placeholder="07XXXXXXXXX"
                    value={withdrawWallet}
                    onChange={(e) => setWithdrawWallet(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!user.package_id || withdrawLoading}
                  className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {withdrawLoading ? 'جاري المعالجة...' : user.package_id ? 'طلب سحب الأرباح' : 'يجب تفعيل باقة للسحب'}
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm">
              <h4 className="font-bold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                سحب الأرباح
              </h4>
              <p className="text-xs text-gray-500 mb-4">يجب أن تمتلك باقة تطوير مفعلة لتتمكن من سحب نقاطك وتحويلها إلى مبالغ نقدية.</p>
              <button
                onClick={() => setActiveTab('packages')}
                className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-all text-sm"
              >
                تفعيل باقة سحب
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-bold text-lg">سجل طلباتي</h3>
              <span className="text-xs text-gray-400 font-medium">{requests.length} طلب إجمالي</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
              {['all', 'pending', 'accepted', 'paid', 'rejected'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s as any)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${
                    filter === s ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {s === 'all' ? 'الكل' : s === 'pending' ? 'قيد المراجعة' : s === 'accepted' ? 'مقبول' : s === 'paid' ? 'تم الدفع' : 'مرفوض'}
                </button>
              ))}
            </div>
          </div>
          {filteredRequests.length === 0 && filteredWithdrawals.length === 0 ? (
            <div className="p-12 text-center">
              <History className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 font-medium">لا توجد طلبات سابقة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-black">
                  <tr>
                    <th className="px-6 py-4">النوع</th>
                    <th className="px-6 py-4">التاريخ</th>
                    <th className="px-6 py-4">الكمية</th>
                    <th className="px-6 py-4">المبلغ</th>
                    <th className="px-6 py-4">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredRequests.map((req) => (
                    <tr key={`req-${req.id}`} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-[10px] font-bold text-emerald-600">بيع رصيد</td>
                      <td className="px-6 py-4 text-xs text-gray-500">{new Date(req.created_at).toLocaleDateString('ar-IQ')}</td>
                      <td className="px-6 py-4 font-bold">{req.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 font-bold text-emerald-600">{req.price.toLocaleString()} د.ع</td>
                      <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                    </tr>
                  ))}
                  {filteredWithdrawals.map((w) => (
                    <tr key={`w-${w.id}`} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-[10px] font-bold text-indigo-600">سحب أرباح</td>
                      <td className="px-6 py-4 text-xs text-gray-500">{new Date(w.created_at).toLocaleDateString('ar-IQ')}</td>
                      <td className="px-6 py-4 font-bold">{w.points.toLocaleString()} نقطة</td>
                      <td className="px-6 py-4 font-bold text-indigo-600">{w.amount.toLocaleString()} د.ع</td>
                      <td className="px-6 py-4">{getStatusBadge(w.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'games' && <Games points={user.points} onUpdatePoints={(p) => onUpdateUser({ points: p })} />}

      {activeTab === 'rooms' && <Rooms user={user} onUpdateUser={onUpdateUser} />}

      {activeTab === 'charge' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-black/5 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold">شحن نقاط</h3>
              </div>

              <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 mb-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-400"></div>
                <h4 className="text-amber-900 font-black text-lg mb-2">الخطوة 1: تحويل الرصيد</h4>
                <p className="text-amber-800 text-sm font-bold mb-4">قم بتحويل رصيد آسيا سيل إلى الرقم التالي:</p>
                <div className="bg-white py-4 px-6 rounded-2xl inline-block shadow-sm border border-amber-100 mb-4">
                  <span className="font-mono text-2xl font-black text-emerald-600 tracking-widest">{transferPhone}</span>
                </div>
                <p className="text-amber-700 text-xs font-bold">
                  * يجب أن يكون التحويل بنفس القيمة المطلوبة
                </p>
              </div>

              <form onSubmit={handleChargeSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">عدد النقاط المطلوبة</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="1000"
                      value={chargeAmount}
                      onChange={(e) => setChargeAmount(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-lg"
                      placeholder="مثال: 10000"
                    />
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">نقطة</div>
                  </div>
                  {chargeAmount && (
                    <p className="mt-3 text-sm font-bold text-indigo-600 flex items-center gap-1">
                      <Banknote className="w-4 h-4" />
                      المبلغ المطلوب تحويله: {Math.floor((parseInt(chargeAmount) * rate) / 1000).toLocaleString()} دينار
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">الخطوة 2: إثبات التحويل</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      required
                      onChange={handleChargeImageChange}
                      className="hidden"
                      id="charge-proof-upload"
                    />
                    <label
                      htmlFor="charge-proof-upload"
                      className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                        chargeProof 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-indigo-400'
                      }`}
                    >
                      {chargeProof ? (
                        <img src={chargeProof} alt="Proof" className="w-full h-full object-contain p-2" />
                      ) : (
                        <div className="flex flex-col items-center text-gray-500">
                          <ImageIcon className="w-8 h-8 text-indigo-500 mb-2" />
                          <span className="font-bold text-gray-700 text-sm">اضغط لرفع صورة الإثبات</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!chargeAmount || !chargeProof || chargeLoading}
                  className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {chargeLoading ? 'جاري الإرسال...' : 'تأكيد وإرسال'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'packages' && (
        <div className="space-y-8">
          {/* Active Counters Section */}
          {myCounters.length > 0 && (
            <div>
              <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                <Clock className="w-6 h-6 text-indigo-600" />
                عداداتي النشطة
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myCounters.map(counter => {
                  const lastClaim = new Date(counter.last_claim).getTime();
                  const now = new Date().getTime();
                  const diff = now - lastClaim;
                  const total = 24 * 60 * 60 * 1000;
                  const canClaim = diff >= total && counter.days_claimed < counter.total_days;
                  const isCompleted = counter.days_claimed >= counter.total_days;

                  return (
                    <div key={counter.id} className={`bg-white rounded-3xl p-6 border-2 ${canClaim ? 'border-emerald-500 shadow-emerald-100' : isCompleted ? 'border-gray-200 opacity-75' : 'border-black/5'} shadow-sm relative overflow-hidden`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-lg">{counter.name}</h4>
                          <p className="text-xs text-gray-500 font-bold">الربح اليومي: <span className="text-emerald-600">{counter.daily_reward.toLocaleString()} نقطة</span></p>
                        </div>
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                          <Zap className="w-5 h-5" />
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-gray-500">التقدم</span>
                          <span className="text-indigo-600">{counter.days_claimed} / {counter.total_days} يوم</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${(counter.days_claimed / counter.total_days) * 100}%` }}></div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleClaimCounter(counter.id)}
                        disabled={!canClaim}
                        className={`w-full font-black py-3 rounded-xl transition-all ${canClaim ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600' : isCompleted ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {isCompleted ? 'مكتمل' : canClaim ? 'جمع الأرباح' : 'قيد التعدين...'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Buy New Counters Section */}
          <div>
            <h3 className="text-xl font-black mb-4 flex items-center gap-2">
              <PackageIcon className="w-6 h-6 text-amber-600" />
              شراء عداد جديد
            </h3>
            <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 text-center relative overflow-hidden mb-6">
              <div className="absolute top-0 left-0 w-full h-1 bg-amber-400"></div>
              <h4 className="text-amber-900 font-black text-lg mb-2">كيفية تفعيل العدادات</h4>
              <p className="text-amber-800 text-sm font-bold mb-4">يمكنك شراء العدادات باستخدام نقاطك. كل عداد يعطيك نسبة ربح 2% يومياً لمدة سنة كاملة.</p>
              <div className="bg-white py-4 px-6 rounded-2xl inline-block shadow-sm border border-amber-100 mb-4">
                <p className="text-xl font-black text-amber-600 font-mono tracking-widest">رصيدك: {user.points.toLocaleString()} نقطة</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <div key={pkg.id} className="bg-white rounded-[2.5rem] p-8 border-2 border-black/5 hover:border-gray-200 transition-all relative overflow-hidden">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${pkg.id === 1 ? 'bg-orange-50 text-orange-600' : pkg.id === 2 ? 'bg-gray-50 text-gray-600' : 'bg-amber-50 text-amber-600'}`}>
                    <Zap className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black mb-2">{pkg.name}</h3>
                  <div className="text-3xl font-black mb-6">{pkg.price.toLocaleString()} <span className="text-sm font-bold text-gray-400">نقطة</span></div>
                  
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-center gap-3 text-sm font-bold text-gray-600">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      المدة: {pkg.return_months} يوم
                    </li>
                    <li className="flex items-center gap-3 text-sm font-bold text-gray-600">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      الربح اليومي: {Math.floor(pkg.price * (pkg.bonus_percent / 100)).toLocaleString()} نقطة
                    </li>
                    <li className="flex items-center gap-3 text-sm font-bold text-gray-600">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      تفعيل ميزة السحب
                    </li>
                  </ul>

                  <button
                    onClick={() => handleBuyCounter(pkg)}
                    disabled={user.points < pkg.price}
                    className={`w-full font-black py-4 rounded-2xl transition-all ${user.points >= pkg.price ? 'bg-black text-white hover:bg-gray-800 shadow-lg shadow-gray-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                  >
                    {user.points >= pkg.price ? 'شراء العداد' : 'نقاط غير كافية'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

        {activeTab === 'search' && (
          <div className="space-y-6">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم أو الآيدي (ID)..."
                className="w-full bg-white border border-gray-200 rounded-2xl py-4 pr-12 pl-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold shadow-sm"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <button
                type="submit"
                disabled={searchLoading}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
              >
                {searchLoading ? 'جاري البحث...' : 'بحث'}
              </button>
            </form>

            <div className="space-y-4">
              {searchResults.length > 0 ? (
                searchResults.map(u => (
                  <div key={u.id} className="bg-white p-4 rounded-2xl shadow-sm border border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 border-2 border-indigo-50">
                        {u.avatar ? (
                          <img src={u.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <UserIcon className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{u.name || 'مستخدم'}</h4>
                        <p className="text-xs text-gray-500 font-mono">ID: {u.id}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-emerald-600 flex items-center gap-1 justify-end">
                        {u.points.toLocaleString()} <Coins className="w-3 h-3" />
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold">
                        LVL {Math.floor(Math.sqrt((u.spent_points || 0) / 1000)) + 1}
                      </div>
                    </div>
                  </div>
                ))
              ) : searchQuery && !searchLoading ? (
                <div className="text-center text-gray-500 py-8 font-bold">
                  لا توجد نتائج للبحث
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 pb-safe z-50">
        <div className="flex justify-around items-center p-2 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'profile' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <UserIcon className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">أنا</span>
          </button>
          
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'rooms' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Mic className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">الغرف</span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'search' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Search className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">بحث</span>
          </button>

          <button
            onClick={() => setActiveTab('games')}
            className={`flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'games' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Gamepad2 className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">الألعاب</span>
          </button>
        </div>
      </div>
    </div>
  );
}
