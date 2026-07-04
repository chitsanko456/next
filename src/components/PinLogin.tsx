import React, { useState, useEffect } from 'react';
import { StaffMember, Branch, ShopSettings } from '../types';
import { motion } from 'motion/react';
import { Pill, User, Building2, Lock, LogIn, AlertTriangle, ShieldCheck } from 'lucide-react';

interface PinLoginProps {
  staffMembers: StaffMember[];
  branches: Branch[];
  settings: ShopSettings;
  onLoginSuccess: (userId: string, branchId: string) => void;
}

export default function PinLogin({ staffMembers, branches, settings, onLoginSuccess }: PinLoginProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState<number>(0);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setLockoutTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutTimeLeft]);

  // Initialize defaults
  useEffect(() => {
    if (staffMembers.length > 0) {
      setSelectedStaffId(staffMembers[0].id);
    }
    const mainBranch = branches.find(b => b.isMain);
    if (mainBranch) {
      setSelectedBranchId(mainBranch.id);
    } else if (branches.length > 0) {
      setSelectedBranchId(branches[0].id);
    }
  }, [staffMembers, branches]);

  // If selected staff has a preset branch, lock or autofill the branch selection
  useEffect(() => {
    const selectedStaff = staffMembers.find(s => s.id === selectedStaffId);
    if (selectedStaff && selectedStaff.role === 'staff' && selectedStaff.branchId) {
      setSelectedBranchId(selectedStaff.branchId);
    }
  }, [selectedStaffId, staffMembers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (lockoutTimeLeft > 0) {
      setError(`လုံခြုံရေးအရ ပိတ်ထားပါသည်။ ကျေးဇူးပြု၍ ${lockoutTimeLeft} စက္ကန့် စောင့်ဆိုင်းပေးပါ။`);
      return;
    }

    setIsSubmitting(true);

    if (!selectedStaffId) {
      setError('ဝန်ထမ်းအမည်ကို ရွေးချယ်ပေးပါ');
      setIsSubmitting(false);
      return;
    }

    const staff = staffMembers.find(s => s.id === selectedStaffId);
    if (!staff) {
      setError('ဝန်ထမ်း ရှာမတွေ့ပါ။');
      setIsSubmitting(false);
      return;
    }

    if ((pin.length !== 6 && pin.length !== 4) || isNaN(Number(pin))) {
      setError('PIN ကုဒ်သည် ဂဏန်း ၆ လုံး (သို့မဟုတ် ၄ လုံး) ဖြစ်ရပါမည်');
      setIsSubmitting(false);
      return;
    }

    // Validate PIN
    if (staff.pin === pin) {
      // Success!
      setFailedAttempts(0);
      setTimeout(() => {
        onLoginSuccess(staff.id, selectedBranchId);
        setIsSubmitting(false);
      }, 400);
    } else {
      const nextFailed = failedAttempts + 1;
      setFailedAttempts(nextFailed);
      
      if (nextFailed >= 3) {
        setLockoutTimeLeft(30); // block for 30 seconds
        setFailedAttempts(0);  // reset tracker so next round starts clean
        setError('PIN ကုဒ် (၃) ကြိမ် မှားယွင်းသွားသဖြင့် စနစ်ကို ၃၀ စက္ကန့် ခေတ္တပိတ်ထားပါသည်။');
      } else {
        setError(`လုံခြုံရေး PIN ကုဒ် မမှန်ကန်ပါ။ ပြန်လည်စမ်းသပ်ပါ။ (ကျန်ရှိသည့်အကြိမ်အရေအတွက်: ${3 - nextFailed} ကြိမ်)`);
      }
      setIsSubmitting(false);
    }
  };

  const currentSelectedStaff = staffMembers.find(s => s.id === selectedStaffId);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans selection:bg-emerald-100">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden p-8 space-y-6"
      >
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-emerald-600/10">
            <Pill className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight">
              {settings.name || 'ရတနာ ဆေးဆိုင်စနစ်'}
            </h2>
            <p className="text-xs text-emerald-600 font-semibold mt-1">
              ဆေးဆိုင် စာရင်းကိုင်နှင့် အရောင်းစနစ် (PIN လော့ဂ်အင်)
            </p>
          </div>
        </div>

        {/* Info Indicator */}
        <div className="bg-emerald-50/50 border border-emerald-100/30 text-emerald-800 p-3.5 rounded-2xl text-[11px] leading-relaxed flex items-start space-x-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            <b>မင်္ဂလာပါ:</b> ဆိုင်ခွဲစာရင်းမှားများနှင့် လုံခြုံရေးအတွက် သတ်မှတ်ထားသော ဝန်ထမ်းအကောင့်ကို ရွေးချယ်ပြီး PIN ကုဒ်ရိုက်နှိပ်ကာ ဝင်ရောက်ပါ။
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
          {/* Select Staff */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-600">
              ဝန်ထမ်းအမည် ရွေးချယ်ရန်
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <User className="w-4 h-4" />
              </span>
              <select
                value={selectedStaffId}
                onChange={(e) => {
                  setSelectedStaffId(e.target.value);
                  setError('');
                  setPin('');
                }}
                className="w-full bg-slate-50 text-xs text-gray-800 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150 cursor-pointer"
              >
                {staffMembers.map(staff => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} ({staff.role === 'owner' ? 'ဆိုင်ပိုင်ရှင်' : 'အရောင်းဝန်ထမ်း'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Select Branch */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-600">
              တာဝန်ကျမည့် ဆိုင်ခွဲ
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Building2 className="w-4 h-4" />
              </span>
              <select
                value={selectedBranchId}
                disabled={currentSelectedStaff?.role === 'staff' && !!currentSelectedStaff?.branchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  setError('');
                }}
                className={`w-full text-xs text-gray-800 border rounded-2xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150 ${
                  currentSelectedStaff?.role === 'staff' && !!currentSelectedStaff?.branchId
                    ? 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-500'
                    : 'bg-slate-50 border-slate-200 cursor-pointer'
                }`}
              >
                {branches.map(br => (
                  <option key={br.id} value={br.id}>
                    {br.name} {br.isMain ? '(ပင်မဆိုင်ခွဲ)' : ''}
                  </option>
                ))}
              </select>
            </div>
            {currentSelectedStaff?.role === 'staff' && !!currentSelectedStaff?.branchId && (
              <p className="text-[9px] text-amber-600 font-semibold leading-none mt-1">
                🔒 ဤဝန်ထမ်းအတွက် တာဝန်ကျဆိုင်ခွဲကို ပုံသေ သတ်မှတ်ထားပါသည်။
              </p>
            )}
          </div>

          {/* Enter PIN */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-600">
              အကောင့်လုံခြုံရေး PIN ကုဒ် (ဂဏန်း ၆ လုံး)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                maxLength={6}
                disabled={lockoutTimeLeft > 0}
                required
                placeholder="••••••"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ''));
                  setError('');
                }}
                className="w-full text-center tracking-[1.5em] font-mono font-black text-base bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150 disabled:bg-rose-50 disabled:text-rose-400 disabled:border-rose-100"
              />
            </div>
            {lockoutTimeLeft > 0 && (
              <p className="text-[10px] text-rose-600 font-bold text-center mt-1 animate-pulse">
                ⏳ လုံခြုံရေးအရ ပိတ်ထားသည်။ ကျန်ရှိချိန် {lockoutTimeLeft} စက္ကန့်
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || lockoutTimeLeft > 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs py-3 rounded-2xl transition duration-150 flex items-center justify-center space-x-2 shadow-sm cursor-pointer mt-4"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>စနစ်ထဲသို့ ဝင်ရောက်မည်</span>
              </>
            )}
          </button>
        </form>

        {/* Helpful default credential reminder */}
        <div className="text-center pt-2">
          <p className="text-[10px] text-gray-400 leading-relaxed font-semibold">
            စမ်းသပ်ရန် Owners PIN: <span className="text-emerald-600 font-extrabold font-mono">123456</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
