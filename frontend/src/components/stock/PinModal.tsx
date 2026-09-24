import React, { useState } from 'react';
import { Lock, Delete, X } from 'lucide-react';

interface PinModalProps {
  onUnlock: (pin: string) => Promise<boolean>;
  onClose?: () => void;
  canCancel?: boolean;
}

export const PinModal: React.FC<PinModalProps> = ({ onUnlock, onClose, canCancel = false }) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      const next = pin + digit;
      setPin(next);
      setError(null);
      if (next.length === 4) {
        attemptUnlock(next);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const attemptUnlock = async (codeToTest: string) => {
    setLoading(true);
    try {
      const success = await onUnlock(codeToTest);
      if (!success) {
        setError('Incorrect PIN. Default is 1901.');
        setPin('');
      }
    } catch {
      setError('Connection error');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 relative text-center">
        {canCancel && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 mx-auto flex items-center justify-center mb-3">
          <Lock className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-white mb-0.5">Shiv Laminate Security</h3>
        <p className="text-xs text-slate-400 mb-5">Enter Owner PIN to unlock stock actions</p>

        {/* PIN Indicators */}
        <div className="flex items-center justify-center space-x-3 mb-6">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border transition-all duration-150 ${
                pin.length > idx
                  ? 'bg-sky-400 border-sky-300 scale-110 shadow-sm shadow-sky-400/50'
                  : 'bg-slate-950 border-slate-700'
              }`}
            />
          ))}
        </div>

        {error && <div className="text-xs text-rose-400 font-medium mb-3">{error}</div>}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[220px] mx-auto mb-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              disabled={loading}
              onClick={() => handleDigit(num)}
              className="h-12 rounded-xl bg-slate-800 text-white text-lg font-bold hover:bg-slate-700 active:scale-95 transition-all shadow-sm"
            >
              {num}
            </button>
          ))}
          <div className="flex items-center justify-center text-[10px] text-slate-400">PIN:1901</div>
          <button
            disabled={loading}
            onClick={() => handleDigit('0')}
            className="h-12 rounded-xl bg-slate-800 text-white text-lg font-bold hover:bg-slate-700 active:scale-95 transition-all shadow-sm"
          >
            0
          </button>
          <button
            disabled={loading || pin.length === 0}
            onClick={handleDelete}
            className="h-12 rounded-xl bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center disabled:opacity-30"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
