# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
```bash
npm run dev          # Start development server on localhost:3000
npm run build        # Build for production (includes PWA optimization)
npm run build:pwa    # Explicit PWA build with optimization script
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run format:check # Check code formatting without modifying
```

### Environment Setup
- Copy `.env.example` to `.env.local` and configure:
  - `GOOGLE_SHEETS_API_KEY`
  - `GOOGLE_SHEETS_CLIENT_EMAIL`
  - `GOOGLE_SHEETS_PRIVATE_KEY`
  - `GOOGLE_SHEETS_SPREADSHEET_ID`
- Google Sheets API must be enabled with service account credentials
- Share target Google Sheet with service account email

## Architecture Overview

### Data Flow Pattern
This app uses **Google Sheets as the backend database**:
1. **Google Sheets** → stores all financial data (transactions, budgets, goals, accounts, assets)
2. **API Routes** (`app/api/*`) → fetch from Google Sheets using service account
3. **SWR Custom Hooks** (`utils/hooks.js`) → manage client-side data fetching with caching
4. **Components** → consume data via hooks, display UI

**Critical**: API responses are intentionally not cached (see PWA configuration) to ensure real-time financial data accuracy.

### Custom SWR Hooks Pattern
All data fetching uses custom hooks in `utils/hooks.js`:
- `useTransactions(sheetName)` - Monthly transaction data
- `useAccounts(delay)` - Account balances with optional staggered loading
- `useBudgets(month)` - Budget data for specific month
- `useGoals()` - Financial goals
- `useAssets(delay)` - Asset portfolio with optional staggered loading
- `useStaggeredLoading(delay)` - Utility hook for performance optimization

All hooks return: `{ data, error, isLoading, mutate, isError }`

**Key Features**:
- Built-in retry logic with exponential backoff (3 attempts)
- 30-second timeout for cold starts
- Cache busting with timestamp parameters
- Auto-refresh intervals (10-15 seconds)
- NO caching headers to prevent stale financial data

### Google Sheets Integration
- Service: `utils/google.js` handles Google Sheets API authentication
- CSV parsing: Uses PapaParse to convert sheet data to JSON
- Header transformation: Handles duplicate headers (e.g., "Date Date" → "Date")
- Data cleaning: Converts " - " entries to "0", strips quotes

### API Route Pattern
```javascript
// Standard pattern for all API routes
export const dynamic = "force-dynamic";  // Disable static optimization
export const revalidate = 0;             // No revalidation caching

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("force") === "true";

  // Fetch from Google Sheets
  const csvData = await googleSheetsService.read(sheetName, "csv", forceRefresh);

  // Return with NO-CACHE headers for force refresh
  return Response.json({ data }, {
    headers: {
      "Cache-Control": forceRefresh
        ? "no-cache, no-store, must-revalidate"
        : "public, max-age=10, stale-while-revalidate=20"
    }
  });
}
```

### Component Architecture

**Import Pattern**:
```javascript
// Use absolute imports with @/ prefix
import { useTransactions } from "@/utils/hooks";
import { formatCurrency } from "@/utils/helper";
import { Account, Budget } from "@/components/Card";
```

**Standard Component Structure**:
```javascript
"use client";  // Required for interactive components
import { useState, useMemo } from "react";

export default function Component({ data, isLoading, error, onAction }) {
  // 1. Local state
  const [state, setState] = useState(initial);

  // 2. Computed values with useMemo
  const processed = useMemo(() => transform(data), [data]);

  // 3. Event handlers
  const handleAction = (item) => onAction?.(item);

  // 4. Render: Loading → Error → Empty → Data
  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState />;
  if (!data?.length) return <EmptyState />;

  return <div>{/* content */}</div>;
}
```

**Component Organization**:
```
components/ComponentName/
├── index.js           # Exports (export { default as Foo } from "./Foo")
├── ComponentName.js   # Main implementation
└── ComponentSkeleton.js  # Loading state
```

### State Management Patterns

**Persistent State** (using cookies):
```javascript
import Cookies from "js-cookie";

// Save state to cookie
Cookies.set(key, JSON.stringify(value), {
  expires: 365,
  sameSite: 'strict'
});

// Read from cookie
const saved = Cookies.get(key);
const value = saved ? JSON.parse(saved) : defaultValue;
```

