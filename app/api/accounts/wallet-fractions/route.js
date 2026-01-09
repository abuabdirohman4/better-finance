import { googleSheetsService } from "@/utils/google";

// GET /api/accounts/wallet-fractions - Get wallet fractions data
export async function GET() {
    try {
        const csvData = await googleSheetsService.read("Wallet");

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

        // Filter and format data - only get rows with Fraction values
        const fractions = result.data
            .filter((row) => row["Fraction"] && row["Fraction"].trim() !== "")
            .map((row) => ({
                fraction: parseInt(row["Fraction"]) || 0,
                count: parseInt(row["Count"]) || 0,
                type: row["Type"] || "paper", // Use Type column from sheet
                id: `${row["Fraction"]}_${row["Type"] || "paper"}`, // Unique ID based on fraction and type
            }))
            .sort((a, b) => {
                // Sort by fraction value descending, then by type (paper first)
                if (a.fraction !== b.fraction) {
                    return b.fraction - a.fraction;
                }
                return a.type === "paper" ? -1 : 1;
            });

        return Response.json({
            success: true,
            data: fractions,
        });
    } catch (error) {
        console.error("❌ Error fetching wallet fractions:", error);
        return Response.json(
            {
                error: "Failed to fetch wallet fractions data",
                details: error.message,
            },
            { status: 500 }
        );
    }
}

// PUT /api/accounts/wallet-fractions - Update wallet fractions count
export async function PUT(request) {
    try {
        // Check if request body exists
        if (!request.body) {
            return Response.json(
                { error: "Request body is required" },
                { status: 400 }
            );
        }

        const { fractions } = await request.json();

        if (!fractions || !Array.isArray(fractions)) {
            return Response.json(
                { error: "Fractions data is required and must be an array" },
                { status: 400 }
            );
        }

        // Validate each fraction
        for (const fraction of fractions) {
            if (
                typeof fraction.fraction === "undefined" ||
                typeof fraction.count === "undefined" ||
                !fraction.type
            ) {
                return Response.json(
                    {
                        error: "Each fraction must have fraction, count, and type properties",
                    },
                    { status: 400 }
                );
            }
        }

        // Check if googleSheetsService is available
        if (!googleSheetsService || !googleSheetsService.updateByValue) {
            return Response.json(
                { error: "Google Sheets service is not available" },
                { status: 500 }
            );
        }

        // Update each fraction count in the Wallet sheet
        const updatePromises = fractions.map(async (fraction) => {
            try {
                // Get all data to find the correct row
                const walletData = await googleSheetsService.getAll("Wallet");

                // Find the row index that matches both fraction and type
                let targetRowIndex = -1;
                for (let i = 1; i < walletData.length; i++) {
                    // Skip header row
                    const row = walletData[i];
                    if (
                        row[0] === fraction.fraction.toString() &&
                        row[1] === fraction.type
                    ) {
                        targetRowIndex = i;
                        break;
                    }
                }

                if (targetRowIndex === -1) {
                    throw new Error(
                        `Row not found for fraction ${fraction.fraction} with type ${fraction.type}`
                    );
                }

                // Update the specific row
                const result = await googleSheetsService.update(
                    "Wallet",
                    `C${targetRowIndex + 1}`, // Column C, row number (1-based)
                    fraction.count
                );

                return {
                    success: true,
                    fraction: fraction.fraction,
                    type: fraction.type,
                };
            } catch (error) {
                console.error(
                    `Error updating fraction ${fraction.fraction} (${fraction.type}):`,
                    error
                );
                return {
                    success: false,
                    fraction: fraction.fraction,
                    type: fraction.type,
                    error: error.message,
                };
            }
        });

        const results = await Promise.all(updatePromises);
        const successful = results.filter((r) => r.success);
        const failed = results.filter((r) => !r.success);

        // Update last_updated timestamp for Wallet account in Summary sheet if any updates were successful
        if (successful.length > 0) {
            try {
                const walletRowNumber = await googleSheetsService.findRowByValue(
                    "Summary",
                    "A",
                    "Wallet",
                    {
                        caseSensitive: false,
                        exactMatch: false,
                    }
                );

                if (walletRowNumber) {
                    const timestamp = new Date().toISOString();
                    await googleSheetsService.update(
                        "Summary",
                        `D${walletRowNumber}`,
                        timestamp
                    );
                }
            } catch (error) {
                console.error("Error updating Wallet last_updated timestamp:", error);
                // Don't fail the entire operation if timestamp update fails
            }
        }

        const headers = new Headers();
        headers.set("Content-Type", "application/json");
        headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
        headers.set("Last-Modified", new Date().toUTCString());
        headers.set("ETag", `"${Date.now()}"`);

        return Response.json(
            {
                success: true,
                message: `Successfully updated ${successful.length} fractions`,
                data: {
                    updated: successful.length,
                    failed: failed.length,
                    results: results,
                },
            },
            { headers }
        );
    } catch (error) {
        console.error("Error updating wallet fractions:", error);

        return Response.json(
            {
                error: "Failed to update wallet fractions",
                details: error.message,
            },
            { status: 500 }
        );
    }
}

// POST /api/accounts/wallet-fractions - Fallback for PUT method
export async function POST(request) {
    return PUT(request);
}

// OPTIONS /api/accounts/wallet-fractions - Handle CORS preflight
export async function OPTIONS() {
    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Max-Age", "86400");

    return new Response(null, {
        status: 200,
        headers,
    });
}
