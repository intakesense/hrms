import { useState, FormEvent, ChangeEvent } from "react";
import { X, Receipt, IndianRupee, Calendar } from "lucide-react";
import type { CreateExpenseDto } from "@/types";

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateExpenseDto) => void;
  isLoading: boolean;
}

const ExpenseModal = ({ isOpen, onClose, onSubmit, isLoading }: ExpenseModalProps) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState<string>("");

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setItem("");
    setAmount("");
  };

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({
      date,
      item,
      amount: parseFloat(amount),
    });
    resetForm();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isFormValid = () => {
    return date && item.trim() !== "" && amount && parseFloat(amount) > 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-6 md:p-8 transform transition-all duration-300 ease-out scale-95 animate-modal-pop-in border border-gray-100 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
              <Receipt size={24} />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-slate-100">Submit Expense</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Date Picker */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
              <Calendar size={14} className="text-gray-400" />
              Expense Date
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 block p-2.5 transition-all outline-none"
              required
            />
          </div>

          {/* Item Description */}
          <div>
            <label htmlFor="item" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
              Expense Description
            </label>
            <input
              id="item"
              type="text"
              value={item}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setItem(e.target.value)}
              placeholder="e.g. Client Dinner, Office Stationery"
              className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 block p-2.5 transition-all outline-none"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
              Amount (₹)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 dark:text-slate-400 sm:text-sm">₹</span>
              </div>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 block p-2.5 pl-7 transition-all outline-none"
                required
              />
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg p-4 mb-2">
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed font-medium">
              Note: Once submitted, your expense will be sent to HR for review. Approved expenses cannot be modified later.
            </p>
          </div>

          <div className="flex justify-end items-center gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700/80 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600/80 focus:ring-4 focus:outline-none focus:ring-gray-200 dark:focus:ring-slate-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !isFormValid()}
              className="px-5 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:ring-4 focus:outline-none focus:ring-amber-300 dark:bg-amber-500 dark:hover:bg-amber-600 dark:focus:ring-amber-700 rounded-lg transition-colors disabled:opacity-70 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : "Submit Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseModal;
