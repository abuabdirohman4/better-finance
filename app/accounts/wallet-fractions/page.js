"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccounts } from "@/utils/hooks";
import { formatCurrency, formatLastUpdated } from "@/utils/helper";
import Button from "@/components/Button";

export default function WalletFractions() {
    const router = useRouter();
    const { data: accountData, isLoading, mutate } = useAccounts();

    // State for wallet fractions data
    const [fractions, setFractions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [isLoadingFractions, setIsLoadingFractions] = useState(true);

    // Find wallet account
    const walletAccount = accountData?.find((acc) => acc.name === "Wallet");
    const walletBalance = walletAccount?.balance || 0;
    const lastUpdated = walletAccount?.lastUpdated || null;

    // Fetch wallet fractions data from Google Sheets
    useEffect(() => {
        const fetchWalletFractions = async () => {
            try {
                setIsLoadingFractions(true);
                const response = await fetch("/api/accounts/wallet-fractions");

                if (!response.ok) {
                    console.error(
                        "Error fetching wallet fractions:",
                        response.status,
                        response.statusText
                    );
                    return;
                }

                const data = await response.json();

                if (data.success) {
                    setFractions(data.data || []);
                } else {
                    console.error(
                        "Error fetching wallet fractions:",
                        data.error
                    );
                }
            } catch (error) {
                console.error("Error fetching wallet fractions:", error);
            } finally {
                setIsLoadingFractions(false);
            }
        };

        fetchWalletFractions();
    }, []);

    // Calculate total amount from fractions
    const calculateTotal = () => {
        return fractions.reduce((total, fraction) => {
            const count = parseInt(fraction.count) || 0;
            const fractionValue = parseInt(fraction.fraction) || 0;
            return total + count * fractionValue;
        }, 0);
    };

    // Handle count input change
    const handleCountChange = (index, value) => {
        const newFractions = [...fractions];
        newFractions[index].count = value.replace(/[^\d]/g, ""); // Only allow numbers
        setFractions(newFractions);
    };

    // Handle update fractions
    const handleUpdate = async () => {
        setLoading(true);
        setResult(null);

        try {
            const response = await fetch("/api/accounts/wallet-fractions", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    fractions: fractions.map((f) => ({
                        fraction: f.fraction,
                        count: parseInt(f.count) || 0,
                        type: f.type,
                    })),
                }),
            });

            // Check if response is ok before trying to parse JSON
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMessage =
                        errorData.error || errorData.details || errorMessage;
                } catch (parseError) {
                    console.error(
                        "Failed to parse error response:",
                        parseError
                    );
                }
                setResult({ success: false, error: errorMessage });
                return;
            }

            // Try to parse JSON response
            let data;
            try {
                const responseText = await response.text();
                if (!responseText) {
                    throw new Error("Empty response from server");
                }
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error("Failed to parse JSON response:", parseError);
                setResult({
                    success: false,
                    error: "Invalid response from server. Please try again.",
                });
                return;
            }

            if (data.success) {
                setResult({
                    success: true,
                    data,
                    calculatedTotal: calculateTotal(),
                    difference: calculateTotal() - walletBalance,
                });
                // Refresh account data
                mutate();

                // Refresh wallet fractions data to show updated values
                const refreshResponse = await fetch(
                    "/api/accounts/wallet-fractions"
                );
                if (refreshResponse.ok) {
                    const refreshData = await refreshResponse.json();
                    if (refreshData.success) {
                        setFractions(refreshData.data || []);
                    }
                }
            } else {
                setResult({
                    success: false,
                    error:
                        data.error || data.details || "Unknown error occurred",
                });
            }
        } catch (error) {
            console.error("Network or other error:", error);
            setResult({
                success: false,
                error: `Network error: ${error.message}`,
            });
        } finally {
            setLoading(false);
        }
    };

    const calculatedTotal = calculateTotal();
    const difference = calculatedTotal - walletBalance;

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-md mx-auto px-4 py-6">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                        >
                            <svg
                                className="w-5 h-5 text-gray-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                        </button>
                        <div className="flex-1">
                            <h1 className="text-xl font-bold text-gray-900">
                                Wallet Balancing
                            </h1>
                            <p className="text-sm text-gray-600">
                                Reality check for your Wallet
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 py-6 pb-24 space-y-6">
                {/* Calculation Summary */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        Calculation Balance
                    </h2>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">
                                Current Balance:
                            </span>
                            <span className="font-bold text-lg text-gray-900">
                                {formatCurrency(walletBalance)}
                            </span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">
                                Reality Balance:
                            </span>
                            <span className="font-bold text-lg text-blue-600">
                                {formatCurrency(calculatedTotal)}
                            </span>
                        </div>

                        <div className="border-t pt-4">
                            <div
                                className={`p-4 rounded-xl border ${
                                    difference === 0
                                        ? "bg-green-50 border-green-200"
                                        : difference > 0
                                          ? "bg-blue-50 border-blue-200"
                                          : "bg-red-50 border-red-200"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">
                                        Difference:
                                    </span>
                                    <span
                                        className={`text-lg font-bold ${
                                            difference === 0
                                                ? "text-green-600"
                                                : difference > 0
                                                  ? "text-blue-600"
                                                  : "text-red-600"
                                        }`}
                                    >
                                        {difference === 0
                                            ? "Perfect Match!"
                                            : difference > 0
                                              ? `+${formatCurrency(difference)}`
                                              : formatCurrency(difference)}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                    {difference === 0
                                        ? "Your records are accurate!"
                                        : difference > 0
                                          ? "You have more money than recorded"
                                          : "You have less money than recorded"}
                                </p>
                            </div>
                        </div>

                        {lastUpdated && (
                            <div className="text-right mt-1">
                                <span className="text-xs">
                                    Updated {formatLastUpdated(lastUpdated)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Fractions Input */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                    {isLoadingFractions ? (
                        <div className="grid grid-cols-3 gap-3">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                                <div key={i} className="animate-pulse">
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <div className="h-6 bg-gray-200 rounded w-16 mb-2"></div>
                                        <div className="h-8 bg-gray-200 rounded w-full"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-3">
                            {fractions.map((fraction, index) => (
                                <div
                                    key={fraction.id || index}
                                    className="p-3 bg-gray-50 rounded-lg"
                                >
                                    <div className="flex flex-col items-center space-y-2">
                                        <div className="w-16 h-6 bg-green-100 rounded flex items-center justify-center">
                                            <span className="text-green-700 font-bold text-xs">
                                                {fraction.fraction.toLocaleString(
                                                    "id-ID"
                                                )}
                                            </span>
                                        </div>
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            value={fraction.count}
                                            onChange={(e) =>
                                                handleCountChange(
                                                    index,
                                                    e.target.value
                                                )
                                            }
                                            placeholder="0"
                                            className="w-full p-1 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Update Button */}
                <Button
                    onClick={handleUpdate}
                    disabled={isLoadingFractions}
                    loading={loading}
                    variant="primary"
                    size="md"
                >
                    Update Wallet
                </Button>

                {/* Results */}
                {result && (
                    <div
                        className={`rounded-2xl shadow-lg border p-6 ${
                            result.success
                                ? "bg-green-50 border-green-200"
                                : "bg-red-50 border-red-200"
                        }`}
                    >
                        <h3
                            className={`text-lg font-semibold mb-2 ${
                                result.success
                                    ? "text-green-800"
                                    : "text-red-800"
                            }`}
                        >
                            {result.success
                                ? "✅ Updated Successfully!"
                                : "❌ Error"}
                        </h3>
                        {result.success && (
                            <div className="space-y-2">
                                <p className="text-sm text-green-700">
                                    Total calculated:{" "}
                                    {formatCurrency(result.calculatedTotal)}
                                </p>
                                <p className="text-sm text-green-700">
                                    Difference:{" "}
                                    {result.difference > 0 ? "+" : ""}
                                    {formatCurrency(result.difference)}
                                </p>
                            </div>
                        )}
                        {!result.success && (
                            <p className="text-sm text-red-700">
                                {result.error}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
