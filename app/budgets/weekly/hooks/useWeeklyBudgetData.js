import { useMemo } from "react";
import { getBudgetColors } from "@/utils/helper";
import { EATING_CATEGORIES } from "../constants";
import { getWeekInfo } from "../utils/dateCalculations";
import { calculateWeekSpending } from "../utils/spendingCalculations";
import { calculateWeeklyBudgetWithPool } from "../utils/budgetCalculations";

/**
 * Custom hook for calculating weekly budget data
 * @param {Object} budgetData - Processed budget data
 * @param {Array} transactionData - Array of transactions
 * @param {number} selectedWeek - Currently selected week
 * @param {string} selectedMonth - Currently selected month
 * @param {number} weeksInMonth - Total weeks in the month
 * @returns {Object} Weekly budget calculations and totals
 */
export function useWeeklyBudgetData(
    budgetData,
    transactionData,
    selectedWeek,
    selectedMonth,
    weeksInMonth
) {
    // Get week info for selected week
    const selectedWeekInfo = useMemo(() => {
        if (!selectedMonth || !selectedWeek || !weeksInMonth) {
            return null;
        }
        
        const weekInfo = getWeekInfo(selectedMonth, selectedWeek);
        
        // Validate weekInfo object
        if (!weekInfo || !weekInfo.startDate || !weekInfo.endDate) {
            console.warn('Invalid weekInfo returned from getWeekInfo:', { selectedMonth, selectedWeek, weekInfo });
            return null;
        }
        
        return weekInfo;
    }, [selectedMonth, selectedWeek, weeksInMonth]);

    // Calculate weekly budgets and spending
    const weeklyData = useMemo(() => {
        if (
            !budgetData ||
            !budgetData.spending ||
            !transactionData ||
            !Array.isArray(transactionData) ||
            !selectedWeekInfo
        ) {
            return [];
        }

        // Calculate all weeks in the month for budget distribution
        const allWeeksInfo = Array.from({ length: weeksInMonth }, (_, i) => {
            const weekInfo = getWeekInfo(selectedMonth, i + 1);
            // Filter out invalid week info
            return weekInfo && weekInfo.startDate && weekInfo.endDate ? weekInfo : null;
        }).filter(Boolean); // Remove null entries

        return EATING_CATEGORIES.map((category) => {
            // Find budget for this category in spending data
            const budget = budgetData.spending[category.key];
            const monthlyBudget = budget ? budget.budget : 0;

            // Calculate dynamic weekly budget with monthly pool strategy
            const weeklyBudget = calculateWeeklyBudgetWithPool(
                monthlyBudget,
                allWeeksInfo,
                selectedWeek,
                transactionData,
                category.key
            );

            // Calculate spending for this week
            const weekSpending = calculateWeekSpending(
                transactionData,
                category.key,
                selectedWeekInfo
            );

            const remaining = Math.abs(weeklyBudget) - weekSpending;
            const percentage =
                Math.abs(weeklyBudget) > 0
                    ? (weekSpending / Math.abs(weeklyBudget)) * 100
                    : 0;

            const colors = getBudgetColors(percentage);

            return {
                ...category,
                monthlyBudget,
                weeklyBudget,
                weekSpending,
                remaining,
                percentage,
                colors,
            };
        });
    }, [
        budgetData,
        transactionData,
        selectedWeekInfo,
        selectedWeek,
        weeksInMonth,
        selectedMonth,
    ]);

    // Calculate totals
    const totalWeeklyBudget = weeklyData.reduce(
        (sum, item) => sum + Math.abs(item.weeklyBudget),
        0
    );
    const totalWeekSpending = weeklyData.reduce(
        (sum, item) => sum + item.weekSpending,
        0
    );
    const totalRemaining = totalWeeklyBudget - totalWeekSpending;
    const totalPercentage =
        totalWeeklyBudget > 0
            ? (totalWeekSpending / totalWeeklyBudget) * 100
            : 0;
    const totalColors = getBudgetColors(totalPercentage);

    return {
        weeklyData,
        totalWeeklyBudget,
        totalWeekSpending,
        totalRemaining,
        totalPercentage,
        totalColors,
        selectedWeekInfo,
    };
}
