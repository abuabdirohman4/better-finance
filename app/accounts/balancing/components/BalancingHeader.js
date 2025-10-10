/**
 * Header component for balancing page
 * @param {object} props - Component props
 * @param {string} props.accountName - Name of the account
 * @param {function} props.onBack - Back button handler
 */
export default function BalancingHeader({ accountName, onBack }) {
    return (
        <div className="bg-white shadow-sm border-b border-gray-100">
            <div className="max-w-md mx-auto px-4 py-6">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={onBack}
                        className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                        <svg
                            className="w-5 h-5 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-gray-900">
                            {accountName} Balancing
                        </h1>
                        <p className="text-sm text-gray-600">
                            Reality check for your{" "}
                            {accountName.toLowerCase()}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
