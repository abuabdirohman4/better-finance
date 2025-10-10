import { getCashValue } from "@/utils/helper";

/**
 * Calculate spending for a specific category within a week
 * @param {Array} transactions - Array of transaction objects
 * @param {string} category - Category to filter by
 * @param {Object} currentWeek - Week information object with startDate and endDate
 * @returns {number} Total spending amount for the category in the week
 */
export function calculateWeekSpending(transactions, category, currentWeek) {
    if (!transactions || !Array.isArray(transactions)) {
        return 0;
    }

    // Validate currentWeek object
    if (!currentWeek || !currentWeek.startDate || !currentWeek.endDate) {
        console.warn('Invalid currentWeek object:', currentWeek);
        return 0;
    }

    const filteredTransactions = transactions.filter((transaction) => {
        if (transaction.Transaction !== "Spending") return false;
        if (
            transaction["Category or Account"].toLowerCase() !==
            category.toLowerCase()
        )
            return false;

        let transactionDate;
        if (transaction.Date.includes("/")) {
            const [day, month, year] = transaction.Date.split("/");
            transactionDate = new Date(year, month - 1, day);
        } else {
            transactionDate = new Date(transaction.Date);
        }

        const weekStart = new Date(currentWeek.startDate);
        const weekEnd = new Date(currentWeek.endDate);

        return transactionDate >= weekStart && transactionDate <= weekEnd;
    });

    return filteredTransactions.reduce((total, transaction) => {
        const amount = Math.abs(getCashValue(transaction));
        return total + amount;
    }, 0);
}
