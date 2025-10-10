import { formatCurrency } from "@/utils/helper";

export default function OverallProgressCard({ 
    totalWeekSpending, 
    totalWeeklyBudget, 
    totalRemaining, 
    totalPercentage, 
    totalColors 
}) {
    return (
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            {/* Header with Icon */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                    Overall Weekly Progress
                </h2>
                <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full flex items-center justify-center">
                    <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                    </svg>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="col-span-2">
                    <p className="text-sm text-gray-600 mb-1">
                        Spending / Budget
                    </p>
                    <p className="text-lg font-bold text-gray-700">
                        {formatCurrency(Math.abs(totalWeekSpending))} /{" "}
                        {formatCurrency(Math.abs(totalWeeklyBudget))}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">
                        Remaining
                    </p>
                    <p
                        className={`text-lg font-bold ${
                            totalRemaining >= 0
                                ? "text-gray-700"
                                : "text-red-600"
                        }`}
                    >
                        {formatCurrency(totalRemaining)}
                    </p>
                </div>
            </div>

            {/* Progress Bar with Percentage */}
            <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                        className={`h-3 rounded-full transition-all duration-200 ease-out ${totalColors.progress}`}
                        style={{
                            width: `${Math.min(totalPercentage, 100)}%`,
                        }}
                    ></div>
                </div>
                <span
                    className={`text-sm font-semibold ${totalColors.text}`}
                >
                    {totalPercentage.toFixed(0)}%
                </span>
            </div>
        </div>
    );
}
