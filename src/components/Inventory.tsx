import React, { useState } from 'react';
import { Medicine, ShopSettings, StaffMember, Branch } from '../types';
import { CATEGORIES, getCategoryFallbackImage } from '../initialData';
import { Search, Plus, Trash2, Edit2, AlertTriangle, Check, RefreshCw, Layers, FileText, ChevronDown, Image, Upload, X, Eye, Store, MapPin, Phone } from 'lucide-react';

interface InventoryProps {
  medicines: Medicine[];
  settings: ShopSettings;
  currentUser?: StaffMember;
  branches: Branch[];
  onAddMedicine: (med: Medicine) => void;
  onUpdateMedicine: (med: Medicine) => void;
  onDeleteMedicine: (id: string) => void;
  onAddBranch: (branch: Branch) => void;
  onUpdateBranch: (branch: Branch) => void;
  onDeleteBranch: (id: string) => void;
}

export default function Inventory({ 
  medicines, 
  settings, 
  currentUser, 
  branches, 
  onAddMedicine, 
  onUpdateMedicine, 
  onDeleteMedicine,
  onAddBranch,
  onUpdateBranch,
  onDeleteBranch
}: InventoryProps) {
  const isStaff = currentUser?.role === 'staff';

  // Sub tab tracking
  const [subTab, setSubTab] = useState<'medicines' | 'branches'>('medicines');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterAlert, setFilterAlert] = useState<'all' | 'low' | 'expired' | 'near-expiry'>('all');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [buyingPrice, setBuyingPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [expiryDate, setExpiryDate] = useState('');
  const [minStockAlert, setMinStockAlert] = useState<number>(10);
  const [rackNumber, setRackNumber] = useState('');
  const [image, setImage] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Multi-branch Stocks State
  const [formBranchStocks, setFormBranchStocks] = useState<{ [branchId: string]: number }>({});

  // Branch management Form State
  const [isBranchFormOpen, setIsBranchFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchIsMain, setBranchIsMain] = useState(false);
  const [branchErrorMsg, setBranchErrorMsg] = useState('');

  const openAddBranchForm = () => {
    setEditingBranch(null);
    setBranchName('');
    setBranchAddress('');
    setBranchPhone('');
    setBranchIsMain(false);
    setBranchErrorMsg('');
    setIsBranchFormOpen(true);
  };

  const openEditBranchForm = (br: Branch) => {
    setEditingBranch(br);
    setBranchName(br.name);
    setBranchAddress(br.address || '');
    setBranchPhone(br.phone || '');
    setBranchIsMain(br.isMain || false);
    setBranchErrorMsg('');
    setIsBranchFormOpen(true);
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) {
      setBranchErrorMsg('ဆိုင်ခွဲအမည် ထည့်သွင်းရန် လိုအပ်ပါသည်။');
      return;
    }
    const branchData: Branch = {
      id: editingBranch ? editingBranch.id : 'branch-' + Date.now(),
      name: branchName.trim(),
      address: branchAddress.trim() || undefined,
      phone: branchPhone.trim() || undefined,
      isMain: branchIsMain,
    };
    if (editingBranch) {
      onUpdateBranch(branchData);
    } else {
      onAddBranch(branchData);
    }
    setIsBranchFormOpen(false);
  };

  // Quick Stock adjustment state
  const [adjustingStockId, setAdjustingStockId] = useState<string | null>(null);
  const [adjustValue, setAdjustValue] = useState<number>(10);

  // Validation state
  const [errorMsg, setErrorMsg] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('ဓာတ်ပုံအရွယ်အစားသည် 2MB ထက် မကျော်ရပါ။');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('ဓာတ်ပုံအရွယ်အစားသည် 2MB ထက် မကျော်ရပါ။');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openAddForm = () => {
    setEditingMedicine(null);
    setCode('MED-' + Math.floor(1000 + Math.random() * 9000));
    setName('');
    setGenericName('');
    setCategory(CATEGORIES[0]);
    setBuyingPrice(0);
    setSellingPrice(0);
    setStock(0);
    
    // Initialize stocks as 0 for all branches
    const initialStocks: { [id: string]: number } = {};
    branches.forEach(b => {
      initialStocks[b.id] = 0;
    });
    setFormBranchStocks(initialStocks);

    setExpiryDate('');
    setMinStockAlert(10);
    setRackNumber('');
    setImage('');
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const openEditForm = (med: Medicine) => {
    setEditingMedicine(med);
    setCode(med.code);
    setName(med.name);
    setGenericName(med.genericName || '');
    setCategory(med.category);
    setBuyingPrice(med.buyingPrice);
    setSellingPrice(med.sellingPrice);
    setStock(med.stock);

    // Initialize/merge branch stocks
    const stocks = med.branchStocks || { 'branch-main': med.stock };
    const mergedStocks = { ...stocks };
    branches.forEach(b => {
      if (mergedStocks[b.id] === undefined) {
        mergedStocks[b.id] = b.id === 'branch-main' ? med.stock : 0;
      }
    });
    setFormBranchStocks(mergedStocks);

    setExpiryDate(med.expiryDate);
    setMinStockAlert(med.minStockAlert);
    setRackNumber(med.rackNumber || '');
    setImage(med.image || '');
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrorMsg('ဆေးအမည် ထည့်သွင်းရန် လိုအပ်ပါသည်။');
      return;
    }
    
    // Validate branch stocks
    const invalidStock = (Object.values(formBranchStocks) as number[]).some(val => val < 0);
    if (buyingPrice < 0 || sellingPrice < 0 || minStockAlert < 0 || invalidStock) {
      setErrorMsg('ဈေးနှုန်းများနှင့် အရေအတွက်များသည် ၀ သက်ဆိုင်ရာ ဆိုင်ခွဲလက်ကျန်များထက်ကြီးရပါမည်။');
      return;
    }
    
    if (!expiryDate) {
      setErrorMsg('သက်တမ်းကုန်ဆုံးရက် ထည့်သွင်းပေးပါ။');
      return;
    }

    // Calculate total stock from all branches
    const totalStock = (Object.values(formBranchStocks) as number[]).reduce((a, b) => a + b, 0);

    const medicineData: Medicine = {
      id: editingMedicine ? editingMedicine.id : 'med-' + Date.now(),
      code: code.trim() || 'MED-' + Math.floor(1000 + Math.random() * 9000),
      name: name.trim(),
      genericName: genericName.trim() || undefined,
      category,
      buyingPrice,
      sellingPrice,
      stock: totalStock, // Summed automatically
      branchStocks: formBranchStocks, // Save branch-specific stocks
      expiryDate,
      minStockAlert,
      rackNumber: rackNumber.trim() || undefined,
      image: image || undefined,
    };

    if (editingMedicine) {
      onUpdateMedicine(medicineData);
    } else {
      onAddMedicine(medicineData);
    }

    setIsFormOpen(false);
  };

  const handleQuickStockAdjust = (id: string, currentStock: number) => {
    const med = medicines.find(m => m.id === id);
    if (med) {
      const bStocks = { ...(med.branchStocks || { 'branch-main': med.stock }) };
      const mainId = branches.find(b => b.isMain)?.id || 'branch-main';
      bStocks[mainId] = Math.max(0, (bStocks[mainId] || 0) + adjustValue);
      
      const summedStock = Object.values(bStocks).reduce((a, b) => a + b, 0);

      onUpdateMedicine({
        ...med,
        stock: summedStock,
        branchStocks: bStocks,
      });
      setAdjustingStockId(null);
    }
  };

  // Check Expiry Categories
  const getExpiryStatus = (dateStr: string) => {
    const expDate = new Date(dateStr);
    const todayDate = new Date();
    todayDate.setHours(0,0,0,0);
    
    if (expDate <= todayDate) return 'EXPIRED';
    
    const diffTime = expDate.getTime() - todayDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 90) return 'NEAR_EXPIRY';
    
    return 'SAFE';
  };

  // Filter medicines
  const filteredMedicines = medicines.filter(med => {
    const matchesSearch = 
      med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (med.genericName && med.genericName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || med.category === selectedCategory;

    const expiryStatus = getExpiryStatus(med.expiryDate);
    const matchesAlert = 
      filterAlert === 'all' ||
      (filterAlert === 'low' && med.stock <= med.minStockAlert) ||
      (filterAlert === 'expired' && expiryStatus === 'EXPIRED') ||
      (filterAlert === 'near-expiry' && expiryStatus === 'NEAR_EXPIRY');

    return matchesSearch && matchesCategory && matchesAlert;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">ဂိုထောင် / ဆေးပစ္စည်းစာရင်းများ</h2>
          <p className="text-xs text-gray-500">ဆေးဝါးအချက်အလက်များနှင့် လက်ကျန်အခြေအနေများကို ဆိုင်ခွဲအလိုက် ဤနေရာတွင် ကြည့်ရှုစစ်ဆေးနိုင်ပါသည်။</p>
        </div>
        {!isStaff ? (
          subTab === 'medicines' ? (
            <button
              onClick={openAddForm}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center space-x-1 transition duration-150 shadow-sm sm:self-start cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1" />
              <span>ဆေးပစ္စည်းအသစ်သွင်းမည်</span>
            </button>
          ) : (
            <button
              onClick={openAddBranchForm}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center space-x-1 transition duration-150 shadow-sm sm:self-start cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1" />
              <span>ဆိုင်ခွဲအသစ်ဖွင့်မည်</span>
            </button>
          )
        ) : (
          <div className="bg-slate-100 text-slate-600 border border-slate-200 px-3.5 py-2 rounded-xl font-bold text-xs flex items-center space-x-1.5 self-start shadow-2xs">
            <Eye className="w-4 h-4 text-slate-500" />
            <span>ဝန်ထမ်းအဆင့် (ကြည့်ရှုခွင့်သာရှိသည်)</span>
          </div>
        )}
      </div>

      {/* Sub tabs: Medicines List vs Branches Management */}
      <div className="flex border-b border-gray-100 space-x-1.5 p-1 bg-gray-100/50 rounded-xl max-w-xs sm:max-w-sm">
        <button
          onClick={() => setSubTab('medicines')}
          className={`flex-1 text-center py-2 rounded-lg font-bold text-xs transition duration-150 flex items-center justify-center space-x-1.5 cursor-pointer ${
            subTab === 'medicines'
              ? 'bg-white text-emerald-700 shadow-2xs border border-gray-100/50'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>ဆေးဝါးလက်ကျန် စာရင်း</span>
        </button>
        <button
          onClick={() => setSubTab('branches')}
          className={`flex-1 text-center py-2 rounded-lg font-bold text-xs transition duration-150 flex items-center justify-center space-x-1.5 cursor-pointer ${
            subTab === 'branches'
              ? 'bg-white text-emerald-700 shadow-2xs border border-gray-100/50'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>ဆိုင်ခွဲများ စီမံရန်</span>
        </button>
      </div>

      {subTab === 'medicines' ? (
        <>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="ဆေးအမည်၊ ဘားကုဒ် သို့မဟုတ် ဓာတုဗေဒအမည်ဖြင့် ရှာရန်..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 text-xs border border-gray-100 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150"
            />
          </div>

          {/* Category Dropdown */}
          <div className="w-full lg:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-gray-50 text-xs border border-gray-100 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150 font-medium text-gray-700"
            >
              <option value="All">အုပ်စုအားလုံး</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Alert Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterAlert('all')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition duration-150 ${
                filterAlert === 'all' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
              }`}
            >
              အားလုံး ({medicines.length})
            </button>
            <button
              onClick={() => setFilterAlert('low')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition duration-150 flex items-center space-x-1 ${
                filterAlert === 'low' 
                  ? 'bg-amber-50 border-amber-200 text-amber-700' 
                  : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mr-0.5" />
              <span>လက်ကျန်နည်း ({medicines.filter(m => m.stock <= m.minStockAlert).length})</span>
            </button>
            <button
              onClick={() => setFilterAlert('expired')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition duration-150 flex items-center space-x-1 ${
                filterAlert === 'expired' 
                  ? 'bg-rose-50 border-rose-200 text-rose-700' 
                  : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 mr-0.5" />
              <span>သက်တမ်းကုန် ({medicines.filter(m => getExpiryStatus(m.expiryDate) === 'EXPIRED').length})</span>
            </button>
            <button
              onClick={() => setFilterAlert('near-expiry')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition duration-150 flex items-center space-x-1 ${
                filterAlert === 'near-expiry' 
                  ? 'bg-amber-50 border-amber-200 text-amber-700' 
                  : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>ကုန်လုနီးပါး ({medicines.filter(m => getExpiryStatus(m.expiryDate) === 'NEAR_EXPIRY').length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filteredMedicines.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center text-gray-400">
            <Layers className="w-12 h-12 text-gray-300 stroke-1 mb-3" />
            <h3 className="font-semibold text-sm text-gray-600">ဆေးဝါးစာရင်း မတွေ့ရှိပါ</h3>
            <p className="text-xs max-w-xs mt-1">ရှာဖွေမှုစကားလုံးကို ပြောင်းလဲစစ်ဆေးပါ သို့မဟုတ် ဆေးအသစ်များကို စာရင်းသွင်းကြည့်ပါ။</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">ဘားကုဒ် / ဆေးအမည်</th>
                  <th className="py-3 px-4 font-semibold">အုပ်စု / နေရာ</th>
                  {!isStaff && <th className="py-3 px-4 text-right font-semibold">ဝယ်ရင်းဈေး</th>}
                  <th className="py-3 px-4 text-right font-semibold">ရောင်းဈေး</th>
                  <th className="py-3 px-4 text-center font-semibold">လက်ကျန်အရေအတွက်</th>
                  <th className="py-3 px-4 text-center font-semibold">သက်တမ်းကုန်ရက်</th>
                  <th className="py-3 px-4 text-right font-semibold">လုပ်ဆောင်ချက်များ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredMedicines.map((med) => {
                  const expStatus = getExpiryStatus(med.expiryDate);
                  const isLow = med.stock <= med.minStockAlert;
                  
                  return (
                    <tr key={med.id} className="hover:bg-gray-50/50 transition">
                      {/* Code and Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={med.image || getCategoryFallbackImage(med.category)}
                            alt={med.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 object-cover rounded-xl border border-gray-100 shadow-2xs shrink-0"
                          />
                          <div>
                            <div className="font-semibold text-gray-800 text-sm">{med.name}</div>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <span className="font-mono text-[10px] text-gray-400 font-semibold bg-gray-100 px-1.5 py-0.5 rounded">
                                {med.code}
                              </span>
                              {med.genericName && (
                                <span className="text-[10px] text-gray-500 italic max-w-[150px] truncate">
                                  ({med.genericName})
                                </span>
                              )}
                            </div>
                            
                            {/* Branch stock list */}
                            <div className="flex flex-wrap gap-1 mt-1.5 max-w-sm">
                              {branches.map(br => {
                                const brStock = med.branchStocks?.[br.id] !== undefined ? med.branchStocks[br.id] : (br.id === 'branch-main' ? med.stock : 0);
                                return (
                                  <span 
                                    key={br.id} 
                                    className={`text-[8px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1 font-sans ${
                                      brStock <= 0 
                                        ? 'bg-rose-50 text-rose-600 border border-rose-100/30' 
                                        : brStock <= med.minStockAlert 
                                          ? 'bg-amber-50 text-amber-600 border border-amber-100/30'
                                          : 'bg-slate-50 text-slate-600 border border-slate-100'
                                    }`}
                                    title={`${br.name} လက်ကျန်`}
                                  >
                                    <span className="opacity-80 truncate max-w-[50px]">{br.name}:</span>
                                    <span className="font-bold">{brStock}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category & Location */}
                      <td className="py-3.5 px-4 text-gray-600">
                        <div>{med.category}</div>
                        {med.rackNumber && (
                          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                            နေရာ: {med.rackNumber}
                          </div>
                        )}
                      </td>

                      {/* Buying Price */}
                      {!isStaff && (
                        <td className="py-3.5 px-4 text-right text-gray-500 font-medium">
                          {med.buyingPrice.toLocaleString()} {settings.currency}
                        </td>
                      )}

                      {/* Selling Price */}
                      <td className="py-3.5 px-4 text-right font-bold text-gray-800">
                        {med.sellingPrice.toLocaleString()} {settings.currency}
                      </td>

                      {/* Stock Adjuster */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-center">
                          {adjustingStockId === med.id ? (
                            <div className="flex items-center space-x-1 animate-fadeIn bg-emerald-50 p-1 rounded-xl border border-emerald-200">
                              <input
                                type="number"
                                value={adjustValue}
                                onChange={(e) => setAdjustValue(parseInt(e.target.value) || 0)}
                                className="w-12 bg-white text-center text-xs font-bold border border-gray-200 rounded px-1 py-0.5"
                                placeholder="Qty"
                              />
                              <button
                                onClick={() => handleQuickStockAdjust(med.id, med.stock)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded p-1"
                                title="Confirm refil"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setAdjustingStockId(null)}
                                className="text-gray-400 hover:text-gray-600 text-[10px] px-1"
                              >
                                ပယ်ဖျက်
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                isLow 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              }`}>
                                {med.stock.toLocaleString()}
                              </span>
                              {!isStaff && (
                                <button
                                  onClick={() => {
                                    setAdjustingStockId(med.id);
                                    setAdjustValue(10); // Default to restock 10 items
                                  }}
                                  className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition duration-100"
                                  title="Quick restock"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                          {isLow && (
                            <span className="text-[9px] text-amber-600 font-medium mt-1">
                              (လက်ကျန်နည်းနေသည်)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Expiry Date */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded font-mono text-[11px] font-semibold ${
                          expStatus === 'EXPIRED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-100'
                            : expStatus === 'NEAR_EXPIRY'
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-gray-50 text-gray-600'
                        }`}>
                          {med.expiryDate}
                        </span>
                      </td>

                       {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {!isStaff ? (
                            <>
                              <button
                                onClick={() => openEditForm(med)}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`"${med.name}" ကို ဆေးစာရင်းထဲမှ ဖျက်ပစ်ရန် သေချာပါသလား?`)) {
                                    onDeleteMedicine(med.id);
                                  }
                                }}
                                className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => openEditForm(med)}
                              className="px-2.5 py-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition duration-150 flex items-center space-x-1"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-[10px] font-bold">ကြည့်ရန်</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  ) : (
    /* Branch Management View */
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
        {branches.map(br => {
          // Calculate medicine types that have active stock in this branch
          const activeMedInBranchCount = medicines.filter(m => {
            const stockVal = m.branchStocks?.[br.id] !== undefined ? m.branchStocks[br.id] : (br.id === 'branch-main' ? m.stock : 0);
            return stockVal > 0;
          }).length;

          // Calculate total stock units in this branch
          const totalUnitsInBranch = medicines.reduce((acc, m) => {
            const stockVal = m.branchStocks?.[br.id] !== undefined ? m.branchStocks[br.id] : (br.id === 'branch-main' ? m.stock : 0);
            return acc + stockVal;
          }, 0);

          return (
            <div key={br.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden transition hover:shadow-xs">
              {br.isMain && (
                <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl font-sans">
                  Main Branch
                </div>
              )}

              <div className="space-y-2.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-gray-800 text-sm leading-tight">{br.name}</h4>
                    <span className="text-[10px] text-gray-400 font-bold font-sans">ID: {br.id}</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 text-[11px] text-gray-500">
                  {br.address && (
                    <div className="flex items-start space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{br.address}</span>
                    </div>
                  )}
                  {br.phone && (
                    <div className="flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{br.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-50 pt-3.5 flex items-center justify-between">
                <div className="flex space-x-4">
                  <div>
                    <p className="text-[9px] font-bold text-gray-400">ဆေးအမျိုးအစား</p>
                    <p className="font-extrabold text-xs text-slate-700 mt-0.5">{activeMedInBranchCount} မျိုး</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-400">စုစုပေါင်းဆေးလုံးရေ</p>
                    <p className="font-extrabold text-xs text-slate-700 mt-0.5 font-sans">{totalUnitsInBranch.toLocaleString()} ကတ်/ဗူး</p>
                  </div>
                </div>

                {!isStaff && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEditBranchForm(br)}
                      className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer animate-none"
                      title="ပြင်ဆင်ရန်"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!br.isMain && (
                      <button
                        onClick={() => {
                          if (confirm(`"${br.name}" ကို ဖျက်ပစ်ရန် သေချာပါသလား? ဆိုင်ခွဲကိုဖျက်ပါက ဤဆိုင်ခွဲ၏ ဆေးဝါးလက်ကျန်များကိုပါ ဆုံးရှုံးစေနိုင်ပါသည်။`)) {
                            onDeleteBranch(br.id);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer animate-none"
                        title="ဖျက်ရန်"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )}

  {/* Add / Edit Branch Form Modal */}
  {isBranchFormOpen && (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl overflow-hidden animate-scaleIn border border-gray-100">
        <div className="bg-emerald-600 text-white px-6 py-4 flex justify-between items-center">
          <h3 className="font-bold text-sm">
            {editingBranch ? 'ဆိုင်ခွဲအချက်အလက် ပြင်ဆင်ရန်' : 'ဆိုင်ခွဲအသစ် စာရင်းသွင်းရန်'}
          </h3>
          <button 
            onClick={() => setIsBranchFormOpen(false)}
            className="text-white/80 hover:text-white font-bold text-lg cursor-pointer"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSaveBranch} className="p-6 space-y-4">
          {branchErrorMsg && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-xs flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{branchErrorMsg}</span>
            </div>
          )}

          <div className="space-y-3">
            {/* Branch Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                ဆိုင်ခွဲအမည် <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                placeholder="ဥပမာ - ရွှေပြည်သာ ဆိုင်ခွဲ (၂)"
              />
            </div>

            {/* Branch Phone */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                ဖုန်းနံပါတ်
              </label>
              <input
                type="text"
                value={branchPhone}
                onChange={(e) => setBranchPhone(e.target.value)}
                className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                placeholder="ဥပမာ - ၀၉-၄၅၀၀၀၁၂၃၄"
              />
            </div>

            {/* Branch Address */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                ဆိုင်လိပ်စာ
              </label>
              <textarea
                rows={2}
                value={branchAddress}
                onChange={(e) => setBranchAddress(e.target.value)}
                className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                placeholder="ဥပမာ - အမှတ် (၄၅)၊ ကမ္ဘာအေးဘုရားလမ်း..."
              />
            </div>

            {/* Is Main Branch Toggle */}
            {!editingBranch?.isMain && (
              <div className="flex items-center space-x-2.5 bg-slate-50 p-3 rounded-xl border border-gray-100 mt-1">
                <input
                  type="checkbox"
                  id="branchIsMainCheckbox"
                  checked={branchIsMain}
                  onChange={(e) => setBranchIsMain(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 border-gray-200 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="branchIsMainCheckbox" className="text-[11px] font-bold text-gray-600 cursor-pointer">
                  ပင်မဆိုင်ခွဲအဖြစ် သတ်မှတ်မည် (Main Branch)
                </label>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl transition duration-150 flex items-center justify-center space-x-1 shadow-sm cursor-pointer"
            >
              <span>ဆိုင်ခွဲသိမ်းဆည်းမည်</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )}

  {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl overflow-hidden animate-scaleIn border border-gray-100">
            <div className="bg-emerald-600 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-sm">
                {isStaff 
                  ? 'ဆေးဝါးအသေးစိတ် အချက်အလက်များ' 
                  : (editingMedicine ? 'ဆေးအချက်အလက် ပြင်ဆင်ရန်' : 'ဆေးအသစ် စာရင်းသွင်းရန်')}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-white/80 hover:text-white font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* Medicine Image */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    ဆေးဝါးဓာတ်ပုံ
                  </label>
                  <div className="flex gap-4 items-center">
                    {/* Current Image or Fallback Preview */}
                    <div className="relative w-20 h-20 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                      <img
                        src={image || getCategoryFallbackImage(category)}
                        alt="Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      {image && !isStaff && (
                        <button
                          type="button"
                          onClick={() => setImage('')}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black transition"
                          title="Remove image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Dropzone & Manual URL Input */}
                    {!isStaff ? (
                      <div className="flex-1 space-y-1.5">
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`border border-dashed rounded-xl p-2.5 text-center cursor-pointer transition ${
                            isDragging
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-gray-200 hover:border-emerald-500/40 bg-gray-50/50'
                          }`}
                          onClick={() => document.getElementById('image-upload-input')?.click()}
                        >
                          <Upload className="w-4 h-4 mx-auto text-gray-400 mb-0.5" />
                          <p className="text-[10px] text-gray-500">
                            <span className="text-emerald-600 font-semibold">ပုံတင်ရန် နှိပ်ပါ</span> သို့မဟုတ် ဆွဲထည့်ပါ (Max 2MB)
                          </p>
                          <input
                            id="image-upload-input"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                          />
                        </div>
                        <input
                          type="text"
                          value={image.startsWith('data:') ? '' : image}
                          onChange={(e) => setImage(e.target.value)}
                          placeholder="သို့မဟုတ် ပုံ၏ Link (URL) ထည့်ပါ"
                          className="w-full bg-gray-50 text-[10px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    ) : (
                      <div className="flex-1">
                        <p className="text-[11px] text-gray-400 italic">ဝန်ထမ်းအကောင့်ဖြစ်၍ ဆေးဝါးဓာတ်ပုံ ပြောင်းလဲခွင့်မရှိပါ။</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Barcode/Code */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    ဘားကုဒ် / ကုဒ်နံပါတ်
                  </label>
                  <input
                    type="text"
                    disabled={isStaff}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-75 disabled:bg-gray-100"
                    placeholder="ဥပမာ - BGS001"
                  />
                </div>

                {/* Name */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    ဆေးအမည် <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isStaff}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-75 disabled:bg-gray-100"
                    placeholder="ဥပမာ - Biogesic 500mg"
                  />
                </div>

                {/* Generic Chemical Formula */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    ဓာတုဗေဒ / ဆေးအုပ်စုအမည် (Generic Name)
                  </label>
                  <input
                    type="text"
                    disabled={isStaff}
                    value={genericName}
                    onChange={(e) => setGenericName(e.target.value)}
                    className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-75 disabled:bg-gray-100"
                    placeholder="ဥပမာ - Paracetamol"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    ဆေးအမျိုးအစား
                  </label>
                  <select
                    disabled={isStaff}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-700 disabled:opacity-75 disabled:bg-gray-100"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Rack Number */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    ထားရှိရာ ဆေးစင် / နေရာ
                  </label>
                  <input
                    type="text"
                    disabled={isStaff}
                    value={rackNumber}
                    onChange={(e) => setRackNumber(e.target.value)}
                    className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-75 disabled:bg-gray-100"
                    placeholder="ဥပမာ - စင် A-1"
                  />
                </div>

                {/* Buying Price - ONLY rendered if NOT staff */}
                {!isStaff && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      ဝယ်ရင်းဈေး ({settings.currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={buyingPrice}
                      onChange={(e) => setBuyingPrice(parseFloat(e.target.value) || 0)}
                      className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                    />
                  </div>
                )}

                {/* Selling Price */}
                <div className={isStaff ? "col-span-2" : ""}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    ရောင်းဈေး ({settings.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    disabled={isStaff}
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-emerald-700 disabled:opacity-75 disabled:bg-gray-100"
                  />
                </div>

                {/* Stock Quantity - Divided by Branches */}
                <div className="col-span-2 bg-slate-50 p-3.5 rounded-2xl border border-gray-100 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-700">ဆိုင်ခွဲအလိုက် လက်ကျန်စာရင်းများ</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black font-sans">
                      စုစုပေါင်း: {(Object.values(formBranchStocks) as number[]).reduce((a, b) => a + b, 0)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {branches.map(br => (
                      <div key={br.id} className="bg-white p-2 rounded-xl border border-gray-100 flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-gray-600 truncate">{br.name}</span>
                        <input
                          type="number"
                          min="0"
                          required
                          disabled={isStaff}
                          value={formBranchStocks[br.id] !== undefined ? formBranchStocks[br.id] : 0}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setFormBranchStocks(prev => ({
                              ...prev,
                              [br.id]: val
                            }));
                          }}
                          className="w-full bg-gray-50 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold text-gray-800 text-center mt-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Min Stock Alert */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    အနည်းဆုံးသတိပေးချက်ပမာဏ
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    disabled={isStaff}
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(parseInt(e.target.value) || 0)}
                    className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium disabled:opacity-75 disabled:bg-gray-100"
                  />
                </div>

                {/* Expiry Date */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    သက်တမ်းကုန်ဆုံးရက် <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    disabled={isStaff}
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-gray-700 disabled:opacity-75 disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition"
                >
                  {isStaff ? 'ပိတ်မည်' : 'မလုပ်တော့ပါ'}
                </button>
                {!isStaff && (
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2 rounded-xl transition duration-150 shadow-sm"
                  >
                    {editingMedicine ? 'ပြင်ဆင်ချက်သိမ်းမည်' : 'စာရင်းသွင်းမည်'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
