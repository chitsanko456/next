import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { motion } from 'motion/react';
import { Pill, Mail, Lock, AlertTriangle, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';

interface AuthProps {
  onAuthSuccess: () => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getMyanmarError = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'အီးမေးလ်လိပ်စာ ပုံစံမမှန်ကန်ပါ။';
      case 'auth/user-disabled':
        return 'ဤအသုံးပြုသူအကောင့်ကို ပိတ်ပင်ထားပါသည်။';
      case 'auth/user-not-found':
        return 'ဤအီးမေးလ်ဖြင့် အကောင့်ဖွင့်ထားခြင်း မရှိသေးပါ။';
      case 'auth/wrong-password':
        return 'လျှို့ဝှက်နံပါတ် (Password) မမှန်ကန်ပါ။';
      case 'auth/email-already-in-use':
        return 'ဤအီးမေးလ်အား အခြားသူတစ်ဦးက အသုံးပြုထားပြီးဖြစ်သည်။';
      case 'auth/weak-password':
        return 'လျှို့ဝှက်နံပါတ်သည် အနည်းဆုံး ဂဏန်း/စာလုံး ၆ လုံး ရှိရပါမည်။';
      case 'auth/invalid-credential':
        return 'အီးမေးလ် သို့မဟုတ် လျှို့ဝှက်နံပါတ် မမှန်ကန်ပါ။ သေချာစွာ စစ်ဆေးပြီး ပြန်လည်ရိုက်သွင်းပါ။';
      case 'auth/operation-not-allowed':
        return 'Firebase Dashboard တွင် Email/Password provider ကို ဖွင့်ထားခြင်း မရှိသေးပါ။ (auth/operation-not-allowed)';
      default:
        return `အမှားအယွင်းတစ်ခု ရှိနေပါသည်။ ထပ်မံကြိုးစားကြည့်ပါ။ (Error: ${errorCode})`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError('အီးမေးလ်နှင့် လျှို့ဝှက်နံပါတ်ကို ဖြည့်စွက်ပါ');
      setLoading(false);
      return;
    }

    if (isRegister) {
      if (password !== confirmPassword) {
        setError('လျှို့ဝှက်နံပါတ် နှစ်ခု တူညီမှုမရှိပါ။');
        setLoading(false);
        return;
      }
    }

    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      setError(getMyanmarError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans selection:bg-emerald-100">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden p-8 space-y-6"
      >
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-emerald-600/10">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight">
              ရတနာ ဆေးဆိုင်စနစ်
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {isRegister ? 'စနစ်သုံးစွဲသူ အကောင့်အသစ် ဖွင့်လှစ်ခြင်း' : 'ဆက်တင်နှင့် အရောင်းစနစ်သို့ ဝင်ရောက်ခြင်း'}
            </p>
          </div>
        </div>

        {/* Security Alert Badge */}
        <div className="bg-amber-50 border border-amber-100 text-amber-800 p-3.5 rounded-2xl text-[11px] leading-relaxed flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <b>လုံခြုံရေး သတိပေးချက်:</b> ဆေးဆိုင်ဒေတာများအား ခွင့်ပြုချက်မရှိဘဲ ဝင်ရောက်ကြည့်ရှုခြင်းမှ ကာကွယ်ရန် ဤအကောင့်ဝင်ရောက်မှု အဆင့်ကို ထည့်သွင်းထားခြင်း ဖြစ်ပါသည်။
          </span>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-rose-50 border border-rose-100 text-rose-700 p-3.5 rounded-2xl text-xs flex items-start space-x-2.5"
          >
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-600">
              အီးမေးလ်လိပ်စာ (Email Address)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 text-xs text-gray-800 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-600">
              လျှို့ဝှက်နံပါတ် (Password)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 text-xs text-gray-800 border border-slate-200 rounded-2xl pl-10 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password input (Register only) */}
          {isRegister && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-1.5"
            >
              <label className="block text-xs font-bold text-gray-600">
                လျှို့ဝှက်နံပါတ် ပြန်လည်ရိုက်ထည့်ပါ (Confirm Password)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 text-xs text-gray-800 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150"
                />
              </div>
            </motion.div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs py-3 rounded-2xl transition duration-150 flex items-center justify-center space-x-2 shadow-sm cursor-pointer mt-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : isRegister ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>အကောင့်အသစ် ဖွင့်မည်</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>စနစ်ထဲသို့ ဝင်ရောက်မည်</span>
              </>
            )}
          </button>
        </form>

        {/* Switch Mode Button */}
        <div className="pt-2 text-center space-y-4">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition"
          >
            {isRegister ? 'အကောင့်ရှိပြီးသားဖြစ်ပါသလား? ဝင်ရောက်ရန် နှိပ်ပါ' : 'သုံးစွဲသူ အသစ်ဖြစ်ပါသလား? အကောင့်ဖွင့်ရန် နှိပ်ပါ'}
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-4 text-[10px] text-gray-400 font-bold uppercase">Or</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          <button
            type="button"
            onClick={() => {
              // Trigger success to bypass the auth screen using the local default user
              onAuthSuccess();
            }}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-2xl transition duration-150 flex items-center justify-center space-x-2 cursor-pointer border border-slate-200"
          >
            <span>ဝင်ရောက်အသုံးပြုမည် (Bypass Demo Mode)</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
