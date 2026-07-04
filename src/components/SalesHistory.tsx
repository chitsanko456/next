import React, { useState, useMemo, useRef } from 'react';
import { Medicine, Voucher, ShopSettings, StaffMember, AuditLog } from '../types';
import { Search, Calendar, FileText, Trash2, Printer, CheckCircle, RefreshCw, AlertTriangle, ArrowRight, TrendingUp, UserCheck, BarChart3, Layers, Landmark, ShieldAlert, DollarSign, ArrowDownRight, Package, ClipboardList, HelpCircle } from 'lucide-react';

interface SalesHistoryProps {
  vouchers: Voucher[];
  medicines: Medicine[];
  settings: ShopSettings;
  currentUser?: StaffMember;
  auditLogs?: AuditLog[];
  onRefundVoucher: (id: string) => void;
}

export default function SalesHistory({ vouchers, medicines, settings, currentUser, auditLogs = [], onRefundVoucher }: SalesHistoryProps) {
  const isStaff = currentUser?.role === 'staff';
  
  // Navigation sub-tab
  const [subTab, setSubTab] = useState<'vouchers' | 'reports'>('vouchers');

  // Report Period Selection
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or '0'-'11'
  const [activeHoverBar, setActiveHoverBar] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week'>('all');

  // Selected voucher for print modal
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const reportPrintRef = useRef<HTMLDivElement>(null);

  // Filter vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v => {
      const matchesSearch = 
        v.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.customerName && v.customerName.toLowerCase().includes(searchTerm.toLowerCase()));

      const voucherDate = new Date(v.date);
      const todayDate = new Date();
      todayDate.setHours(0,0,0,0);

      let matchesDate = true;
      if (dateFilter === 'today') {
        matchesDate = voucherDate >= todayDate;
      } else if (dateFilter === 'yesterday') {
        const yesterday = new Date(todayDate);
        yesterday.setDate(yesterday.getDate() - 1);
        matchesDate = voucherDate >= yesterday && voucherDate < todayDate;
      } else if (dateFilter === 'week') {
        const oneWeekAgo = new Date(todayDate);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        matchesDate = voucherDate >= oneWeekAgo;
      }

      return matchesSearch && matchesDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Latest first
  }, [vouchers, searchTerm, dateFilter]);

  // Calculate stats for filtered vouchers
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalProfit = 0;

    filteredVouchers.forEach(voucher => {
      totalRevenue += voucher.netTotal;
      
      let voucherProfit = 0;
      voucher.items.forEach(item => {
        const med = medicines.find(m => m.id === item.medicineId);
        const buyPrice = med ? med.buyingPrice : 0;
        voucherProfit += (item.price - buyPrice) * item.quantity;
      });
      // Subtract discount
      totalProfit += (voucherProfit - voucher.discount);
    });

    return {
      revenue: totalRevenue,
      profit: totalProfit,
      count: filteredVouchers.length
    };
  }, [filteredVouchers, medicines]);

  // 1. Calculate Monthly Financials
  const monthlyBreakdown = useMemo(() => {
    const monthsData = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i,
      monthName: [
        'ဇန်နဝါရီ (January)', 'ဖေဖော်ဝါရီ (February)', 'မတ် (March)', 
        'ဧပြီ (April)', 'မေ (May)', 'ဇွန် (June)', 
        'ဇူလိုင် (July)', 'ဩဂုတ် (August)', 'စက်တင်ဘာ (September)', 
        'အောက်တိုဘာ (October)', 'နိုဝင်ဘာ (November)', 'ဒီဇင်ဘာ (December)'
      ][i],
      shortName: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
      voucherCount: 0,
      revenue: 0,
      buyingCost: 0,
      discount: 0,
      profit: 0,
      registeredItems: 0
    }));

    vouchers.forEach(v => {
      const d = new Date(v.date);
      if (d.getFullYear() === selectedYear) {
        const m = d.getMonth();
        monthsData[m].voucherCount += 1;
        monthsData[m].revenue += v.netTotal;
        monthsData[m].discount += v.discount;
        
        let vCost = 0;
        v.items.forEach(item => {
          const med = medicines.find(medItem => medItem.id === item.medicineId);
          const buyPrice = med ? med.buyingPrice : 0;
          vCost += buyPrice * item.quantity;
        });
        monthsData[m].buyingCost += vCost;
        monthsData[m].profit += (v.subtotal - vCost - v.discount);
      }
    });

    if (auditLogs) {
      auditLogs.forEach(log => {
        if (log.action === 'ဆေးဝါးအသစ် စာရင်းသွင်းခြင်း') {
          const d = new Date(log.timestamp);
          if (d.getFullYear() === selectedYear) {
            const m = d.getMonth();
            monthsData[m].registeredItems += 1;
          }
        }
      });
    }

    return monthsData;
  }, [vouchers, medicines, selectedYear, auditLogs]);

  // 2. Calculate Daily Financials
  const dailyBreakdown = useMemo(() => {
    if (selectedMonth === 'all') return [];

    const daysInMonth = new Date(selectedYear, Number(selectedMonth) + 1, 0).getDate();
    const daysData = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      voucherCount: 0,
      revenue: 0,
      buyingCost: 0,
      discount: 0,
      profit: 0,
      registeredItems: 0
    }));

    vouchers.forEach(v => {
      const d = new Date(v.date);
      if (d.getFullYear() === selectedYear && d.getMonth() === Number(selectedMonth)) {
        const dayIdx = d.getDate() - 1;
        if (dayIdx >= 0 && dayIdx < daysData.length) {
          daysData[dayIdx].voucherCount += 1;
          daysData[dayIdx].revenue += v.netTotal;
          daysData[dayIdx].discount += v.discount;
          
          let vCost = 0;
          v.items.forEach(item => {
            const med = medicines.find(medItem => medItem.id === item.medicineId);
            const buyPrice = med ? med.buyingPrice : 0;
            vCost += buyPrice * item.quantity;
          });
          daysData[dayIdx].buyingCost += vCost;
          daysData[dayIdx].profit += (v.subtotal - vCost - v.discount);
        }
      }
    });

    if (auditLogs) {
      auditLogs.forEach(log => {
        if (log.action === 'ဆေးဝါးအသစ် စာရင်းသွင်းခြင်း') {
          const d = new Date(log.timestamp);
          if (d.getFullYear() === selectedYear && d.getMonth() === Number(selectedMonth)) {
            const dayIdx = d.getDate() - 1;
            if (dayIdx >= 0 && dayIdx < daysData.length) {
              daysData[dayIdx].registeredItems += 1;
            }
          }
        }
      });
    }

    return daysData;
  }, [vouchers, medicines, selectedYear, selectedMonth, auditLogs]);

  // 3. Calculate Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const catMap: Record<string, { revenue: number, profit: number, quantity: number }> = {};

    vouchers.forEach(v => {
      const d = new Date(v.date);
      const matchesYear = d.getFullYear() === selectedYear;
      const matchesMonth = selectedMonth === 'all' || d.getMonth() === Number(selectedMonth);

      if (matchesYear && matchesMonth) {
        v.items.forEach(item => {
          const med = medicines.find(medItem => medItem.id === item.medicineId);
          const category = med ? med.category : 'အခြား';
          const buyPrice = med ? med.buyingPrice : 0;
          
          if (!catMap[category]) {
            catMap[category] = { revenue: 0, profit: 0, quantity: 0 };
          }
          
          catMap[category].revenue += item.total;
          catMap[category].profit += (item.price - buyPrice) * item.quantity;
          catMap[category].quantity += item.quantity;
        });
      }
    });

    return Object.entries(catMap).map(([category, data]) => ({
      category,
      ...data
    })).sort((a, b) => b.revenue - a.revenue);
  }, [vouchers, medicines, selectedYear, selectedMonth]);

  // 4. Calculate Top Selling Medicines
  const topSellingMedicines = useMemo(() => {
    const medMap: Record<string, { name: string, quantity: number, revenue: number, profit: number }> = {};

    vouchers.forEach(v => {
      const d = new Date(v.date);
      const matchesYear = d.getFullYear() === selectedYear;
      const matchesMonth = selectedMonth === 'all' || d.getMonth() === Number(selectedMonth);

      if (matchesYear && matchesMonth) {
        v.items.forEach(item => {
          const med = medicines.find(medItem => medItem.id === item.medicineId);
          const buyPrice = med ? med.buyingPrice : 0;
          
          if (!medMap[item.medicineId]) {
            medMap[item.medicineId] = { name: item.name, quantity: 0, revenue: 0, profit: 0 };
          }
          
          medMap[item.medicineId].quantity += item.quantity;
          medMap[item.medicineId].revenue += item.total;
          medMap[item.medicineId].profit += (item.price - buyPrice) * item.quantity;
        });
      }
    });

    return Object.values(medMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [vouchers, medicines, selectedYear, selectedMonth]);

  // 5. Aggregate KPI stats for selected filters
  const reportStats = useMemo(() => {
    let revenue = 0;
    let buyingCost = 0;
    let discount = 0;
    let profit = 0;
    let voucherCount = 0;
    let registeredItems = 0;

    if (selectedMonth === 'all') {
      monthlyBreakdown.forEach(m => {
        revenue += m.revenue;
        buyingCost += m.buyingCost;
        discount += m.discount;
        profit += m.profit;
        voucherCount += m.voucherCount;
        registeredItems += m.registeredItems;
      });
    } else {
      const mIdx = Number(selectedMonth);
      revenue = monthlyBreakdown[mIdx].revenue;
      buyingCost = monthlyBreakdown[mIdx].buyingCost;
      discount = monthlyBreakdown[mIdx].discount;
      profit = monthlyBreakdown[mIdx].profit;
      voucherCount = monthlyBreakdown[mIdx].voucherCount;
      registeredItems = monthlyBreakdown[mIdx].registeredItems;
    }

    return { revenue, buyingCost, discount, profit, voucherCount, registeredItems };
  }, [selectedMonth, monthlyBreakdown]);

  // List of all unique years in vouchers for selection
  const uniqueYears = useMemo(() => {
    const yearsSet = new Set<number>([new Date().getFullYear()]);
    vouchers.forEach(v => {
      const yr = new Date(v.date).getFullYear();
      if (!isNaN(yr)) yearsSet.add(yr);
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [vouchers]);

  // Print Report Handler
  const handleReportPrint = () => {
    const printContent = reportPrintRef.current?.innerHTML;
    if (printContent) {
      const printWindow = window.open('', '', 'height=800,width=1000');
      if (printWindow) {
        printWindow.document.write('<html><head><title>ဘဏ္ဍာရေး အစီရင်ခံစာ ပုံနှိပ်ခြင်း</title>');
        printWindow.document.write(`<style>
          body { font-family: sans-serif, Arial; padding: 40px; font-size: 12px; color: #333; line-height: 1.5; }
          .title { font-size: 20px; font-weight: bold; margin-bottom: 5px; text-align: center; color: #111; }
          .subtitle { font-size: 12px; text-align: center; margin-bottom: 25px; color: #666; }
          .grid-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
          .summary-card { padding: 15px; border: 1px solid #ddd; border-radius: 8px; text-align: center; }
          .summary-card p { margin: 0 0 5px 0; font-size: 10px; text-transform: uppercase; color: #777; }
          .summary-card h3 { margin: 0; font-size: 16px; font-weight: bold; color: #111; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 30px; }
          th { border-bottom: 2px solid #333; text-align: left; padding: 10px 8px; font-size: 11px; font-weight: bold; }
          td { border-bottom: 1px solid #eee; padding: 10px 8px; font-size: 11px; }
          .text-right { text-align: right; }
          .section-title { font-size: 14px; font-weight: bold; margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px; }
          .footer { text-align: center; margin-top: 40px; font-size: 10px; color: #999; }
        </style>`);
        printWindow.document.write('</body></html>');
        // Wait, write content as well
        printWindow.document.body.innerHTML = printContent;
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  // Refund handler
  const handleRefundClick = (id: string, voucherId: string) => {
    if (confirm(`ဘောက်ချာနံပါတ် "${voucherId}" ကို ဖျက်သိမ်း/ပယ်ဖျက်ရန် သေချာပါသလား?\n\n(ပယ်ဖျက်လိုက်ပါက ရောင်းထွက်သွားသော ဆေးပစ္စည်းအရေအတွက်များသည် ဂိုထောင်လက်ကျန်ထဲသို့ အလိုအလျောက် ပြန်လည်ပေါင်းထည့်သွားမည်ဖြစ်ပါသည်။)`)) {
      onRefundVoucher(id);
    }
  };

  // Receipt printing helper
  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (printContent) {
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">အရောင်းနှင့် ဘဏ္ဍာရေး အချက်အလက်များ</h2>
          <p className="text-xs text-gray-500">ရောင်းချခဲ့ပြီးသော ဘောက်ချာမှတ်တမ်းများနှင့် လချုပ်/နှစ်ချုပ် အမြတ်အစွန်းများကို စနစ်တကျ ကြည့်ရှုနိုင်ပါသည်။</p>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-gray-100 pb-px">
        <button
          onClick={() => setSubTab('vouchers')}
          id="tab-vouchers"
          className={`flex items-center space-x-2 pb-3 px-4 text-xs font-bold border-b-2 transition duration-150 ${
            subTab === 'vouchers'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>ဘောက်ချာမှတ်တမ်း (Vouchers History)</span>
        </button>
        <button
          onClick={() => setSubTab('reports')}
          id="tab-reports"
          className={`flex items-center space-x-2 pb-3 px-4 text-xs font-bold border-b-2 transition duration-150 ${
            subTab === 'reports'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>လချုပ်နှင့် နှစ်ချုပ် အစီရင်ခံစာများ (Financial Reports)</span>
        </button>
      </div>

      {subTab === 'vouchers' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Filter Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 font-medium">စစ်ထုတ်ထားသော အရောင်းစုစုပေါင်း</p>
          <h3 className="text-2xl font-black text-gray-800 mt-1">
            {stats.revenue.toLocaleString()} <span className="text-xs font-normal text-gray-500">{settings.currency}</span>
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">စုစုပေါင်း ဘောက်ချာ {stats.count} စောင်</p>
        </div>

        {!isStaff ? (
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-400 font-medium">စစ်ထုတ်ထားသော အသားတင်အမြတ်</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">
              {stats.profit.toLocaleString()} <span className="text-xs font-normal text-gray-500">{settings.currency}</span>
            </h3>
            <p className="text-[10px] text-emerald-500 flex items-center mt-0.5">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              ရင်းနှီးငွေနှင့် နှုတ်ပြီး
            </p>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-400 font-medium">လက်ရှိငွေကိုင်ဝန်ထမ်း</p>
            <h3 className="text-xl font-black text-emerald-600 mt-1">
              {currentUser?.name || 'မဖော်ပြထားပါ'}
            </h3>
            <p className="text-[10px] text-emerald-500 flex items-center mt-0.5">
              <UserCheck className="w-3.5 h-3.5 mr-1" />
              အရောင်းဘောက်ချာများ ထုတ်ပေးနိုင်သည်
            </p>
          </div>
        )}

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">လက်ရှိစစ်ထုတ်မှု</p>
            <h3 className="text-sm font-bold text-gray-800 mt-1">
              {dateFilter === 'all' && 'အချိန်အားလုံး'}
              {dateFilter === 'today' && 'ယနေ့အရောင်း'}
              {dateFilter === 'yesterday' && 'မနေ့ကအရောင်း'}
              {dateFilter === 'week' && 'လွန်ခဲ့သော ၇ ရက်'}
            </h3>
          </div>
          <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 shrink-0">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${dateFilter === 'all' ? 'bg-white shadow-xs text-emerald-600' : 'text-gray-500 hover:text-gray-800'}`}
            >
              အားလုံး
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${dateFilter === 'today' ? 'bg-white shadow-xs text-emerald-600' : 'text-gray-500 hover:text-gray-800'}`}
            >
              ယနေ့
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${dateFilter === 'week' ? 'bg-white shadow-xs text-emerald-600' : 'text-gray-500 hover:text-gray-800'}`}
            >
              ၇ရက်
            </button>
          </div>
        </div>
      </div>

      {/* History Controls */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ဘောက်ချာနံပါတ် သို့မဟုတ် ဝယ်သူအမည်ဖြင့် ရှာရန်..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 text-xs border border-gray-100 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150"
          />
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filteredVouchers.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center text-gray-400">
            <FileText className="w-12 h-12 text-gray-300 stroke-1 mb-3" />
            <h3 className="font-semibold text-sm text-gray-600">အရောင်းဘောက်ချာမှတ်တမ်း မရှိပါ</h3>
            <p className="text-xs max-w-xs mt-1">သတ်မှတ်ထားသော ရှာဖွေမှု သို့မဟုတ် အချိန်အပိုင်းအခြားအတွင်း ဘောက်ချာမရှိပါ။</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">ဘောက်ချာနံပါတ်</th>
                  <th className="py-3 px-4 font-semibold">ရက်စွဲ / အချိန်</th>
                  <th className="py-3 px-4 font-semibold">ဝယ်ယူသူ</th>
                  <th className="py-3 px-4 text-center font-semibold">ပစ္စည်းစုစုပေါင်း</th>
                  <th className="py-3 px-4 text-right font-semibold">ကျသင့်ငွေ</th>
                  <th className="py-3 px-4 text-right font-semibold">လုပ်ဆောင်ချက်</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredVouchers.map((voucher) => (
                  <tr key={voucher.id} className="hover:bg-gray-50/50 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                      {voucher.id}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500">
                      {new Date(voucher.date).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-700">{voucher.customerName || '-'}</div>
                      {voucher.cashierName && (
                        <div className="text-[10px] text-gray-400 mt-0.5 font-medium">ငွေကိုင်: {voucher.cashierName}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium text-gray-600">
                      {voucher.items.reduce((acc, curr) => acc + curr.quantity, 0)} မျိုး
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-gray-800">
                      {voucher.netTotal.toLocaleString()} {settings.currency}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedVoucher(voucher);
                            setShowReceiptModal(true);
                          }}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition flex items-center space-x-1"
                        >
                          <Printer className="w-3 h-3 mr-0.5" />
                          <span>ဘောက်ချာကြည့်</span>
                        </button>
                        {!isStaff && (
                          <button
                            onClick={() => handleRefundClick(voucher.id, voucher.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Voucher ပယ်ဖျက်ပြီး ဆေးစာရင်းပြန်ထည့်မည်"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  ) : (
        /* FINANCIAL REPORTS SUB-TAB PANEL */
        <div className="space-y-6 animate-fadeIn">
          {/* Controls Panel */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Year Select */}
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 mb-1">နှစ် ရွေးချယ်ရန်</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-gray-50 text-xs border border-gray-100 rounded-xl px-3 py-2 font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {uniqueYears.map(yr => (
                    <option key={yr} value={yr}>{yr} ခုနှစ်</option>
                  ))}
                </select>
              </div>

              {/* Month Select */}
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 mb-1">လ ရွေးချယ်ရန်</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-gray-50 text-xs border border-gray-100 rounded-xl px-3 py-2 font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="all">တစ်နှစ်လုံးစာချုပ် (Annual)</option>
                  {monthlyBreakdown.map((m, idx) => (
                    <option key={idx} value={idx}>{m.monthName.split(' ')[0]}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleReportPrint}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs flex items-center justify-center space-x-1.5 self-end md:self-auto cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>အစီရင်ခံစာ ပုံနှိပ်ထုတ်ယူမည်</span>
            </button>
          </div>

          {/* Business KPI Dashboard (Financial Overview Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Sales Card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">စုစုပေါင်း ရောင်းရငွေ (Sales)</p>
                <h3 className="text-2xl font-black text-gray-800 mt-1">
                  {reportStats.revenue.toLocaleString()} <span className="text-xs font-normal text-gray-500">{settings.currency}</span>
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">ဘောက်ချာစောင်ရေ {reportStats.voucherCount} စောင်စာ</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            {/* Profit Card (Visible to Owner Only) */}
            {!isStaff ? (
              <>
                {/* Buying Cost / COGS */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">စုစုပေါင်း ဝယ်ရင်းစရိတ် (COGS)</p>
                    <h3 className="text-2xl font-black text-slate-700 mt-1">
                      {reportStats.buyingCost.toLocaleString()} <span className="text-xs font-normal text-gray-500">{settings.currency}</span>
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">ဆေးဝါးဝယ်ယူ ရင်းနှီးထားငွေ</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>

                {/* Discounts */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">စုစုပေါင်း လျှော့ပေးငွေ (Discounts)</p>
                    <h3 className="text-2xl font-black text-rose-600 mt-1">
                      {reportStats.discount.toLocaleString()} <span className="text-xs font-normal text-gray-500">{settings.currency}</span>
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">ဝယ်သူများကို လျှော့ပေးခဲ့သောငွေ</p>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl text-rose-500">
                    <ArrowDownRight className="w-5 h-5" />
                  </div>
                </div>

                {/* Net Profit - Glowing Green highlight card */}
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 rounded-2xl shadow-sm text-white flex items-start justify-between">
                  <div>
                    <p className="text-xs text-emerald-100 font-medium">အသားတင် အမြတ်ငွေ (Net Profit)</p>
                    <h3 className="text-2xl font-black mt-1">
                      {reportStats.profit.toLocaleString()} <span className="text-xs font-normal text-emerald-200">{settings.currency}</span>
                    </h3>
                    <p className="text-[10px] text-emerald-200 flex items-center mt-0.5">
                      <TrendingUp className="w-3.5 h-3.5 mr-1" />
                      တစ်နှစ်အမြတ်နှင့် စာရင်းချုပ်အမြတ်
                    </p>
                  </div>
                  <div className="p-3 bg-white/10 rounded-xl text-white">
                    <Landmark className="w-5 h-5" />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Staff alternatives */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">စုစုပေါင်း ဘောက်ချာအရေအတွက်</p>
                    <h3 className="text-2xl font-black text-slate-800 mt-1">
                      {reportStats.voucherCount.toLocaleString()} <span className="text-xs font-normal text-gray-500">စောင်</span>
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">အောင်မြင်စွာ အရောင်းဖွင့်ပြီးသမျှ</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>

                {/* Staff registered items count */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">စာရင်းသွင်းဆေးဝါးသစ်</p>
                    <h3 className="text-2xl font-black text-slate-800 mt-1">
                      {reportStats.registeredItems.toLocaleString()} <span className="text-xs font-normal text-gray-500">မျိုး</span>
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">လအလိုက် မှတ်ပုံတင်ခဲ့သော ဆေးဝါးများ</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                    <Package className="w-5 h-5" />
                  </div>
                </div>

                {/* Restricted Access Alert */}
                <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 text-amber-800 flex items-start space-x-3 col-span-2">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs">အမြတ်အစွန်း ကန့်သတ်ချက်</h4>
                    <p className="text-[10px] text-amber-600 mt-0.5 leading-relaxed">
                      ဝယ်ရင်းဈေးနှင့် အသားတင်အမြတ်ဇယားများကို ဆိုင်ပိုင်ရှင် (Owner) အဆင့်ဖြင့်ဝင်မှသာ လုံခြုံရေးအရ ကြည့်ရှုခွင့်ရှိပါသည်။
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Interactive CSS/SVG Bar Chart and Data Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visual Analytics Column (Left Column - 2 width span) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Elegant CSS/SVG Bar Chart */}
              {(() => {
                const chartData = selectedMonth === 'all' 
                  ? monthlyBreakdown.map(m => ({ label: m.shortName, revenue: m.revenue, profit: m.profit }))
                  : dailyBreakdown.map(d => ({ label: d.day.toString(), revenue: d.revenue, profit: d.profit }));

                const maxChartVal = Math.max(...chartData.map(d => d.revenue), 1000);

                return (
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="font-extrabold text-sm text-gray-800">
                          {selectedMonth === 'all' ? `${selectedYear} ခုနှစ် လအလိုက် ဝင်ငွေနှင့် အမြတ်အစွန်း` : `${selectedYear} ခုနှစ်၊ ${monthlyBreakdown[Number(selectedMonth)].monthName.split(' ')[0]} ရက်အလိုက် ဝင်ငွေနှင့် အမြတ်အစွန်း`}
                        </h3>
                        <p className="text-[10px] text-gray-400 mt-0.5">ကိန်းဂဏန်းများပေါ်သို့ cursor တင်ကာ အသေးစိတ်ကြည့်ရှုနိုင်ပါသည်</p>
                      </div>
                      <div className="flex items-center space-x-4 text-xs font-semibold shrink-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs"></span>
                          <span className="text-gray-500 text-[10px]">ရောင်းရငွေ</span>
                        </div>
                        {!isStaff && (
                          <div className="flex items-center space-x-1.5">
                            <span className="w-2.5 h-2.5 bg-teal-600 rounded-xs"></span>
                            <span className="text-gray-500 text-[10px]">အမြတ်ငွေ</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bars Container */}
                    <div className="h-[220px] flex items-end space-x-1 md:space-x-2 border-b border-gray-100 pb-2 relative">
                      {chartData.map((data, idx) => {
                        const revHeight = (data.revenue / maxChartVal) * 100;
                        const profHeight = (data.profit / maxChartVal) * 100;

                        return (
                          <div 
                            key={idx} 
                            className="flex-1 flex flex-col items-center group relative h-full justify-end"
                            onMouseEnter={() => setActiveHoverBar(idx)}
                            onMouseLeave={() => setActiveHoverBar(null)}
                          >
                            {/* Hover tooltip card */}
                            {activeHoverBar === idx && (
                              <div className="absolute bottom-full mb-2 bg-slate-950 text-white text-[10px] p-2.5 rounded-xl shadow-lg z-20 w-32 text-center animate-fadeIn pointer-events-none border border-white/10">
                                <p className="font-extrabold border-b border-white/10 pb-1 mb-1 text-[9px] text-emerald-400 uppercase tracking-wide">
                                  {selectedMonth === 'all' ? monthlyBreakdown[idx].monthName.split(' ')[0] : `ရက်စွဲ - ${data.label} ရက်`}
                                </p>
                                <div className="space-y-0.5 text-left">
                                  <p className="text-slate-300">အရောင်း: <span className="font-bold text-white">{data.revenue.toLocaleString()}</span></p>
                                  {!isStaff && <p className="text-teal-300">အမြတ်: <span className="font-bold text-white">{data.profit.toLocaleString()}</span></p>}
                                </div>
                              </div>
                            )}

                            {/* Bar Columns */}
                            <div className="w-full flex items-end justify-center space-x-0.5 max-w-[44px] h-full">
                              {/* Revenue Bar */}
                              <div 
                                className="bg-emerald-100 group-hover:bg-emerald-500 rounded-t-xs transition-all duration-300 w-2 md:w-4 shadow-xs"
                                style={{ height: `${Math.max(revHeight, 2)}%` }}
                              ></div>
                              {/* Profit Bar (only for owner) */}
                              {!isStaff && (
                                <div 
                                  className="bg-teal-200 group-hover:bg-teal-600 rounded-t-xs transition-all duration-300 w-2 md:w-4 shadow-xs"
                                  style={{ height: `${Math.max(profHeight, 2)}%` }}
                                ></div>
                              )}
                            </div>

                            <span className="text-[9px] font-bold text-gray-400 mt-2 truncate w-full text-center group-hover:text-emerald-600 transition-colors">
                              {data.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Aggregated Data Grid Table */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-gray-800">
                    {selectedMonth === 'all' ? `${selectedYear} ခုနှစ် လအလိုက် အသေးစိတ်အနှစ်ချုပ်` : `${selectedYear} ခုနှစ်၊ ${monthlyBreakdown[Number(selectedMonth)].monthName.split(' ')[0]} ရက်အလိုက် အသေးစိတ်အနှစ်ချုပ်`}
                  </h3>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase">
                    {selectedMonth === 'all' ? 'လချုပ်ဇယား' : 'နေ့ချုပ်ဇယား'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-gray-100">
                        <th className="p-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">{selectedMonth === 'all' ? 'လအမည်' : 'ရက်စွဲ'}</th>
                        <th className="p-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider text-right">ဘောက်ချာစောင်ရေ</th>
                        <th className="p-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider text-right">ရောင်းရငွေ (Sales)</th>
                        {!isStaff && (
                          <>
                            <th className="p-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider text-right">ဝယ်ရင်းစရိတ် (COGS)</th>
                            <th className="p-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider text-right">လျှော့ဈေး (Discount)</th>
                            <th className="p-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider text-right">အမြတ်ငွေ (Profit)</th>
                          </>
                        )}
                        <th className="p-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider text-right">ဆေးဝါးသစ်မှတ်ပုံတင်မှု</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs">
                      {selectedMonth === 'all' ? (
                        monthlyBreakdown.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/25 transition">
                            <td className="p-3 font-bold text-gray-700">{m.monthName.split(' ')[0]}</td>
                            <td className="p-3 text-right font-mono text-gray-500">{m.voucherCount} စောင်</td>
                            <td className="p-3 text-right font-black text-gray-800">{m.revenue.toLocaleString()} {settings.currency}</td>
                            {!isStaff && (
                              <>
                                <td className="p-3 text-right font-mono text-gray-500">{m.buyingCost.toLocaleString()}</td>
                                <td className="p-3 text-right font-mono text-gray-500">{m.discount.toLocaleString()}</td>
                                <td className="p-3 text-right font-black text-emerald-600">{m.profit.toLocaleString()} {settings.currency}</td>
                              </>
                            )}
                            <td className="p-3 text-right text-gray-500 font-bold">{m.registeredItems} မျိုး</td>
                          </tr>
                        ))
                      ) : (
                        dailyBreakdown.map((d, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/25 transition">
                            <td className="p-3 font-bold text-gray-700 font-mono">{d.day} ရက်</td>
                            <td className="p-3 text-right font-mono text-gray-500">{d.voucherCount} စောင်</td>
                            <td className="p-3 text-right font-black text-gray-800">{d.revenue.toLocaleString()} {settings.currency}</td>
                            {!isStaff && (
                              <>
                                <td className="p-3 text-right font-mono text-gray-500">{d.buyingCost.toLocaleString()}</td>
                                <td className="p-3 text-right font-mono text-gray-500">{d.discount.toLocaleString()}</td>
                                <td className="p-3 text-right font-black text-emerald-600">{d.profit.toLocaleString()} {settings.currency}</td>
                              </>
                            )}
                            <td className="p-3 text-right text-gray-500 font-bold">{d.registeredItems} မျိုး</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Side Analytics Column (Right Column) */}
            <div className="space-y-6">
              {/* Category-wise Sales breakdown */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-800">အမျိုးအစားအလိုက် ရောင်းအားအကောင်းဆုံး</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">ဆေးဝါးအမျိုးအစားအလိုက် စာရင်းခွဲခြားမှု</p>
                </div>

                {categoryBreakdown.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">ရောင်းအားစာရင်း မရှိသေးပါ။</p>
                ) : (
                  <div className="space-y-3.5">
                    {categoryBreakdown.map((cat, idx) => {
                      const totalCatRevenue = categoryBreakdown.reduce((acc, c) => acc + c.revenue, 1);
                      const percent = (cat.revenue / totalCatRevenue) * 100;

                      return (
                        <div key={idx} className="space-y-1 text-xs">
                          <div className="flex justify-between font-bold text-gray-700">
                            <span>{cat.category}</span>
                            <span className="font-black text-gray-900">{cat.revenue.toLocaleString()} {settings.currency}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-gray-400">
                            <span>ရောင်းရဦးရေ {cat.quantity} ခု</span>
                            <span>{percent.toFixed(1)}%</span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percent}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top Selling Medicines */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-800">အရောင်းရဆုံး ဆေးဝါး ၅ မျိုး</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">ရောင်းချခဲ့ရသည့် အလုံးရေအများဆုံး ဆေးဝါးများ</p>
                </div>

                {topSellingMedicines.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">အရောင်းမှတ်တမ်း မရှိသေးပါ။</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {topSellingMedicines.map((med, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2.5 text-xs first:pt-0 last:pb-0">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 bg-emerald-50 rounded-lg text-emerald-600 font-black text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-gray-800">{med.name}</p>
                            <p className="text-[10px] text-gray-400 font-medium">အရေအတွက် - {med.quantity} ခု</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-gray-900">{med.revenue.toLocaleString()} {settings.currency}</p>
                          {!isStaff && (
                            <p className="text-[10px] text-emerald-600 font-bold flex items-center justify-end">
                              <TrendingUp className="w-3 h-3 mr-0.5 shrink-0" />
                              +{med.profit.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* HIDDEN PRINT-ONLY CONTAINER (STYLED PERFECTLY FOR OFFICE B&W PRINTERS) */}
          <div ref={reportPrintRef} className="hidden">
            <div className="title">{settings.name} - ဘဏ္ဍာရေး အစီရင်ခံစာ ({selectedYear})</div>
            <div className="subtitle">
              {selectedMonth === 'all' 
                ? `${selectedYear} ခုနှစ် တစ်နှစ်လုံးစာ ဘဏ္ဍာရေး အစီရင်ခံစာချုပ်` 
                : `${selectedYear} ခုနှစ်၊ ${monthlyBreakdown[Number(selectedMonth)].monthName} လချုပ် အစီရင်ခံစာ`}
            </div>
            
            <div className="grid-summary">
              <div className="summary-card">
                <p>စုစုပေါင်း ရောင်းရငွေ (Sales)</p>
                <h3>{reportStats.revenue.toLocaleString()} {settings.currency}</h3>
              </div>
              {!isStaff && (
                <>
                  <div className="summary-card">
                    <p>စုစုပေါင်း ဝယ်ရင်းစရိတ် (COGS)</p>
                    <h3>{reportStats.buyingCost.toLocaleString()} {settings.currency}</h3>
                  </div>
                  <div className="summary-card">
                    <p>စုစုပေါင်း လျှော့ပေးငွေ (Discounts)</p>
                    <h3>{reportStats.discount.toLocaleString()} {settings.currency}</h3>
                  </div>
                  <div className="summary-card" style={{ border: '1px solid #10b981', backgroundColor: '#ecfdf5' }}>
                    <p style={{ color: '#047857' }}>အသားတင်အမြတ်ငွေ (Net Profit)</p>
                    <h3 style={{ color: '#047857' }}>{reportStats.profit.toLocaleString()} {settings.currency}</h3>
                  </div>
                </>
              )}
            </div>

            <div className="section-title">
              {selectedMonth === 'all' ? 'လအလိုက် စာရင်းချုပ် ဇယား' : 'ရက်အလိုက် စာရင်းချုပ် ဇယား'}
            </div>
            <table>
              <thead>
                <tr>
                  <th>{selectedMonth === 'all' ? 'လအမည်' : 'ရက်စွဲ'}</th>
                  <th className="text-right">ဘောက်ချာစောင်ရေ</th>
                  <th className="text-right">ရောင်းရငွေ (Sales)</th>
                  {!isStaff && (
                    <>
                      <th className="text-right">ဝယ်ရင်းစရိတ် (COGS)</th>
                      <th className="text-right">လျှော့ဈေး (Discount)</th>
                      <th className="text-right">အမြတ်ငွေ (Profit)</th>
                    </>
                  )}
                  <th className="text-right">စာရင်းသွင်းဆေးဝါးသစ်</th>
                </tr>
              </thead>
              <tbody>
                {selectedMonth === 'all' ? (
                  monthlyBreakdown.map((m, idx) => (
                    <tr key={idx}>
                      <td>{m.monthName}</td>
                      <td className="text-right">{m.voucherCount}</td>
                      <td className="text-right">{m.revenue.toLocaleString()}</td>
                      {!isStaff && (
                        <>
                          <td className="text-right">{m.buyingCost.toLocaleString()}</td>
                          <td className="text-right">{m.discount.toLocaleString()}</td>
                          <td className="text-right" style={{ color: '#047857', fontWeight: 'bold' }}>{m.profit.toLocaleString()}</td>
                        </>
                      )}
                      <td className="text-right">{m.registeredItems}</td>
                    </tr>
                  ))
                ) : (
                  dailyBreakdown.map((d, idx) => (
                    <tr key={idx}>
                      <td>{selectedYear}-{String(Number(selectedMonth)+1).padStart(2, '0')}-{String(d.day).padStart(2, '0')}</td>
                      <td className="text-right">{d.voucherCount}</td>
                      <td className="text-right">{d.revenue.toLocaleString()}</td>
                      {!isStaff && (
                        <>
                          <td className="text-right">{d.buyingCost.toLocaleString()}</td>
                          <td className="text-right">{d.discount.toLocaleString()}</td>
                          <td className="text-right" style={{ color: '#047857', fontWeight: 'bold' }}>{d.profit.toLocaleString()}</td>
                        </>
                      )}
                      <td className="text-right">{d.registeredItems}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="section-title">ဆေးအမျိုးအစားအလိုက် ရောင်းအား (Category Sales)</div>
            <table>
              <thead>
                <tr>
                  <th>အမျိုးအစား</th>
                  <th className="text-right">စုစုပေါင်းရောင်းရဦးရေ</th>
                  <th className="text-right">ရောင်းရငွေ (Sales)</th>
                  {!isStaff && <th className="text-right">ရရှိသည့်အမြတ် (Profit)</th>}
                </tr>
              </thead>
              <tbody>
                {categoryBreakdown.map((cat, idx) => (
                  <tr key={idx}>
                    <td>{cat.category}</td>
                    <td className="text-right">{cat.quantity}</td>
                    <td className="text-right">{cat.revenue.toLocaleString()}</td>
                    {!isStaff && <td className="text-right" style={{ color: '#047857', fontWeight: 'bold' }}>{cat.profit.toLocaleString()}</td>}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="section-title">အရောင်းရဆုံးဆေးဝါး ၅ မျိုး (Top 5 Best Sellers)</div>
            <table>
              <thead>
                <tr>
                  <th>ဆေးအမည်</th>
                  <th className="text-right">ရောင်းရဦးရေ</th>
                  <th className="text-right">ရောင်းရငွေ (Sales)</th>
                  {!isStaff && <th className="text-right">ရရှိသည့်အမြတ် (Profit)</th>}
                </tr>
              </thead>
              <tbody>
                {topSellingMedicines.map((med, idx) => (
                  <tr key={idx}>
                    <td>{med.name}</td>
                    <td className="text-right">{med.quantity}</td>
                    <td className="text-right">{med.revenue.toLocaleString()}</td>
                    {!isStaff && <td className="text-right" style={{ color: '#047857', fontWeight: 'bold' }}>{med.profit.toLocaleString()}</td>}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="footer">
              * ကွန်ပြူတာအလိုအလျောက် ထုတ်ပြန်ပေးသော ဘဏ္ဍာရေး အနှစ်ချုပ် အစီရင်ခံစာ ဖြစ်ပါသည်။ *<br />
              ထုတ်ယူသည့်ရက်စွဲ - {new Date().toLocaleString()} | ဆိုင်အမည် - {settings.name}
            </div>
          </div>
        </div>
      )}

      {/* Reprint Voucher Modal (reuse POS receipt styling for consistency) */}
      {showReceiptModal && selectedVoucher && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl overflow-hidden animate-scaleIn border border-gray-100 flex flex-col">
            
            <div className="bg-emerald-600 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">ဘောက်ချာအသေးစိတ် ပြန်ကြည့်ရန်</h3>
              <button 
                onClick={() => setShowReceiptModal(false)}
                className="text-white/80 hover:text-white font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <div className="p-6 bg-slate-50 flex-1 overflow-y-auto max-h-[420px]">
              <div 
                ref={printRef}
                className="bg-white p-5 shadow-xs border border-gray-100 rounded-xl receipt-print text-xs text-slate-800 leading-relaxed font-sans mx-auto max-w-[280px]"
              >
                <div className="text-center">
                  <h4 className="font-extrabold text-sm text-gray-900">{settings.name}</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">{settings.address}</p>
                  <p className="text-[10px] text-gray-500">ဖုန်း - {settings.phone}</p>
                  
                  <div className="border-b border-dashed border-gray-300 my-3"></div>
                  
                  <div className="text-left space-y-1 text-[10px] text-gray-500">
                    <div className="flex justify-between">
                      <span>ဘောက်ချာ - {selectedVoucher.id}</span>
                      <span>ရက်စွဲ - {new Date(selectedVoucher.date).toLocaleString()}</span>
                    </div>
                    {selectedVoucher.customerName && (
                      <div className="flex justify-between">
                        <span>ဝယ်သူ - {selectedVoucher.customerName}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-b border-dashed border-gray-300 my-3"></div>
                </div>

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
                    {selectedVoucher.items.map((item, idx) => (
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

                <div className="space-y-1.5 text-[10px] text-gray-600">
                  <div className="flex justify-between">
                    <span>စုစုပေါင်း ကျသင့်ငွေ</span>
                    <span>{selectedVoucher.subtotal.toLocaleString()} {settings.currency}</span>
                  </div>
                  {selectedVoucher.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>လျှော့ဈေး</span>
                      <span>-{selectedVoucher.discount.toLocaleString()} {settings.currency}</span>
                    </div>
                  )}
                  {selectedVoucher.tax > 0 && (
                    <div className="flex justify-between">
                      <span>အခွန် / အပိုကြေး</span>
                      <span>+{selectedVoucher.tax.toLocaleString()} {settings.currency}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-gray-900 font-extrabold pt-0.5">
                    <span>စုစုပေါင်းကျသင့်ငွေ</span>
                    <span>{selectedVoucher.netTotal.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="border-b border-dashed border-gray-100 my-1"></div>
                  <div className="flex justify-between">
                    <span>ဝယ်သူ ပေးငွေ</span>
                    <span>{selectedVoucher.paidAmount.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between font-bold text-teal-600">
                    <span>ပြန်အမ်းငွေ</span>
                    <span>{selectedVoucher.changeAmount.toLocaleString()} {settings.currency}</span>
                  </div>
                </div>

                <div className="border-b border-dashed border-gray-300 my-3"></div>

                <div className="text-center text-[10px] text-gray-500 whitespace-pre-line leading-relaxed">
                  {settings.footerMessage}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-5 py-4 flex items-center justify-end space-x-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
              >
                ပိတ်မည်
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2 rounded-xl transition duration-150 flex items-center space-x-1 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>ပြန်လည် ပုံနှိပ်မည်</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
