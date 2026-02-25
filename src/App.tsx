import React, { useState, useEffect, useCallback } from 'react';
import { User, CreditRequest } from './types';
import Layout from './components/Layout';
import Auth from './components/Auth';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [rate, setRate] = useState(850);
  const [transferPhone, setTransferPhone] = useState('');
  const [authError, setAuthError] = useState('');

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
        if (data.type === 'NEW_REQUEST' || data.type === 'UPDATE_REQUEST' || data.type === 'SETTINGS_CHANGED') {
          fetchData();
        }
      };

      return () => ws.close();
    }
  }, [user, fetchData]);

  const handleAuth = async (phone: string, pin: string, isRegister: boolean) => {
    setAuthError('');
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin }),
      });
      const data = await res.json();
      if (data.error) {
        setAuthError(data.error);
      } else {
        setUser(data);
      }
    } catch (e) {
      setAuthError('حدث خطأ في الاتصال');
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

  const handleUpdateSettings = async (settings: { rate?: number; transfer_phone?: string }) => {
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
    <Layout user={user} onLogout={handleLogout}>
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
          rate={rate}
          transferPhone={transferPhone}
          requests={requests}
          onSubmit={handleSubmitRequest}
        />
      )}
    </Layout>
  );
}
