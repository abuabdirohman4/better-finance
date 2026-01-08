import { useState, useEffect, useMemo } from "react";
import { months } from "@/utils/constants";
import { getCurrentWeek } from "@/utils/helper";
import { getWeeksInMonth } from "../utils/dateCalculations";
import Cookies from "js-cookie";

/**
 * Custom hook for managing week selection with cookie persistence
 * @param {string} selectedMonth - Currently selected month
 * @returns {Object} Week selection state and utilities
 */
export function useWeekSelection(selectedMonth) {
    const [selectedWeek, setSelectedWeek] = useState(1);
    
    // Get current week info
    const currentDate = useMemo(() => new Date(), []);
    const currentWeek = getCurrentWeek(currentDate);

    // Calculate weeks in selected month
    const weeksInMonth = useMemo(() => {
        return getWeeksInMonth(selectedMonth);
    }, [selectedMonth]);

    // Get current week number for the selected month
    const currentWeekNumber = useMemo(() => {
        // Check if current date is in the selected month
        const currentMonthIndex = months.indexOf(selectedMonth);
        if (currentDate.getMonth() !== currentMonthIndex) {
            return 1; // If not in the selected month, default to week 1
        }

        // Use existing getCurrentWeek function
        const currentWeekInfo = getCurrentWeek(currentDate);
        return currentWeekInfo.week;
    }, [selectedMonth, currentDate]);

    // Validate and adjust selectedWeek when month changes
    useEffect(() => {
        // If current selectedWeek exceeds weeksInMonth, reset to last valid week
        if (selectedWeek > weeksInMonth) {
            setSelectedWeek(weeksInMonth > 0 ? weeksInMonth : 1);
        }
    }, [selectedWeek, weeksInMonth]);

    // Load selected week from cookies when component loads
    // useEffect(() => {
    //     const savedWeek = Cookies.get("weekly-budget-selected-week");
    //     if (savedWeek) {
    //         try {
    //             const parsedWeek = parseInt(savedWeek);
    //             if (parsedWeek > 0 && parsedWeek <= weeksInMonth) {
    //                 setSelectedWeek(parsedWeek);
    //                 return; // Don't auto-select current week if we have saved week
    //             }
    //         } catch (error) {
    //             console.error("Error parsing saved week from cookies:", error);
    //         }
    //     }

    //     // Auto-select current week when month changes or component loads (fallback)
    //     if (currentWeekNumber > 0 && currentWeekNumber <= weeksInMonth) {
    //         setSelectedWeek(currentWeekNumber);
    //     } else {
    //         // If current week is not valid for this month, default to week 1
    //         setSelectedWeek(1);
    //     }
    // }, [currentWeekNumber, weeksInMonth, selectedMonth]);

    // Save selected week to cookies when it changes
    useEffect(() => {
        Cookies.set("weekly-budget-selected-week", selectedWeek.toString(), {
            expires: 365,
            sameSite: "strict",
        });
    }, [selectedWeek]);

    return {
        selectedWeek,
        setSelectedWeek,
        weeksInMonth,
        currentWeek,
        currentWeekNumber,
    };
}
