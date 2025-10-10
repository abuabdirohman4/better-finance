import Button from "@/components/Button";

/**
 * Reality check form component
 * @param {object} props - Component props
 * @param {string} props.accountName - Name of the account
 * @param {string} props.displayValue - Display value for input
 * @param {object} props.inputHandlers - Input event handlers
 * @param {string} props.realBalance - Real balance value
 * @param {boolean} props.loading - Loading state
 * @param {function} props.onUpdate - Update handler
 */
export default function RealityCheckForm({ 
    accountName, 
    displayValue, 
    inputHandlers, 
    realBalance, 
    loading, 
    onUpdate 
}) {
    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Actual {accountName}
            </h2>

            <div className="space-y-4">
                <div>
                    <input
                        type="tel"
                        inputMode="numeric"
                        value={displayValue}
                        onChange={inputHandlers.onChange}
                        onKeyDown={inputHandlers.onKeyDown}
                        onPaste={inputHandlers.onPaste}
                        onCopy={inputHandlers.onCopy}
                        onCut={inputHandlers.onCut}
                        placeholder={`Enter your actual ${accountName.toLowerCase()} balance`}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                        autoComplete="off"
                    />
                </div>

                <Button
                    onClick={onUpdate}
                    disabled={!realBalance}
                    loading={loading}
                    variant="primary"
                    size="md"
                >
                    {`Update ${accountName}`}
                </Button>
            </div>
        </div>
    );
}
