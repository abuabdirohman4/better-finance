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

    let weekCount = 0;
    let currentWeekStart = new Date(firstMonday);

    while (currentWeekStart <= lastDayOfMonth) {
        weekCount++;
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    return Math.max(weekCount, 1);
}

/**
 * Get week information for a specific week in a month
 * @param {string} monthName - Name of the month
 * @param {number} weekNumber - Week number (1-based)
 * @returns {Object} Week information object
 */
export function getWeekInfo(monthName, weekNumber) {
    const currentYear = new Date().getFullYear();
    const monthIndex = months.indexOf(monthName);

    if (monthIndex === -1) {
        const now = new Date();
        return getCurrentWeek(now);
    }

    const firstDayOfMonth = new Date(currentYear, monthIndex, 1);
    const lastDayOfMonth = new Date(currentYear, monthIndex + 1, 0);

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

    const weekStartDate = new Date(firstMonday);
    weekStartDate.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);
    weekStartDate.setHours(0, 0, 0, 0);

    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    weekEndDate.setHours(23, 59, 59, 999);

    if (weekEndDate > lastDayOfMonth) {
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
