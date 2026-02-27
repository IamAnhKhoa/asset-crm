// =========================
//  CORE DATA TYPES
// =========================

export interface Asset {
    id: string;
    name: string;
    location: string;
    year: string | number;
    status: string;
    person?: string;
    specificLocation?: string;
    row?: number;
}

export interface CheckReport {
    row?: number;
    time: string;
    assetId: string;
    assetName?: string;
    reporter: string;
    status: string;
    note: string;
    approveStatus?: string;
    location?: string;
}

export interface RepairTicket {
    source?: 'pending' | 'history';
    row?: number;
    time: string;
    assetId: string;
    name?: string;
    location?: string;
    person: string;
    issue: string;
    note: string;
    approveStatus: string;
    repairStatus: string;
    result: string;
    handlerNote: string;
    updatedTime?: string;
}

export interface DashboardStats {
    total: number;
    good: number;
    bad: number;
    needRepair: number;
    missing: number;
    pendingCheck: number;
    pendingRepair: number;
    repairing: number;
    waitingFix: number;
}

export interface DeptCount {
    [dept: string]: number;
}

export interface Dashboard {
    stats: DashboardStats;
    departments: string[];
    deptCounts: DeptCount;
    recentAssets: Asset[];
    recentRepairs: RepairTicket[];
}

export interface ComparisonData {
    current: number;
    previous: number;
    change: number;
    changePercent: number;
}

export interface PeriodComparison {
    label: string;
    total: ComparisonData;
    checks: ComparisonData;
    repairs: ComparisonData;
}

export interface DateRange {
    from: Date | undefined;
    to: Date | undefined;
}

// API response wrapper
export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
    success?: boolean;
}

// Form types
export interface AssetFormData {
    id: string;
    name: string;
    location: string;
    year: string;
    status: string;
    person?: string;
    specificLocation?: string;
    isEdit?: boolean;
}

export interface RepairFormData {
    assetId: string;
    reporter: string;
    issue: string;
    note: string;
}

export interface CheckFormData {
    assetId: string;
    reporter: string;
    status: string;
    note: string;
}

export interface ApproveRepairData {
    repairStatus: string;
    result: string;
    handlerNote: string;
}
