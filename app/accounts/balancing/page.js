"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccounts } from "@/utils/hooks";
import { useBalancingInput } from "./hooks/useBalancingInput";
import { 
    BalancingHeader, 
    CalculationBalanceCard, 
    RealityCheckForm, 
    ResultCard 
} from "./components";

export default function AccountBalancing() {
    return (
        <Suspense
            fallback={
                <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
                    <div className="bg-white shadow-sm border-b border-gray-100">
                        <div className="max-w-md mx-auto px-4 py-6">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                                <div className="flex-1">
                                    <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="max-w-md mx-auto px-4 py-6 pb-24 space-y-6">
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                            <div className="h-6 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>
                            <div className="space-y-3">
                                <div className="h-8 bg-gray-200 rounded w-full animate-pulse"></div>
                                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </main>
            }
        >
            <AccountBalancingContent />
        </Suspense>
    );
}

function AccountBalancingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const accountName = searchParams.get("account") || "Wallet";

    const { data: accountData, isLoading, mutate } = useAccounts();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    // Find the specified account
    const account = accountData?.find((acc) => acc.name === accountName);
    const currentBalance = account?.balance || 0;
    const currentBalancing = account?.balancing || 0;

    // Use the custom input hook
    const { realBalance, displayValue, inputHandlers } = useBalancingInput(accountName, currentBalancing);

    // Calculate difference - use realBalance input if available, otherwise use last reality check
    const systemDifference = realBalance
        ? parseFloat(realBalance) - currentBalance
        : currentBalancing > 0
          ? currentBalancing - currentBalance
          : 0;

    const handleUpdate = async () => {
        if (!realBalance) {
            alert("Please enter the real balance");
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const response = await fetch("/api/accounts/balancing", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    accountName,
                    realBalance: parseFloat(realBalance),
                }),
            });

            // Check if response is ok and has content
            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = {
                        error: `HTTP ${response.status}: ${response.statusText}`,
                    };
                }
                setResult({
                    success: false,
                    error: errorData.error || "Request failed",
                });
                return;
            }

            // Check if response has content before parsing JSON
            const responseText = await response.text();
            if (!responseText.trim()) {
                setResult({
                    success: false,
                    error: "Empty response from server",
                });
                return;
            }

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error("JSON Parse Error:", parseError);
                console.error("Response Text:", responseText);
                setResult({
                    success: false,
                    error: "Invalid response format from server",
                });
                return;
            }

            setResult({
                success: true,
                data,
                difference: parseFloat(realBalance) - currentBalance,
            });

            // Simple refresh account data
            mutate();
        } catch (error) {
            console.error("Fetch Error:", error);
            setResult({
                success: false,
                error: error.message || "Network error occurred",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
            {/* Header */}
            <BalancingHeader 
                accountName={accountName} 
                onBack={() => router.back()} 
            />

            <div className="max-w-md mx-auto px-4 py-6 pb-24 space-y-6">
                {/* Calculation Balance Card */}
                <CalculationBalanceCard
                    isLoading={isLoading}
                    accountName={accountName}
                    currentBalance={currentBalance}
                    currentBalancing={currentBalancing}
                    systemDifference={systemDifference}
                />

                {/* Reality Check Form */}
                <RealityCheckForm
                    accountName={accountName}
                    displayValue={displayValue}
                    inputHandlers={inputHandlers}
                    realBalance={realBalance}
                    loading={loading}
                    onUpdate={handleUpdate}
                />

                {/* Results */}
                <ResultCard
                    result={result}
                    accountName={accountName}
                    realBalance={realBalance}
                />
            </div>
        </main>
    );
}