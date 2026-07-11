# Plan: Wishlist Feature dengan Smart Affordability Analysis

## Context

User ingin halaman wishlist di mana bisa mencatat barang/hal yang ingin dibeli. Tapi lebih dari sekedar list — sistem harus membantu user menganalisa:
- Apakah wishlist item affordable sekarang?
- Kapan sebaiknya/idealnya dibeli?
- Berapa lama perlu menabung untuk beli ini?

Data keuangan user (accounts, transactions, budgets, goals) sudah tersedia via Google Sheets. Wishlist data juga akan disimpan di Google Sheets sebagai sheet baru bernama "Wishlist".

## Fitur yang Direncanakan

### Core (MVP)
1. **Wishlist Page** — list semua wishlist items
2. **Add/Edit/Delete** — user input wishlist langsung ke Google Sheets
3. **Priority** — high/medium/low priority
4. **Category** — Electronics, Fashion, Food, Travel, etc.
5. **Target Price** — harga target item

### Smart Analysis (value-added)
6. **Affordability Status** — bisa beli sekarang? (berdasarkan saldo accounts)
7. **Savings Estimate** — kalau tidak bisa beli sekarang, berapa lama perlu nabung?
8. **Recommendation Tag** — "Bisa beli sekarang", "Nabung X bulan lagi", "Pertimbangkan ulang"

## Google Sheets Schema (Wishlist Sheet)

| Column | Type | Description |
|--------|------|-------------|
| ID | string | Unique ID (timestamp-based) |
| Name | string | Nama item |
| Category | string | Kategori (Electronics, Fashion, Travel, dll) |
| Price | number | Harga target (IDR) |
| Priority | string | high/medium/low |
| Notes | string | Catatan tambahan |
| Link | string | URL produk (optional) |
| Status | string | active/purchased/cancelled |
| CreatedAt | date | DD/MM/YYYY |
| PurchasedAt | date | DD/MM/YYYY (opsional, diisi saat purchased) |

## Tasks

### Task 1: Buat Google Sheets API Route untuk Wishlist (Read)
**File**: `app/api/wishlist/route.js`
**Action**: Create

```javascript
import { googleSheetsService } from "@/utils/google";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
    try {
        const url = new URL(request.url);
        const forceRefresh = url.searchParams.get("force") === "true";

        const csvData = await googleSheetsService.read(
            "Wishlist",
            "csv",
            forceRefresh
        );

        const Papa = (await import("papaparse")).default;
        const result = Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.replace(/"/g, "").trim(),
            transform: (value) => {
                let cleanValue = value.replace(/"/g, "");
                if (cleanValue === "  - " || cleanValue === " - ") {
                    cleanValue = "0";
                }
                return cleanValue;
            },
        });

        // Only return active items (not purchased/cancelled)
        const parsedData = result.data.filter((row) => {
            const name = row["Name"] || row[" Name "] || "";
            return name.trim() !== "";
        });

        const headers = {
            "Cache-Control": forceRefresh
                ? "no-cache, no-store, must-revalidate"
                : "public, max-age=10, stale-while-revalidate=20",
        };

        return Response.json({ success: true, data: parsedData }, { headers });
    } catch (error) {
        console.error("❌ Error fetching wishlist:", error);
        return Response.json(
            { error: "Failed to fetch wishlist data", details: error.message },
            { status: 500, headers: { "Cache-Control": "no-cache, no-store, must-revalidate" } }
        );
    }
}
```

### Task 2: Buat SWR Hook untuk Wishlist
**File**: `utils/hooks.js`
**Action**: Edit — tambahkan hook baru di bagian akhir file

```javascript
// Custom hook for fetching wishlist data
export const useWishlist = () => {
    const { data, error, isLoading, mutate } = useSWR(
        "wishlist",
        async () => {
            const maxRetries = 3;
            let lastError;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const cacheBuster = `?t=${Date.now()}&force=true`;
                    const response = await fetch(`/api/wishlist${cacheBuster}`, {
                        headers: {
                            "Cache-Control": "no-cache, no-store, must-revalidate",
                            Pragma: "no-cache",
                            Expires: "0",
                        },
                        signal: AbortSignal.timeout(30000),
                    });
                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(result.error || "Failed to fetch wishlist");
                    }

                    return result.data;
                } catch (error) {
                    lastError = error;
                    console.error(`❌ Error fetching wishlist (attempt ${attempt}/${maxRetries}):`, error);

                    if (attempt === maxRetries) return [];

                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }

            return [];
        },
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 5000,
            errorRetryCount: 0,
            refreshInterval: 15000,
        }
    );

    return {
        data: data || [],
        error,
        isLoading,
        mutate,
        isError: !!error,
    };
};
```

