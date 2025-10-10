/**
 * Format bank account value with decimal support
 * @param {string} normalizedValue - Clean numeric value
 * @param {boolean} isDecimal - Whether value has decimal places
 * @returns {string} Formatted display value
 */
export function formatBankAccountValue(normalizedValue, isDecimal) {
    if (isDecimal) {
        const [integerPart, decimalPart] = normalizedValue.split(".");
        const formattedInteger = Number(integerPart).toLocaleString("id-ID");
        return decimalPart ? `${formattedInteger},${decimalPart}` : `${formattedInteger},`;
    } else {
        const number = Number(normalizedValue);
        return number.toLocaleString("id-ID");
    }
}

/**
 * Format non-bank account value (integer only)
 * @param {number} number - Numeric value
 * @returns {string} Formatted display value
 */
export function formatNonBankValue(number) {
    return number.toLocaleString("id-ID");
}
