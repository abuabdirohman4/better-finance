import { googleSheetsService } from "@/utils/google";

// Ensure this route is always dynamic and not statically optimized
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/accounts - Get all accounts data
export async function GET(request) {
    try {
        // Add cache busting for Google Sheets
        const url = new URL(request.url);
        const forceRefresh = url.searchParams.get("force") === "true";

        const csvData = await googleSheetsService.read(
            "Summary",
            "csv",
            forceRefresh
        );

        // Parse CSV data
        const Papa = (await import("papaparse")).default;
        const result = Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => {
                const cleanHeader = header.replace(/"/g, "").trim();
                return cleanHeader;
            },
            transform: (value) => {
                let cleanValue = value.replace(/"/g, "").trim();
                if (
                    cleanValue === "  - " ||
                    cleanValue === " - " ||
                    cleanValue === ""
                ) {
                    cleanValue = "0";
                }
                return cleanValue;
            },
        });

        // Filter and format data
        const accounts = result.data
            .filter((row) => row["Name"] && row["Name"].trim() !== "")
            .map((row) => ({
                name: row["Name"].trim(),
                value: parseFloat(row["Value"]) || 0,
                balance: parseFloat(row["Value"]) || 0,
                balancing: parseFloat(row["Balancing"]) || 0,
                lastUpdated: row["Last Updated"] || null,
            }));

        const headers = {
            "Cache-Control": forceRefresh
                ? "no-cache, no-store, must-revalidate"
                : "public, max-age=10, stale-while-revalidate=20",
            "Last-Modified": new Date().toUTCString(),
            ETag: `"${Date.now()}"`,
        };

        return Response.json(
            {
                success: true,
                data: accounts,
            },
            { headers }
        );
    } catch (error) {
        console.error("❌ Error fetching accounts:", error);
        return Response.json(
            {
                error: "Failed to fetch accounts data",
                details: error.message,
            },
            {
                status: 500,
                headers: {
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                },
            }
        );
    }
}
