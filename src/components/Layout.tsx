import React from 'react';
import { User, LogOut, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { User as UserType } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: UserType | null;
  onLogout: () => void;
  onLogoClick?: () => void;
}

export default function Layout({ children, user, onLogout, onLogoClick }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans" dir="rtl">
      <header className="bg-white border-b border-black/5 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={onLogoClick}>
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">
              آ
            </div>
            <h1 className="text-xl font-bold tracking-tight">وسيط آسيا</h1>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {user.role === 'admin' ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                ) : user.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-6 h-6 rounded-full object-cover border border-gray-200" />
                ) : (
                  <User className="w-4 h-4 text-emerald-600" />
                )}
                <span className="font-bold">{user.name || user.phone}</span>
              </div>
              <button
                onClick={onLogout}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                title="تسجيل الخروج"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {children}
        </motion.div>
      </main>

      <footer className="max-w-4xl mx-auto px-4 py-8 text-center text-sm text-gray-400">
        <p>© {new Date().getFullYear()} وسيط آسيا - جميع الحقوق محفوظة</p>
      </footer>
    </div>
  );
}
