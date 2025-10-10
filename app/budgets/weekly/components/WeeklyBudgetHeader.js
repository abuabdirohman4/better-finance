export default function WeeklyBudgetHeader({ 
    currentWeek, 
    selectedWeek, 
    setSelectedWeek, 
    weeksInMonth 
}) {
    return (
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 px-3 pt-5 pb-4">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-full h-8">
                <svg
                    viewBox="0 0 400 32"
                    className="w-full h-full"
                    preserveAspectRatio="none"
                >
                    <path
                        d="M0,32 Q100,20 200,32 T400,20 L400,32 Z"
                        fill="rgb(249 250 251)"
                        className="transition-all duration-300"
                    ></path>
                </svg>
            </div>
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    {/* Page Title */}
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-1">
                            Weekly Budget
                        </h1>
                        <p className="text-white text-sm">
                            {currentWeek.month} {currentWeek.year}
                        </p>
                    </div>
                    {/* Settings and Week Selector */}
                    <div className="flex items-center space-x-3">
                        {/* Week Selector */}
                        <div className="relative">
                            <select
                                id="week"
                                value={selectedWeek}
                                onChange={(e) =>
                                    setSelectedWeek(
                                        parseInt(e.target.value)
                                    )
                                }
                                className="appearance-none bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 pr-10 cursor-pointer hover:bg-white/30 transition-all duration-200"
                            >
                                {Array.from(
                                    { length: weeksInMonth },
                                    (_, i) => i + 1
                                ).map((week) => (
                                    <option
                                        key={week}
                                        value={week}
                                        className="text-gray-800 bg-white"
                                    >
                                        Week {week}
                                    </option>
                                ))}
                            </select>
                            {/* Custom dropdown arrow */}
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                <svg
                                    className="w-4 h-4 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
