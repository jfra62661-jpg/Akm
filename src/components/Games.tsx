import React, { useState } from 'react';
import { Dice5, Trophy, Coins, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GamesProps {
  points: number;
  onUpdatePoints: (newPoints: number) => void;
}

export default function Games({ points, onUpdatePoints }: GamesProps) {
  const [bet, setBet] = useState(100);
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<{ isWin: boolean; multiplier: number } | null>(null);

  const handleLuckGame = async () => {
    if (points < bet) return;
    setIsRolling(true);
    setResult(null);

    try {
      const res = await fetch('/api/games/luck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet })
      });
      const data = await res.json();
      
      setTimeout(() => {
        setIsRolling(false);
        setResult({ isWin: data.isWin, multiplier: data.multiplier });
        onUpdatePoints(data.newPoints);
      }, 1000);
    } catch (e) {
      setIsRolling(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl p-8 border border-black/5 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Dice5 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold">لعبة الحظ</h3>
            <p className="text-sm text-gray-400">ضاعف نقاطك بضغطة واحدة</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center space-y-8 py-8">
          <motion.div
            animate={
              isRolling 
                ? { rotate: [0, 360], scale: [1, 1.2, 1], y: [0, -20, 0] } 
                : result?.isWin 
                  ? { scale: [1, 1.2, 1], rotate: [0, -10, 10, -10, 10, 0] }
                  : result?.isWin === false
                    ? { x: [-10, 10, -10, 10, 0] }
                    : {}
            }
            transition={
              isRolling 
                ? { repeat: Infinity, duration: 0.6, ease: "easeInOut" } 
                : { duration: 0.5 }
            }
            className={`w-32 h-32 rounded-[2rem] flex items-center justify-center shadow-2xl transition-colors duration-300 ${
              isRolling 
                ? 'bg-indigo-100 text-indigo-400 shadow-indigo-200' 
                : result?.isWin 
                  ? 'bg-emerald-500 text-white shadow-emerald-500/40' 
                  : result?.isWin === false 
                    ? 'bg-red-500 text-white shadow-red-500/40' 
                    : 'bg-indigo-600 text-white shadow-indigo-600/40'
            }`}
          >
            <Dice5 className={`w-16 h-16 ${isRolling ? 'animate-pulse' : ''}`} />
          </motion.div>

          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key={result.isWin ? 'win' : 'lose'}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.8 }}
                className={`text-center p-6 rounded-3xl w-full max-w-xs ${
                  result.isWin ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}
              >
                <p className="text-2xl font-black mb-1">{result.isWin ? 'مبروك! فزت' : 'حظ أوفر المرة القادمة'}</p>
                <p className="text-lg font-bold flex items-center justify-center gap-2">
                  {result.isWin ? (
                    <>
                      +{bet * result.multiplier} نقطة
                      <span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-1 rounded-full">
                        {result.multiplier}x
                      </span>
                    </>
                  ) : (
                    `-${bet} نقطة`
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="w-full max-w-xs space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">مبلغ الرهان</span>
                <span className="text-lg font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl">{bet} نقطة</span>
              </div>
              <div className="relative pt-2 pb-6">
                <input
                  type="range"
                  min="100"
                  max={Math.max(100, Math.min(points, 5000))}
                  step="100"
                  value={bet}
                  onChange={(e) => setBet(parseInt(e.target.value))}
                  disabled={isRolling}
                  className="w-full h-3 bg-gray-100 rounded-full appearance-none cursor-pointer accent-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-50 transition-all"
                  style={{
                    background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${((bet - 100) / (Math.max(100, Math.min(points, 5000)) - 100)) * 100}%, #f3f4f6 ${((bet - 100) / (Math.max(100, Math.min(points, 5000)) - 100)) * 100}%, #f3f4f6 100%)`
                  }}
                />
                <div className="absolute bottom-0 left-0 w-full flex justify-between text-[10px] font-bold text-gray-400 px-1">
                  <span>100</span>
                  <span>{Math.max(100, Math.min(points, 5000))}</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleLuckGame}
              disabled={isRolling || points < bet}
              className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 text-lg"
            >
              {isRolling ? (
                <>
                  <Dice5 className="w-6 h-6 animate-spin" />
                  جاري السحب...
                </>
              ) : (
                'العب الآن'
              )}
            </button>
          </div>
        </div>

        <div className="mt-4 bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100/50">
          <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-indigo-500" />
            قواعد اللعبة ونسبة الفوز
          </h4>
          <ul className="space-y-3 text-sm text-indigo-800/80 font-medium">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0"></span>
              <p><strong>طريقة اللعب:</strong> حدد مبلغ الرهان واضغط على "العب الآن". إذا فزت، ستحصل على ضعف مبلغ رهانك.</p>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0"></span>
              <p><strong>المضاعف (Multiplier):</strong> نسبة الربح هي <strong>2x</strong>. على سبيل المثال، إذا راهنت بـ 100 نقطة وفزت، ستربح 100 نقطة إضافية (المجموع 200 نقطة). وإذا خسرت، ستفقد الـ 100 نقطة.</p>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0"></span>
              <p><strong>نسبة الفوز (Odds):</strong> تعتمد اللعبة على نظام احتمالات عشوائي يتم تحديده من قبل الإدارة لضمان تجربة عادلة ومثيرة.</p>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-gray-50 rounded-3xl p-8 border border-dashed border-gray-200 flex flex-col items-center text-center">
        <Trophy className="w-12 h-12 text-gray-300 mb-4" />
        <h4 className="font-bold text-gray-400">لعبة الطاولي</h4>
        <p className="text-sm text-gray-400 max-w-xs mt-2">قريباً: العب ضد الذكاء الاصطناعي أو ضد لاعبين حقيقيين واربح مبالغ ضخمة</p>
      </div>
    </div>
  );
}
