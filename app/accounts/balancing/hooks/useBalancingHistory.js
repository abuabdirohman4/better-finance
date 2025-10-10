import { useState } from 'react';

/**
 * Custom hook for managing undo/redo history in balancing input
 * @returns {object} History management functions and state
 */
export function useBalancingHistory() {
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    /**
     * Save state to history
     * @param {string} realBalanceValue - Real balance value
     * @param {string} displayValueValue - Display formatted value
     * @param {number} cursorPos - Cursor position
     */
    const saveToHistory = (realBalanceValue, displayValueValue, cursorPos) => {
        const newState = {
            realBalance: realBalanceValue,
            displayValue: displayValueValue,
            cursorPosition: cursorPos,
            timestamp: Date.now()
        };

        setHistory(prevHistory => {
            // Remove any states after current index
            const newHistory = prevHistory.slice(0, historyIndex + 1);
            
            // Add new state
            newHistory.push(newState);
            
            // Limit history to 50 states
            if (newHistory.length > 50) {
                newHistory.shift();
            }
            
            return newHistory;
        });
        
        setHistoryIndex(prevIndex => Math.min(prevIndex + 1, 49));
    };

    /**
     * Undo to previous state
     * @returns {object|null} Previous state or null if no undo available
     */
    const handleUndo = () => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            setHistoryIndex(prevIndex => prevIndex - 1);
            return prevState;
        }
        return null;
    };

    /**
     * Redo to next state
     * @returns {object|null} Next state or null if no redo available
     */
    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            setHistoryIndex(prevIndex => prevIndex + 1);
            return nextState;
        }
        return null;
    };

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    return {
        saveToHistory,
        handleUndo,
        handleRedo,
        canUndo,
        canRedo
    };
}