**Collapsible Sections**: Track show/hide state for budget categories, account groups, etc.

## PWA Architecture

### Service Worker Configuration
- Uses `next-pwa` with extensive runtime caching rules
- **Static assets**: `StaleWhileRevalidate` (images, CSS, JS, fonts)
- **API routes**: `NetworkFirst` with **NO caching** (maxEntries: 0, maxAgeSeconds: 0)
- 30-second timeout for API calls to handle cold starts
- Build script: `scripts/build-pwa.js` generates manifest and optimizes assets

### PWA Components (`components/PWA/`)
- Install prompt management
- Offline/online status indicators
- Service worker update notifications
- Splash screen for app-like experience

**Critical PWA Pattern**:
```javascript
// next.config.mjs - API routes MUST NOT be cached
{
  urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
  handler: "NetworkFirst",
  options: {
    cacheName: "apis-no-cache",
    networkTimeoutSeconds: 30,
    expiration: {
      maxEntries: 0,    // NO cache entries
      maxAgeSeconds: 0  // NO cache time
    }
  }
}
```

### Webpack Configuration
Node.js module fallbacks disabled for browser (`net`, `fs`, `crypto`, etc.) - defined in `next.config.mjs`

## Utility Functions

### Currency Formatting (`utils/helper.js`)
```javascript
formatCurrency(amount, format)
// formats: "rupiah" | "brackets" | "signs" | "short" | "superscript"
// "short": 1500000 → "Rp1.5jt", 2000000000 → "Rp2M"
// "brackets": negative amounts as (Rp1,000)
// "superscript": returns JSX with decimal as superscript
```

### Date Formatting
```javascript
formatDate("15/02/2026")
// Returns: "Today", "Yesterday", or "15 Feb 2026"
```

## Naming Conventions

- **Components**: PascalCase (`BudgetCard`, `TransactionList`)
- **Files**: kebab-case for pages, PascalCase for components
- **Variables**: camelCase (`totalBudget`, `isLoading`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)

## Code Style

- **Components**: Functional components with React hooks only
- **Functions**: Arrow functions for components and handlers
- **Error States**: Show emoji icon (⚠️), message, and helpful text
- **Loading States**: Use animated skeleton loaders, not spinners
- **Exports**: Named exports from index.js files for clean imports

## Financial Categories

The app uses predefined category constants (`utils/constants.js`):
- **Eating**: Food, Coffee, Fruits, Desserts
- **Living**: Housing, utilities, transportation
- **Saving**: Emergency funds, general savings
- **Investing**: Stocks, crypto, mutual funds
- **Giving**: Donations, gifts

## Important Patterns

### Performance Optimization
- **Staggered Loading**: Use `delay` parameter in hooks to prevent simultaneous API calls
  ```javascript
  useAccounts(0)    // Load immediately
  useAssets(500)    // Load after 500ms delay
  ```
- **useMemo**: For expensive calculations (data transformations, filtering)
- **useCallback**: For event handlers passed to lists

### Error Handling
- All custom hooks have built-in retry logic (3 attempts, exponential backoff)
- Return empty arrays on final failure to prevent UI crashes
- Log errors with ❌ emoji for easy console filtering

### Mobile-First Design
- Max width: `max-w-md` (448px) centered on desktop
- Bottom navigation for primary nav
- Gradient header with wave design (common pattern)
- Touch-friendly card components

## Project-Specific Behaviors

1. **Real-time Data**: Financial data must always be fresh - no API caching, aggressive cache busting
2. **Google Sheets as Database**: All writes happen in Google Sheets, app is read-only
3. **Privacy Controls**: Components support hide/show for sensitive data (account balances, totals)
4. **Weekly Budget System**: Special budget allocation logic for week-by-week spending control
5. **Transaction Filtering**: Advanced multi-criteria filtering (type, account, category, date range)

## Common Issues

### Cold Start Timeouts
- API routes have 30-second timeout to handle serverless cold starts
- Hooks retry 3 times with exponential backoff before giving up

### Stale Data
- If data seems cached, check:
  1. Cache busting parameters include `force=true`
  2. Headers include `Cache-Control: no-cache`
  3. Service worker not caching API routes

### Google Sheets Authentication
- Private key must have `\n` replaced with actual newlines
- Service account needs "Editor" access to spreadsheet
- Spreadsheet ID is from URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
