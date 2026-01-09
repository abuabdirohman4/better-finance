import { googleSheetsService } from "@/utils/google";

// PUT /api/accounts/balancing - Update account balancing
export async function PUT(request) {
    try {
        // Parse request body with error handling
        let requestData;
        try {
            requestData = await request.json();
        } catch (parseError) {
            console.error("❌ Error parsing request JSON:", parseError);
            return Response.json(
                { error: "Invalid JSON in request body" },
                { status: 400 }
            );
        }

        const { accountName, realBalance } = requestData;

        if (!accountName || realBalance === undefined || realBalance === null) {
            return Response.json(
                { error: "Account name and real balance are required" },
                { status: 400 }
            );
        }

        const value = parseFloat(realBalance);

        if (isNaN(value)) {
            return Response.json(
                { error: "Real balance must be a valid number" },
                { status: 400 }
            );
        }

        // Find the row number for the account
        const rowNumber = await googleSheetsService.findRowByValue(
            "Summary",
            "A",
            accountName,
            {
                caseSensitive: false,
                exactMatch: false,
            }
        );

        if (!rowNumber) {
            return Response.json(
                { error: `Account "${accountName}" not found` },
                { status: 404 }
            );
        }

        // Get current timestamp in ISO format
        const timestamp = new Date().toISOString();

        // Update both balancing column (C) and last_updated column (D) for the specified account
        await googleSheetsService.updateBatch("Summary", [
            { range: `C${rowNumber}`, value },
            { range: `D${rowNumber}`, value: timestamp },
        ]);

        const successResponse = {
            success: true,
            message: `Successfully updated ${accountName} balancing to ${value}`,
            data: {
                accountName,
                realBalance: value,
                column: "C",
            },
        };

        const headers = new Headers();
        headers.set("Content-Type", "application/json");
        headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
        headers.set("Last-Modified", new Date().toUTCString());
        headers.set("ETag", `"${Date.now()}"`);

        return Response.json(successResponse, { headers });
    } catch (error) {
        console.error("❌ Error updating account balancing:", error);

        const errorResponse = {
            error: "Failed to update account balancing",
            details: error.message,
            timestamp: new Date().toISOString(),
        };

        const errorHeaders = new Headers();
        errorHeaders.set("Content-Type", "application/json");
        errorHeaders.set(
            "Cache-Control",
            "no-cache, no-store, must-revalidate"
        );
        errorHeaders.set("Last-Modified", new Date().toUTCString());
        errorHeaders.set("ETag", `"${Date.now()}"`);

        return Response.json(errorResponse, {
            status: 500,
            headers: errorHeaders,
        });
    }
}
