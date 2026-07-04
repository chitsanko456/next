import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Medicine, CartItem, Voucher, ShopSettings, Branch, StaffMember } from '../types';
import { CATEGORIES, getCategoryFallbackImage } from '../initialData';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, User, Tag, Percent, DollarSign, Printer, CheckCircle, AlertTriangle, Barcode } from 'lucide-react';

interface POSProps {
  medicines: Medicine[];
  settings: ShopSettings;
  branches: Branch[];
  onCheckout: (cartItems: CartItem[], voucher: Voucher) => void;
  currentUser?: StaffMember;
}

export default function POS({ medicines, settings, branches, onCheckout, currentUser }: POSProps) {
  // Branch Selector State
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    if (currentUser?.role === 'staff' && currentUser?.branchId) {
      return currentUser.branchId;
    }
    const main = branches.find(b => b.isMain);
    return main ? main.id : (branches[0]?.id || 'branch-main');
  });

  // Force branch selection for staff reactively
  useEffect(() => {
    if (currentUser?.role === 'staff' && currentUser?.branchId) {
      setSelectedBranchId(currentUser.branchId);
    }
  }, [currentUser]);

  const getBranchStock = (medicine: Medicine): number => {
    if (medicine.branchStocks && medicine.branchStocks[selectedBranchId] !== undefined) {
      return medicine.branchStocks[selectedBranchId];
    }
    return selectedBranchId === 'branch-main' ? medicine.stock : 0;
  };

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Barcode / Scanner helper states
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [lastScannedItem, setLastScannedItem] = useState<string | null>(null);

  // Auto-focus search input on load
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Clear barcode alert after 3 seconds
  useEffect(() => {
    if (lastScannedItem) {
      const timer = setTimeout(() => {
        setLastScannedItem(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastScannedItem]);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  // Checkout inputs
  const [customerName, setCustomerName] = useState('');
  const [discount, setDiscount] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Active Completed Voucher for Receipt Modal
  const [activeVoucher, setActiveVoucher] = useState<Voucher | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Print ref for thermal receipt layout
  const printRef = useRef<HTMLDivElement>(null);

  // Filter medicines
  const filteredMedicines = useMemo(() => {
    return medicines.filter(med => {
      const matchesSearch = 
        med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        med.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (med.genericName && med.genericName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || med.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [medicines, searchTerm, selectedCategory]);

  // Add to cart helper
  const addToCart = (medicine: Medicine) => {
    const branchStock = getBranchStock(medicine);
    if (branchStock <= 0) {
      alert(`တောင်းပန်ပါသည်။ ဤဆေးဝါး "${medicine.name}" သည် ရွေးချယ်ထားသော ဆိုင်ခွဲတွင် ကုန်နေပါသည်။`);
      return;
    }

    setCart(prevCart => {
      const existing = prevCart.find(item => item.medicine.id === medicine.id);
      if (existing) {
        // Check stock limit
        if (existing.quantity >= branchStock) {
          alert(`တောင်းပန်ပါသည်။ ဤဆိုင်ခွဲတွင် လက်ကျန်ရှိသော အရေအတွက် (${branchStock}) သာ အများဆုံး ရောင်းချနိုင်ပါသည်။`);
          return prevCart;
        }
        return prevCart.map(item => 
          item.medicine.id === medicine.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { medicine, quantity: 1 }];
      }
    });
  };

  // Adjust quantity in cart
  const adjustQuantity = (id: string, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.medicine.id === id) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          
          const branchStock = getBranchStock(item.medicine);
          // Check stock limit
          if (newQty > branchStock) {
            alert(`တောင်းပန်ပါသည်။ ဤဆိုင်ခွဲတွင် လက်ကျန်ရှိသော အရေအတွက် (${branchStock}) သာ အများဆုံး ရောင်းချနိုင်ပါသည်။`);
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter((item): item is CartItem => item !== null);
    });
  };

  // Remove from cart
  const removeFromCart = (id: string) => {
    setCart(prevCart => prevCart.filter(item => item.medicine.id !== id));
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.medicine.sellingPrice * item.quantity), 0);
  }, [cart]);

  const taxAmount = useMemo(() => {
    return Math.round((subtotal - discount) * (taxPercent / 100));
  }, [subtotal, discount, taxPercent]);

  const netTotal = useMemo(() => {
    return Math.max(0, subtotal - discount + taxAmount);
  }, [subtotal, discount, taxAmount]);

  const changeAmount = useMemo(() => {
    if (paidAmount <= 0) return 0;
    return Math.max(0, paidAmount - netTotal);
  }, [paidAmount, netTotal]);

  // Handle Checkout
  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      alert('ဈေးခြင်းတောင်းထဲတွင် ဆေးဝါးများ ထည့်သွင်းပေးပါ။');
      return;
    }

    if (paidAmount < netTotal) {
      alert(`ငွေပေးချေမှု မပြည့်စုံပါ။ ကျသင့်ငွေ စုစုပေါင်းမှာ ${netTotal.toLocaleString()} ${settings.currency} ဖြစ်ပါသည်။`);
      return;
    }

    // Generate Voucher
    const voucherId = 'V-' + Math.floor(100000 + Math.random() * 900000);
    const completedVoucher: Voucher = {
      id: voucherId,
      date: new Date().toISOString(),
      items: cart.map(item => ({
        medicineId: item.medicine.id,
        name: item.medicine.name,
        quantity: item.quantity,
        price: item.medicine.sellingPrice,
        total: item.medicine.sellingPrice * item.quantity
      })),
      subtotal,
      discount,
      tax: taxAmount,
      netTotal,
      paidAmount,
      changeAmount,
      customerName: customerName.trim() || undefined,
      branchId: selectedBranchId
    };

    // Callback to App.tsx to deduct stock and append voucher
    onCheckout(cart, completedVoucher);

    // Open receipt preview modal
    setActiveVoucher(completedVoucher);
    setShowReceiptModal(true);

    // Reset checkout fields & cart
    setCart([]);
    setCustomerName('');
    setDiscount(0);
    setTaxPercent(0);
    setPaidAmount(0);
  };

  // Trigger browser print of the voucher element only
  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    const originalContent = document.body.innerHTML;

    if (printContent) {
      // Open a new printable window or replace styles temporarily to print
      const printWindow = window.open('', '', 'height=600,width=400');
      if (printWindow) {
        printWindow.document.write('<html><head><title>ဘောက်ချာပုံနှိပ်ခြင်း</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
          body { font-family: 'Pyidaungsu', 'Padauk', sans-serif, Arial; padding: 20px; font-size: 13px; color: #000; line-height: 1.4; }
          .receipt { max-width: 300px; margin: 0 auto; text-align: center; }
          .header { font-weight: bold; font-size: 16px; margin-bottom: 5px; }
          .sub { font-size: 11px; margin-bottom: 3px; }
          .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; text-align: left; margin: 4px 0; }
          .col { flex: 1; }
          .col-right { text-align: right; }
          .bold { font-weight: bold; }
          .footer { font-size: 11px; margin-top: 15px; text-align: center; white-space: pre-line; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { border-bottom: 1px dashed #000; text-align: left; padding-bottom: 5px; font-size: 11px; }
          td { padding: 4px 0; font-size: 11px; vertical-align: top; }
        `);
        printWindow.document.write('</style></head><body>');
        printWindow.document.write(printContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      
      {/* Left Column: Medicines Catalog (8 cols) */}
      <div className="xl:col-span-7 space-y-4">
        {/* Search and category filters */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
          {/* Branch Selector Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse shrink-0"></span>
              <span className="text-xs font-bold text-gray-800">ရောင်းချမည့် ဆိုင်ခွဲ ရွေးချယ်ရန်</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <select
                value={selectedBranchId}
                disabled={currentUser?.role === 'staff' && !!currentUser?.branchId}
                onChange={(e) => {
                  const bId = e.target.value;
                  if (cart.length > 0) {
                    if (confirm('ဆိုင်ခွဲ ပြောင်းလဲပါက လက်ရှိ ဈေးခြင်းထဲရှိ ဆေးဝါးများ ပျက်ပြယ်သွားပါမည်။ ဆက်လက်လုပ်ဆောင်မလား?')) {
                      setCart([]);
                      setSelectedBranchId(bId);
                    }
                  } else {
                    setSelectedBranchId(bId);
                  }
                }}
                className={`text-[11px] font-bold rounded-lg border px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-w-[160px] ${
                  currentUser?.role === 'staff' && !!currentUser?.branchId
                    ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 cursor-pointer'
                }`}
              >
                {branches.map(br => (
                  <option key={br.id} value={br.id}>
                    {br.name} {br.isMain ? '★' : ''}
                  </option>
                ))}
              </select>
              {currentUser?.role === 'staff' && !!currentUser?.branchId && (
                <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-100 px-2 py-1 rounded-md font-medium leading-none">
                  🔒 သင်၏ တာဝန်ကျဆိုင်ခွဲ ({branches.find(b => b.id === currentUser.branchId)?.name}) ကို အလိုအလျောက် သတ်မှတ်ပေးထားပါသည်။
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                ref={searchInputRef}
                placeholder="ဆေးအမည် သို့မဟုတ် ကုဒ်နံပါတ် (Barcode) ဖြင့် အမြန်ရှာရန်..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const cleanTerm = searchTerm.trim();
                    if (!cleanTerm) return;

                    // Search for exact match by code (barcode)
                    const matchedMed = medicines.find(
                      med => med.code.toLowerCase() === cleanTerm.toLowerCase()
                    );

                    if (matchedMed) {
                      const mStock = getBranchStock(matchedMed);
                      if (mStock <= 0) {
                        alert(`တောင်းပန်ပါသည်။ "${matchedMed.name}" သည် ဤဆိုင်ခွဲတွင် ကုန်နေပြီ ဖြစ်ပါသည်။`);
                        setSearchTerm('');
                        return;
                      }
                      addToCart(matchedMed);
                      setLastScannedItem(`"${matchedMed.name}" ကို ဈေးခြင်းထဲသို့ ထည့်ပြီးပါပြီ။`);
                      setSearchTerm('');
                      return;
                    }

                    // Otherwise if only one filtered result, add it
                    if (filteredMedicines.length === 1) {
                      const singleMed = filteredMedicines[0];
                      const sStock = getBranchStock(singleMed);
                      if (sStock <= 0) {
                        alert(`တောင်းပန်ပါသည်။ "${singleMed.name}" သည် ဤဆိုင်ခွဲတွင် ကုန်နေပြီ ဖြစ်ပါသည်။`);
                        setSearchTerm('');
                        return;
                      }
                      addToCart(singleMed);
                      setLastScannedItem(`"${singleMed.name}" ကို ဈေးခြင်းထဲသို့ ထည့်ပြီးပါပြီ။`);
                      setSearchTerm('');
                    }
                  }
                }}
                className="w-full bg-gray-50 text-xs border border-gray-100 rounded-xl pl-9 pr-12 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1" title="Barcode Scanner ready">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <Barcode className="text-gray-400 w-4.5 h-4.5" />
              </div>
            </div>

            {/* Category Select */}
            <div className="w-full md:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-gray-50 text-xs border border-gray-100 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-gray-700"
              >
                <option value="All">အုပ်စုအားလုံး</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Scanner feedback toast */}
        {lastScannedItem && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center justify-between shadow-xs animate-pulse">
            <div className="flex items-center space-x-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="font-semibold text-xs Burmese-font">{lastScannedItem}</p>
            </div>
            <button 
              onClick={() => setLastScannedItem(null)} 
              className="text-emerald-500 hover:text-emerald-700 text-[10px] font-bold"
            >
              ပိတ်ရန်
            </button>
          </div>
        )}

        {/* Medicines Grid */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm min-h-[400px]">
          {filteredMedicines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-center">
              <Search className="w-12 h-12 stroke-1 mb-2 text-gray-300" />
              <p className="font-semibold text-xs">ဆေးဝါးစာရင်း မတွေ့ပါ</p>
              <p className="text-[10px] mt-1 text-gray-400">ရှာဖွေမှုစကားလုံးကို အခြားပြောင်းလဲရိုက်ထည့်ကြည့်ပါ။</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredMedicines.map(med => {
                const inCart = cart.find(item => item.medicine.id === med.id);
                const quantityInCart = inCart ? inCart.quantity : 0;
                const branchStock = getBranchStock(med);
                const remainingStock = branchStock - quantityInCart;
                const isOutOfStock = branchStock <= 0;
                
                return (
                  <button
                    key={med.id}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(med)}
                    className={`text-left p-2.5 rounded-xl border transition-all duration-150 flex items-center space-x-2.5 h-28 relative outline-none ${
                      isOutOfStock 
                        ? 'bg-gray-50 border-gray-100 cursor-not-allowed opacity-60' 
                        : 'bg-white border-gray-100 hover:border-emerald-500 hover:shadow-xs hover:scale-[1.01]'
                    }`}
                  >
                    {/* Left Column: Image */}
                    <div className="w-16 h-16 sm:w-18 sm:h-18 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden shrink-0">
                      <img
                        src={med.image || getCategoryFallbackImage(med.category)}
                        alt={med.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Right Column: Text & Price details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-bold text-gray-800 text-[11px] sm:text-xs line-clamp-1 leading-tight">
                            {med.name}
                          </span>
                          {med.rackNumber && (
                            <span className="text-[8px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-medium shrink-0 font-sans">
                              {med.rackNumber}
                            </span>
                          )}
                        </div>
                        {med.genericName && (
                          <p className="text-[9px] text-gray-400 italic line-clamp-1 mt-0.5">
                            {med.genericName}
                          </p>
                        )}
                        <p className="text-[8px] text-gray-500 bg-gray-100 inline-block px-1.5 py-0.5 rounded mt-1 font-semibold">
                          {med.category.split(' ')[0]}
                        </p>
                      </div>

                      <div className="flex justify-between items-end mt-1">
                        <div>
                          <span className="font-extrabold text-emerald-600 text-xs sm:text-sm">
                            {med.sellingPrice.toLocaleString()} <span className="text-[9px] font-normal text-gray-500">{settings.currency}</span>
                          </span>
                        </div>

                        {/* Stock Indicator */}
                        <div>
                          {isOutOfStock ? (
                            <span className="text-[8px] font-bold text-rose-500 bg-rose-50 px-1 py-0.5 rounded">
                              ပြတ်ပြီ
                            </span>
                          ) : (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              remainingStock <= med.minStockAlert 
                                ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                : 'bg-slate-50 text-slate-700'
                            }`}>
                              ကျန်: {remainingStock}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cart Badge */}
                    {quantityInCart > 0 && (
                      <div className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm">
                        {quantityInCart}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Checkout panel (5 cols) */}
      <div className="xl:col-span-5 space-y-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full min-h-[500px]">
          <div className="flex items-center space-x-2 text-gray-800 font-bold border-b border-gray-50 pb-3 mb-3">
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm">ရောင်းချမည့် ဈေးခြင်းတောင်း</h3>
            <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-bold ml-auto font-sans">
              {cart.reduce((acc, item) => acc + item.quantity, 0)} မျိုး
            </span>
          </div>

          {/* Cart Items Area */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[300px]">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <ShoppingCart className="w-12 h-12 stroke-1 mb-2 text-gray-300" />
                <p className="text-xs">ဈေးခြင်းတောင်းထဲ ဆေးထည့်ရန် ဆေးအမည်များကို နှိပ်ပါ။</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.medicine.id} className="bg-gray-50 p-3 rounded-xl flex justify-between items-center border border-gray-100">
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="font-semibold text-gray-800 text-xs truncate leading-tight">
                      {item.medicine.name}
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {item.medicine.sellingPrice.toLocaleString()} {settings.currency} x {item.quantity}
                    </p>
                  </div>

                  {/* Qty Adjustment Controls */}
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => adjustQuantity(item.medicine.id, -1)}
                      className="p-1 hover:bg-white rounded-lg text-gray-500 hover:text-rose-600 transition border border-transparent hover:border-gray-100"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-xs text-gray-800 px-1 w-6 text-center font-sans">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => adjustQuantity(item.medicine.id, 1)}
                      className="p-1 hover:bg-white rounded-lg text-gray-500 hover:text-emerald-600 transition border border-transparent hover:border-gray-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.medicine.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 transition ml-1"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout & Bill Form */}
          <form onSubmit={handleCheckoutSubmit} className="border-t border-gray-100 pt-4 mt-4 space-y-4">
            
            {/* Customer Name */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="ဝယ်ယူသူအမည် (ထည့်လိုပါက)"
                className="w-full bg-gray-50 text-xs border border-gray-100 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Calculations Grid */}
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-2.5 text-xs">
              
              {/* Subtotal */}
              <div className="flex justify-between text-gray-600">
                <span>ကျသင့်ငွေ</span>
                <span className="font-semibold text-gray-800">{subtotal.toLocaleString()} {settings.currency}</span>
              </div>

              {/* Discount */}
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center">
                  <Tag className="w-3 h-3 mr-1 text-gray-400" />
                  လျှော့ဈေး ({settings.currency})
                </span>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={discount === 0 ? '' : discount}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-24 bg-white text-right font-bold text-gray-800 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="၀"
                />
              </div>

              {/* Tax */}
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center">
                  <Percent className="w-3 h-3 mr-1 text-gray-400" />
                  အခွန် / ဝန်ဆောင်ခ (%)
                </span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={taxPercent === 0 ? '' : taxPercent}
                  onChange={(e) => setTaxPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-24 bg-white text-right font-bold text-gray-800 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="၀%"
                />
              </div>

              {/* Tax Amount Display */}
              {taxPercent > 0 && (
                <div className="flex justify-between text-[10px] text-gray-400 italic">
                  <span>ကျသင့်မည့် အခွန်ငွေ</span>
                  <span>+{taxAmount.toLocaleString()} {settings.currency}</span>
                </div>
              )}

              <hr className="border-dashed border-gray-200" />

              {/* Net Total */}
              <div className="flex justify-between text-sm">
                <span className="font-bold text-gray-800">အသားတင် ကျသင့်ငွေ</span>
                <span className="font-black text-emerald-600 text-base">{netTotal.toLocaleString()} {settings.currency}</span>
              </div>

              {/* Paid Amount */}
              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-gray-800 flex items-center text-xs">
                  <CreditCard className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  ဝယ်သူ ပေးငွေ ({settings.currency})
                </span>
                <input
                  type="number"
                  min="0"
                  required
                  value={paidAmount === 0 ? '' : paidAmount}
                  onChange={(e) => setPaidAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-32 bg-emerald-50 text-right font-black text-gray-900 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="ဝယ်သူ ပေးငွေ"
                />
              </div>

              {/* Change Amount */}
              {paidAmount > 0 && (
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-gray-500">ပြန်အမ်းငွေ</span>
                  <span className={`font-black text-xs ${changeAmount > 0 ? 'text-teal-600' : 'text-gray-400'}`}>
                    {changeAmount.toLocaleString()} {settings.currency}
                  </span>
                </div>
              )}
            </div>

            {/* Submit Checkout Button */}
            <button
              type="submit"
              disabled={cart.length === 0}
              className={`w-full font-bold text-xs py-3 rounded-xl transition duration-150 flex items-center justify-center space-x-1 shadow-sm ${
                cart.length === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
              }`}
            >
              <span>ငွေရှင်းပြီး ဘောက်ချာထုတ်မည်</span>
            </button>
          </form>
        </div>
      </div>

      {/* Voucher Print Preview Modal */}
      {showReceiptModal && activeVoucher && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl overflow-hidden animate-scaleIn border border-gray-100 flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-emerald-600 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <CheckCircle className="w-5 h-5 text-emerald-100" />
                <h3 className="font-bold text-sm">အရောင်းအောင်မြင်ပါသည်!</h3>
              </div>
              <button 
                onClick={() => setShowReceiptModal(false)}
                className="text-white/80 hover:text-white font-bold text-lg"
              >
                &times;
              </button>
            </div>

            {/* Printable Area Container */}
            <div className="p-6 bg-slate-50 flex-1 overflow-y-auto max-h-[420px]">
              {/* Receipt Body Container */}
              <div 
                ref={printRef}
                className="bg-white p-5 shadow-xs border border-gray-100 rounded-xl receipt-print text-xs text-slate-800 leading-relaxed font-sans mx-auto max-w-[280px]"
              >
                <div className="text-center">
                  <h4 className="font-extrabold text-sm text-gray-900">{settings.name}</h4>
                  {activeVoucher.branchId && (
                    <p className="text-[9px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 inline-block mt-1 font-sans">
                      {branches.find(b => b.id === activeVoucher.branchId)?.name || 'ပင်မဆိုင်'}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-500 mt-1">{settings.address}</p>
                  <p className="text-[10px] text-gray-500">ဖုန်း - {settings.phone}</p>
                  
                  <div className="border-b border-dashed border-gray-300 my-3"></div>
                  
                  <div className="text-left space-y-1 text-[10px] text-gray-500">
                    <div className="flex justify-between">
                      <span>ဘောက်ချာ - {activeVoucher.id}</span>
                      <span>ရက်စွဲ - {new Date(activeVoucher.date).toLocaleString()}</span>
                    </div>
                    {activeVoucher.customerName && (
                      <div className="flex justify-between">
                        <span>ဝယ်သူ - {activeVoucher.customerName}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-b border-dashed border-gray-300 my-3"></div>
                </div>

                {/* Items Table */}
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead>
                    <tr className="border-b border-dashed border-gray-300 text-gray-600 font-bold">
                      <th className="py-1 font-semibold">ဆေးအမည်</th>
                      <th className="py-1 text-center font-semibold">ရေ</th>
                      <th className="py-1 text-right font-semibold">နှုန်း</th>
                      <th className="py-1 text-right font-semibold">စုစုပေါင်း</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dashed divide-gray-100">
                    {activeVoucher.items.map((item, idx) => (
                      <tr key={idx} className="text-gray-700">
                        <td className="py-1.5 pr-1 font-medium">{item.name}</td>
                        <td className="py-1.5 text-center">{item.quantity}</td>
                        <td className="py-1.5 text-right">{item.price.toLocaleString()}</td>
                        <td className="py-1.5 text-right font-semibold">{item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-b border-dashed border-gray-300 my-3"></div>

                {/* Totals Area */}
                <div className="space-y-1.5 text-[10px] text-gray-600">
                  <div className="flex justify-between">
                    <span>စုစုပေါင်း ကျသင့်ငွေ</span>
                    <span>{activeVoucher.subtotal.toLocaleString()} {settings.currency}</span>
                  </div>
                  {activeVoucher.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>လျှော့ဈေး</span>
                      <span>-{activeVoucher.discount.toLocaleString()} {settings.currency}</span>
                    </div>
                  )}
                  {activeVoucher.tax > 0 && (
                    <div className="flex justify-between">
                      <span>အခွန် / အပိုကြေး</span>
                      <span>+{activeVoucher.tax.toLocaleString()} {settings.currency}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-gray-900 font-extrabold pt-0.5">
                    <span>စုစုပေါင်းကျသင့်ငွေ</span>
                    <span>{activeVoucher.netTotal.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="border-b border-dashed border-gray-100 my-1"></div>
                  <div className="flex justify-between">
                    <span>ဝယ်သူ ပေးငွေ</span>
                    <span>{activeVoucher.paidAmount.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between font-bold text-teal-600">
                    <span>ပြန်အမ်းငွေ</span>
                    <span>{activeVoucher.changeAmount.toLocaleString()} {settings.currency}</span>
                  </div>
                </div>

                <div className="border-b border-dashed border-gray-300 my-3"></div>

                <div className="text-center text-[10px] text-gray-500 whitespace-pre-line leading-relaxed">
                  {settings.footerMessage}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-gray-50 px-5 py-4 flex items-center justify-end space-x-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
              >
                ဘောင်ချာပိတ်မည်
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2 rounded-xl transition duration-150 flex items-center space-x-1 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>ဘောက်ချာ ပုံနှိပ်မည်</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
