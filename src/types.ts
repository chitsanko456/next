export interface Medicine {
  id: string;
  code: string; // Barcode or SKU code
  name: string; // ဆေးအမည်
  genericName?: string; // ဓာတုဗေဒအမည် (ဥပမာ - Paracetamol)
  category: string; // ဆေးအမျိုးအစား (ဥပမာ - ဆေးပြား၊ ဆေးရည်)
  buyingPrice: number; // ဝယ်ရင်းဈေး
  sellingPrice: number; // ရောင်းဈေး
  stock: number; // လက်ကျန်အရေအတွက်
  expiryDate: string; // သက်တမ်းကုန်ဆုံးရက် (YYYY-MM-DD)
  minStockAlert: number; // အနည်းဆုံး လက်ကျန်သတိပေးချက်
  rackNumber?: string; // ထားရှိရာ နေရာ/ဆေးစင်
  image?: string; // ဆေးဝါးဓာတ်ပုံ (Base64 သို့မဟုတ် URL)
  branchStocks?: { [branchId: string]: number }; // ဆိုင်ခွဲအလိုက် လက်ကျန်အရေအတွက်
}

export interface CartItem {
  medicine: Medicine;
  quantity: number;
}

export interface VoucherItem {
  medicineId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Voucher {
  id: string;
  date: string;
  items: VoucherItem[];
  subtotal: number;
  discount: number;
  tax: number;
  netTotal: number;
  paidAmount: number;
  changeAmount: number;
  customerName?: string;
  cashierName?: string; // ဘေလ်ဖွင့်ပေးသူ ဝန်ထမ်းအမည်
  branchId?: string; // ဘယ်ဆိုင်ခွဲက ရောင်းလိုက်တာလဲ
}

export interface StaffMember {
  id: string;
  name: string;
  pin: string;
  role: 'owner' | 'staff';
  branchId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  action: string;
  details: string;
  severity: 'info' | 'warning' | 'danger';
}

export interface ShopSettings {
  name: string;
  phone: string;
  address: string;
  footerMessage: string;
  currency: string;
}

export interface Branch {
  id: string;
  name: string; // ဆိုင်ခွဲအမည်
  address?: string; // လိပ်စာ
  phone?: string; // ဖုန်းနံပါတ်
  isMain?: boolean; // ပင်မဆိုင် ဟုတ်/မဟုတ်
}

export type TabType = 'dashboard' | 'pos' | 'inventory' | 'sales' | 'settings';
