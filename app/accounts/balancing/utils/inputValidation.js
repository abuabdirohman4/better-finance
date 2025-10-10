/**
 * Validate bank account input
 * @param {string} normalizedValue - Clean numeric value
 * @param {boolean} isDecimal - Whether value has decimal places
 * @returns {boolean} Whether input is valid
 */
export function validateBankInput(normalizedValue, isDecimal) {
    const isValid = /^\d+$/.test(normalizedValue) || 
                   (isDecimal && /^\d+\.\d{0,2}$/.test(normalizedValue));
    
    if (isValid) {
        // Additional validation: prevent extremely large numbers
        const numValue = parseFloat(normalizedValue);
        return numValue <= 999999999999; // 999 billion max
    }
    
    return false;
}

/**
 * Validate non-bank account input
 * @param {number} number - Numeric value
 * @returns {boolean} Whether input is valid
 */
export function validateNonBankInput(number) {
    // Additional validation: prevent extremely large numbers
    return number <= 999999999999; // 999 billion max
}

/**
 * Parse input value to determine if it's decimal and normalize it
 * @param {string} cleanValue - Clean input value
 * @returns {object} Parsed result with normalizedValue and isDecimal
 */
export function parseInputValue(cleanValue) {
    let normalizedValue = cleanValue;
    let isDecimal = false;

    // Check for decimal separator (comma takes priority)
    const commaIndex = cleanValue.lastIndexOf(",");
    const dotIndex = cleanValue.lastIndexOf(".");

    if (commaIndex !== -1) {
        // Comma found - treat as decimal separator
        const afterComma = cleanValue.substring(commaIndex + 1);
        if (afterComma.length <= 2) {
            isDecimal = true;
            // Remove all dots (thousand separators) and convert comma to dot
            normalizedValue = cleanValue.replace(/\./g, "").replace(",", ".");
        } else {
            // Invalid - too many decimal places
            return { normalizedValue: null, isDecimal: false };
        }
    } else if (dotIndex !== -1) {
        // Only dots - determine if decimal or thousand separator
        const afterDot = cleanValue.substring(dotIndex + 1);
        if (afterDot.length <= 2) {
            isDecimal = true;
            normalizedValue = cleanValue;
        } else {
            // Treat as thousand separator
            normalizedValue = cleanValue.replace(/\./g, "");
        }
    }

    return { normalizedValue, isDecimal };
}
