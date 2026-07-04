import { Medicine, ShopSettings, StaffMember, AuditLog, Branch } from './types';

export const getCategoryFallbackImage = (category: string): string => {
  const cat = category.toLowerCase();
  if (cat.includes('ပြား') || cat.includes('tablet')) {
    return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=60';
  }
  if (cat.includes('တောင့်') || cat.includes('capsule')) {
    return 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=300&auto=format&fit=crop&q=60';
  }
  if (cat.includes('ရည်') || cat.includes('syrup')) {
    return 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=300&auto=format&fit=crop&q=60';
  }
  if (cat.includes('လိမ်း') || cat.includes('ointment') || cat.includes('cream')) {
    return 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=300&auto=format&fit=crop&q=60';
  }
  if (cat.includes('ဓာတ်ဆား') || cat.includes('powder')) {
    return 'https://images.unsplash.com/photo-1559742811-82410b49c405?w=300&auto=format&fit=crop&q=60';
  }
  if (cat.includes('ထိုး') || cat.includes('injection')) {
    return 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=300&auto=format&fit=crop&q=60';
  }
  if (cat.includes('ကလေး') || cat.includes('pediatric')) {
    return 'https://images.unsplash.com/photo-1512438248247-f0f2a5a8b7f0?w=300&auto=format&fit=crop&q=60';
  }
  return 'https://images.unsplash.com/photo-1587854692152-cbe660dbbc88?w=300&auto=format&fit=crop&q=60';
};

export const INITIAL_MEDICINES: Medicine[] = [
  {
    id: 'med-1',
    code: 'BGS001',
    name: 'Biogesic 500mg',
    genericName: 'Paracetamol',
    category: 'ဆေးပြား (Tablets)',
    buyingPrice: 80,
    sellingPrice: 120,
    stock: 250,
    expiryDate: '2028-06-30',
    minStockAlert: 50,
    rackNumber: 'A-1',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=60',
  },
  {
    id: 'med-2',
    code: 'DCG002',
    name: 'Decolgen Forte',
    genericName: 'Paracetamol + Chlorpheniramine + Phenylephrine',
    category: 'ဆေးပြား (Tablets)',
    buyingPrice: 100,
    sellingPrice: 150,
    stock: 180,
    expiryDate: '2027-12-15',
    minStockAlert: 40,
    rackNumber: 'A-2',
    image: 'https://images.unsplash.com/photo-1585438711314-35624950e12f?w=300&auto=format&fit=crop&q=60',
  },
  {
    id: 'med-3',
    code: 'AMX003',
    name: 'Amoxicillin 500mg (Amoxil)',
    genericName: 'Amoxicillin',
    category: 'ဆေးတောင့် (Capsules)',
    buyingPrice: 150,
    sellingPrice: 220,
    stock: 120,
    expiryDate: '2027-09-20',
    minStockAlert: 30,
    rackNumber: 'B-1',
    image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=300&auto=format&fit=crop&q=60',
  },
  {
    id: 'med-4',
    code: 'OMZ004',
    name: 'Omez 20mg',
    genericName: 'Omeprazole',
    category: 'ဆေးတောင့် (Capsules)',
    buyingPrice: 120,
    sellingPrice: 180,
    stock: 15, // Low stock on purpose
    expiryDate: '2027-05-10',
    minStockAlert: 20,
    rackNumber: 'B-2',
    image: 'https://images.unsplash.com/photo-1628771065518-0d82f11181a6?w=300&auto=format&fit=crop&q=60',
  },
  {
    id: 'med-5',
    code: 'ORS005',
    name: 'Royal-D ORS (လိမ္မော်နံ့)',
    genericName: 'Oral Rehydration Salts',
    category: 'ဓာတ်ဆားထုပ် (Powders)',
    buyingPrice: 200,
    sellingPrice: 300,
    stock: 80,
    expiryDate: '2028-03-12',
    minStockAlert: 25,
    rackNumber: 'C-3',
    image: 'https://images.unsplash.com/photo-1559742811-82410b49c405?w=300&auto=format&fit=crop&q=60',
  },
  {
    id: 'med-6',
    code: 'TUS006',
    name: 'Tussils Cough Syrup',
    genericName: 'Dextromethorphan',
    category: 'ဆေးရည် (Syrups)',
    buyingPrice: 1200,
    sellingPrice: 1600,
    stock: 45,
    expiryDate: '2026-08-01', // Near expiry on purpose
    minStockAlert: 10,
    rackNumber: 'D-2',
    image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=300&auto=format&fit=crop&q=60',
  },
  {
    id: 'med-7',
    code: 'BTD007',
    name: 'Betadine Ointment 15g',
    genericName: 'Povidone-Iodine',
    category: 'လိမ်းဆေး (Ointments)',
    buyingPrice: 2500,
    sellingPrice: 3200,
    stock: 30,
    expiryDate: '2028-11-25',
    minStockAlert: 8,
    rackNumber: 'E-1',
    image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=300&auto=format&fit=crop&q=60',
  },
  {
    id: 'med-8',
    code: 'ZRT008',
    name: 'Zyrtec 10mg',
    genericName: 'Cetirizine',
    category: 'ဆေးပြား (Tablets)',
    buyingPrice: 300,
    sellingPrice: 450,
    stock: 90,
    expiryDate: '2027-01-15',
    minStockAlert: 20,
    rackNumber: 'A-4',
    image: 'https://images.unsplash.com/photo-1607619056574-7b8d304f2c38?w=300&auto=format&fit=crop&q=60',
  }
];

