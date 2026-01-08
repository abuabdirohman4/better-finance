"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { categories, months } from "@/utils/constants";
import { useTransactions, useBudgets } from "@/utils/hooks";
import { processBudgetData } from "./utils";
import { formatCurrency, getBudgetColors, toProperCase } from "@/utils/helper";
import { getDefaultSheetName } from "@/utils/google";
import Cookies from "js-cookie";

export default function Budgets() {
    const router = useRouter();
    const [selectedMonth, setSelectedMonth] = useState(
        getDefaultSheetName(months)
    );

    // State to control collapse for each category with default hide all
    const [collapsedCategories, setCollapsedCategories] = useState({
        eating: true,
        living: true,
        saving: true,
        investing: true,
        giving: true,
    });

    // State to control hidden budgets and categories
    const [hiddenBudgets, setHiddenBudgets] = useState({});
    const [hiddenCategories, setHiddenCategories] = useState({});

    // Load collapse state and hidden state from cookies when component mounts
    useEffect(() => {
        const savedCollapseState = Cookies.get("budget-collapse-state");
        if (savedCollapseState) {
            try {
                const parsedState = JSON.parse(savedCollapseState);
                setCollapsedCategories((prev) => ({
                    ...prev,
                    ...parsedState,
                }));
            } catch (error) {
                console.error(
                    "Error parsing collapse state from cookies:",
                    error
                );
            }
        }

        const savedHiddenBudgets = Cookies.get("budget-hidden-state");
        if (savedHiddenBudgets) {
            try {
                const parsedHiddenBudgets = JSON.parse(savedHiddenBudgets);
                setHiddenBudgets(parsedHiddenBudgets);
            } catch (error) {
                console.error(
                    "Error parsing hidden budgets state from cookies:",
                    error
                );
            }
        }

        const savedHiddenCategories = Cookies.get(
            "budget-category-hidden-state"
        );
        if (savedHiddenCategories) {
            try {
                const parsedHiddenCategories = JSON.parse(
                    savedHiddenCategories
                );
                setHiddenCategories(parsedHiddenCategories);
            } catch (error) {
                console.error(
                    "Error parsing hidden categories state from cookies:",
                    error
                );
            }
        }
    }, []);

    // Function to toggle collapse and save to cookies
    const toggleCategory = (categoryKey) => {
        const newState = {
            ...collapsedCategories,
            [categoryKey]: !collapsedCategories[categoryKey],
        };

        setCollapsedCategories(newState);

        // Save to cookies
        Cookies.set("budget-collapse-state", JSON.stringify(newState), {
            expires: 365,
            sameSite: "strict",
        });
    };

    // Function to toggle hide/show individual budget item
    const toggleBudgetVisibility = (categoryKey, subCategory) => {
        const budgetId = `${categoryKey}-${subCategory}`;
        const newHiddenBudgets = {
            ...hiddenBudgets,
            [budgetId]: !hiddenBudgets[budgetId],
        };

        setHiddenBudgets(newHiddenBudgets);

        // Save to cookies
        Cookies.set("budget-hidden-state", JSON.stringify(newHiddenBudgets), {
            expires: 365,
            sameSite: "strict",
        });
    };

    // Function to toggle hide/show entire category
    const toggleCategoryVisibility = (categoryKey) => {
        const newHiddenCategories = {
            ...hiddenCategories,
            [categoryKey]: !hiddenCategories[categoryKey],
        };

        setHiddenCategories(newHiddenCategories);

        // Save to cookies
        Cookies.set(
            "budget-category-hidden-state",
            JSON.stringify(newHiddenCategories),
            {
                expires: 365,
                sameSite: "strict",
            }
        );
    };

    // Function to navigate to transactions with category filter
    const navigateToTransactionsWithFilter = (categoryName) => {
        const encodedCategory = encodeURIComponent(categoryName);
        router.push(`/transactions?category=${encodedCategory}`);
    };

    // Use SWR hooks for data fetching
    const {
        data: transactionData,
        isLoading: isTransactionLoading,
        error: transactionError,
    } = useTransactions(selectedMonth);
    const {
        data: budgetRawData,
        isLoading: isBudgetLoading,
        error: budgetError,
    } = useBudgets(selectedMonth);

    // Process budget data when it changes
    const budgetData = useMemo(() => {
        if (!budgetRawData) return null;
        return processBudgetData(budgetRawData, selectedMonth);
    }, [budgetRawData, selectedMonth]);

    // Group budget data based on categories constants with case-insensitive matching
    // AND prevent duplication with category priority
    const groupedBudgetData = budgetData
        ? (() => {
              const usedKeys = new Set(); // Track keys that have been used

              const getCategoryForKey = (key) => {
                  // Exact match only - no partial matching
                  if (
                      categories.eating.some(
                          (cat) => cat.toLowerCase() === key.toLowerCase()
                      )
                  )
                      return "eating";
                  if (
                      categories.living.some(
                          (cat) => cat.toLowerCase() === key.toLowerCase()
                      )
                  )
                      return "living";
                  if (
                      categories.giving.some(
                          (cat) => cat.toLowerCase() === key.toLowerCase()
                      )
                  )
                      return "giving";
                  if (
                      categories.saving.some(
                          (cat) => cat.toLowerCase() === key.toLowerCase()
                      )
                  )
                      return "saving";
                  if (
                      categories.investing.some(
                          (cat) => cat.toLowerCase() === key.toLowerCase()
                      )
                  )
                      return "investing";

                  return null;
              };

              const result = {
                  eating: {},
                  living: {},
                  saving: {},
                  investing: {},
                  giving: {},
              };

              // Process spending data
              Object.entries(budgetData.spending || {}).forEach(
                  ([key, value]) => {
                      const category = getCategoryForKey(key);
                      if (category && !usedKeys.has(key)) {
                          result[category][key] = value;
                          usedKeys.add(key);
                      } else if (!category) {
                          // Item doesn't fit into any category - skip silently
                      }
                  }
              );

              // Process transfer data
              Object.entries(budgetData.transfer || {}).forEach(
                  ([key, value]) => {
                      const category = getCategoryForKey(key);
                      if (category && !usedKeys.has(key)) {
                          result[category][key] = value;
                          usedKeys.add(key);
                      } else if (!category) {
                          // Item doesn't fit into any category - skip silently
                      }
                  }
              );

              return result;
          })()
        : null;

    // Calculate totals per category based on ALL data (not affected by hide/unhide)
    const calculateCategoryTotalsAll = (groupedBudgetData) => {
        if (!groupedBudgetData) return {};

        const categoryTotals = {};

        Object.entries(groupedBudgetData).forEach(
            ([categoryKey, categoryData]) => {
                // Calculate totals including ALL items (visible and hidden)
                const allItems = Object.entries(categoryData);

                const totalBudget = allItems.reduce(
                    (sum, [_, item]) => sum + Math.abs(item.budget),
                    0
                );
                const totalSpent = allItems.reduce(
                    (sum, [_, item]) => sum + Math.abs(item.actual),
                    0
                );
                const totalRemaining = totalBudget - totalSpent;
                const percentageUsed =
                    totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

                categoryTotals[categoryKey] = {
                    budget: totalBudget,
                    spent: totalSpent,
                    remaining: totalRemaining,
                    percentageUsed: percentageUsed,
                };
            }
        );

        return categoryTotals;
    };

    const categoryTotalsAll = calculateCategoryTotalsAll(groupedBudgetData);

    // Calculate totals from ALL data (not affected by hide/unhide)
    const totalBudgetFromSheetAll = groupedBudgetData
        ? Object.entries(groupedBudgetData).reduce(
              (sum, [categoryKey, categoryData]) => {
                  return (
                      sum +
                      Object.entries(categoryData).reduce(
                          (catSum, [subCategory, item]) => {
                              return catSum + Math.abs(item.budget);
                          },
                          0
                      )
                  );
              },
              0
          )
        : 0;

    const totalActualFromSheetAll = groupedBudgetData
        ? Object.entries(groupedBudgetData).reduce(
              (sum, [categoryKey, categoryData]) => {
                  return (
                      sum +
                      Object.entries(categoryData).reduce(
                          (catSum, [subCategory, item]) => {
                              return catSum + Math.abs(item.actual);
                          },
                          0
                      )
                  );
              },
              0
          )
        : 0;

    // Calculate percentage based on ALL data (not affected by hide/unhide)
    const percentageFromSheetAll =
        totalBudgetFromSheetAll !== 0
            ? Math.abs(
                  (totalActualFromSheetAll / totalBudgetFromSheetAll) * 100
              )
            : 0;

    // Loading state
    const isLoading = isTransactionLoading || isBudgetLoading;
    const hasError = transactionError || budgetError;

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
            {/* Header Section */}
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 px-3 pt-5 pb-4">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>

                {/* Asymmetrical Wave Shape at Bottom */}
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
                        />
                    </svg>
                </div>

                <div className="relative z-10">
                    {/* Top Row - Page Title and Month Selector */}
                    <div className="flex items-center justify-between mb-4">
                        {/* Page Title */}
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-1">
                                Budgets
                            </h1>
                            <p className="text-blue-100 text-sm">
                                Track your spending limits
                            </p>
                        </div>

                        {/* Settings and Month Selector */}
                        <div className="flex items-center space-x-3">
                            {/* Month Selector */}
                            <div className="relative">
                                <select
                                    id="month"
                                    value={selectedMonth}
                                    onChange={(e) =>
                                        setSelectedMonth(e.target.value)
                                    }
                                    className="appearance-none bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 pr-10 cursor-pointer hover:bg-white/30 transition-all duration-200"
                                >
                                    {months.map((month) => (
                                        <option
                                            key={month}
                                            value={month}
                                            className="text-gray-800 bg-white"
                                        >
                                            {month}
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

            {/* Budget Summary Cards */}
            <div className="px-3 mt-6 mb-8">
                <div className="grid grid-cols-1 gap-4">
                    {/* Overall Progress Card */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-800">
                                Overall Budgets Progress
                            </h2>
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-purple-500 rounded-full flex items-center justify-center">
                                <svg
                                    className="w-5 h-5 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                    />
                                </svg>
                            </div>
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="text-center">
                                <p className="text-sm text-gray-600 mb-1">
                                    Budget
                                </p>
                                <p className="text-lg font-bold text-gray-700">
                                    {formatCurrency(
                                        totalBudgetFromSheetAll,
                                        "short"
                                    )}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-gray-600 mb-1">
                                    Spending
                                </p>
                                <p className="text-lg font-bold text-gray-700">
                                    {formatCurrency(
                                        totalActualFromSheetAll,
                                        "short"
                                    )}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-gray-600 mb-1">
                                    Remaining
                                </p>
                                <p
                                    className={`text-lg font-bold ${
                                        totalBudgetFromSheetAll -
                                            totalActualFromSheetAll >=
                                        0
                                            ? "text-gray-700"
                                            : "text-red-600"
                                    }`}
                                >
                                    {formatCurrency(
                                        totalBudgetFromSheetAll -
                                            totalActualFromSheetAll,
                                        "short"
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Progress Bar with Percentage */}
                        <div className="mt-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-3">
                                    <div
                                        className={`h-3 rounded-full transition-all duration-200 ease-out md:duration-500 ${getBudgetColors(percentageFromSheetAll).progress}`}
                                        style={{
                                            width: `${Math.min(percentageFromSheetAll, 100)}%`,
                                        }}
                                    ></div>
                                </div>
                                <span
                                    className={`text-sm font-semibold ${getBudgetColors(percentageFromSheetAll).text}`}
                                >
                                    {percentageFromSheetAll.toFixed(0)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Budget Categories */}
            <div className="px-3 pb-24">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h3 className="text-xl font-bold text-gray-900">
                            Budget Spending
                        </h3>
                    </div>

                    <div className="p-6 pt-0">
                        {isLoading ? (
                            <div className="space-y-4">
                                {/* Skeleton for budget categories */}
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="animate-pulse">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="h-5 bg-gray-200 rounded w-32"></div>
                                            <div className="h-5 bg-gray-200 rounded w-20"></div>
                                        </div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="flex-1 bg-gray-200 rounded-full h-3"></div>
                                            <div className="h-4 bg-gray-200 rounded w-16"></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                                            <div className="h-4 bg-gray-200 rounded w-20"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : hasError ? (
                            <div className="text-center py-8">
                                <div className="text-red-500 text-6xl mb-4">
                                    ⚠️
                                </div>
                                <p className="text-red-600 font-semibold">
                                    Error loading data
                                </p>
                                <p className="text-gray-600 text-sm mt-2">
                                    Please try again later
                                </p>
                            </div>
                        ) : groupedBudgetData &&
                          Object.keys(groupedBudgetData).length > 0 ? (
                            <div className="space-y-4">
                                {/* Grouped Categories */}
                                {Object.entries(groupedBudgetData).map(
                                    ([categoryKey, categoryData]) => {
                                        const totalsAll =
                                            categoryTotalsAll[categoryKey];
                                        if (
                                            !totalsAll ||
                                            Object.keys(categoryData).length ===
                                                0
                                        )
                                            return null;

                                        // Skip hidden categories
                                        if (hiddenCategories[categoryKey])
                                            return null;

                                        return (
                                            <div
                                                key={categoryKey}
                                                className="border border-gray-200 rounded-xl overflow-hidden"
                                            >
                                                {/* Category Header */}
                                                <div
                                                    className="relative cursor-pointer p-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all duration-200"
                                                    onClick={() =>
                                                        toggleCategory(
                                                            categoryKey
                                                        )
                                                    }
                                                >
                                                    {/* Category Info with Budget Summary and Arrow */}
                                                    <div className="flex items-center justify-between mb-3">
                                                        {/* Left: Icon + Nama Kategori */}
                                                        <div className="flex items-center">
                                                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                                                                <span className="text-white text-lg">
                                                                    {categoryKey ===
                                                                    "eating"
                                                                        ? "🍽️"
                                                                        : categoryKey ===
                                                                            "living"
                                                                          ? "🏠"
                                                                          : categoryKey ===
                                                                              "saving"
                                                                            ? "💰"
                                                                            : categoryKey ===
                                                                                "investing"
                                                                              ? "💹"
                                                                              : categoryKey ===
                                                                                  "giving"
                                                                                ? "❤️"
                                                                                : "📋"}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-lg font-semibold text-gray-900 capitalize">
                                                                    {
                                                                        categoryKey
                                                                    }
                                                                </h4>
                                                                <p className="text-sm text-gray-600">
                                                                    {formatCurrency(
                                                                        totalsAll.spent,
                                                                        "short"
                                                                    )}{" "}
                                                                    /{" "}
                                                                    {formatCurrency(
                                                                        totalsAll.budget,
                                                                        "short"
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Right: Remaining Budget + Hide Button + Arrow */}
                                                        <div className="flex items-center space-x-3">
                                                            {/* Remaining Budget */}
                                                            <div className="text-right">
                                                                <p
                                                                    className={`text-lg font-bold ${
                                                                        totalsAll.remaining >=
                                                                        0
                                                                            ? "text-gray-700"
                                                                            : "text-red-600"
                                                                    }`}
                                                                >
                                                                    {formatCurrency(
                                                                        totalsAll.remaining,
                                                                        "short"
                                                                    )}
                                                                </p>
                                                            </div>

                                                            {/* Hide Category Button */}
                                                            <button
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    toggleCategoryVisibility(
                                                                        categoryKey
                                                                    );
                                                                }}
                                                                className="p-1 rounded-full hover:bg-gray-200 transition-colors duration-200"
                                                                title="Hide this category"
                                                            >
                                                                <svg
                                                                    className="w-4 h-4 text-gray-400"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={
                                                                            2
                                                                        }
                                                                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                                                                    />
                                                                </svg>
                                                            </button>

                                                            {/* Arrow icon */}
                                                            <div className="flex-shrink-0">
                                                                <svg
                                                                    className={`w-5 h-5 text-gray-600 transition-all duration-200 ease-out md:duration-500 md:ease-in-out transform-gpu ${
                                                                        collapsedCategories[
                                                                            categoryKey
                                                                        ]
                                                                            ? "rotate-180 md:scale-110 scale-100"
                                                                            : "rotate-0 scale-100"
                                                                    }`}
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={
                                                                            2
                                                                        }
                                                                        d="M19 9l-7 7-7-7"
                                                                    />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Mini Progress Bar with Percentage */}
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className={`h-2 rounded-full transition-all duration-200 ease-out md:duration-300 ${getBudgetColors(categoryTotalsAll[categoryKey]?.percentageUsed || 0).progress}`}
                                                                style={{
                                                                    width: `${Math.min(categoryTotalsAll[categoryKey]?.percentageUsed || 0, 100)}%`,
                                                                }}
                                                            ></div>
                                                        </div>
                                                        <span
                                                            className={`text-sm font-medium ${getBudgetColors(categoryTotalsAll[categoryKey]?.percentageUsed || 0).text}`}
                                                        >
                                                            {(
                                                                categoryTotalsAll[
                                                                    categoryKey
                                                                ]
                                                                    ?.percentageUsed ||
                                                                0
                                                            ).toFixed(0)}
                                                            %
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Collapsible Subcategories */}
                                                <div
                                                    className={`overflow-hidden transition-all duration-500 ease-in-out md:duration-500 duration-200 ${
                                                        collapsedCategories[
                                                            categoryKey
                                                        ]
                                                            ? "max-h-0 opacity-0 scale-95 transform-gpu md:scale-95 scale-100"
                                                            : "max-h-[2000px] opacity-100 scale-100 transform-gpu"
                                                    }`}
                                                >
                                                    <div
                                                        className={`p-4 bg-gray-50 space-y-3 transition-all duration-500 ease-in-out md:duration-500 duration-200 ${
                                                            collapsedCategories[
                                                                categoryKey
                                                            ]
                                                                ? "transform -translate-y-2 opacity-0 md:-translate-y-2 translate-y-0"
                                                                : "transform translate-y-0 opacity-100"
                                                        }`}
                                                    >
                                                        {Object.entries(
                                                            categoryData
                                                        ).map(
                                                            ([
                                                                subCategory,
                                                                data,
                                                            ]) => {
                                                                const budgetId = `${categoryKey}-${subCategory}`;

                                                                // Skip hidden budget items
                                                                if (
                                                                    hiddenBudgets[
                                                                        budgetId
                                                                    ]
                                                                )
                                                                    return null;

                                                                const subBudget =
                                                                    Math.abs(
                                                                        data.budget
                                                                    );
                                                                const subSpent =
                                                                    Math.abs(
                                                                        data.actual
                                                                    );
                                                                const subPercentageUsed =
                                                                    subBudget >
                                                                    0
                                                                        ? (subSpent /
                                                                              subBudget) *
                                                                          100
                                                                        : 0;
                                                                const subColors =
                                                                    getBudgetColors(
                                                                        subPercentageUsed
                                                                    );

                                                                // Get appropriate icon based on subcategory
                                                                const getSubCategoryIcon =
                                                                    (
                                                                        category,
                                                                        subCat
                                                                    ) => {
                                                                        if (
                                                                            category ===
                                                                            "eating"
                                                                        ) {
                                                                            if (
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "dining"
                                                                                    ) ||
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "out"
                                                                                    )
                                                                            )
                                                                                return "🍽️";
                                                                            if (
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "food"
                                                                                    )
                                                                            )
                                                                                return "🍕";
                                                                            if (
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "fruits"
                                                                                    )
                                                                            )
                                                                                return "🍎";
                                                                            if (
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "groceries"
                                                                                    )
                                                                            )
                                                                                return "🛒";
                                                                            if (
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "grab"
                                                                                    )
                                                                            )
                                                                                return "🚗";
                                                                            return "🍽️";
                                                                        } else if (
                                                                            category ===
                                                                            "living"
                                                                        ) {
                                                                            if (
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "transport"
                                                                                    )
                                                                            )
                                                                                return "🚗";
                                                                            if (
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "house"
                                                                                    ) ||
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "home"
                                                                                    )
                                                                            )
                                                                                return "🏠";
                                                                            if (
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "health"
                                                                                    )
                                                                            )
                                                                                return "🏥";
                                                                            if (
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "children"
                                                                                    )
                                                                            )
                                                                                return "👶";
                                                                            if (
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "spouse"
                                                                                    )
                                                                            )
                                                                                return "💑";
                                                                            if (
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "entertainment"
                                                                                    )
                                                                            )
                                                                                return "🎮";
                                                                            if (
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "tools"
                                                                                    )
                                                                            )
                                                                                return "🔧";
                                                                            if (
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "credit"
                                                                                    )
                                                                            )
                                                                                return "💳";
                                                                            if (
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "charge"
                                                                                    )
                                                                            )
                                                                                return "⚡";
                                                                            return "🏠";
                                                                        } else if (
                                                                            category ===
                                                                            "giving"
                                                                        ) {
                                                                            if (
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "infaq"
                                                                                    )
                                                                            )
                                                                                return "🕌";
                                                                            if (
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "tax"
                                                                                    )
                                                                            )
                                                                                return "📊";
                                                                            if (
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "shodaqoh"
                                                                                    )
                                                                            )
                                                                                return "❤️";
                                                                            return "❤️";
                                                                        } else if (
                                                                            category ===
                                                                            "saving"
                                                                        ) {
                                                                            if (
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "sinking"
                                                                                    )
                                                                            )
                                                                                return "💰";
                                                                            if (
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "wishlist"
                                                                                    )
                                                                            )
                                                                                return "🎁";
                                                                            return "💰";
                                                                        } else if (
                                                                            category ===
                                                                            "investing"
                                                                        ) {
                                                                            if (
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "business"
                                                                                    )
                                                                            )
                                                                                return "💼";
                                                                            if (
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "emergency"
                                                                                    )
                                                                            )
                                                                                return "🚨";
                                                                            if (
                                                                                subCat
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "investment"
                                                                                    )
                                                                            )
                                                                                return "📈";
                                                                            return "💹";
                                                                        }
                                                                        return "📋";
                                                                    };

                                                                return (
                                                                    <div
                                                                        key={
                                                                            subCategory
                                                                        }
                                                                        className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                                                                        onClick={() =>
                                                                            navigateToTransactionsWithFilter(
                                                                                subCategory
                                                                            )
                                                                        }
                                                                        title={`View ${subCategory} transactions`}
                                                                    >
                                                                        {/* Header with Icon and Title */}
                                                                        <div className="flex items-center justify-between mb-3">
                                                                            <div className="flex items-center">
                                                                                <div className="w-8 h-8 flex items-center justify-center mr-2">
                                                                                    <span className="text-2xl">
                                                                                        {getSubCategoryIcon(
                                                                                            categoryKey,
                                                                                            subCategory
                                                                                        )}
                                                                                    </span>
                                                                                </div>
                                                                                <div>
                                                                                    <h6 className="font-medium text-gray-900 text-sm">
                                                                                        {toProperCase(
                                                                                            subCategory
                                                                                        )}
                                                                                    </h6>
                                                                                    <p className="text-xs text-gray-600">
                                                                                        {formatCurrency(
                                                                                            subSpent
                                                                                        )}{" "}
                                                                                        /{" "}
                                                                                        {formatCurrency(
                                                                                            subBudget
                                                                                        )}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center space-x-2">
                                                                                <div className="text-right">
                                                                                    <p
                                                                                        className={`text-sm font-bold ${
                                                                                            subBudget -
                                                                                                subSpent >=
                                                                                            0
                                                                                                ? "text-gray-700"
                                                                                                : "text-red-600"
                                                                                        }`}
                                                                                    >
                                                                                        {formatCurrency(
                                                                                            subBudget -
                                                                                                subSpent
                                                                                        )}
                                                                                    </p>
                                                                                </div>
                                                                                <button
                                                                                    onClick={() =>
                                                                                        toggleBudgetVisibility(
                                                                                            categoryKey,
                                                                                            subCategory
                                                                                        )
                                                                                    }
                                                                                    className="p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
                                                                                    title="Hide this budget item"
                                                                                >
                                                                                    <svg
                                                                                        className="w-4 h-4 text-gray-400"
                                                                                        fill="none"
                                                                                        stroke="currentColor"
                                                                                        viewBox="0 0 24 24"
                                                                                    >
                                                                                        <path
                                                                                            strokeLinecap="round"
                                                                                            strokeLinejoin="round"
                                                                                            strokeWidth={
                                                                                                2
                                                                                            }
                                                                                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                                                                                        />
                                                                                    </svg>
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        {/* Progress Bar with Percentage */}
                                                                        <div className="flex items-center gap-3 mb-2">
                                                                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                                                <div
                                                                                    className={`h-2 rounded-full transition-all duration-200 ease-out md:duration-300 ${subColors.progress}`}
                                                                                    style={{
                                                                                        width: `${Math.min(subPercentageUsed, 100)}%`,
                                                                                    }}
                                                                                ></div>
                                                                            </div>
                                                                            <span
                                                                                className={`text-xs font-medium ${subColors.text}`}
                                                                            >
                                                                                {subPercentageUsed.toFixed(
                                                                                    0
                                                                                )}

                                                                                %
                                                                            </span>
                                                                        </div>

                                                                        {/* Status Message - Right Aligned */}
                                                                        {subPercentageUsed >
                                                                            100 && (
                                                                            <div className="text-right">
                                                                                <p className="text-xs font-medium text-red-600">
                                                                                    Over
                                                                                    Budget!
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            }
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="text-gray-400 text-6xl mb-4">
                                    📊
                                </div>
                                <p className="text-gray-600 font-semibold">
                                    No budget data available
                                </p>
                                <p className="text-gray-500 text-sm mt-2">
                                    Select a month to view budgets
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
