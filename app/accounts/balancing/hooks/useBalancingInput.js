import { useState, useEffect } from 'react';
import { useBalancingHistory } from './useBalancingHistory';
import { calculateCursorPosition } from '../utils/cursorPositioning';
import { formatBankAccountValue, formatNonBankValue } from '../utils/inputFormatting';
import { validateBankInput, validateNonBankInput, parseInputValue } from '../utils/inputValidation';

/**
 * Custom hook for managing balancing input with cursor positioning and formatting
 * @param {string} accountName - Name of the account
 * @param {number} currentBalancing - Current balancing value
 * @returns {object} Input state and handlers
 */
export function useBalancingInput(accountName, currentBalancing) {
    const [realBalance, setRealBalance] = useState("");
    const [displayValue, setDisplayValue] = useState("");
    const [cursorPosition, setCursorPosition] = useState(0);
    const [isTyping, setIsTyping] = useState(false);
    const [isReplacingAtStart, setIsReplacingAtStart] = useState(false);
    
    const { saveToHistory, handleUndo, handleRedo } = useBalancingHistory();
    const isBankAccount = accountName === "Mandiri" || accountName === "BCA";

    // Initialize display value with existing reality balance
    useEffect(() => {
        if (currentBalancing > 0 && !realBalance) {
            if (isBankAccount) {
                // For bank accounts, format with decimal places
                const displayVal = currentBalancing.toLocaleString("id-ID", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });
                setDisplayValue(displayVal);
                setRealBalance(currentBalancing.toString());
                
                // Initialize history with initial state
                saveToHistory(currentBalancing.toString(), displayVal, displayVal.length);
            } else {
                // For non-bank accounts, integer only
                const displayVal = Math.round(currentBalancing).toLocaleString("id-ID");
                setDisplayValue(displayVal);
                setRealBalance(Math.round(currentBalancing).toString());
                
                // Initialize history with initial state
                saveToHistory(Math.round(currentBalancing).toString(), displayVal, displayVal.length);
            }
        }
    }, [currentBalancing, accountName, realBalance, isBankAccount, saveToHistory]);

    // Set cursor position after display value changes
    useEffect(() => {
        const input = document.querySelector('input[type="tel"]');
        if (input && cursorPosition !== null && cursorPosition >= 0) {
            // Use requestAnimationFrame for better timing
            requestAnimationFrame(() => {
                try {
                    input.setSelectionRange(cursorPosition, cursorPosition);
                } catch (error) {
                    // Fallback: set cursor to end if position is invalid
                    input.setSelectionRange(input.value.length, input.value.length);
                }
            });
        }
    }, [displayValue, cursorPosition]);

    // Handle paste events
    const handlePaste = (e) => {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const input = e.target;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        
        // Insert pasted text at cursor position
        const newValue = displayValue.substring(0, start) + pastedText + displayValue.substring(end);
        
        // Create a synthetic event to process the new value
        const syntheticEvent = {
            target: {
                value: newValue,
                selectionStart: start + pastedText.length,
                selectionEnd: start + pastedText.length
            }
        };
        
        setIsTyping(true);
        handleInputChange(syntheticEvent);
    };

    // Handle copy events
    const handleCopy = (e) => {
        // Let the default copy behavior work
        return;
    };

    // Handle cut events
    const handleCut = (e) => {
        // Let the default cut behavior work
        return;
    };

    // Handle key events for better control
    const handleKeyDown = (e) => {
        // Allow navigation keys
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab'].includes(e.key)) {
            return;
        }
        
        // Handle undo/redo shortcuts
        if (e.metaKey || e.ctrlKey) {
            if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                const prevState = handleUndo();
                if (prevState) {
                    setRealBalance(prevState.realBalance);
                    setDisplayValue(prevState.displayValue);
                    setCursorPosition(prevState.cursorPosition);
                }
                return;
            }
            if ((e.key.toLowerCase() === 'z' && e.shiftKey) || (e.key.toLowerCase() === 'y')) {
                e.preventDefault();
                const nextState = handleRedo();
                if (nextState) {
                    setRealBalance(nextState.realBalance);
                    setDisplayValue(nextState.displayValue);
                    setCursorPosition(nextState.cursorPosition);
                }
                return;
            }
        }
        
        // Allow other shortcuts (Cmd/Ctrl + A, C, V, X)
        if (e.metaKey || e.ctrlKey) {
            if (['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
                return; // Allow these shortcuts
            }
        }
        
        // Handle backspace and delete
        if (['Backspace', 'Delete'].includes(e.key)) {
            setIsTyping(false);
            const input = e.target;
            const start = input.selectionStart;
            const end = input.selectionEnd;
            
            // Check if we're deleting from the start
            if (start === 0 || (start === 1 && input.value[0] === '1')) {
                setIsReplacingAtStart(true);
            }
            
            if (start === end) {
                // Single cursor position
                if (e.key === 'Backspace' && start > 0) {
                    // Don't prevent default, let the normal flow handle it
                    return;
                } else if (e.key === 'Delete' && start < input.value.length) {
                    // Don't prevent default, let the normal flow handle it
                    return;
                }
            } else {
                // Text selected - allow deletion
                return;
            }
        }
        
        // Allow decimal separators for bank accounts
        if (isBankAccount) {
            if (['.', ','].includes(e.key)) {
                setIsTyping(true);
                return;
            }
        }
        
        // Allow digits
        if (/\d/.test(e.key)) {
            setIsTyping(true);
            return;
        }
        
        // Block other characters
        e.preventDefault();
    };

    // Handle input formatting
    const handleInputChange = (e) => {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart;
        const oldDisplayValue = displayValue;

        if (isBankAccount) {
            // For bank accounts, allow decimal input
            const cleanValue = value.replace(/[^\d.,]/g, "");

            if (cleanValue === "") {
                setRealBalance("");
                setDisplayValue("");
                setCursorPosition(0);
                return;
            }

            // Parse the input to determine if it's decimal
            const { normalizedValue, isDecimal } = parseInputValue(cleanValue);

            if (normalizedValue === null) {
                // Invalid - too many decimal places
                return;
            }

            // Validate the normalized value
            if (validateBankInput(normalizedValue, isDecimal)) {
                setRealBalance(normalizedValue);

                // Format display value
                const displayVal = formatBankAccountValue(normalizedValue, isDecimal);
                setDisplayValue(displayVal);
                
                // Calculate proper cursor position
                const newCursorPos = calculateCursorPosition(oldDisplayValue, displayVal, cursorPos, isTyping, isReplacingAtStart);
                setCursorPosition(newCursorPos);
                
                // Save to history
                saveToHistory(normalizedValue, displayVal, newCursorPos);
                
                // Reset typing state after processing
                setIsTyping(false);
                setIsReplacingAtStart(false);
            } else {
                // If invalid, revert to previous state
                setDisplayValue(oldDisplayValue);
                setIsTyping(false);
            }
        } else {
            // For non-bank accounts, integer only
            const numericValue = value.replace(/[^\d]/g, "");

            if (numericValue === "") {
                setRealBalance("");
                setDisplayValue("");
                setCursorPosition(0);
            } else {
                const number = Number(numericValue);
                
                if (validateNonBankInput(number)) {
                    const displayVal = formatNonBankValue(number);
                    setRealBalance(number.toString());
                    setDisplayValue(displayVal);
                    
                    // Calculate proper cursor position
                    const newCursorPos = calculateCursorPosition(oldDisplayValue, displayVal, cursorPos, isTyping, isReplacingAtStart);
                    setCursorPosition(newCursorPos);
                    
                    // Save to history
                    saveToHistory(number.toString(), displayVal, newCursorPos);
                    
                    // Reset typing state after processing
                    setIsTyping(false);
                    setIsReplacingAtStart(false);
                }
            }
        }
    };

    const inputHandlers = {
        onChange: handleInputChange,
        onKeyDown: handleKeyDown,
        onPaste: handlePaste,
        onCopy: handleCopy,
        onCut: handleCut
    };

    return {
        realBalance,
        displayValue,
        inputHandlers,
        cursorPosition
    };
}
