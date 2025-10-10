import { formatCurrency } from "@/utils/helper";

/**
 * Result card component for displaying update results
 * @param {object} props - Component props
 * @param {object} props.result - Result object with success/error info
 * @param {string} props.accountName - Name of the account
 * @param {string} props.realBalance - Real balance value
 */
export default function ResultCard({ result, accountName, realBalance }) {
    if (!result) return null;

    return (
        <div
            className={`rounded-2xl shadow-lg border p-6 ${
                result.success
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
            }`}
        >
            <h3
                className={`text-lg font-semibold mb-2 ${
                    result.success
                        ? "text-green-800"
                        : "text-red-800"
                }`}
            >
                {result.success
                    ? "✅ Updated Successfully!"
                    : "❌ Error"}
            </h3>
            {result.success && (
                <div className="space-y-2">
                    <p className="text-sm text-green-700">
                        Actual {accountName} updated to{" "}
                        {formatCurrency(parseFloat(realBalance))}
                    </p>
                    <p className="text-sm text-green-700">
                        Difference:{" "}
                        {result.difference > 0 ? "+" : ""}
                        {formatCurrency(result.difference)}
                    </p>
                </div>
            )}
            {!result.success && (
                <p className="text-sm text-red-700">
                    {result.error}
                </p>
            )}
        </div>
    );
}