### Task 3: Buat Affordability Calculator Utility
**File**: `utils/wishlist-helper.js`
**Action**: Create

```javascript
/**
 * Wishlist affordability analysis utilities
 */

/**
 * Calculate affordability status and savings estimate
 * @param {number} itemPrice - Target price of wishlist item
 * @param {number} availableBalance - Current available balance from accounts
 * @param {number} monthlySavings - Average monthly savings (income - expenses)
 * @returns {object} { canAfford, monthsNeeded, recommendation, tag }
 */
export const calculateAffordability = (itemPrice, availableBalance, monthlySavings) => {
    if (!itemPrice || itemPrice <= 0) {
        return {
            canAfford: null,
            monthsNeeded: null,
            recommendation: "Tambahkan harga target untuk melihat analisa",
            tag: "no-price",
            tagColor: "gray",
        };
    }

    if (availableBalance >= itemPrice) {
        return {
            canAfford: true,
            monthsNeeded: 0,
            recommendation: "Saldo kamu cukup untuk membeli ini sekarang",
            tag: "Bisa beli sekarang",
            tagColor: "green",
        };
    }

    const deficit = itemPrice - availableBalance;

    if (!monthlySavings || monthlySavings <= 0) {
        return {
            canAfford: false,
            monthsNeeded: null,
            recommendation: "Tambah pemasukan atau kurangi pengeluaran untuk menabung",
            tag: "Perlu perencanaan",
            tagColor: "red",
        };
    }

    const monthsNeeded = Math.ceil(deficit / monthlySavings);

    if (monthsNeeded <= 1) {
        return {
            canAfford: false,
            monthsNeeded,
            recommendation: `Nabung sekitar ${formatMonths(monthsNeeded)} lagi`,
            tag: "Hampir bisa",
            tagColor: "yellow",
        };
    } else if (monthsNeeded <= 6) {
        return {
            canAfford: false,
            monthsNeeded,
            recommendation: `Nabung sekitar ${formatMonths(monthsNeeded)} lagi`,
            tag: `${monthsNeeded} bulan lagi`,
            tagColor: "yellow",
        };
    } else if (monthsNeeded <= 12) {
        return {
            canAfford: false,
            monthsNeeded,
            recommendation: `Butuh ${formatMonths(monthsNeeded)} lagi. Pertimbangkan cicilan atau nabung rutin`,
            tag: `${monthsNeeded} bulan lagi`,
            tagColor: "orange",
        };
    } else {
        return {
            canAfford: false,
            monthsNeeded,
            recommendation: `Butuh ${formatMonths(monthsNeeded)} lagi. Evaluasi ulang prioritas atau cari alternatif`,
            tag: "Pertimbangkan ulang",
            tagColor: "red",
        };
    }
};

const formatMonths = (months) => {
    if (months === 1) return "1 bulan";
    if (months < 12) return `${months} bulan`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return `${years} tahun`;
    return `${years} tahun ${remainingMonths} bulan`;
};

/**
 * Sort wishlist items by priority and price
 */
export const sortWishlistItems = (items, sortBy = "priority") => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };

    return [...items].sort((a, b) => {
        if (sortBy === "priority") {
            const aPriority = priorityOrder[a.Priority?.toLowerCase()] ?? 1;
            const bPriority = priorityOrder[b.Priority?.toLowerCase()] ?? 1;
            if (aPriority !== bPriority) return aPriority - bPriority;
            return parseFloat(a.Price || 0) - parseFloat(b.Price || 0);
        }
        if (sortBy === "price-asc") return parseFloat(a.Price || 0) - parseFloat(b.Price || 0);
        if (sortBy === "price-desc") return parseFloat(b.Price || 0) - parseFloat(a.Price || 0);
        if (sortBy === "name") return a.Name?.localeCompare(b.Name);
        return 0;
    });
};

/**
 * Get priority color class
 */
export const getPriorityColor = (priority) => {
    const colors = {
        high: "text-red-500 bg-red-50",
        medium: "text-yellow-500 bg-yellow-50",
        low: "text-green-500 bg-green-50",
    };
    return colors[priority?.toLowerCase()] || "text-gray-500 bg-gray-50";
};

/**
 * Get tag color class
 */
export const getTagColor = (tagColor) => {
    const colors = {
        green: "text-green-700 bg-green-100",
        yellow: "text-yellow-700 bg-yellow-100",
        orange: "text-orange-700 bg-orange-100",
        red: "text-red-700 bg-red-100",
        gray: "text-gray-500 bg-gray-100",
    };
    return colors[tagColor] || colors.gray;
};
```

