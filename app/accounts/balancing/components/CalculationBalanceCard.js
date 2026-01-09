import { formatCurrency, formatLastUpdated } from "@/utils/helper";

/**
 * Calculation balance card component
 * @param {object} props - Component props
 * @param {boolean} props.isLoading - Loading state
 * @param {string} props.accountName - Name of the account
 * @param {number} props.currentBalance - Current balance
 * @param {number} props.currentBalancing - Current balancing value
 * @param {number} props.systemDifference - Calculated difference
 * @param {string} props.lastUpdated - ISO timestamp of last update
 */
export default function CalculationBalanceCard({
    isLoading,
    accountName,
    currentBalance,
    currentBalancing,
    systemDifference,
    lastUpdated
}) {
    const isBankAccount = accountName === "Mandiri" || accountName === "BCA";
    console.log("lastUpdated", lastUpdated);
    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Calculation Balance
            </h2>
            {isLoading ? (
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Current Balance:</span>
                        <span className="font-bold text-lg text-gray-900">
                            {isBankAccount
                                ? formatCurrency(currentBalance, "superscript")
                                : formatCurrency(currentBalance)}
                        </span>
                    </div>

                    {/* Last Reality Check */}
                    {currentBalancing > 0 ? (
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">
                                Reality Balance:
                            </span>
                            <span className="font-bold text-lg text-blue-600">
                                {isBankAccount
                                    ? formatCurrency(currentBalancing, "superscript")
                                    : formatCurrency(currentBalancing)}
                            </span>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">
                                Reality Balance:
                            </span>
                            <span className="text-sm text-gray-400 italic">
                                Not yet recorded
                            </span>
                        </div>
                    )}

                    {/* Dynamic Difference Display - Only show if there's reality balance data */}
                    {currentBalancing > 0 && (
                        <div className="border-t pt-4">
                            <div
                                className={`p-4 rounded-xl border ${
                                    systemDifference === 0
                                        ? "bg-green-50 border-green-200"
                                        : systemDifference > 0
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
                                            systemDifference === 0
                                                ? "text-green-600"
                                                : systemDifference > 0
                                                  ? "text-blue-600"
                                                  : "text-red-600"
                                        }`}
                                    >
                                        {systemDifference === 0
                                            ? "Perfect Match!"
                                            : systemDifference > 0
                                              ? `+${formatCurrency(systemDifference)}`
                                              : formatCurrency(
                                                    systemDifference
                                                )}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                    {systemDifference === 0
                                        ? "Your records are accurate!"
                                        : systemDifference > 0
                                          ? "You have more money than recorded"
                                          : "You have less money than recorded"}
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {lastUpdated && (
                        <div className="text-right mt-1">
                            <span className="text-xs">
                                Updated {formatLastUpdated(lastUpdated)}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
