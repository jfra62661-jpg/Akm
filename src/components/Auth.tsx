import React, { useState } from 'react';
import { Phone, Lock, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthProps {
  onLogin: (phone: string, pin: string, isRegister: boolean) => void;
  error?: string;
}

export default function Auth({ onLogin, error }: AuthProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(phone, pin, isRegister);
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-3xl shadow-sm border border-black/5 p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">
            {isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
          </h2>
          <p className="text-gray-500 text-sm">
            {isRegister ? 'أدخل رقم هاتفك ورمز الدخول للبدء' : 'مرحباً بك مجدداً في وسيط آسيا'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 mr-1">
              رقم الهاتف
            </label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                required
                placeholder="077XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pr-11 pl-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 mr-1">
              رمز الدخول (PIN)
            </label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                required
                placeholder="****"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pr-11 pl-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center font-medium">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            {isRegister ? 'إنشاء الحساب' : 'دخول'}
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center space-y-4">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-emerald-600 font-semibold hover:underline block w-full"
          >
            {isRegister ? 'لديك حساب بالفعل؟ سجل دخولك' : 'ليس لديك حساب؟ أنشئ حساباً جديداً'}
          </button>
        </div>
      </div>
    </div>
  );
}