export const DEFAULT_SETTINGS: ShopSettings = {
  name: 'ရတနာ ဆေးဆိုင်',
  phone: '09-777 888 999',
  address: 'အမှတ် (၁၂၃)၊ လမ်းမတော်၊ ရန်ကုန်မြို့။',
  footerMessage: 'ဝယ်ယူအားပေးမှုကို အထူးကျေးဇူးတင်ရှိပါသည်။ \nကျန်းမာရွှင်လန်းပါစေ။',
  currency: 'ကျပ်',
};

export const CATEGORIES = [
  'ဆေးပြား (Tablets)',
  'ဆေးတောင့် (Capsules)',
  'ဆေးရည် (Syrups)',
  'လိမ်းဆေး (Ointments)',
  'ဓာတ်ဆားထုပ် (Powders)',
  'ထိုးဆေး (Injections)',
  'ကလေးဆေးများ (Pediatric)',
  'အခြား (Others)',
];

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'staff-owner',
    name: 'ဦးရတနာ (ဆိုင်ပိုင်ရှင်)',
    pin: '123456',
    role: 'owner',
  },
  {
    id: 'staff-1',
    name: 'မမေသူ (အရောင်းဝန်ထမ်း - နေ့ဆိုင်း)',
    pin: '111111',
    role: 'staff',
  },
  {
    id: 'staff-2',
    name: 'ကိုကျော်ကျော် (အရောင်းဝန်ထမ်း - ညဆိုင်း)',
    pin: '222222',
    role: 'staff',
  },
];

export const INITIAL_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    userName: 'ဦးရတနာ (ဆိုင်ပိုင်ရှင်)',
    action: 'စနစ်စတင်ခြင်း',
    details: 'ဆေးဆိုင်အရောင်းဆော့ဖ်ဝဲ စတင်လည်ပတ်ခဲ့သည်။',
    severity: 'info',
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    userName: 'မမေသူ (အရောင်းဝန်ထမ်း - နေ့ဆိုင်း)',
    action: 'အရောင်းဝန်ထမ်း ဝင်ရောက်ခြင်း',
    details: 'နေ့ဆိုင်း ဝန်ထမ်း မမေသူ စနစ်ထဲသို့ PIN ကုဒ်ဖြင့် Login ဝင်ရောက်ခဲ့သည်။',
    severity: 'info',
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    userName: 'မမေသူ (အရောင်းဝန်ထမ်း - နေ့ဆိုင်း)',
    action: 'ဆေးဝါးဈေးနှုန်းစစ်ဆေးခြင်း',
    details: 'Paracetamol 500mg (Tylol) ၏ ရောင်းဈေးနှင့် လက်ကျန်ကို ရှာဖွေကြည့်ရှုခဲ့သည်။',
    severity: 'info',
  },
  {
    id: 'log-4',
    timestamp: new Date(Date.now() - 3600000 * 0.8).toISOString(),
    userName: 'မမေသူ (အရောင်းဝန်ထမ်း - နေ့ဆိုင်း)',
    action: 'ခွင့်ပြုချက်မရှိဘဲ ဝင်ရောက်ရန်ကြိုးပမ်းမှု',
    details: 'ဝန်ထမ်း မမေသူသည် ဝယ်ရင်းဈေးနှုန်း (Buying Price) ကို ကြည့်ရှုရန် သို့မဟုတ် ဆေးဝါးစာရင်း ပြင်ဆင်ရန် ကြိုးပမ်းသော်လည်း စနစ်မှ ငြင်းပယ်ခဲ့သည်။',
    severity: 'warning',
  }
];

export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'branch-main',
    name: 'ပင်မဆိုင်ကြီး (Main Branch)',
    address: 'အမှတ် (၁၂၃)၊ လမ်းမတော်၊ ရန်ကုန်မြို့။',
    phone: '09-777 888 999',
    isMain: true
  },
  {
    id: 'branch-hlaing',
    name: 'လှိုင်သာယာ ဆိုင်ခွဲ (Branch 1)',
    address: 'လမ်းမကြီးဘေး၊ လှိုင်သာယာမြို့နယ်။',
    phone: '09-111 222 333',
    isMain: false
  },
  {
    id: 'branch-yankin',
    name: 'ရန်ကင်း ဆိုင်ခွဲ (Branch 2)',
    address: 'ကျောက်ကုန်းလမ်း၊ ရန်ကင်းမြို့နယ်။',
    phone: '09-444 555 666',
    isMain: false
  }
];
