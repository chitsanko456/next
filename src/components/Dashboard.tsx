import React, { useState, useMemo } from 'react';
import { Medicine, Voucher, ShopSettings, StaffMember, Branch } from '../types';
import { getCategoryFallbackImage } from '../initialData';
import { Pill, AlertTriangle, CalendarOff, Package, DollarSign, TrendingUp, ShoppingCart, ArrowRight, ClipboardList, ShieldAlert, Calendar, Info, Building2 } from 'lucide-react';

interface DashboardProps {
  medicines: Medicine[];
  vouchers: Voucher[];
  settings: ShopSettings;
  currentUser?: StaffMember;
  onNavigate: (tab: 'pos' | 'inventory' | 'sales') => void;
  branches: Branch[];
}

export default function Dashboard({ medicines, vouchers, settings, currentUser, onNavigate, branches }: DashboardProps) {
  const isStaff = currentUser?.role === 'staff';

  // Selected year and branch for statement report
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');

  // Generate monthly breakdown for the selected year and branch
  const monthsData = useMemo(() => {
    const monthlyList = Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      return {
        month: monthNum,
        monthLabel: `${monthNum} လပိုင်း`,
        vouchersCount: 0,
        salesAmount: 0,
        buyingCost: 0,
        profit: 0
      };
    });

    // Filter vouchers of selected year & branch
    vouchers.forEach(v => {
      if (v.date.startsWith(selectedYear.toString())) {
        const vBranchId = v.branchId || 'branch-main';
        if (selectedBranchFilter === 'all' || vBranchId === selectedBranchFilter) {
          const monthPart = v.date.substring(5, 7);
          const monthIndex = parseInt(monthPart) - 1;
          if (monthIndex >= 0 && monthIndex < 12) {
            monthlyList[monthIndex].vouchersCount += 1;
            monthlyList[monthIndex].salesAmount += v.netTotal;

            // calculate costs for profit
            let costTotal = 0;
            v.items.forEach(item => {
              const med = medicines.find(m => m.id === item.medicineId);
              const buyPrice = med ? med.buyingPrice : 0;
              costTotal += buyPrice * item.quantity;
            });
            monthlyList[monthIndex].buyingCost += costTotal;
            monthlyList[monthIndex].profit += (v.netTotal - costTotal);
          }
        }
      }
    });

    return monthlyList;
  }, [vouchers, medicines, selectedYear, selectedBranchFilter]);

  // Aggregate Annual totals
  const annualTotalSales = monthsData.reduce((sum, m) => sum + m.salesAmount, 0);
  const annualTotalCost = monthsData.reduce((sum, m) => sum + m.buyingCost, 0);
  const annualTotalProfit = monthsData.reduce((sum, m) => sum + m.profit, 0);
  const annualTotalVouchers = monthsData.reduce((sum, m) => sum + m.vouchersCount, 0);

  // Side-by-side branch comparison data for the selected year
  const branchesComparison = useMemo(() => {
    return branches.map(br => {
      let salesAmount = 0;
      let buyingCost = 0;
      let profit = 0;
      let vouchersCount = 0;

      vouchers.forEach(v => {
        const vBranchId = v.branchId || 'branch-main';
        if (vBranchId === br.id && v.date.startsWith(selectedYear.toString())) {
          vouchersCount += 1;
          salesAmount += v.netTotal;

          let costTotal = 0;
          v.items.forEach(item => {
            const med = medicines.find(m => m.id === item.medicineId);
            const buyPrice = med ? med.buyingPrice : 0;
            costTotal += buyPrice * item.quantity;
          });
          buyingCost += costTotal;
          profit += (v.netTotal - costTotal);
        }
      });

      return {
        ...br,
        salesAmount,
        buyingCost,
        profit,
        vouchersCount
      };
    });
  }, [vouchers, medicines, branches, selectedYear]);

  // Today's Sales calculation
  const today = new Date().toISOString().split('T')[0];
  const todayVouchers = vouchers.filter(v => v.date.startsWith(today));
  
  const todaySales = todayVouchers.reduce((acc, curr) => acc + curr.netTotal, 0);
  
  // Profit calculation (sellingPrice - buyingPrice) - ONLY calculated if owner
  const todayProfit = isStaff ? 0 : todayVouchers.reduce((acc, voucher) => {
    let voucherProfit = 0;
    voucher.items.forEach(item => {
      const med = medicines.find(m => m.id === item.medicineId);
      const buyPrice = med ? med.buyingPrice : 0;
      voucherProfit += (item.price - buyPrice) * item.quantity;
    });
    return acc + (voucherProfit - voucher.discount);
  }, 0);

  // Stock status
  const totalItems = medicines.reduce((acc, curr) => acc + curr.stock, 0);
  const totalStockWorth = medicines.reduce((acc, curr) => acc + (curr.stock * curr.sellingPrice), 0);
  const totalBuyingCost = isStaff ? 0 : medicines.reduce((acc, curr) => acc + (curr.stock * curr.buyingPrice), 0);

  // Alerts
  const lowStockMedicines = medicines.filter(m => m.stock <= m.minStockAlert);
  
  // Near Expiry (within 90 days)
  const isNearExpiry = (dateStr: string) => {
    const expDate = new Date(dateStr);
    const todayDate = new Date();
    const diffTime = expDate.getTime() - todayDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 90; // Less than or equal to 90 days
  };

  const expiredOrNearExpiryMedicines = medicines.filter(m => {
    const expDate = new Date(m.expiryDate);
    const todayDate = new Date();
    todayDate.setHours(0,0,0,0);
    return expDate <= todayDate || isNearExpiry(m.expiryDate);
  });

  // Count items already expired
  const expiredCount = medicines.filter(m => new Date(m.expiryDate) < new Date()).length;

  return (
    <div className="space-y-6" id="dashboard-tab">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-md">
        <h1 className="text-2xl font-bold mb-2">မင်္ဂလာပါ၊ {settings.name}</h1>
        <p className="text-emerald-100 text-sm max-w-xl">
          ယနေ့အတွက် ဆေးဆိုင်စာရင်းများ၊ လက်ကျန်ဆေးဝါးများနှင့် အရောင်းဘောက်ချာများကို ဤနေရာတွင် အလွယ်တကူ စီမံခန့်ခွဲနိုင်ပါသည်။
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Today */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">ယနေ့ ရောင်းရငွေ</p>
            <h3 className="text-xl font-bold text-gray-800">
              {todaySales.toLocaleString()} <span className="text-xs font-normal text-gray-500">{settings.currency}</span>
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              ဘောက်ချာ {todayVouchers.length} စောင်
            </p>
          </div>
        </div>

        {/* Profit Today / Voucher Count conditional */}
        {!isStaff ? (
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">ယနေ့ အသားတင် အမြတ်</p>
              <h3 className="text-xl font-bold text-gray-800">
                {todayProfit.toLocaleString()} <span className="text-xs font-normal text-gray-500">{settings.currency}</span>
              </h3>
              <p className="text-[11px] text-teal-600 font-medium mt-0.5">
                ရင်းနှီးငွေနှင့် နှုတ်ပြီး
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">ယနေ့ရောင်းရ ဘောက်ချာ</p>
              <h3 className="text-xl font-bold text-gray-800">
                {todayVouchers.length} <span className="text-xs font-normal text-gray-500">စောင်</span>
              </h3>
              <p className="text-[11px] text-teal-600 font-medium mt-0.5">
                အလိုအလျောက် မှတ်တမ်းတင်ထားသည်
              </p>
            </div>
          </div>
        )}

        {/* Total Stock Value */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium font-sans">စုစုပေါင်း ဆေးတန်ဖိုး (ရောင်းဈေး)</p>
            <h3 className="text-xl font-bold text-gray-800">
              {totalStockWorth.toLocaleString()} <span className="text-xs font-normal text-gray-500">{settings.currency}</span>
            </h3>
            <p className="text-[11px] text-blue-600 font-medium mt-0.5">
              {!isStaff ? (
                `ဝယ်ရင်းဈေး: ${totalBuyingCost.toLocaleString()} ${settings.currency}`
              ) : (
                `စုစုပေါင်းဆေးအရေအတွက်: ${totalItems.toLocaleString()} ခု`
              )}
            </p>
          </div>
        </div>

        {/* Total Medicines Count */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">ဆေးအမျိုးအစားစုစုပေါင်း</p>
            <h3 className="text-xl font-bold text-gray-800">
              {medicines.length} <span className="text-xs font-normal text-gray-500">မျိုး</span>
            </h3>
            <p className="text-[11px] text-indigo-600 font-medium mt-0.5">
              စုစုပေါင်းအရေအတွက်: {totalItems.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Side-by-Side Branch sales & profits Comparison Panel - Only shown to Owner */}
      {!isStaff && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-800 flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <span>ဆိုင်ခွဲများအလိုက် {selectedYear} ခုနှစ် အရောင်းနှင့် အမြတ်ငွေ နှိုင်းယှဉ်ချက်</span>
            </h3>
            <p className="text-xs text-gray-400">ဆိုင်ခွဲတစ်ခုစီ၏ ရောင်းရငွေ၊ ရင်းနှီးငွေနှင့် အသားတင်အမြတ်ငွေများကို တစ်စုတစ်စည်းတည်း နှိုင်းယှဉ်ကြည့်ရှုနိုင်ပါသည်။</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branchesComparison.map(b => (
              <div key={b.id} className="bg-slate-50/50 border border-gray-100 rounded-2xl p-4 space-y-3 hover:shadow-md hover:border-gray-200 transition duration-150">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-black text-gray-800 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                      <span>{b.name}</span>
                      {b.isMain && <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md font-bold">ပင်မ</span>}
                    </h4>
                    {b.address && <p className="text-[10px] text-gray-400 mt-1">{b.address}</p>}
                  </div>
                  <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full font-sans">
                    {b.vouchersCount} စောင်
                  </span>
                </div>

                <div className="border-t border-gray-100/50 pt-2.5 space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">ရောင်းရငွေ:</span>
                    <span className="font-bold text-gray-800 font-sans">{b.salesAmount.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">ရင်းနှီးငွေ:</span>
                    <span className="font-medium text-gray-600 font-sans">{b.buyingCost.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between text-[11px] pt-1 border-t border-dashed border-gray-200/60">
                    <span className="font-bold text-emerald-700">အသားတင်အမြတ်:</span>
                    <span className="font-black text-emerald-600 font-sans">{b.profit.toLocaleString()} {settings.currency}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly statement and Annual Profit Reports Panel */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-gray-800 flex items-center space-x-2">
              <ClipboardList className="w-5 h-5 text-emerald-600 animate-pulse" />
              <span>လချုပ်စာရင်းများနှင့် နှစ်ချုပ်အမြတ်ငွေများ</span>
            </h3>
            <p className="text-xs text-gray-400">ဆေးဝါးစာရင်းသွင်းရောင်းချမှုများကို လအလိုက် တိကျသောအမြတ်ငွေဖြင့် စစ်ဆေးကြည့်ရှုနိုင်ပါသည်။</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
            {/* Branch filter dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-gray-500">ဆိုင်ခွဲ:</span>
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="bg-gray-50 text-xs font-bold border border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">ဆိုင်အားလုံးပေါင်း</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Year filter dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-gray-500">ခုနှစ်:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value) || new Date().getFullYear())}
                className="bg-gray-50 text-xs font-bold border border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-sans cursor-pointer"
              >
                {[2025, 2026, 2027, 2028, 2029].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Explain Method to user in Myanmar */}
        <div className="bg-emerald-50/50 border border-emerald-100/30 p-3.5 rounded-xl text-emerald-800 text-[11px] flex items-start space-x-2">
          <Info className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <div>
            <span className="font-bold">အမြတ်တွက်ချက်ပုံ လမ်းညွှန်:</span> ဆေးဝါးတစ်ခုစီကို ရောင်းချသည့်ဈေးနှုန်းမှ ဝယ်ရင်းဈေး (ရင်းနှီးစရိတ်) ကိုနုတ်ပြီး ရောင်းရသည့် အရေအတွက်နှင့်မြှောက်၍ အသားတင်အမြတ်ကို တိကျစွာ လချုပ်/နှစ်ချုပ် တွက်ချက်ထားခြင်း ဖြစ်ပါသည်။ (Voucher သက်ရောက်သည့် discount များကိုလည်း အလိုအလျောက် ခုနှိမ်တွက်ချက်ပြီး ဖြစ်ပါသည်)။
          </div>
        </div>

        {/* Annual summary boxes and Monthly details table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Annual summary box */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <span className="text-[10px] bg-white/10 text-white border border-white/15 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider font-sans">
                {selectedYear} Summary ({selectedBranchFilter === 'all' ? 'ဆိုင်အားလုံး' : branches.find(b => b.id === selectedBranchFilter)?.name})
              </span>
              <h4 className="text-sm font-semibold text-emerald-100/90 mt-3">{selectedYear} တစ်နှစ်တာချုပ် အနှစ်ချုပ်</h4>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-emerald-200 font-medium">စုစုပေါင်းရောင်းရငွေ</p>
                <p className="text-xl font-black font-sans">{annualTotalSales.toLocaleString()} <span className="text-xs font-normal text-emerald-200">{settings.currency}</span></p>
              </div>

              {!isStaff && (
                <>
                  <div>
                    <p className="text-[10px] text-emerald-200 font-medium font-sans">ဆေးဝါးဝယ်ရင်းစရိတ် (စုစုပေါင်းရင်းနှီးငွေ)</p>
                    <p className="text-base font-bold font-sans">{annualTotalCost.toLocaleString()} <span className="text-xs font-normal text-emerald-200">{settings.currency}</span></p>
                  </div>
                  <div className="border-t border-white/10 pt-3">
                    <p className="text-[10px] text-emerald-200 font-bold">တစ်နှစ်တာ အသားတင် အမြတ်ငွေ</p>
                    <p className="text-2xl font-black text-amber-300 font-sans">{annualTotalProfit.toLocaleString()} <span className="text-xs font-normal text-emerald-100">{settings.currency}</span></p>
                  </div>
                </>
              )}

              <div>
                <p className="text-[10px] text-emerald-200 font-medium">စုစုပေါင်းရောင်းရ ဘောက်ချာ</p>
                <p className="text-xs font-bold font-sans">{annualTotalVouchers} စောင်</p>
              </div>
            </div>

            <div className="text-[10px] text-emerald-100/60 font-sans">
              * Live updated from cloud databases.
            </div>
          </div>

          {/* Monthly Breakdown Table */}
          <div className="lg:col-span-2 border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/50">
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200 text-gray-500 font-semibold tracking-wider sticky top-0">
                    <th className="py-2.5 px-3">လပိုင်း</th>
                    <th className="py-2.5 px-3 text-center">ဘောက်ချာ</th>
                    <th className="py-2.5 px-3 text-right">ရောင်းရငွေ</th>
                    {!isStaff && <th className="py-2.5 px-3 text-right">ရင်းနှီးစရိတ်</th>}
                    {!isStaff && <th className="py-2.5 px-3 text-right text-emerald-700">အသားတင်အမြတ်</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {monthsData.map(m => {
                    const hasSales = m.vouchersCount > 0;
                    return (
                      <tr key={m.month} className={`hover:bg-gray-50/50 transition ${!hasSales ? 'opacity-40' : ''}`}>
                        <td className="py-2.5 px-3 font-semibold text-gray-800 flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>{m.monthLabel}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-gray-600 font-sans">
                          {m.vouchersCount} စောင်
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-700 font-sans">
                          {m.salesAmount.toLocaleString()}
                        </td>
                        {!isStaff && (
                          <td className="py-2.5 px-3 text-right text-gray-500 font-medium font-sans">
                            {m.buyingCost.toLocaleString()}
                          </td>
                        )}
                        {!isStaff && (
                          <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600 font-sans">
                            {m.profit.toLocaleString()}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Low Stock Panel */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2 text-amber-600 font-semibold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>လက်ကျန်နည်းနေသော ဆေးဝါးများ ({lowStockMedicines.length})</span>
            </div>
            <button 
              onClick={() => onNavigate('inventory')}
              className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
            >
              <span>ဖြည့်တင်းရန်</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {lowStockMedicines.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Package className="w-10 h-10 stroke-1 mb-2 text-gray-300" />
              <p className="text-xs">လက်ကျန်နည်းနေသော ဆေးဝါးမရှိပါ။</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider">
                    <th className="py-2 font-medium">ဆေးအမည်</th>
                    <th className="py-2 text-center font-medium">နေရာ</th>
                    <th className="py-2 text-right font-medium">အနည်းဆုံး</th>
                    <th className="py-2 text-right font-medium text-amber-600">လက်ကျန်</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {lowStockMedicines.slice(0, 5).map(med => (
                    <tr key={med.id} className="hover:bg-gray-50">
                      <td className="py-2">
                        <div className="flex items-center space-x-2.5">
                          <img
                            src={med.image || getCategoryFallbackImage(med.category)}
                            alt={med.name}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 object-cover rounded-lg border border-gray-100 shadow-2xs shrink-0"
                          />
                          <div>
                            <p className="font-semibold text-gray-800 text-xs">{med.name}</p>
                            <p className="text-[9px] text-gray-400">{med.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 text-center text-gray-500 font-medium">
                        {med.rackNumber || '-'}
                      </td>
                      <td className="py-2 text-right font-medium text-gray-400">
                        {med.minStockAlert}
                      </td>
                      <td className="py-2 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                          {med.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {lowStockMedicines.length > 5 && (
                <p className="text-[11px] text-gray-400 text-center mt-3">
                  နှင့် အခြား လက်ကျန်နည်းနေသော ဆေးဝါး {lowStockMedicines.length - 5} မျိုး ရှိပါသေးသည်။
                </p>
              )}
            </div>
          )}
        </div>

        {/* Near Expiry Panel */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2 text-rose-600 font-semibold text-sm">
              <CalendarOff className="w-5 h-5" />
              <span>သက်တမ်းကုန်လုနီးပါး / ကုန်ဆုံးပြီး ဆေးဝါးများ ({expiredOrNearExpiryMedicines.length})</span>
            </div>
            <button 
              onClick={() => onNavigate('inventory')}
              className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
            >
              <span>စစ်ဆေးရန်</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {expiredOrNearExpiryMedicines.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <CalendarOff className="w-10 h-10 stroke-1 mb-2 text-gray-300" />
              <p className="text-xs">သက်တမ်းကုန်လုနီးပါး ဆေးဝါးမရှိပါ။</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider">
                    <th className="py-2 font-medium">ဆေးအမည်</th>
                    <th className="py-2 text-center font-medium">သက်တမ်းကုန်ရက်</th>
                    <th className="py-2 text-right font-medium">လက်ကျန်</th>
                    <th className="py-2 text-right font-medium">အခြေအနေ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {expiredOrNearExpiryMedicines.slice(0, 5).map(med => {
                    const exp = new Date(med.expiryDate);
                    const isExpired = exp < new Date();
                    return (
                      <tr key={med.id} className="hover:bg-gray-50">
                        <td className="py-2">
                          <div className="flex items-center space-x-2.5">
                            <img
                              src={med.image || getCategoryFallbackImage(med.category)}
                              alt={med.name}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 object-cover rounded-lg border border-gray-100 shadow-2xs shrink-0"
                            />
                            <div>
                              <p className="font-semibold text-gray-800 text-xs">{med.name}</p>
                              <p className="text-[9px] text-gray-400">{med.genericName || med.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 text-center text-gray-500 font-mono">
                          {med.expiryDate}
                        </td>
                        <td className="py-2 text-right font-medium text-gray-600">
                          {med.stock}
                        </td>
                        <td className="py-2 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            isExpired 
                              ? 'bg-rose-50 text-rose-700 border-rose-100 font-semibold animate-pulse' 
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                            {isExpired ? 'သက်တမ်းကုန်ပြီ' : 'ရက် ၉၀ အတွင်း'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {expiredOrNearExpiryMedicines.length > 5 && (
                <p className="text-[11px] text-gray-400 text-center mt-3">
                  နှင့် အခြား သက်တမ်းကုန်လုနီးပါး ဆေးဝါး {expiredOrNearExpiryMedicines.length - 5} မျိုး ရှိပါသေးသည်။
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Guides */}
      <div className="bg-emerald-50 border border-emerald-100/50 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-emerald-900">အမြန်အရောင်းဖွင့်လှစ်လိုပါသလား?</h4>
          <p className="text-xs text-emerald-700 mt-1">
            ဈေးဝယ်သူ ရောက်ရှိပါက ဆေးအမည် သို့မဟုတ် ကုဒ်နံပါတ်ဖြင့် ရှာဖွေပြီး ချက်ချင်း ဘောက်ချာတွက်ချက် ရောင်းချနိုင်ပါသည်။
          </p>
        </div>
        <button
          onClick={() => onNavigate('pos')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition duration-150 flex items-center justify-center space-x-1 shadow-sm shrink-0"
        >
          <ShoppingCart className="w-4 h-4 mr-1" />
          <span>ဆေးအရောင်း တာမီနယ်သို့ သွားမည်</span>
        </button>
      </div>
    </div>
  );
}
