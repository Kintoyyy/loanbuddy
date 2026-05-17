import { useState } from "react";
import { Calculator as CalculatorIcon, TrendingUp, DollarSign, Calendar, Percent } from "lucide-react";
import AppSidebar from "../components/AppSidebar";

type CalculatorType = "simple-interest" | "compound-interest" | "emi" | "future-value" | "present-value";

interface CalculatorProps {
  onGoHome: () => void;
  onGoLoans: () => void;
  onGoDebtors: () => void;
  onGoEntries: () => void;
  onGoProfile: () => void;
  onGoSettings: () => void;
  onLogout: () => void;
  onGoLanding: () => void;
}

interface CalculatorState {
  principal: string;
  rate: string;
  time: string;
  frequency: string;
  downPayment: string;
  loanAmount: string;
  monthlyRate: string;
  months: string;
}

function Calculator({ onGoHome, onGoLoans, onGoDebtors, onGoEntries, onGoProfile, onGoSettings, onLogout, onGoLanding }: CalculatorProps) {
  const [activeCalc, setActiveCalc] = useState<CalculatorType>("simple-interest");
  const [inputs, setInputs] = useState<CalculatorState>({
    principal: "",
    rate: "",
    time: "",
    frequency: "annual",
    downPayment: "",
    loanAmount: "",
    monthlyRate: "",
    months: "",
  });
  const [results, setResults] = useState<Record<string, number | null>>({});

  const handleInputChange = (key: keyof CalculatorState, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const calculateSimpleInterest = () => {
    const principal = parseFloat(inputs.principal);
    const rate = parseFloat(inputs.rate);
    const time = parseFloat(inputs.time);

    if (!principal || !rate || !time) {
      alert("Please fill all fields");
      return;
    }

    const interest = (principal * rate * time) / 100;
    const totalAmount = principal + interest;

    setResults({
      interest: parseFloat(interest.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
    });
  };

  const calculateCompoundInterest = () => {
    const principal = parseFloat(inputs.principal);
    const rate = parseFloat(inputs.rate);
    const time = parseFloat(inputs.time);
    const frequency = parseInt(inputs.frequency);

    if (!principal || !rate || !time || !frequency) {
      alert("Please fill all fields");
      return;
    }

    const amount = principal * Math.pow(1 + rate / 100 / frequency, frequency * time);
    const interest = amount - principal;

    setResults({
      interest: parseFloat(interest.toFixed(2)),
      totalAmount: parseFloat(amount.toFixed(2)),
    });
  };

  const calculateEMI = () => {
    const loanAmount = parseFloat(inputs.loanAmount);
    const monthlyRate = parseFloat(inputs.monthlyRate);
    const months = parseFloat(inputs.months);

    if (!loanAmount || !monthlyRate || !months) {
      alert("Please fill all fields");
      return;
    }

    const monthlyRateDecimal = monthlyRate / 100;
    const emi =
      (loanAmount * monthlyRateDecimal * Math.pow(1 + monthlyRateDecimal, months)) /
      (Math.pow(1 + monthlyRateDecimal, months) - 1);
    const totalPayment = emi * months;
    const totalInterest = totalPayment - loanAmount;

    setResults({
      emi: parseFloat(emi.toFixed(2)),
      totalPayment: parseFloat(totalPayment.toFixed(2)),
      totalInterest: parseFloat(totalInterest.toFixed(2)),
    });
  };

  const calculateFutureValue = () => {
    const principal = parseFloat(inputs.principal);
    const rate = parseFloat(inputs.rate);
    const time = parseFloat(inputs.time);

    if (!principal || !rate || !time) {
      alert("Please fill all fields");
      return;
    }

    const futureValue = principal * Math.pow(1 + rate / 100, time);

    setResults({
      futureValue: parseFloat(futureValue.toFixed(2)),
    });
  };

  const calculatePresentValue = () => {
    const futureValue = parseFloat(inputs.principal);
    const rate = parseFloat(inputs.rate);
    const time = parseFloat(inputs.time);

    if (!futureValue || !rate || !time) {
      alert("Please fill all fields");
      return;
    }

    const presentValue = futureValue / Math.pow(1 + rate / 100, time);

    setResults({
      presentValue: parseFloat(presentValue.toFixed(2)),
    });
  };

  const handleCalculate = () => {
    switch (activeCalc) {
      case "simple-interest":
        calculateSimpleInterest();
        break;
      case "compound-interest":
        calculateCompoundInterest();
        break;
      case "emi":
        calculateEMI();
        break;
      case "future-value":
        calculateFutureValue();
        break;
      case "present-value":
        calculatePresentValue();
        break;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar
        active="calculator"
        onGoHome={onGoHome}
        onGoLoans={onGoLoans}
        onGoDebtors={onGoDebtors}
        onGoEntries={onGoEntries}
        onGoProfile={onGoProfile}
        onGoSettings={onGoSettings}
        onGoCalculator={() => {}}
        onGoLanding={onGoLanding}
        onLogout={onLogout}
      />

      <main className="pb-24 md:ml-64 md:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Financial Calculators</h1>
            <p className="text-sm text-slate-500">Calculate interest, EMI, and more for your loans</p>
          </div>
        </header>

        <div className="px-4 py-6 md:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-4 gap-6">
              {/* Calculator Selection */}
              <div className="space-y-3">
                <h2 className="font-semibold text-slate-900 px-2">Calculators</h2>

                <button
                  onClick={() => {
                    setActiveCalc("simple-interest");
                    setResults({});
                  }}
                  className={`w-full text-left rounded-lg p-3 transition ${
                    activeCalc === "simple-interest"
                      ? "bg-slate-900 text-white shadow-md"
                      : "bg-white text-slate-900 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium">Simple Interest</span>
                  </div>
                  <p className="text-xs opacity-75">P × R × T / 100</p>
                </button>

                <button
                  onClick={() => {
                    setActiveCalc("compound-interest");
                    setResults({});
                  }}
                  className={`w-full text-left rounded-lg p-3 transition ${
                    activeCalc === "compound-interest"
                      ? "bg-slate-900 text-white shadow-md"
                      : "bg-white text-slate-900 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="font-medium">Compound Interest</span>
                  </div>
                  <p className="text-xs opacity-75">P(1 + r/n)^nt</p>
                </button>

                <button
                  onClick={() => {
                    setActiveCalc("emi");
                    setResults({});
                  }}
                  className={`w-full text-left rounded-lg p-3 transition ${
                    activeCalc === "emi"
                      ? "bg-slate-900 text-white shadow-md"
                      : "bg-white text-slate-900 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">EMI Calculator</span>
                  </div>
                  <p className="text-xs opacity-75">Monthly payment</p>
                </button>

                <button
                  onClick={() => {
                    setActiveCalc("future-value");
                    setResults({});
                  }}
                  className={`w-full text-left rounded-lg p-3 transition ${
                    activeCalc === "future-value"
                      ? "bg-slate-900 text-white shadow-md"
                      : "bg-white text-slate-900 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Percent className="h-4 w-4" />
                    <span className="font-medium">Future Value</span>
                  </div>
                  <p className="text-xs opacity-75">Investment growth</p>
                </button>

                <button
                  onClick={() => {
                    setActiveCalc("present-value");
                    setResults({});
                  }}
                  className={`w-full text-left rounded-lg p-3 transition ${
                    activeCalc === "present-value"
                      ? "bg-slate-900 text-white shadow-md"
                      : "bg-white text-slate-900 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Percent className="h-4 w-4" />
                    <span className="font-medium">Present Value</span>
                  </div>
                  <p className="text-xs opacity-75">Discounted value</p>
                </button>
              </div>

              {/* Calculator Forms */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                  {/* Simple Interest */}
                  {activeCalc === "simple-interest" && (
                    <div>
                      <h2 className="text-xl font-semibold mb-2">Simple Interest Calculator</h2>
                      <p className="text-sm text-slate-600 mb-6">
                        Calculate interest earned or paid on a principal amount for a fixed period.
                      </p>

                      <div className="space-y-4 mb-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-1">
                            Principal Amount (₱)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g., 10000"
                            value={inputs.principal}
                            onChange={(e) => handleInputChange("principal", e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-1">
                            Rate of Interest (% per annum)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g., 5"
                            value={inputs.rate}
                            onChange={(e) => handleInputChange("rate", e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-1">
                            Time Period (years)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g., 2"
                            value={inputs.time}
                            onChange={(e) => handleInputChange("time", e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleCalculate}
                        className="w-full bg-slate-900 text-white py-2 rounded-lg font-medium hover:bg-slate-800 transition mb-6"
                      >
                        Calculate
                      </button>

                      {results.interest !== undefined && (
                        <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex justify-between">
                            <span className="text-slate-700">Interest Amount:</span>
                            <span className="font-bold text-green-600">₱{results.interest?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">Total Amount:</span>
                            <span className="font-bold text-slate-900">₱{results.totalAmount?.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Compound Interest */}
                  {activeCalc === "compound-interest" && (
                    <div>
                      <h2 className="text-xl font-semibold mb-2">Compound Interest Calculator</h2>
                      <p className="text-sm text-slate-600 mb-6">
                        Calculate interest that compounds periodically over time.
                      </p>

                      <div className="space-y-4 mb-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-1">
                            Principal Amount (₱)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g., 10000"
                            value={inputs.principal}
                            onChange={(e) => handleInputChange("principal", e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-1">
                            Rate of Interest (% per annum)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g., 5"
                            value={inputs.rate}
                            onChange={(e) => handleInputChange("rate", e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-1">
                            Time Period (years)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g., 2"
                            value={inputs.time}
                            onChange={(e) => handleInputChange("time", e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-1">
                            Compounding Frequency
                          </label>
                          <select
                            value={inputs.frequency}
                            onChange={(e) => handleInputChange("frequency", e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:outline-none"
                          >
                            <option value="1">Annually</option>
                            <option value="2">Semi-annually</option>
                            <option value="4">Quarterly</option>
                            <option value="12">Monthly</option>
                            <option value="365">Daily</option>
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={handleCalculate}
                        className="w-full bg-slate-900 text-white py-2 rounded-lg font-medium hover:bg-slate-800 transition mb-6"
                      >
                        Calculate
                      </button>

                      {results.interest !== undefined && (
                        <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex justify-between">
                            <span className="text-slate-700">Interest Amount:</span>
                            <span className="font-bold text-green-600">₱{results.interest?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">Total Amount:</span>
                            <span className="font-bold text-slate-900">₱{results.totalAmount?.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* EMI Calculator */}
                  {activeCalc === "emi" && (
                    <div>
                      <h2 className="text-xl font-semibold mb-2">EMI Calculator</h2>
                      <p className="text-sm text-slate-600 mb-6">
                        Calculate the monthly installment amount for a loan.
                      </p>

                      <div className="space-y-4 mb-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-1">
                            Loan Amount (₱)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g., 100000"
                            value={inputs.loanAmount}
                            onChange={(e) => handleInputChange("loanAmount", e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-1">
                            Monthly Interest Rate (%)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g., 0.5"
                            step="0.01"
                            value={inputs.monthlyRate}
                            onChange={(e) => handleInputChange("monthlyRate", e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-1">
                            Loan Duration (months)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g., 60"
                            value={inputs.months}
                            onChange={(e) => handleInputChange("months", e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleCalculate}
                        className="w-full bg-slate-900 text-white py-2 rounded-lg font-medium hover:bg-slate-800 transition mb-6"
                      >
                        Calculate
                      </button>

                      {results.emi !== undefined && (
                        <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex justify-between">
                            <span className="text-slate-700">Monthly EMI:</span>
                            <span className="font-bold text-blue-600">₱{results.emi?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">Total Interest Payable:</span>
                            <span className="font-bold text-red-600">₱{results.totalInterest?.toLocaleString()}</span>
                          </div>
                          <div className="border-t border-slate-300 pt-3 flex justify-between">
                            <span className="text-slate-700 font-medium">Total Amount to Pay:</span>
                            <span className="font-bold text-slate-900">₱{results.totalPayment?.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Future Value */}
                  {activeCalc === "future-value" && (
                    <div>
                      <h2 className="text-xl font-semibold mb-2">Future Value Calculator</h2>
                      <p className="text-sm text-slate-600 mb-6">
                        Calculate the future value of an investment with compound interest.
                      </p>

                      <div className="space-y-4 mb-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-1">
                            Present Value (₱)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g., 10000"
                            value={inputs.principal}
                            onChange={(e) => handleInputChange("principal", e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-1">
                            Annual Interest Rate (%)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g., 5"
                            value={inputs.rate}
                            onChange={(e) => handleInputChange("rate", e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-1">
                            Time Period (years)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g., 5"
                            value={inputs.time}
                            onChange={(e) => handleInputChange("time", e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleCalculate}
                        className="w-full bg-slate-900 text-white py-2 rounded-lg font-medium hover:bg-slate-800 transition mb-6"
                      >
                        Calculate
                      </button>

                      {results.futureValue !== undefined && (
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex justify-between">
                            <span className="text-slate-700">Future Value:</span>
                            <span className="font-bold text-green-600 text-lg">
                              ₱{results.futureValue?.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Present Value */}
                  {activeCalc === "present-value" && (
                    <div>
                      <h2 className="text-xl font-semibold mb-2">Present Value Calculator</h2>
                      <p className="text-sm text-slate-600 mb-6">
                        Calculate the present value of a future amount of money.
                      </p>

                      <div className="space-y-4 mb-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-1">
                            Future Value (₱)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g., 15000"
                            value={inputs.principal}
                            onChange={(e) => handleInputChange("principal", e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-1">
                            Annual Discount Rate (%)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g., 5"
                            value={inputs.rate}
                            onChange={(e) => handleInputChange("rate", e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-1">
                            Time Period (years)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g., 5"
                            value={inputs.time}
                            onChange={(e) => handleInputChange("time", e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleCalculate}
                        className="w-full bg-slate-900 text-white py-2 rounded-lg font-medium hover:bg-slate-800 transition mb-6"
                      >
                        Calculate
                      </button>

                      {results.presentValue !== undefined && (
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex justify-between">
                            <span className="text-slate-700">Present Value:</span>
                            <span className="font-bold text-blue-600 text-lg">
                              ₱{results.presentValue?.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info Cards */}
            <div className="mt-8 grid md:grid-cols-3 gap-6">
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-semibold mb-2">Simple Interest</h3>
                <p className="text-sm text-slate-600">
                  Interest calculated on the principal amount only. Formula: I = P × R × T / 100
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-semibold mb-2">Compound Interest</h3>
                <p className="text-sm text-slate-600">
                  Interest calculated on both principal and accumulated interest. Formula: A = P(1 + r/n)^nt
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-semibold mb-2">EMI</h3>
                <p className="text-sm text-slate-600">
                  Equal Monthly Installment - fixed payment amount for loan repayment over a specified period.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Calculator;
