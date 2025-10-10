"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTransactions, useBudgets } from "@/utils/hooks";
import { months } from "@/utils/constants";
import { getDefaultSheetName } from "@/utils/google";
import { processBudgetData } from "@/app/budgets/utils";
import { useWeekSelection } from "./hooks/useWeekSelection";
import { useWeeklyBudgetData } from "./hooks/useWeeklyBudgetData";
import { 
    WeeklyBudgetHeader, 
    OverallProgressCard, 
    CategoryBudgetCard, 
    LoadingSkeleton 
} from "./components";

export default function WeeklyBudget() {
    const router = useRouter();
    const [selectedMonth, setSelectedMonth] = useState(getDefaultSheetName(months));
    const { data: budgetRawData, isLoading: budgetLoading } =
        useBudgets(selectedMonth);
    const { data: transactionData, isLoading: transactionLoading } =
        useTransactions(selectedMonth);

    // Use custom hooks for week selection and budget data
    const { selectedWeek, setSelectedWeek, weeksInMonth, currentWeek } = 
        useWeekSelection(selectedMonth);

    // Process budget data
    const budgetData = useMemo(() => {
        if (!budgetRawData) return null;
        return processBudgetData(budgetRawData, selectedMonth);
    }, [budgetRawData, selectedMonth]);

    // Calculate weekly budget data
    const {
        weeklyData,
        totalWeeklyBudget,
        totalWeekSpending,
        totalRemaining,
        totalPercentage,
        totalColors,
        selectedWeekInfo,
    } = useWeeklyBudgetData(
        budgetData,
        transactionData,
        selectedWeek,
        selectedMonth,
        weeksInMonth
    );

    // Function to navigate to transactions with category and week filter
    const navigateToTransactionsWithFilter = (categoryName) => {
        const encodedCategory = encodeURIComponent(categoryName);
        const weekRange = `${selectedWeekInfo.startDate.toISOString().split("T")[0]}|${selectedWeekInfo.endDate.toISOString().split("T")[0]}`;
        const encodedWeek = encodeURIComponent(weekRange);
        router.push(
            `/transactions?category=${encodedCategory}&week=${encodedWeek}`
        );
    };

    if (budgetLoading || transactionLoading) {
        return <LoadingSkeleton />;
    }

    // Show empty state if no data
    if (!budgetData || !transactionData) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
                <div className="p-4">
                    <div className="text-center py-8">
                        <div className="text-gray-500">
                            No budget data available
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
            {/* Header */}
            <WeeklyBudgetHeader
                currentWeek={currentWeek}
                selectedWeek={selectedWeek}
                setSelectedWeek={setSelectedWeek}
                weeksInMonth={weeksInMonth}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                availableMonths={months}
            />

            {/* Content */}
            <div className="px-3 pb-24 mt-6 space-y-4">
                {/* Overall Progress */}
                <OverallProgressCard
                    totalWeekSpending={totalWeekSpending}
                    totalWeeklyBudget={totalWeeklyBudget}
                    totalRemaining={totalRemaining}
                    totalPercentage={totalPercentage}
                    totalColors={totalColors}
                />

                {/* Category Cards */}
                <div className="space-y-3">
                    {weeklyData.map((category) => (
                        <CategoryBudgetCard
                            key={category.key}
                            category={category}
                            onCategoryClick={navigateToTransactionsWithFilter}
                        />
                    ))}
                </div>
            </div>
        </main>
    );
}
