import { calculateWeekSpending } from "./spendingCalculations";

/**
 * Calculate weekly budget with monthly pool strategy (Cascade Budget Algorithm)
 * 
 * This function implements a sophisticated budget allocation system where:
 * 1. Monthly budget is distributed across all weeks based on actual days
 * 2. Previous weeks' overspending reduces current week's budget (penalty)
 * 3. Previous weeks' underspending increases current week's budget (bonus)
 * 4. Penalties and bonuses are distributed proportionally across remaining weeks
 * 
 * @param {number} monthlyBudget - Total monthly budget for the category
 * @param {Array} allWeeksInfo - Array of week info objects for all weeks in month
 * @param {number} currentWeek - Current week number (1-based)
 * @param {Array} transactions - Array of all transactions
 * @param {string} category - Category key to calculate for
 * @returns {number} Calculated weekly budget for current week
 */
export function calculateWeeklyBudgetWithPool(
    monthlyBudget,
    allWeeksInfo,
    currentWeek,
    transactions,
    category
) {
    if (!monthlyBudget || !allWeeksInfo || !transactions) {
        return 0;
    }

    const monthlyBudgetAmount = Math.abs(monthlyBudget);

    // Calculate total days in all weeks
    const totalDays = allWeeksInfo.reduce((total, weekInfo) => {
        const timeDiff =
            weekInfo.endDate.getTime() - weekInfo.startDate.getTime();
        const daysInWeek = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;
        return total + daysInWeek;
    }, 0);

    // Calculate initial budget per day
    const initialBudgetPerDay = monthlyBudgetAmount / totalDays;

    // Calculate original budget for each week based on actual days
    const originalWeeklyBudgets = allWeeksInfo.map((weekInfo) => {
        const timeDiff =
            weekInfo.endDate.getTime() - weekInfo.startDate.getTime();
        const daysInWeek = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;
        return initialBudgetPerDay * daysInWeek;
    });

    // If no transactions, return original budget for the week
    if (
        !transactions ||
        !Array.isArray(transactions) ||
        transactions.length === 0
    ) {
        return originalWeeklyBudgets[currentWeek - 1] || 0;
    }

    const originalWeekBudget = originalWeeklyBudgets[currentWeek - 1] || 0;

    if (currentWeek === 1) {
        return originalWeekBudget;
    }

    const overBudgets = [];
    const underBudgets = [];

    // Calculate penalties and bonuses for each previous week
    for (let i = 0; i < currentWeek; i++) {
        const weekOriginalBudget = originalWeeklyBudgets[i] || 0;
        const weekSpending = calculateWeekSpending(
            transactions,
            category,
            allWeeksInfo[i]
        );

        let weekPenalty = 0;
        let weekBonus = 0;

        // Calculate penalties from previous weeks' overspending
        for (let j = 0; j < i; j++) {
            if (overBudgets[j] > 0) {
                const remainingDaysFromOverBudgetWeek = allWeeksInfo
                    .slice(j + 1)
                    .reduce((total, weekInfo) => {
                        const timeDiff =
                            weekInfo.endDate.getTime() -
                            weekInfo.startDate.getTime();
                        const daysInWeek =
                            Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;
                        return total + daysInWeek;
                    }, 0);

                const penaltyPerDayForThisWeek =
                    remainingDaysFromOverBudgetWeek > 0
                        ? overBudgets[j] / remainingDaysFromOverBudgetWeek
                        : 0;

                const timeDiff =
                    allWeeksInfo[i].endDate.getTime() -
                    allWeeksInfo[i].startDate.getTime();
                const daysInWeek =
                    Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;

                const penaltyAmountFromThisWeek =
                    penaltyPerDayForThisWeek * daysInWeek;
                weekPenalty += penaltyAmountFromThisWeek;
            }
        }

        // Calculate bonuses from previous weeks' underspending
        for (let j = 0; j < i; j++) {
            if (underBudgets[j] > 0) {
                const remainingDaysFromUnderBudgetWeek = allWeeksInfo
                    .slice(j + 1)
                    .reduce((total, weekInfo) => {
                        const timeDiff =
                            weekInfo.endDate.getTime() -
                            weekInfo.startDate.getTime();
                        const daysInWeek =
                            Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;
                        return total + daysInWeek;
                    }, 0);

                const bonusPerDayForThisWeek =
                    remainingDaysFromUnderBudgetWeek > 0
                        ? underBudgets[j] / remainingDaysFromUnderBudgetWeek
                        : 0;

                const timeDiff =
                    allWeeksInfo[i].endDate.getTime() -
                    allWeeksInfo[i].startDate.getTime();
                const daysInWeek =
                    Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;

                const bonusAmountFromThisWeek =
                    bonusPerDayForThisWeek * daysInWeek;
                weekBonus += bonusAmountFromThisWeek;
            }
        }

        const weekAdjustedBudget = Math.max(
            0,
            weekOriginalBudget - weekPenalty + weekBonus
        );
        const weekOverBudget = Math.max(0, weekSpending - weekAdjustedBudget);
        const weekUnderBudget = Math.max(0, weekAdjustedBudget - weekSpending);

        overBudgets.push(weekOverBudget);
        underBudgets.push(weekUnderBudget);
    }

    // Calculate penalties and bonuses for current week
    let currentWeekPenalty = 0;
    let currentWeekBonus = 0;

    for (let i = 0; i < overBudgets.length - 1; i++) {
        if (overBudgets[i] > 0) {
            const remainingDaysFromOverBudgetWeek = allWeeksInfo
                .slice(i + 1)
                .reduce((total, weekInfo) => {
                    const timeDiff =
                        weekInfo.endDate.getTime() -
                        weekInfo.startDate.getTime();
                    const daysInWeek =
                        Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;
                    return total + daysInWeek;
                }, 0);

            const penaltyPerDayForThisWeek =
                remainingDaysFromOverBudgetWeek > 0
                    ? overBudgets[i] / remainingDaysFromOverBudgetWeek
                    : 0;

            const currentWeekInfo = allWeeksInfo[currentWeek - 1];
            const timeDiff =
                currentWeekInfo.endDate.getTime() -
                currentWeekInfo.startDate.getTime();
            const daysInCurrentWeek =
                Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;

            const penaltyAmountFromThisWeek =
                penaltyPerDayForThisWeek * daysInCurrentWeek;
            currentWeekPenalty += penaltyAmountFromThisWeek;
        }

        if (underBudgets[i] > 0) {
            const remainingDaysFromUnderBudgetWeek = allWeeksInfo
                .slice(i + 1)
                .reduce((total, weekInfo) => {
                    const timeDiff =
                        weekInfo.endDate.getTime() -
                        weekInfo.startDate.getTime();
                    const daysInWeek =
                        Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;
                    return total + daysInWeek;
                }, 0);

            const bonusPerDayForThisWeek =
                remainingDaysFromUnderBudgetWeek > 0
                    ? underBudgets[i] / remainingDaysFromUnderBudgetWeek
                    : 0;

            const currentWeekInfo = allWeeksInfo[currentWeek - 1];
            const timeDiff =
                currentWeekInfo.endDate.getTime() -
                currentWeekInfo.startDate.getTime();
            const daysInCurrentWeek =
                Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;

            const bonusAmountFromThisWeek =
                bonusPerDayForThisWeek * daysInCurrentWeek;
            currentWeekBonus += bonusAmountFromThisWeek;
        }
    }

    return Math.max(
        0,
        originalWeekBudget - currentWeekPenalty + currentWeekBonus
    );
}
