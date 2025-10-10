import { formatCurrency } from "@/utils/helper";

export default function CategoryBudgetCard({ category, onCategoryClick }) {
    return (
        <div
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
            onClick={() => onCategoryClick(category.key)}
            title={`View ${category.name} transactions`}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                    <div
                        className={`w-8 h-8 flex items-center justify-center text-white text-2xl`}
                    >
                        {category.icon}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">
                            {category.name}
                        </h3>
                        <div className="text-sm text-gray-500">
                            {formatCurrency(category.weekSpending)}{" "}
                            /{" "}
                            {formatCurrency(Math.abs(category.weeklyBudget))}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div
                        className={`text-lg font-bold ${category.colors.text}`}
                    >
                        {formatCurrency(category.remaining)}
                    </div>
                </div>
            </div>

            {/* Progress Bar with Percentage */}
            <div className="flex items-center space-x-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full transition-all duration-300 ${category.colors.progress}`}
                        style={{
                            width: `${Math.min(category.percentage, 100)}%`,
                        }}
                    ></div>
                </div>
                <div
                    className={`text-sm font-medium ${category.colors.text}`}
                >
                    {category.percentage.toFixed(0)}%
                </div>
            </div>
        </div>
    );
}
