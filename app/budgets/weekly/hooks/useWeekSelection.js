import { useState, useEffect, useMemo } from "react";
import { months } from "@/utils/constants";
import { getCurrentWeek } from "@/utils/helper";
import { getWeeksInMonth } from "../utils/dateCalculations";

/**
 * Custom hook for managing week selection
 * Auto-selects current week on every refresh
 * @param {string} selectedMonth - Currently selected month
 * @returns {Object} Week selection state and utilities
 */
export function useWeekSelection(selectedMonth) {
    const [selectedWeek, setSelectedWeek] = useState(1);

    // Calculate weeks in selected month
    const weeksInMonth = useMemo(() => {
        return getWeeksInMonth(selectedMonth);
    }, [selectedMonth]);

    // Get current week number for the selected month
    const currentWeekNumber = useMemo(() => {
        const now = new Date();
        const currentMonthIndex = months.indexOf(selectedMonth);
        const currentYear = now.getFullYear();

        // If not viewing current month, default to week 1
        if (now.getMonth() !== currentMonthIndex) {
            return 1;
        }

        // Calculate which week of the month we're in
        const firstDayOfMonth = new Date(currentYear, currentMonthIndex, 1);
        const currentDay = now.getDate();

        // Find first Monday of the month
        const firstDayOfWeek = firstDayOfMonth.getDay();
        const daysToFirstMonday =
            firstDayOfWeek === 0 ? 1 :
            firstDayOfWeek === 1 ? 0 :
            8 - firstDayOfWeek;

        const firstMonday = new Date(firstDayOfMonth);
        firstMonday.setDate(firstDayOfMonth.getDate() + daysToFirstMonday);

        // If we're before the first Monday, we're in week 1
        if (now < firstMonday) {
            return 1;
        }

        // Calculate week number from first Monday
        const daysSinceFirstMonday = currentDay - firstMonday.getDate();
        const weekNumber = Math.floor(daysSinceFirstMonday / 7) + 2; // +2 because week 1 is before first Monday

        // Ensure week number doesn't exceed total weeks in month
        return Math.min(weekNumber, weeksInMonth);
    }, [selectedMonth, weeksInMonth]);

    // Get current week info for legacy compatibility
    const currentWeek = useMemo(() => {
        return getCurrentWeek(new Date());
    }, []);

    // Auto-select current week on component mount and when month changes
    useEffect(() => {
        // Auto-select current week when month changes or component loads
        if (currentWeekNumber > 0 && currentWeekNumber <= weeksInMonth) {
            setSelectedWeek(currentWeekNumber);
        } else {
            // If current week is not valid for this month, default to week 1
            setSelectedWeek(1);
        }
    }, [currentWeekNumber, weeksInMonth, selectedMonth]);

    return {
        selectedWeek,
        setSelectedWeek,
        weeksInMonth,
        currentWeek,
        currentWeekNumber,
    };
}
