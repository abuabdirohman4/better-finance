# Architecture Patterns

Detailed architecture patterns for prj-better-finance.

## Data Flow

```
Google Sheets → API Routes → SWR Hooks → Components
```

All financial data lives in Google Sheets. The app is **read-only** — no writes from the app.

## API Route Pattern

```javascript
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("force") === "true";

  const csvData = await googleSheetsService.read(sheetName, "csv", forceRefresh);

  return Response.json({ data }, {
    headers: {
      "Cache-Control": forceRefresh
        ? "no-cache, no-store, must-revalidate"
        : "public, max-age=10, stale-while-revalidate=20"
    }
  });
}
```

## SWR Hook Pattern

All hooks return: `{ data, error, isLoading, mutate, isError }`

Key features:
- Retry logic with exponential backoff (3 attempts)
- 30-second timeout for cold starts
- Cache busting with timestamp parameters
- Auto-refresh intervals (10-15 seconds)
- NO caching headers to prevent stale financial data

## Component Structure

```javascript
"use client";
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

## Component Organization

```
components/ComponentName/
├── index.js           # Exports
├── ComponentName.js   # Main implementation
└── ComponentSkeleton.js  # Loading state
```

## Staggered Loading

Prevent simultaneous API calls:

```javascript
useAccounts(0)    // Load immediately
useAssets(500)    // Load after 500ms delay
```

## Persistent State

```javascript
import Cookies from "js-cookie";

Cookies.set(key, JSON.stringify(value), { expires: 365, sameSite: 'strict' });
const value = Cookies.get(key) ? JSON.parse(Cookies.get(key)) : defaultValue;
```

## Page Structure

```
app/
├── accounts/     # Account balances (savings, investments)
├── assets/       # Asset portfolio
├── budgets/      # Monthly/weekly budget management
├── goals/        # Financial goals tracking
├── transactions/ # Transaction history & filtering
└── settings/     # App configuration
```