### Task 4: Buat WishlistCard Component
**File**: `components/Card/WishlistCard.js`
**Action**: Create

```javascript
"use client";
import { formatCurrency } from "@/utils/helper";
import { getPriorityColor, getTagColor } from "@/utils/wishlist-helper";

export default function WishlistCard({ item, affordability, isHidden, onToggleHide }) {
    const priorityColor = getPriorityColor(item.Priority);
    const tagColor = getTagColor(affordability?.tagColor);

    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityColor}`}>
                            {item.Priority || "medium"}
                        </span>
                        {item.Category && (
                            <span className="text-xs text-gray-400">{item.Category}</span>
                        )}
                    </div>
                    <h3 className="font-semibold text-gray-800 truncate">{item.Name}</h3>
                    {item.Notes && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{item.Notes}</p>
                    )}
                </div>
                <div className="text-right shrink-0">
                    <p className="font-bold text-gray-800">
                        {isHidden ? "••••••" : formatCurrency(parseFloat(item.Price || 0), "short")}
                    </p>
                    <button
                        onClick={() => onToggleHide?.(item.ID)}
                        className="text-xs text-gray-400 mt-0.5"
                    >
                        {isHidden ? "Tampilkan" : "Sembunyikan"}
                    </button>
                </div>
            </div>

            {affordability && (
                <div className={`mt-3 px-3 py-2 rounded-lg text-xs font-medium ${tagColor}`}>
                    <div className="flex items-center gap-1.5">
                        <span>{affordability.canAfford === true ? "✅" : affordability.canAfford === false ? "💰" : "💡"}</span>
                        <span>{affordability.recommendation}</span>
                    </div>
                </div>
            )}

            {item.Link && (
                <a
                    href={item.Link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs text-blue-500 underline"
                >
                    Lihat produk →
                </a>
            )}
        </div>
    );
}
```

### Task 5: Buat Wishlist Page
**File**: `app/wishlist/page.js`
**Action**: Create

```javascript
"use client";
import { useState, useMemo } from "react";
import { useWishlist } from "@/utils/hooks";
import { useAccounts } from "@/utils/hooks";
import { useTransactions } from "@/utils/hooks";
import WishlistCard from "@/components/Card/WishlistCard";
import { calculateAffordability, sortWishlistItems } from "@/utils/wishlist-helper";
import { formatCurrency } from "@/utils/helper";

