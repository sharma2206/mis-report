import {
    FileText, BarChart3, CreditCard, Hospital, Building2, Stethoscope, Package,
} from 'lucide-react';

export const FILE_FIELD_MAP = {
    bill_items: 'bill_file',
    cashier:    'cashier_file',
    er:         'er_file',
    ip:         'ip_file',
    surgery:    'surgery_file',
    package:    'package_file',
};

export const REQUIRED_FIELDS = {
    chromepet: ['bill_file', 'cashier_file', 'package_file'],
    oragadam:  ['bill_file', 'cashier_file'],
};

export const DETECT_RULES = [
    { pattern: /bill_item|bill_wise/i,         typeKey: 'bill_items', label: 'Bill Items',          icon: BarChart3,   color: 'blue'   },
    { pattern: /cashier|collection_detail/i,   typeKey: 'cashier',    label: 'Cashier Collection',  icon: CreditCard,  color: 'green'  },
    { pattern: /er_admission|emergency/i,      typeKey: 'er',         label: 'ER Admission',        icon: Hospital,    color: 'red'    },
    { pattern: /ip_admission/i,                typeKey: 'ip',         label: 'IP Admission',        icon: Building2,   color: 'violet' },
    { pattern: /surgery/i,                     typeKey: 'surgery',    label: 'Surgery Detail',      icon: Stethoscope, color: 'amber'  },
    { pattern: /package_consumption|package/i, typeKey: 'package',    label: 'Package Consumption', icon: Package,     color: 'cyan'   },
];

export const COLOR_CLASSES = {
    blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   iconBg: 'bg-blue-100',   text: 'text-blue-600'   },
    green:  { bg: 'bg-green-50',  border: 'border-green-200',  iconBg: 'bg-green-100',  text: 'text-green-600'  },
    red:    { bg: 'bg-red-50',    border: 'border-red-200',    iconBg: 'bg-red-100',    text: 'text-red-600'    },
    violet: { bg: 'bg-violet-50', border: 'border-violet-200', iconBg: 'bg-violet-100', text: 'text-violet-600' },
    amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  iconBg: 'bg-amber-100',  text: 'text-amber-600'  },
    cyan:   { bg: 'bg-cyan-50',   border: 'border-cyan-200',   iconBg: 'bg-cyan-100',   text: 'text-cyan-600'   },
    slate:  { bg: 'bg-slate-50',  border: 'border-slate-200',  iconBg: 'bg-slate-100',  text: 'text-slate-500'  },
};

export function detectFile(filename) {
    for (const r of DETECT_RULES) {
        if (r.pattern.test(filename)) return r;
    }
    return { typeKey: 'unknown', label: 'Unknown CSV', icon: FileText, color: 'slate' };
}

export function fmtSize(bytes) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}
