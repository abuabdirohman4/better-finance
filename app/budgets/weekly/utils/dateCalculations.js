import { months } from "@/utils/constants";
import { getCurrentWeek } from "@/utils/helper";

/**
 * Calculate the number of weeks in a given month
 * @param {string} monthName - Name of the month
 * @returns {number} Number of weeks in the month
 */
export function getWeeksInMonth(monthName) {
    const currentYear = new Date().getFullYear();
    const monthIndex = months.indexOf(monthName);

    if (monthIndex === -1) return 4;

    const firstDayOfMonth = new Date(currentYear, monthIndex, 1);
    const lastDayOfMonth = new Date(currentYear, monthIndex + 1, 0);

    // Calculate total days in the month
    const totalDays = lastDayOfMonth.getDate();
    
    // Calculate weeks based on total days, ensuring we cover all days
    // Each week has 7 days, so we need to account for partial weeks
    const weeks = Math.ceil(totalDays / 7);
    
    // Ensure minimum 4 weeks and maximum 6 weeks for budgeting purposes
    return Math.max(4, Math.min(6, weeks));
}

/**
 * Get week information for a specific week in a month
 * @param {string} monthName - Name of the month
 * @param {number} weekNumber - Week number (1-based)
 * @returns {Object} Week information object
 */
export function getWeekInfo(monthName, weekNumber) {
    // Validate inputs
    if (!monthName || !weekNumber || weekNumber < 1) {
        console.warn('Invalid inputs to getWeekInfo:', { monthName, weekNumber });
        return null;
    }

    const currentYear = new Date().getFullYear();
    const monthIndex = months.indexOf(monthName);

    if (monthIndex === -1) {
        console.warn('Invalid month name:', monthName);
        const now = new Date();
        return getCurrentWeek(now);
    }

    const firstDayOfMonth = new Date(currentYear, monthIndex, 1);
    const lastDayOfMonth = new Date(currentYear, monthIndex + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    // Week 1 starts from beginning of PREVIOUS month to capture all prior transactions
    if (weekNumber === 1) {
        // Start from the first day of the previous month
        const weekStartDate = new Date(currentYear, monthIndex - 1, 1);
        weekStartDate.setHours(0, 0, 0, 0);
        
        // Find the end of the first week (Sunday)
        const firstDayOfWeek = firstDayOfMonth.getDay(); // 0=Sunday, 1=Monday, etc.
        const daysToSunday = firstDayOfWeek === 0 ? 0 : 7 - firstDayOfWeek;
        
        const weekEndDate = new Date(firstDayOfMonth);
        weekEndDate.setDate(firstDayOfMonth.getDate() + daysToSunday);
        weekEndDate.setHours(23, 59, 59, 999);
        
        return {
            week: weekNumber,
            month: monthName,
            year: currentYear,
            startDate: weekStartDate,
            endDate: weekEndDate,
        };
    }

    // For other weeks, start from Monday
    const firstMonday = new Date(firstDayOfMonth);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    
    const daysToFirstMonday =
        firstDayOfWeek === 0
            ? 1
            : firstDayOfWeek === 1
              ? 0
              : 8 - firstDayOfWeek;
    
    if (daysToFirstMonday > 0) {
        firstMonday.setDate(firstDayOfMonth.getDate() + daysToFirstMonday);
    }

    if (firstMonday.getMonth() !== monthIndex) {
        firstMonday.setTime(firstDayOfMonth.getTime());
    }

    // Calculate start date for this week (Monday)
    const weekStartDate = new Date(firstMonday);
    weekStartDate.setDate(firstMonday.getDate() + (weekNumber - 2) * 7);
    weekStartDate.setHours(0, 0, 0, 0);

    // Calculate end date for this week (Sunday)
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    weekEndDate.setHours(23, 59, 59, 999);

    // For the last week, extend to end of NEXT month to capture all future transactions
    const weeksInMonth = getWeeksInMonth(monthName);
    if (weekNumber === weeksInMonth) {
        const lastDayOfNextMonth = new Date(currentYear, monthIndex + 2, 0);
        weekEndDate.setTime(lastDayOfNextMonth.getTime());
        weekEndDate.setHours(23, 59, 59, 999);
    } else if (weekEndDate > lastDayOfMonth) {
        // For other weeks, don't exceed the last day of the month
        weekEndDate.setTime(lastDayOfMonth.getTime());
        weekEndDate.setHours(23, 59, 59, 999);
    }

    return {
        week: weekNumber,
        month: monthName,
        year: currentYear,
        startDate: weekStartDate,
        endDate: weekEndDate,
    };
}