export default function Wishlist() {
    const { data: wishlistData, isLoading: wishlistLoading } = useWishlist();
    const { data: accountsData, isLoading: accountsLoading } = useAccounts(0);
    const [sortBy, setSortBy] = useState("priority");
    const [hiddenItems, setHiddenItems] = useState({});

    // Calculate total available balance from accounts
    const totalBalance = useMemo(() => {
        if (!accountsData?.length) return 0;
        return accountsData.reduce((sum, acc) => sum + parseFloat(acc.Balance || 0), 0);
    }, [accountsData]);

    // Estimate monthly savings (simplified: based on account growth)
    // TODO: in future, calculate from transactions income - expenses
    const estimatedMonthlySavings = 1000000; // placeholder — 1jt/bulan default

    const sortedItems = useMemo(() => {
        if (!wishlistData?.length) return [];
        return sortWishlistItems(
            wishlistData.filter((i) => i.Status !== "purchased" && i.Status !== "cancelled"),
            sortBy
        );
    }, [wishlistData, sortBy]);

    const totalWishlistValue = useMemo(() => {
        return sortedItems.reduce((sum, i) => sum + parseFloat(i.Price || 0), 0);
    }, [sortedItems]);

    const toggleHide = (id) => {
        setHiddenItems((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const isLoading = wishlistLoading || accountsLoading;

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 px-4 pt-12 pb-16 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-white text-2xl font-bold">Wishlist</h1>
                    <p className="text-purple-200 text-sm mt-1">Impian yang ingin kamu wujudkan</p>
                    <div className="mt-4 bg-white/10 rounded-xl p-3 flex justify-between">
                        <div>
                            <p className="text-purple-200 text-xs">Total Wishlist</p>
                            <p className="text-white font-bold">{formatCurrency(totalWishlistValue, "short")}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-purple-200 text-xs">{sortedItems.length} item</p>
                        </div>
                    </div>
                </div>
                {/* Wave */}
                <svg className="absolute bottom-0 left-0 right-0" viewBox="0 0 390 40" fill="none">
                    <path d="M0 40L390 40L390 10C390 10 330 40 195 40C60 40 0 10 0 10L0 40Z" fill="#F9FAFB"/>
                </svg>
            </div>

            {/* Content */}
            <div className="px-4 -mt-6 relative z-10 max-w-md mx-auto">
                {/* Sort Controls */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                    {[
                        { key: "priority", label: "Prioritas" },
                        { key: "price-asc", label: "Harga ↑" },
                        { key: "price-desc", label: "Harga ↓" },
                        { key: "name", label: "Nama" },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setSortBy(key)}
                            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                                sortBy === key
                                    ? "bg-purple-600 text-white"
                                    : "bg-white text-gray-600 border border-gray-200"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Items */}
                {isLoading ? (
                    <WishlistSkeleton />
                ) : sortedItems.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <p className="text-4xl mb-3">🛍️</p>
                        <p className="font-medium">Wishlist kamu masih kosong</p>
                        <p className="text-sm mt-1">Tambahkan item di Google Sheets tab "Wishlist"</p>
                    </div>
                ) : (
                    sortedItems.map((item) => {
                        const affordability = calculateAffordability(
                            parseFloat(item.Price || 0),
                            totalBalance,
                            estimatedMonthlySavings
                        );
                        return (
                            <WishlistCard
                                key={item.ID || item.Name}
                                item={item}
                                affordability={affordability}
                                isHidden={!!hiddenItems[item.ID]}
                                onToggleHide={toggleHide}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
}

function WishlistSkeleton() {
    return (
        <div className="space-y-3">
            {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
                    <div className="flex justify-between">
                        <div className="space-y-2 flex-1">
                            <div className="h-4 bg-gray-200 rounded w-24" />
                            <div className="h-5 bg-gray-200 rounded w-40" />
                            <div className="h-3 bg-gray-200 rounded w-32" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-5 bg-gray-200 rounded w-20" />
                        </div>
                    </div>
                    <div className="mt-3 h-8 bg-gray-100 rounded-lg" />
                </div>
            ))}
        </div>
    );
}
```

### Task 6: Tambahkan Wishlist ke Navigation
**File**: `components/BottomNav/BottomNav.js` (atau file navigasi yang ada)
**Action**: Edit — tambahkan menu Wishlist

Cek dulu struktur BottomNav yang ada, lalu tambahkan:
```javascript
{ href: "/wishlist", icon: <ShoppingBagIcon />, label: "Wishlist" }
```

## Scope & Batasan (MVP)

- ✅ Read wishlist dari Google Sheets
- ✅ Display affordability analysis berdasarkan saldo accounts
- ✅ Sort by priority/price/name
- ✅ Hide/show harga
- ❌ Add/Edit/Delete item dari app (user isi langsung di Google Sheets dulu)
- ❌ Smart monthly savings dari transactions (pakai nilai statis dulu)
- ❌ Push notification reminder

## Files Yang Akan Dibuat/Diubah

| File | Action | Est. Lines |
|------|--------|------------|
| `app/api/wishlist/route.js` | Create | ~70 |
| `utils/hooks.js` | Edit (append) | ~45 |
| `utils/wishlist-helper.js` | Create | ~90 |
| `components/Card/WishlistCard.js` | Create | ~55 |
| `app/wishlist/page.js` | Create | ~120 |
| `components/BottomNav/BottomNav.js` | Edit | ~5 |

**Total**: ~6 files, ~385 lines → **Recommend Mode A (Antigravity)**

## Commit Message Template

```
feat(wishlist): add wishlist page with smart affordability analysis (fixes #GH-XX)

- Add /api/wishlist route fetching from Google Sheets
- Add useWishlist SWR hook with retry logic
- Add affordability calculator utility (savings estimate)
- Add WishlistCard component with priority and tag display
- Add /wishlist page with sort controls and skeleton loading

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
