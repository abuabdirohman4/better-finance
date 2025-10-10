/**
 * Calculate cursor position after input formatting
 * @param {string} oldValue - Previous formatted value
 * @param {string} newValue - New formatted value
 * @param {number} oldCursorPos - Previous cursor position
 * @param {boolean} isTyping - Whether user is typing (adding characters)
 * @param {boolean} isReplacingAtStart - Whether replacing at the start
 * @returns {number} New cursor position
 */
export function calculateCursorPosition(oldValue, newValue, oldCursorPos, isTyping, isReplacingAtStart) {
    // If values are the same, keep cursor position
    if (oldValue === newValue) {
        return Math.min(oldCursorPos, newValue.length);
    }
    
    // Extract numeric values for comparison
    const oldNumeric = oldValue.replace(/[^\d]/g, '');
    const newNumeric = newValue.replace(/[^\d]/g, '');
    
    // If we're typing (adding characters), be smarter about cursor positioning
    if (isTyping || newNumeric.length > oldNumeric.length) {
        // Special case: if we're replacing at the start
        if (isReplacingAtStart && oldCursorPos === 0) {
            // Count how many digits we just typed
            const typedDigits = newNumeric.length - oldNumeric.length;
            if (typedDigits > 0) {
                // Simple approach: find the position after the first typed digit
                let newCursorPos = 0;
                let digitCount = 0;
                
                for (let i = 0; i < newValue.length; i++) {
                    if (/\d/.test(newValue[i])) {
                        digitCount++;
                        if (digitCount === 1) { // After the first digit
                            newCursorPos = i + 1;
                            break;
                        }
                    }
                }
                
                return Math.min(Math.max(newCursorPos, 0), newValue.length);
            }
        }
        
        // If we're typing at the end, put cursor at the end
        if (oldCursorPos >= oldValue.length - 1) {
            return newValue.length;
        }
        
        // If we're typing in the middle, try to maintain relative position
        const digitsBeforeCursor = oldValue.substring(0, oldCursorPos).replace(/[^\d]/g, '').length;
        
        // Find position in new value where we have the same number of digits
        let newCursorPos = 0;
        let digitCount = 0;
        
        for (let i = 0; i < newValue.length; i++) {
            if (/\d/.test(newValue[i])) {
                digitCount++;
                if (digitCount === digitsBeforeCursor + 1) { // +1 because we added a digit
                    newCursorPos = i + 1;
                    break;
                }
            }
        }
        
        // If we couldn't find the exact position, try relative position
        if (newCursorPos === 0) {
            const relativePos = oldCursorPos / oldValue.length;
            newCursorPos = Math.round(relativePos * newValue.length);
        }
        
        return Math.min(Math.max(newCursorPos, 0), newValue.length);
    }
    
    // If we're deleting, we need to be smarter about cursor positioning
    if (newNumeric.length < oldNumeric.length) {
        // Count digits before cursor in old value
        const digitsBeforeCursor = oldValue.substring(0, oldCursorPos).replace(/[^\d]/g, '').length;
        
        // Special case: if we're deleting from the end, put cursor at the end
        if (oldCursorPos >= oldValue.length - 1) {
            return newValue.length;
        }
        
        // Special case: if cursor is at position 0, keep it at position 0
        if (oldCursorPos === 0) {
            return 0;
        }
        
        // Find position in new value where we have the same number of digits
        let newCursorPos = 0;
        let digitCount = 0;
        
        for (let i = 0; i < newValue.length; i++) {
            if (/\d/.test(newValue[i])) {
                digitCount++;
                if (digitCount === digitsBeforeCursor) {
                    newCursorPos = i + 1;
                    break;
                }
            }
        }
        
        // If we couldn't find the exact position, try to maintain relative position
        if (newCursorPos === 0) {
            // Special handling for cursor at the beginning
            if (digitsBeforeCursor === 0) {
                return 0;
            }
            
            // Calculate relative position based on digit count
            const relativeDigitPos = digitsBeforeCursor / oldNumeric.length;
            const targetDigitPos = Math.round(relativeDigitPos * newNumeric.length);
            
            // Find the position of the target digit
            let digitCount = 0;
            for (let i = 0; i < newValue.length; i++) {
                if (/\d/.test(newValue[i])) {
                    digitCount++;
                    if (digitCount === targetDigitPos) {
                        newCursorPos = i + 1;
                        break;
                    }
                }
            }
            
            // Final fallback - if still 0, check if we should be at the beginning
            if (newCursorPos === 0) {
                // If we were at the beginning and deleting, stay at beginning
                if (oldCursorPos <= 1) {
                    return 0;
                }
                // Otherwise, go to end
                newCursorPos = newValue.length;
            }
        }
        
        return Math.min(Math.max(newCursorPos, 0), newValue.length);
    }
    
    // If lengths are the same, try to maintain relative position
    const relativePos = oldCursorPos / oldValue.length;
    const newPos = Math.round(relativePos * newValue.length);
    
    return Math.min(Math.max(newPos, 0), newValue.length);
}
