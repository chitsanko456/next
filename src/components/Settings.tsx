import React, { useState, useMemo } from 'react';
import { ShopSettings, Medicine, Voucher, StaffMember, AuditLog, Branch } from '../types';
import { Save, RefreshCw, Download, Upload, Trash2, CheckCircle2, AlertTriangle, Building, Phone, MapPin, MessageSquare, Landmark, User, Shield, Users, Key, Plus, Lock, Calendar, ClipboardList, Search } from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

interface SettingsProps {
  settings: ShopSettings;
  onUpdateSettings: (settings: ShopSettings) => void;
  onResetDatabase: () => void;
  onImportDatabase: (medicines: Medicine[], vouchers: Voucher[], settings: ShopSettings) => void;
  medicines: Medicine[];
  vouchers: Voucher[];
  currentUser?: StaffMember;
  staffMembers: StaffMember[];
  setStaffMembers: React.Dispatch<React.SetStateAction<StaffMember[]>>;
  auditLogs: AuditLog[];
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>;
  addLog: (user: string, action: string, details: string, type: 'info' | 'warning' | 'danger') => void;
  userProfile?: any;
  allUserProfiles?: any[];
  branches: Branch[];
}

export default function Settings({ 
  settings, 
  onUpdateSettings, 
  onResetDatabase, 
  onImportDatabase, 
  medicines, 
  vouchers,
  currentUser,
  staffMembers,
  setStaffMembers,
  auditLogs,
  setAuditLogs,
  addLog,
  userProfile,
  allUserProfiles = [],
  branches
}: SettingsProps) {
  const isStaff = currentUser?.role === 'staff';

  // Local states for settings inputs
  const [name, setName] = useState(settings.name);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [footerMessage, setFooterMessage] = useState(settings.footerMessage);
  const [currency, setCurrency] = useState(settings.currency);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  // Staff management states
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'owner' | 'staff'>('staff');
  const [newStaffBranchId, setNewStaffBranchId] = useState<string>(() => {
    const main = branches.find(b => b.isMain);
    return main ? main.id : (branches[0]?.id || 'branch-main');
  });
  const [staffError, setStaffError] = useState('');
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [logSearch, setLogSearch] = useState('');

  // Handle Save settings
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStaff) return;

    onUpdateSettings({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      footerMessage: footerMessage.trim(),
      currency: currency.trim() || 'ကျပ်',
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Export full database to JSON file
  const handleExportData = () => {
    const dataToExport = {
      medicines,
      vouchers,
      settings,
      exportedAt: new Date().toISOString()
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(dataToExport, null, 2)
    )}`;
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `pharmacy_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON backup
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isStaff) return;
    setImportError('');
    setImportSuccess(false);

    const fileReader = new FileReader();
    const file = e.target.files?.[0];

    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const parsedData = JSON.parse(event.target?.result as string);
        
        if (!parsedData.medicines || !parsedData.vouchers || !parsedData.settings) {
          setImportError('မှားယွင်းနေပါသည်။ ဤဖိုင်သည် မှန်ကန်သော ဆေးဆိုင် Backup ဖိုင် မဟုတ်ပါ။');
          return;
        }

        onImportDatabase(parsedData.medicines, parsedData.vouchers, parsedData.settings);
        setImportSuccess(true);
        
        setName(parsedData.settings.name);
        setPhone(parsedData.settings.phone);
        setAddress(parsedData.settings.address);
        setCurrency(parsedData.settings.currency);
        setFooterMessage(parsedData.settings.footerMessage);

      } catch (err) {
        setImportError('ဖိုင်ဖတ်ရန် မဖြစ်နိုင်ပါ။ Backup JSON ဖိုင် ပျက်စီးနေပါသည်။');
      }
    };

    fileReader.readAsText(file);
  };

  const handleResetClick = () => {
    if (isStaff) return;
    if (confirm('ဆေးဆိုင်အချက်အလက်အားလုံးကို စက်ရုံထုတ်ပုံစံ (Default Seed Data) သို့ ပြန်လည်သတ်မှတ်ရန် သေချာပါသလား?\n\n(လက်ရှိထည့်သွင်းထားသော ဆေးဝါးများနှင့် အရောင်းဘောက်ချာမှတ်တမ်းများအားလုံး ပျက်ပြယ်သွားမည်ဖြစ်ပါသည်။)')) {
      onResetDatabase();
      alert('ဒေတာဘေ့စ် ပြန်လည်သတ်မှတ်ခြင်း အောင်မြင်ပါသည်။');
      window.location.reload();
    }
  };

  // Staff list functions
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStaff) return;
    setStaffError('');
    setIsSavingStaff(true);

    try {
      if (!newStaffName.trim() || !newStaffPin.trim()) {
        setStaffError('အမည်နှင့် PIN ကုဒ်ကို ဖြည့်စွက်ပါ');
        setIsSavingStaff(false);
        return;
      }

      if (newStaffPin.trim().length !== 6 || isNaN(Number(newStaffPin))) {
        setStaffError('PIN ကုဒ်သည် ဂဏန်း ၆ လုံး ဖြစ်ရပါမည်');
        setIsSavingStaff(false);
        return;
      }

      if (staffMembers.some(s => s.pin === newStaffPin)) {
        setStaffError('ဤ PIN ကုဒ်အား အခြားဝန်ထမ်းက အသုံးပြုထားပြီးဖြစ်သည်');
        setIsSavingStaff(false);
        return;
      }

      const newStaff: StaffMember = {
        id: 'staff_' + Date.now(),
        name: newStaffName.trim(),
        pin: newStaffPin.trim(),
        role: newStaffRole,
        branchId: newStaffRole === 'staff' ? newStaffBranchId : undefined
      };

      // Save to Firestore
      await setDoc(doc(db, 'staffMembers', newStaff.id), newStaff);

      addLog(
        currentUser?.name || 'ပိုင်ရှင်',
        'ဝန်ထမ်းသစ် ခန့်အပ်ခြင်း',
        `အမည် "${newStaff.name}"၊ ရာထူး "${newStaff.role === 'owner' ? 'Owner' : 'Staff'}" ကို PIN ကုဒ်ဖြင့် စနစ်ထဲသို့ ထည့်သွင်းပေးခဲ့သည်။`,
        'info'
      );

      setNewStaffName('');
      setNewStaffPin('');
      setNewStaffRole('staff');
      setShowAddStaffModal(false);
    } catch (err: any) {
      console.error("Error adding staff:", err);
      setStaffError(`ဝန်ထမ်းထည့်သွင်းရာတွင် အမှားအယွင်းရှိပါသည်- ${err.message || err}`);
    } finally {
      setIsSavingStaff(false);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (isStaff) return;
    const staffToDelete = staffMembers.find(s => s.id === staffId);
    if (!staffToDelete) return;

    if (staffToDelete.id === currentUser?.id) {
      alert('မိမိကိုယ်တိုင် ပြန်လည်ဖျက်၍ မရနိုင်ပါ');
      return;
    }

    if (confirm(`ဝန်ထမ်း "${staffToDelete.name}" ကို စနစ်ထဲမှ ဖယ်ရှားရန် သေချာပါသလား?`)) {
      try {
        // Delete from Firestore
        await deleteDoc(doc(db, 'staffMembers', staffId));

        addLog(
          currentUser?.name || 'ပိုင်ရှင်',
          'ဝန်ထမ်း ဖယ်ရှားခြင်း',
          `ဝန်ထမ်း "${staffToDelete.name}" (${staffToDelete.role}) ကို စနစ်ထဲမှ ဖယ်ရှားခဲ့သည်။`,
          'danger'
        );
      } catch (err: any) {
        console.error("Error deleting staff:", err);
        alert(`ဝန်ထမ်းဖျက်သိမ်းရာတွင် အမှားအယွင်းရှိပါသည်: ${err.message || err}`);
      }
    }
  };

  const handleClearLogs = async () => {
    if (isStaff) return;
    if (confirm('စနစ်၏ လုံခြုံရေးမှတ်တမ်း (Audit Logs) အားလုံးကို ရှင်းလင်းပစ်ရန် သေချာပါသလား?')) {
      // Delete all logs from Firestore
      for (const log of auditLogs) {
        await deleteDoc(doc(db, 'auditLogs', log.id));
      }
      addLog(currentUser?.name || 'ပိုင်ရှင်', 'မှတ်တမ်းရှင်းလင်းခြင်း', 'စနစ်လှုပ်ရှားမှုမှတ်တမ်းအားလုံးကို ရှင်းလင်းခဲ့သည်။', 'warning');
    }
  };

  // Filter audit logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => 
      log.userName.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(logSearch.toLowerCase())
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [auditLogs, logSearch]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-gray-800">စနစ်ထိန်းသိမ်းမှုနှင့် ဆက်တင်များ</h2>
        <p className="text-xs text-gray-500">ဆေးဆိုင်ဆိုင်ရာ အချက်အလက်များ၊ ပြေစာ (Voucher) စာသားများနှင့် ဝန်ထမ်းလုံခြုံရေးထိန်းချုပ်မှုများကို ဤနေရာတွင် လုပ်ဆောင်နိုင်ပါသည်။</p>
      </div>

      {isStaff && (
        <div className="bg-amber-50 border border-amber-200/60 text-amber-800 p-5 rounded-2xl flex items-start space-x-3.5 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-xs">ကန့်သတ်ထားသော ကဏ္ဍဖြစ်ပါသည်</h4>
            <p className="text-[11px] text-amber-700/95 mt-1 leading-relaxed">
              စနစ်ဆက်တင်များ ပြောင်းလဲခြင်း၊ ဒေတာဘေ့စ်တစ်ခုလုံးအား ဖျက်သိမ်းခြင်း၊ ဝန်ထမ်းအကောင့်များ စီမံခန့်ခွဲခြင်းနှင့် လုံခြုံရေးမှတ်တမ်းများကို ကြည့်ရှုစစ်ဆေးခြင်းများကို ဆိုင်ပိုင်ရှင် (Owner) သာ လုပ်ဆောင်ခွင့်ရှိပါသည်။
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Shop Info Form */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-gray-800 border-b border-gray-50 pb-2 mb-3">
            ဆိုင်အချက်အလက် ပြင်ဆင်ရန်
          </h3>

          {saveSuccess && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-3.5 rounded-xl text-xs flex items-center space-x-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>ဆိုင်အချက်အလက်များ ပြောင်းလဲသိမ်းဆည်းပြီးပါပြီ။</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center">
                <Building className="w-3.5 h-3.5 mr-1 text-gray-400" />
                ဆိုင်အမည် / ကုမ္ပဏီအမည်
              </label>
              <input
                type="text"
                required
                disabled={isStaff}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-75 disabled:bg-gray-100/50 text-gray-800"
                placeholder="ရတနာ ဆေးဆိုင်"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center">
                  <Phone className="w-3.5 h-3.5 mr-1 text-gray-400" />
                  ဆက်သွယ်ရန် ဖုန်းနံပါတ်
                </label>
                <input
                  type="text"
                  required
                  disabled={isStaff}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-75 disabled:bg-gray-100/50 text-gray-800"
                  placeholder="09-xxxxxxxxx"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center">
                  <Landmark className="w-3.5 h-3.5 mr-1 text-gray-400" />
                  ငွေကြေး သတ်မှတ်ချက် (ယူနစ်)
                </label>
                <input
                  type="text"
                  required
                  disabled={isStaff}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-75 disabled:bg-gray-100/50 text-gray-800"
                  placeholder="ကျပ် သို့မဟုတ် MMK"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
                ဆိုင်လိပ်စာ
              </label>
              <textarea
                rows={2}
                required
                disabled={isStaff}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-75 disabled:bg-gray-100/50 text-gray-800"
                placeholder="အမှတ် (၁၂၃)၊ လမ်းမတော်၊ ရန်ကုန်မြို့။"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center">
                <MessageSquare className="w-3.5 h-3.5 mr-1 text-gray-400" />
                ဘောက်ချာအောက်ခြေ နှုတ်ခွန်းဆက်စာသား
              </label>
              <textarea
                rows={2}
                disabled={isStaff}
                value={footerMessage}
                onChange={(e) => setFooterMessage(e.target.value)}
                className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-75 disabled:bg-gray-100/50 text-gray-800"
                placeholder="ဝယ်ယူအားပေးမှုကို အထူးကျေးဇူးတင်ရှိပါသည်။"
              />
            </div>

            {!isStaff && (
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition duration-150 flex items-center justify-center shadow-sm cursor-pointer"
              >
                <Save className="w-4 h-4 mr-1.5" />
                <span>ဆိုင်အချက်အလက် သိမ်းဆည်းမည်</span>
              </button>
            )}
          </form>
        </div>

        {/* Right 1 Col: Backup & Database Tools */}
        <div className="space-y-6">
          {/* Backup Panel */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-gray-800 border-b border-gray-50 pb-2 flex items-center">
              <Download className="w-4 h-4 mr-1.5 text-emerald-600" />
              <span>ဒေတာ သိမ်းဆည်း/ဆွဲယူရန်</span>
            </h3>
            
            <p className="text-[11px] text-gray-500 leading-relaxed">
              အရောင်းစာရင်းများနှင့် ဆေးပစ္စည်းအချက်အလက်များအားလုံးကို ဘက်ကပ် (Backup) ထုတ်ယူသိမ်းဆည်းထားနိုင်ပါသည်။
            </p>

            {importSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-2.5 rounded-lg text-[10px] flex items-center space-x-1 animate-fadeIn">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>အချက်အလက်များအားလုံး အောင်မြင်စွာ ပြန်လည်သွင်းယူပြီးပါပြီ!</span>
              </div>
            )}

            {importError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 p-2.5 rounded-lg text-[10px] flex items-start space-x-1 animate-fadeIn">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleExportData}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/50 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>ဘက်ကပ်ဖိုင် ထုတ်ယူမည်</span>
              </button>

              {!isStaff && (
                <label className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/50 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer text-center">
                  <Upload className="w-4 h-4" />
                  <span>ဘက်ကပ်ဖိုင် ပြန်သွင်းမည်</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Reset Database Panel - Hidden for staff */}
          {!isStaff && (
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
              <h3 className="font-bold text-sm text-rose-600 border-b border-rose-50 pb-2 flex items-center">
                <Trash2 className="w-4 h-4 mr-1.5" />
                <span>ဒေတာ ပြန်လည်သတ်မှတ်ရန်</span>
              </h3>
              
              <p className="text-[11px] text-gray-500 leading-relaxed">
                စမ်းသပ်ထားသော အရောင်းစာရင်းများနှင့် ဆေးဝါးများအားလုံးကို ရှင်းလင်းပြီး စနစ်မူလပုံစံသို့ အလုံးစုံ ပြန်လည်သတ်မှတ်ရန် ခလုတ်ကို နှိပ်ပါ။
              </p>

              <button
                onClick={handleResetClick}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>အချက်အလက်အားလုံး ဖျက်မည်</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Staff Management & Audit Trail Section - Only visible to Owner */}
      {!isStaff && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* Staff Members List */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 lg:col-span-1">
            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <h3 className="font-bold text-sm text-gray-800 flex items-center">
                <Users className="w-4 h-4 mr-1.5 text-emerald-600" />
                <span>ဝန်ထမ်းများနှင့် PIN နံပါတ်များ</span>
              </h3>
              <button
                onClick={() => {
                  setStaffError('');
                  setShowAddStaffModal(true);
                }}
                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                title="ဝန်ထမ်းအသစ်ခန့်ရန်"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-gray-400">
              အရောင်းဝန်ထမ်းများသည် ဆေးဝါးရောင်းချခြင်းသာ လုပ်ဆောင်နိုင်ပြီး၊ ဝယ်ရင်းဈေးနှင့် အမြတ်ငွေများကို ကြည့်ရှုခွင့်၊ ပြင်ဆင်ခွင့် ရှိမည်မဟုတ်ပါ။
            </p>

            <div className="divide-y divide-gray-50 max-h-[250px] overflow-y-auto pr-1">
              {staffMembers.map(staff => (
                <div key={staff.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      {staff.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-gray-800 flex items-center">
                        <span>{staff.name}</span>
                        {staff.role === 'owner' ? (
                          <span className="ml-1.5 bg-purple-50 text-purple-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md border border-purple-100">Owner</span>
                        ) : (
                          <span className="ml-1.5 bg-emerald-50 text-emerald-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md border border-emerald-100">Staff</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 flex items-center mt-0.5 font-mono">
                        <Lock className="w-3 h-3 text-slate-300 mr-1" />
                        <span>PIN: {staff.pin}</span>
                        {staff.branchId && (
                          <span className="ml-2 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-sans font-bold">
                            {branches.find(b => b.id === staff.branchId)?.name || 'အခြားဆိုင်ခွဲ'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {staff.id !== currentUser?.id && (
                    <button
                      onClick={() => handleDeleteStaff(staff.id)}
                      className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
                      title="ဝန်ထမ်းကို ဖယ်ရှားမည်"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Audit Logs Trail */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 lg:col-span-2 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-50 pb-3">
              <h3 className="font-bold text-sm text-gray-800 flex items-center">
                <ClipboardList className="w-4 h-4 mr-1.5 text-emerald-600" />
                <span>အရောင်းနှင့် စနစ်လှုပ်ရှားမှုမှတ်တမ်း (Audit Logs)</span>
              </h3>
              <button
                onClick={handleClearLogs}
                className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-100 transition self-end sm:self-auto"
              >
                မှတ်တမ်းအားလုံးရှင်းမည်
              </button>
            </div>

            <p className="text-[11px] text-gray-400">
              ဤနေရာတွင် ဝန်ထမ်းများ၏ လုပ်ဆောင်ချက်များ (ဘေလ်ဖွင့်ခြင်း၊ ဆေးပစ္စည်းအပြောင်းအလဲ၊ အကောင့်ဝင်ရောက်ခြင်း) အားလုံးကို တိကျစွာ မှတ်တမ်းတင်ထားပေးသဖြင့် လိမ်လည်မှုများ လုံးဝမပြုလုပ်နိုင်ပါ။
            </p>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="လုပ်ဆောင်ချက် သို့မဟုတ် ဝန်ထမ်းအမည်ဖြင့် ရှာရန်..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full bg-gray-50 text-[11px] border border-gray-100 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto max-h-[250px] border border-gray-50 rounded-xl divide-y divide-gray-50">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">
                  စနစ်လှုပ်ရှားမှုမှတ်တမ်း မရှိသေးပါ။
                </div>
              ) : (
                filteredLogs.map(log => (
                  <div key={log.id} className="p-3 hover:bg-gray-50/50 transition flex items-start justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className="font-bold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                          {log.userName}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          log.severity === 'danger'
                            ? 'bg-rose-50 text-rose-700 border border-rose-100'
                            : log.severity === 'warning'
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {log.action}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 leading-relaxed font-medium">
                        {log.details}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Firebase Accounts Access Control */}
          {false && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 lg:col-span-3 mt-4">
            <div className="border-b border-gray-50 pb-3">
              <h3 className="font-bold text-sm text-gray-800 flex items-center">
                <Shield className="w-4 h-4 mr-1.5 text-emerald-600 animate-pulse" />
                <span>အွန်လိုင်း အကောင့်များ စီမံခန့်ခွဲခြင်း (Online User Accounts)</span>
              </h3>
              <p className="text-[10px] text-gray-400 mt-1">
                စနစ်ထဲသို့ Email ဖြင့် စာရင်းသွင်းဝင်ရောက်ထားသော ဝန်ထမ်းများ၏ ခွင့်ပြုချက် အဆင့်အတန်းများကို ဤနေရာတွင် စစ်ဆေးအတည်ပြုနိုင်ပါသည်။
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-2">အီးမေးလ်လိပ်စာ (Email Address)</th>
                    <th className="py-3 px-2">ရာထူးအခန်းကဏ္ဍ (Role)</th>
                    <th className="py-3 px-2">ဝင်ရောက်ခွင့် အခြေအနေ (Approval Status)</th>
                    <th className="py-3 px-2">စာရင်းသွင်းသည့်ရက်</th>
                    <th className="py-3 px-2 text-right">လုပ်ဆောင်ချက်များ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allUserProfiles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-400 font-medium">
                        စာရင်းသွင်းထားသော အွန်လိုင်းအကောင့် မရှိသေးပါ။
                      </td>
                    </tr>
                  ) : (
                    allUserProfiles.map((prof: any) => (
                      <tr key={prof.uid} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-2 font-semibold text-gray-700 font-mono">
                          {prof.email}
                        </td>
                        <td className="py-3 px-2">
                          <select
                            value={prof.role}
                            disabled={prof.uid === userProfile?.uid} // can't change own role
                            onChange={async (e) => {
                              const newRole = e.target.value;
                              await setDoc(doc(db, 'userProfiles', prof.uid), {
                                ...prof,
                                role: newRole
                              });
                              addLog(currentUser?.name || 'Owner', 'ရာထူးပြင်ဆင်ခြင်း', `${prof.email} ၏ ရာထူးအား ${newRole} သို့ ပြောင်းလဲခဲ့သည်။`, 'warning');
                            }}
                            className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-2 py-1 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                          >
                            <option value="owner">Owner (ဆိုင်ပိုင်ရှင်)</option>
                            <option value="staff">Staff (အရောင်းဝန်ထမ်း)</option>
                            <option value="pending">Pending (မသေချာသေး)</option>
                          </select>
                        </td>
                        <td className="py-3 px-2">
                          <button
                            disabled={prof.uid === userProfile?.uid} // can't revoke own approval
                            onClick={async () => {
                              const newApprovedState = !prof.approved;
                              await setDoc(doc(db, 'userProfiles', prof.uid), {
                                ...prof,
                                approved: newApprovedState
                              });
                              addLog(currentUser?.name || 'Owner', newApprovedState ? 'အကောင့်ဝင်ခွင့်ပြုခြင်း' : 'အကောင့်ပိတ်ပင်ခြင်း', `${prof.email} ၏ စနစ်ဝင်ခွင့်အား ${newApprovedState ? 'ခွင့်ပြုခဲ့သည်' : 'ပိတ်ပင်ခဲ့သည်'}။`, 'warning');
                            }}
                            className={`px-3 py-1 rounded-full text-[10px] font-extrabold border cursor-pointer transition ${
                              prof.approved
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'
                            }`}
                          >
                            {prof.approved ? 'ခွင့်ပြုပြီး (Approved)' : 'ပိတ်ထားဆဲ (Pending/Suspended)'}
                          </button>
                        </td>
                        <td className="py-3 px-2 text-gray-400 text-[10px] font-medium">
                          {prof.createdAt ? new Date(prof.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <button
                            disabled={prof.uid === userProfile?.uid} // can't delete own profile
                            onClick={async () => {
                              if (confirm(`${prof.email} အကောင့်အား ဒေတာဘေ့စ်မှ ဖျက်ပစ်ရန် သေချာပါသလား?`)) {
                                await deleteDoc(doc(db, 'userProfiles', prof.uid));
                                addLog(currentUser?.name || 'Owner', 'အကောင့်ဖျက်သိမ်းခြင်း', `${prof.email} အား စနစ်မှ ဖျက်သိမ်းခဲ့သည်။`, 'danger');
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-30"
                            title="အကောင့်ကို ဖျက်မည်"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )}

      {/* Add Staff modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl overflow-hidden animate-scaleIn border border-gray-100">
            <div className="bg-emerald-600 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">ဝန်ထမ်းသစ်စာရင်းသွင်းရန်</h3>
              <button 
                onClick={() => setShowAddStaffModal(false)}
                className="text-white/80 hover:text-white font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="p-5 space-y-4">
              {staffError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 p-2.5 rounded-xl text-[10px] flex items-start space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{staffError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  ဝန်ထမ်းအမည်
                </label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="ဥပမာ - မောင်မောင်"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  ရာထူးအဆင့်အတန်း
                </label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as 'owner' | 'staff')}
                  className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-700"
                >
                  <option value="staff">ဝန်ထမ်း (ရောင်းချခွင့်သာရမည်)</option>
                  <option value="owner">ပိုင်ရှင် (အားလုံးပြင်ဆင်စီမံခွင့်ရမည်)</option>
                </select>
              </div>

              {newStaffRole === 'staff' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    တာဝန်ကျမည့် ဆိုင်ခွဲ
                  </label>
                  <select
                    value={newStaffBranchId}
                    onChange={(e) => setNewStaffBranchId(e.target.value)}
                    className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-700"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.isMain ? '(ပင်မဆိုင်)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 flex justify-between items-center">
                  <span>စနစ်ဝင်ရောက်ရန် PIN နံပါတ် (ဂဏန်း ၆ လုံး)</span>
                </label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={newStaffPin}
                  onChange={(e) => setNewStaffPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold tracking-widest text-center"
                  placeholder="xxxxxx"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  disabled={isSavingStaff}
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition disabled:opacity-50"
                >
                  ပယ်ဖျက်
                </button>
                <button
                  type="submit"
                  disabled={isSavingStaff}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-xl transition shadow-sm disabled:opacity-50 flex items-center justify-center space-x-1.5"
                >
                  {isSavingStaff ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>သိမ်းဆည်းနေ...</span>
                    </>
                  ) : (
                    <span>အသစ်ခန့်မည်</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
