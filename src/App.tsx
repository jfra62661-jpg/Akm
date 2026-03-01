import React, { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { User, CreditRequest } from './types';
import Layout from './components/Layout';
import Auth from './components/Auth';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import SupportChat from './components/SupportChat';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [rate, setRate] = useState(850);
  const [transferPhone, setTransferPhone] = useState('');
  const [authError, setAuthError] = useState('');
  const [logoClicks, setLogoClicks] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    try {
      const requestsRes = await fetch(user.role === 'admin' ? '/api/admin/requests' : '/api/my-requests');
      const requestsData = await requestsRes.json();
      if (Array.isArray(requestsData)) {
        setRequests(requestsData);
      } else {
        setRequests([]);
      }

      const settingsRes = await fetch('/api/settings');
      const settingsData = await settingsRes.json();
      setRate(settingsData.rate);
      setTransferPhone(settingsData.transfer_phone);
    } catch (e) {
      console.error('Failed to fetch data', e);
    }
  }, [user]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/me');
        const data = await res.json();
        setUser(data);
      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();

      // WebSocket for real-time updates
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}`);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Refresh data on relevant events
        if (
          data.type === 'NEW_REQUEST' || 
          data.type === 'UPDATE_REQUEST' || 
          data.type === 'SETTINGS_CHANGED' ||
          data.type === 'NEW_PACKAGE_REQUEST' ||
          data.type === 'UPDATE_PACKAGE_REQUEST' ||
          data.type === 'NEW_WITHDRAWAL' ||
          data.type === 'UPDATE_WITHDRAWAL' ||
          data.type === 'NEW_CHARGE_REQUEST' ||
          data.type === 'UPDATE_CHARGE_REQUEST'
        ) {
          fetchData();
        }

        // Show notifications based on user role
        if (user.role === 'admin') {
          if (data.type === 'NEW_REQUEST') toast.success('طلب بيع رصيد جديد');
          if (data.type === 'NEW_PACKAGE_REQUEST') toast.success('طلب تفعيل باقة جديد');
          if (data.type === 'NEW_WITHDRAWAL') toast.success('طلب سحب أرباح جديد');
          if (data.type === 'NEW_CHARGE_REQUEST') toast.success('طلب شحن رصيد جديد');
        } else {
          if (data.type === 'UPDATE_REQUEST') toast.success('تم تحديث حالة طلب بيع الرصيد');
          if (data.type === 'UPDATE_PACKAGE_REQUEST') toast.success('تم تحديث حالة طلب تفعيل الباقة');
          if (data.type === 'UPDATE_WITHDRAWAL') toast.success('تم تحديث حالة طلب سحب الأرباح');
          if (data.type === 'UPDATE_CHARGE_REQUEST') toast.success('تم تحديث حالة طلب شحن الرصيد');
          if (data.type === 'GIFT_SENT' && data.message) toast(data.message, { icon: data.giftIcon });
        }
      };

      return () => ws.close();
    }
  }, [user, fetchData]);

  const handleAuth = async (phone: string, pin: string, isRegister: boolean, email?: string) => {
    setAuthError('');
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email, pin }),
      });
      const data = await res.json();
      if (data.error) {
        setAuthError(data.error);
      } else {
        setUser(data);
        setShowAdminLogin(false);
      }
    } catch (e) {
      setAuthError('حدث خطأ في الاتصال');
    }
  };

  const handleLogoClick = () => {
    const newClicks = logoClicks + 1;
    setLogoClicks(newClicks);
    if (newClicks >= 10) {
      setShowAdminLogin(true);
      setLogoClicks(0);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setRequests([]);
  };

  const handleSubmitRequest = async (data: any) => {
    try {
      await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      fetchData();
    } catch (e) {
      console.error('Failed to submit request', e);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await fetch(`/api/admin/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchData();
    } catch (e) {
      console.error('Failed to update status', e);
    }
  };

  const handleUpdateSettings = async (settings: any) => {
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      fetchData();
    } catch (e) {
      console.error('Failed to update settings', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Layout user={user} onLogout={handleLogout} onLogoClick={handleLogoClick}>
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-center">دخول الإدارة</h3>
            <Auth onLogin={handleAuth} error={authError} isAdminLogin />
            <button 
              onClick={() => setShowAdminLogin(false)}
              className="mt-4 w-full text-gray-400 text-sm font-bold"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {!user ? (
        <Auth onLogin={handleAuth} error={authError} />
      ) : user.role === 'admin' ? (
        <AdminDashboard
          requests={requests}
          currentRate={rate}
          transferPhone={transferPhone}
          onUpdateStatus={handleUpdateStatus}
          onUpdateSettings={handleUpdateSettings}
        />
      ) : (
        <UserDashboard
          user={user}
          rate={rate}
          transferPhone={transferPhone}
          requests={requests}
          onSubmit={handleSubmitRequest}
          onUpdateUser={(updated) => setUser({ ...user, ...updated })}
        />
      )}
      {user && user.role !== 'admin' && <SupportChat user={user} />}
    </Layout>
  );
}
