import React, { useState, useEffect } from 'react';
import { Medicine, Voucher, ShopSettings, TabType, StaffMember, AuditLog, Branch } from './types';
import { INITIAL_MEDICINES, DEFAULT_SETTINGS, INITIAL_STAFF, INITIAL_LOGS, INITIAL_BRANCHES } from './initialData';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Inventory from './components/Inventory';
import SalesHistory from './components/SalesHistory';
import Settings from './components/Settings';
import { db, auth } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Pill, LayoutDashboard, ShoppingCart, FolderKanban, History, Settings2, Clock, Users, Lock, Shield, LogOut, CheckCircle, AlertTriangle, Cloud, CloudLightning } from 'lucide-react';
import PinLogin from './components/PinLogin';

export default function App() {
  // Load initial states from localStorage or fall back to seed data
  const [medicines, setMedicines] = useState<Medicine[]>(() => {
    const saved = localStorage.getItem('pharmacy_medicines');
    return saved ? JSON.parse(saved) : INITIAL_MEDICINES;
  });

  const [vouchers, setVouchers] = useState<Voucher[]>(() => {
    const saved = localStorage.getItem('pharmacy_vouchers');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<ShopSettings>(() => {
    const saved = localStorage.getItem('pharmacy_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(() => {
    const saved = localStorage.getItem('pharmacy_staff_members');
    return saved ? JSON.parse(saved) : INITIAL_STAFF;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('pharmacy_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });

  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = localStorage.getItem('pharmacy_branches');
    return saved ? JSON.parse(saved) : INITIAL_BRANCHES;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem('pharmacy_current_user_id') || '';
  });

  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [isSyncing, setIsSyncing] = useState(true);

  // State for PIN code switcher modal
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [selectedStaffToSwitch, setSelectedStaffToSwitch] = useState<StaffMember | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Firebase Auth states
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isBypassed, setIsBypassed] = useState(() => {
    return localStorage.getItem('auth_bypassed') === 'true';
  });
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [allUserProfiles, setAllUserProfiles] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFbUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync user profiles and automatically make the first user the owner, others pending
  useEffect(() => {
    if (!fbUser) {
      setUserProfile(null);
      setAllUserProfiles([]);
      return;
    }

    const unsubProfiles = onSnapshot(collection(db, 'userProfiles'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      setAllUserProfiles(list);

      const foundProfile = list.find(p => p.uid === fbUser.uid);
      if (foundProfile) {
        setUserProfile(foundProfile);
      } else {
        // Create new profile dynamically
        const hasOwner = list.some((p: any) => p.role === 'owner');
        const newProf = {
          email: fbUser.email,
          role: hasOwner ? 'pending' : 'owner',
          approved: !hasOwner,
          createdAt: new Date().toISOString()
        };
        setDoc(doc(db, 'userProfiles', fbUser.uid), newProf);
      }
    });

    return () => unsubProfiles();
  }, [fbUser]);

  // Active User session resolved
  const currentUser = staffMembers.find(sm => sm.id === currentUserId) || staffMembers[0] || INITIAL_STAFF[0];

  // Helper to add logs to Firestore
  const addLog = (userName: string, action: string, details: string, severity: 'info' | 'warning' | 'danger' = 'info') => {
    const newLog: AuditLog = {
      id: 'log-' + Date.now() + Math.floor(Math.random() * 100),
      timestamp: new Date().toISOString(),
      userName,
      action,
      details,
      severity
    };
    setDoc(doc(db, 'auditLogs', newLog.id), newLog);
  };

  // Firestore Real-time Synchronization
  useEffect(() => {
    // 1. Sync Settings
    const settingsRef = doc(db, 'settings', 'main');
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as ShopSettings);
      } else {
        setDoc(settingsRef, DEFAULT_SETTINGS);
      }
    });

    // 2. Sync Medicines
    const medicinesRef = collection(db, 'medicines');
    const unsubMedicines = onSnapshot(medicinesRef, (snapshot) => {
      if (snapshot.empty) {
        INITIAL_MEDICINES.forEach(med => {
          setDoc(doc(db, 'medicines', med.id), med);
        });
      } else {
        const list = snapshot.docs.map(doc => doc.data() as Medicine);
        setMedicines(list);
      }
    });

    // 3. Sync Vouchers
    const vouchersRef = collection(db, 'vouchers');
    const unsubVouchers = onSnapshot(vouchersRef, (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as Voucher);
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setVouchers(list);
    });

    // 4. Sync Staff Members
    const staffRef = collection(db, 'staffMembers');
    const unsubStaff = onSnapshot(staffRef, (snapshot) => {
      if (snapshot.empty) {
        INITIAL_STAFF.forEach(staff => {
          setDoc(doc(db, 'staffMembers', staff.id), staff);
        });
      } else {
        const list = snapshot.docs.map(doc => doc.data() as StaffMember);
        setStaffMembers(list);
        
        // Auto-migrate old 4-digit PINs to 6-digit PINs for default accounts in Firestore
        list.forEach(staff => {
          if (staff.id === 'staff-owner' && staff.pin === '1234') {
            updateDoc(doc(db, 'staffMembers', 'staff-owner'), { pin: '123456' });
          } else if (staff.id === 'staff-day' && staff.pin === '1111') {
            updateDoc(doc(db, 'staffMembers', 'staff-day'), { pin: '111111' });
          } else if (staff.id === 'staff-night' && staff.pin === '2222') {
            updateDoc(doc(db, 'staffMembers', 'staff-night'), { pin: '222222' });
          }
        });
      }
    });

    // 5. Sync Audit Logs
    const logsRef = collection(db, 'auditLogs');
    const unsubLogs = onSnapshot(logsRef, (snapshot) => {
      if (snapshot.empty) {
        INITIAL_LOGS.forEach(log => {
          setDoc(doc(db, 'auditLogs', log.id), log);
        });
      } else {
        const list = snapshot.docs.map(doc => doc.data() as AuditLog);
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAuditLogs(list);
      }
      setIsSyncing(false);
    });

    // 6. Sync Branches
    const branchesRef = collection(db, 'branches');
    const unsubBranches = onSnapshot(branchesRef, (snapshot) => {
      if (snapshot.empty) {
        INITIAL_BRANCHES.forEach(branch => {
          setDoc(doc(db, 'branches', branch.id), branch);
        });
      } else {
        const list = snapshot.docs.map(doc => doc.data() as Branch);
        setBranches(list);
      }
    });

    return () => {
      unsubSettings();
      unsubMedicines();
      unsubVouchers();
      unsubStaff();
      unsubLogs();
      unsubBranches();
    };
  }, []);

  // Sync back to localStorage as an instant offline/local cache
  useEffect(() => {
    localStorage.setItem('pharmacy_medicines', JSON.stringify(medicines));
  }, [medicines]);

  useEffect(() => {
    localStorage.setItem('pharmacy_vouchers', JSON.stringify(vouchers));
  }, [vouchers]);

  useEffect(() => {
    localStorage.setItem('pharmacy_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('pharmacy_staff_members', JSON.stringify(staffMembers));
  }, [staffMembers]);

  useEffect(() => {
    localStorage.setItem('pharmacy_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('pharmacy_branches', JSON.stringify(branches));
  }, [branches]);

  useEffect(() => {
    localStorage.setItem('pharmacy_current_user_id', currentUserId);
  }, [currentUserId]);

  // Real-time Clock display
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Inventory Handlers (Cloud Connected)
  const handleAddMedicine = (newMed: Medicine) => {
    // Ensure branchStocks is initialized
    const medWithBranch = {
      ...newMed,
      branchStocks: newMed.branchStocks || { 'branch-main': newMed.stock }
    };
    setDoc(doc(db, 'medicines', medWithBranch.id), medWithBranch);
    addLog(currentUser.name, 'ဆေးဝါးအသစ် စာရင်းသွင်းခြင်း', `ဆေးဝါးအသစ် "${newMed.name}" (${newMed.code}) ကို စာရင်းထဲသို့ ထည့်သွင်းခဲ့သည်။`, 'info');
  };

  const handleUpdateMedicine = (updatedMed: Medicine) => {
    setDoc(doc(db, 'medicines', updatedMed.id), updatedMed);
    addLog(currentUser.name, 'ဆေးဝါးအချက်အလက် ပြင်ဆင်ခြင်း', `ဆေးဝါး "${updatedMed.name}" (${updatedMed.code}) ၏ အချက်အလက်များကို ပြင်ဆင်ခဲ့သည်။`, 'info');
  };

  const handleDeleteMedicine = (id: string) => {
    const medToDelete = medicines.find(m => m.id === id);
    deleteDoc(doc(db, 'medicines', id));
    if (medToDelete) {
      addLog(currentUser.name, 'ဆေးဝါးစာရင်း ပယ်ဖျက်ခြင်း', `ဆေးဝါး "${medToDelete.name}" (${medToDelete.code}) ကို စနစ်ထဲမှ ဖျက်ပစ်ခဲ့သည်။`, 'danger');
    }
  };

  // Branch Handlers (Cloud Connected)
  const handleAddBranch = (newBranch: Branch) => {
    setDoc(doc(db, 'branches', newBranch.id), newBranch);
    addLog(currentUser.name, 'ဆိုင်ခွဲအသစ် ဖွင့်လှစ်ခြင်း', `ဆိုင်ခွဲအသစ် "${newBranch.name}" ကို စနစ်ထဲသို့ ထည့်သွင်းခဲ့သည်။`, 'info');
  };

  const handleUpdateBranch = (updatedBranch: Branch) => {
    setDoc(doc(db, 'branches', updatedBranch.id), updatedBranch);
    addLog(currentUser.name, 'ဆိုင်ခွဲအချက်အလက် ပြင်ဆင်ခြင်း', `ဆိုင်ခွဲ "${updatedBranch.name}" ၏ အချက်အလက်များကို ပြင်ဆင်ခဲ့သည်။`, 'info');
  };

  const handleDeleteBranch = (id: string) => {
    const branchToDelete = branches.find(b => b.id === id);
    deleteDoc(doc(db, 'branches', id));
    if (branchToDelete) {
      // Also cleanup medicine branch stock properties to avoid ghost data
      medicines.forEach(async med => {
        if (med.branchStocks && med.branchStocks[id] !== undefined) {
          const updatedStocks = { ...med.branchStocks };
          delete updatedStocks[id];
          const newTotalStock = (Object.values(updatedStocks) as number[]).reduce((a, b) => a + b, 0);
          await updateDoc(doc(db, 'medicines', med.id), {
            branchStocks: updatedStocks,
            stock: newTotalStock
          });
        }
      });
      addLog(currentUser.name, 'ဆိုင်ခွဲ ပိတ်သိမ်းခြင်း', `ဆိုင်ခွဲ "${branchToDelete.name}" ကို စနစ်ထဲမှ ဖျက်ပစ်ခဲ့သည်။`, 'danger');
    }
  };

  // Checkout Handlers (Cloud Sync Stock Deduct per Branch)
  const handleCheckout = async (cartItems: any[], voucher: Voucher) => {
    const selectedBranchId = voucher.branchId || 'branch-main';
    const stampedVoucher = {
      ...voucher,
      cashierName: currentUser.name
    };

    // 1. Deduct quantity from medicines list in Firestore for the chosen branch
    for (const item of cartItems) {
      const med = medicines.find(m => m.id === item.medicine.id);
      if (med) {
        const currentBranchStocks = med.branchStocks || { 'branch-main': med.stock };
        const currentBranchQty = currentBranchStocks[selectedBranchId] !== undefined 
          ? currentBranchStocks[selectedBranchId] 
          : (selectedBranchId === 'branch-main' ? med.stock : 0);
        
        const newBranchQty = Math.max(0, currentBranchQty - item.quantity);
        const updatedBranchStocks = {
          ...currentBranchStocks,
          [selectedBranchId]: newBranchQty
        };
        
        // Dynamic fallback for all standard branches to make sure they have a property
        branches.forEach(br => {
          if (updatedBranchStocks[br.id] === undefined) {
            updatedBranchStocks[br.id] = br.id === 'branch-main' ? med.stock : 0;
          }
        });

        // Recalculate total stock as sum of all branch stocks
        const newTotalStock = (Object.values(updatedBranchStocks) as number[]).reduce((a, b) => a + b, 0);

        await updateDoc(doc(db, 'medicines', med.id), { 
          branchStocks: updatedBranchStocks,
          stock: newTotalStock 
        });
      }
    }

    // 2. Add voucher to historical list
    await setDoc(doc(db, 'vouchers', stampedVoucher.id), stampedVoucher);

    // Log the sales transaction
    const itemsDescription = cartItems.map(item => `${item.medicine.name} x ${item.quantity}`).join(', ');
    const sellingBranch = branches.find(b => b.id === selectedBranchId)?.name || 'ပင်မဆိုင်';
    addLog(
      currentUser.name,
      'အရောင်းဘောက်ချာ ဖွင့်ခြင်း',
      `ဘောက်ချာနံပါတ် ${stampedVoucher.id} ဖြင့် "${sellingBranch}" မှ ကျသင့်ငွေ ${stampedVoucher.netTotal.toLocaleString()} ကျပ် ဖိုး ရောင်းချခဲ့သည်။ (${itemsDescription})`,
      'info'
    );
  };

  // Refund / Cancel Voucher (Cloud Sync Stock Restore per Branch)
  const handleRefundVoucher = async (voucherId: string) => {
    const voucherToRefund = vouchers.find(v => v.id === voucherId);
    if (!voucherToRefund) return;

    const soldBranchId = voucherToRefund.branchId || 'branch-main';

    // 1. Add quantities back to medicines stock in Firestore for the respective branch
    for (const item of voucherToRefund.items) {
      const med = medicines.find(m => m.id === item.medicineId);
      if (med) {
        const currentBranchStocks = med.branchStocks || { 'branch-main': med.stock };
        const currentBranchQty = currentBranchStocks[soldBranchId] !== undefined 
          ? currentBranchStocks[soldBranchId] 
          : (soldBranchId === 'branch-main' ? med.stock : 0);
        
        const newBranchQty = currentBranchQty + item.quantity;
        const updatedBranchStocks = {
          ...currentBranchStocks,
          [soldBranchId]: newBranchQty
        };
        
        const newTotalStock = (Object.values(updatedBranchStocks) as number[]).reduce((a, b) => a + b, 0);

        await updateDoc(doc(db, 'medicines', med.id), { 
          branchStocks: updatedBranchStocks,
          stock: newTotalStock 
        });
      }
    }

    // 2. Remove voucher from history in Firestore
    await deleteDoc(doc(db, 'vouchers', voucherId));

    // Log refund
    const sellingBranch = branches.find(b => b.id === soldBranchId)?.name || 'ပင်မဆိုင်';
    addLog(
      currentUser.name,
      'ဘောက်ချာ ပယ်ဖျက်/ပြန်အမ်းခြင်း',
      `ဘောက်ချာနံပါတ် ${voucherId} ကို ပယ်ဖျက်ပြီး ဆေးပစ္စည်းများကို "${sellingBranch}" ဆိုင်ခွဲလက်ကျန်ထဲသို့ ပြန်လည် ထည့်သွင်းပေးခဲ့သည်။`,
      'danger'
    );
  };

  // Settings Handlers (Cloud Connected)
  const handleUpdateSettings = (newSettings: ShopSettings) => {
    setDoc(doc(db, 'settings', 'main'), newSettings);
    addLog(currentUser.name, 'ဆိုင်ဆက်တင်များ ပြောင်းလဲခြင်း', `ဆိုင်အချက်အလက်များနှင့် ဆက်တင်များကို ပြောင်းလဲပြင်ဆင်ခဲ့သည်။`, 'info');
  };

  // Full Database Reset (Cloud Connected)
  const handleResetDatabase = async () => {
    localStorage.removeItem('pharmacy_medicines');
    localStorage.removeItem('pharmacy_vouchers');
    localStorage.removeItem('pharmacy_settings');
    localStorage.removeItem('pharmacy_staff_members');
    localStorage.removeItem('pharmacy_audit_logs');

    // Reset settings doc
    await setDoc(doc(db, 'settings', 'main'), DEFAULT_SETTINGS);

    // Delete existing documents in medicines, vouchers, staff, and logs
    for (const med of medicines) {
      await deleteDoc(doc(db, 'medicines', med.id));
    }
    for (const v of vouchers) {
      await deleteDoc(doc(db, 'vouchers', v.id));
    }
    for (const s of staffMembers) {
      await deleteDoc(doc(db, 'staffMembers', s.id));
    }
    for (const log of auditLogs) {
      await deleteDoc(doc(db, 'auditLogs', log.id));
    }

    // Repopulate with initial data
    INITIAL_STAFF.forEach(staff => {
      setDoc(doc(db, 'staffMembers', staff.id), staff);
    });
    INITIAL_MEDICINES.forEach(med => {
      setDoc(doc(db, 'medicines', med.id), med);
    });
    INITIAL_LOGS.forEach(log => {
      setDoc(doc(db, 'auditLogs', log.id), log);
    });

    addLog('စနစ် (System)', 'ဒေတာဘေ့စ် ပြန်လည်သတ်မှတ်ခြင်း', `စနစ်ရှိ အချက်အလက်အားလုံးကို စက်ရုံထုတ်မူလအတိုင်း ပြန်လည်ရှင်းလင်းသတ်မှတ်ခဲ့သည်။`, 'danger');
  };

  // Full Database Import (Cloud Connected)
  const handleImportDatabase = async (importedMedicines: Medicine[], importedVouchers: Voucher[], importedSettings: ShopSettings) => {
    // Write settings
    await setDoc(doc(db, 'settings', 'main'), importedSettings);

    // Delete existing medicines and vouchers
    for (const med of medicines) {
      await deleteDoc(doc(db, 'medicines', med.id));
    }
    for (const v of vouchers) {
      await deleteDoc(doc(db, 'vouchers', v.id));
    }

    // Add imported medicines
    for (const med of importedMedicines) {
      await setDoc(doc(db, 'medicines', med.id), med);
    }
    // Add imported vouchers
    for (const v of importedVouchers) {
      await setDoc(doc(db, 'vouchers', v.id), v);
    }

    addLog(currentUser.name, 'ဒေတာဘေ့စ် ပြန်သွင်းယူခြင်း', `ပြင်ပ Backup ဖိုင်မှတစ်ဆင့် စာရင်းအချက်အလက်များကို အသစ်ပြန်လည် သွင်းယူခဲ့သည်။`, 'warning');
  };

  // PIN validation handler
  const handleSwitchUserConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffToSwitch) return;

    if (pinInput === selectedStaffToSwitch.pin) {
      // Success
      setCurrentUserId(selectedStaffToSwitch.id);
      addLog(selectedStaffToSwitch.name, 'အကောင့်ဝင်ရောက်ခြင်း', `စနစ်ထဲသို့ PIN ကုဒ်ဖြင့် အောင်မြင်စွာ Login ဝင်ရောက်ခဲ့သည်။`, 'info');
      setIsPinModalOpen(false);
      setPinInput('');
      setPinError('');
    } else {
      // Fail
      setPinError('PIN ကုဒ် မမှန်ကန်ပါ။ ပြန်လည် ကြိုးစားပါ။');
      addLog(
        selectedStaffToSwitch.name,
        'အကောင့်ဝင်ရန် ကြိုးပမ်းမှု ပျက်ပြားခြင်း',
        `လုံခြုံရေး PIN ကုဒ် အမှားရိုက်နှိပ်၍ စနစ်သို့ ဝင်ရောက်ရန် ကြိုးပမ်းခဲ့သည်။`,
        'warning'
      );
    }
  };

  if (staffMembers.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-gray-400 font-bold">စနစ်ကို ချိတ်ဆက်နေပါသည်...</p>
        </div>
      </div>
    );
  }

  if (!currentUserId || !staffMembers.some(sm => sm.id === currentUserId)) {
    return (
      <PinLogin
        staffMembers={staffMembers}
        branches={branches}
        settings={settings}
        onLoginSuccess={(userId, branchId) => {
          setCurrentUserId(userId);
          localStorage.setItem('pharmacy_current_user_id', userId);
          addLog(
            staffMembers.find(sm => sm.id === userId)?.name || 'ဝန်ထမ်း',
            'စနစ်ထဲသို့ ဝင်ရောက်ခြင်း',
            `ဆိုင်ခွဲ "${branches.find(b => b.id === branchId)?.name || 'ပင်မဆိုင်'}" သို့ PIN ကုဒ်ဖြင့် အောင်မြင်စွာ ဝင်ရောက်ခဲ့သည်။`,
            'info'
          );
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="app-root">
      
      {/* Header Bar */}
      <header className="bg-white border-b border-gray-100 py-3.5 px-4 sm:px-6 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Logo Brand */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Pill className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-base font-black text-gray-900 tracking-tight leading-none">
                {settings.name}
              </h1>
              <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                ဆေးဆိုင် စာရင်းကိုင်နှင့် အရောင်းစနစ် (POS & Warehouse)
              </p>
            </div>
          </div>

          {/* Right Controls: Clock & User Profile Switcher */}
          <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
            {/* Cloud Sync Status Indicator */}
            <div className="flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50/80 px-3.5 py-1.5 rounded-xl border border-emerald-100 font-bold shadow-2xs">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Internet Live Sync</span>
            </div>

            {/* Clock Indicator */}
            <div className="flex items-center space-x-2 text-xs text-gray-500 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-100 font-medium">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span className="font-mono">{time.toLocaleDateString()} {time.toLocaleTimeString()}</span>
            </div>

            {/* Currently Active Profile badge */}
            <div className="flex items-center space-x-2.5 bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl">
              <div className="text-right">
                <p className="text-[9px] text-gray-400 font-extrabold leading-none uppercase">ဝန်ထမ်းအဆင့်</p>
                <p className="text-[11px] font-black text-gray-800 mt-1 flex items-center">
                  <Shield className={`w-3 h-3 mr-1 ${currentUser.role === 'owner' ? 'text-amber-500' : 'text-emerald-500'}`} />
                  {currentUser.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedStaffToSwitch(null);
                  setPinInput('');
                  setPinError('');
                  setIsPinModalOpen(true);
                }}
                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-extrabold rounded-lg transition duration-100 flex items-center space-x-1"
                title="အကောင့်ပြောင်းရန် နှိပ်ပါ"
              >
                <Users className="w-3.5 h-3.5" />
                <span>ပြောင်းရန်</span>
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6">
        
        {/* Navigation Sidebar (Vertical on Large screens, horizontal list on small/medium) */}
        <nav className="lg:w-64 w-full flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible bg-white p-1.5 rounded-2xl border border-gray-100 shadow-xs self-start shrink-0">
          
          {/* Dashboard Tab */}
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl text-xs font-semibold transition duration-150 shrink-0 lg:w-full ${
              currentTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>ပင်မဒိုင်ခွက် (Dashboard)</span>
          </button>

          {/* POS Tab */}
          <button
            onClick={() => setCurrentTab('pos')}
            className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl text-xs font-semibold transition duration-150 shrink-0 lg:w-full ${
              currentTab === 'pos'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800 hover:bg-slate-50'
            }`}
          >
            <ShoppingCart className="w-4 h-4 shrink-0" />
            <span>ဆေးရောင်းရန် (POS Terminal)</span>
          </button>

          {/* Inventory Tab */}
          <button
            onClick={() => setCurrentTab('inventory')}
            className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl text-xs font-semibold transition duration-150 shrink-0 lg:w-full ${
              currentTab === 'inventory'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800 hover:bg-slate-50'
            }`}
          >
            <FolderKanban className="w-4 h-4 shrink-0" />
            <span>ဂိုထောင် / ဆေးစာရင်း (Stock)</span>
          </button>

          {/* Sales History Tab */}
          <button
            onClick={() => setCurrentTab('sales')}
            className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl text-xs font-semibold transition duration-150 shrink-0 lg:w-full ${
              currentTab === 'sales'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800 hover:bg-slate-50'
            }`}
          >
            <History className="w-4 h-4 shrink-0" />
            <span>ဘောက်ချာမှတ်တမ်း (Sales)</span>
          </button>

          {/* Settings Tab */}
          <button
            onClick={() => setCurrentTab('settings')}
            className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl text-xs font-semibold transition duration-150 shrink-0 lg:w-full ${
              currentTab === 'settings'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800 hover:bg-slate-50'
            }`}
          >
            <Settings2 className="w-4 h-4 shrink-0" />
            <span>စနစ်ထိန်းသိမ်းမှု (Settings)</span>
          </button>

          {/* Log Out Tab */}
          <button
            onClick={() => {
              if (confirm('စနစ်ထဲမှ ထွက်ခွာရန် သေချာပါသလား?')) {
                setCurrentUserId('');
                localStorage.removeItem('pharmacy_current_user_id');
              }
            }}
            className="flex items-center space-x-2.5 px-4 py-3 rounded-xl text-xs font-semibold transition duration-150 shrink-0 lg:w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 lg:mt-6 mt-0"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>စနစ်မှထွက်ရန် (Sign Out)</span>
          </button>

        </nav>

        {/* Tab Content Display Area */}
        <main className="flex-1 min-w-0" id="main-content">
          
          {currentTab === 'dashboard' && (
            <Dashboard
              medicines={medicines}
              vouchers={vouchers}
              settings={settings}
              currentUser={currentUser}
              onNavigate={(tab) => setCurrentTab(tab)}
              branches={branches}
            />
          )}

          {currentTab === 'pos' && (
            <POS
              medicines={medicines}
              settings={settings}
              branches={branches}
              onCheckout={handleCheckout}
              currentUser={currentUser}
            />
          )}

          {currentTab === 'inventory' && (
            <Inventory
              medicines={medicines}
              settings={settings}
              currentUser={currentUser}
              branches={branches}
              onAddMedicine={handleAddMedicine}
              onUpdateMedicine={handleUpdateMedicine}
              onDeleteMedicine={handleDeleteMedicine}
              onAddBranch={handleAddBranch}
              onUpdateBranch={handleUpdateBranch}
              onDeleteBranch={handleDeleteBranch}
            />
          )}

          {currentTab === 'sales' && (
            <SalesHistory
              vouchers={vouchers}
              medicines={medicines}
              settings={settings}
              currentUser={currentUser}
              auditLogs={auditLogs}
              onRefundVoucher={handleRefundVoucher}
            />
          )}

          {currentTab === 'settings' && (
            <Settings
              settings={settings}
              currentUser={currentUser}
              staffMembers={staffMembers}
              setStaffMembers={setStaffMembers}
              auditLogs={auditLogs}
              setAuditLogs={setAuditLogs}
              addLog={addLog}
              onUpdateSettings={handleUpdateSettings}
              onResetDatabase={handleResetDatabase}
              onImportDatabase={handleImportDatabase}
              medicines={medicines}
              vouchers={vouchers}
              userProfile={userProfile}
              allUserProfiles={allUserProfiles}
              branches={branches}
            />
          )}

        </main>

      </div>

      {/* Profile PIN switch Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl overflow-hidden border border-gray-100 flex flex-col p-6 animate-scaleIn">
            <h3 className="font-extrabold text-sm text-gray-900 mb-2 flex items-center">
              <Shield className="w-5 h-5 text-emerald-600 mr-2 shrink-0" />
              ဝန်ထမ်းအကောင့်ပြောင်းလဲခြင်း (PIN လိုအပ်သည်)
            </h3>
            <p className="text-xs text-gray-500 mb-4">မမှန်မကန်လုပ်မှုများနှင့် စာရင်းမှားများကို ကာကွယ်ရန် PIN စနစ် ကျင့်သုံးထားပါသည်။</p>

            {/* Profile Selection Stage */}
            {!selectedStaffToSwitch ? (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                <label className="block text-xs font-bold text-gray-600 mb-1">ပြောင်းလဲလိုသော အကောင့်ရွေးပါ -</label>
                {staffMembers.map(staff => (
                  <button
                    key={staff.id}
                    onClick={() => {
                      setSelectedStaffToSwitch(staff);
                      setPinInput('');
                      setPinError('');
                    }}
                    className={`w-full text-left p-3 rounded-xl border border-gray-100 hover:border-emerald-500 hover:bg-emerald-50/20 transition flex items-center justify-between ${
                      currentUser.id === staff.id ? 'bg-slate-50 opacity-60' : 'bg-white'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-800">{staff.name}</p>
                      <p className="text-[10px] text-gray-400 capitalize font-medium">{staff.role === 'owner' ? 'Owner / ဆိုင်ပိုင်ရှင်' : 'Staff / ဝန်ထမ်း'}</p>
                    </div>
                    {currentUser.id === staff.id && (
                      <span className="text-[10px] text-gray-400 font-semibold bg-gray-100 px-2 py-0.5 rounded">လက်ရှိသုံးနေဆဲ</span>
                    )}
                  </button>
                ))}
                <div className="pt-2">
                  <button
                    onClick={() => setIsPinModalOpen(false)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
                  >
                    ပိတ်မည်
                  </button>
                </div>
              </div>
            ) : (
              /* PIN Input Stage */
              <form onSubmit={handleSwitchUserConfirm} className="space-y-4">
                <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/30 text-center">
                  <p className="text-[10px] text-emerald-600 font-bold">ရွေးချယ်ထားသော ဝန်ထမ်း -</p>
                  <p className="text-xs font-black text-gray-800 mt-0.5">{selectedStaffToSwitch.name}</p>
                </div>

                {pinError && (
                  <p className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-2.5 py-1.5 rounded-lg flex items-center">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                    {pinError}
                  </p>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">အကောင့်လုံခြုံရေး PIN ကုဒ် (၆-လုံး) ရိုက်ထည့်ပါ -</label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    autoFocus
                    placeholder="••••••"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-[1.5em] font-mono font-bold text-lg bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <p className="text-[9px] text-gray-400 mt-1.5 text-center">စမ်းသပ်ရန် Owners PIN: <span className="font-bold">123456</span>, Staffs PIN: <span className="font-bold">111111</span> သို့မဟုတ် <span className="font-bold">222222</span> ဖြစ်ပါသည်။</p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStaffToSwitch(null)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
                  >
                    နောက်သို့
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                  >
                    အတည်ပြုမည်
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Humble Footer */}
      <footer className="bg-white border-t border-gray-100 py-4 mt-auto text-center text-[11px] text-gray-400">
        <p>&copy; 2026 {settings.name}. All rights reserved. Designed for local retail pharmacists.</p>
      </footer>

    </div>
  );
}
