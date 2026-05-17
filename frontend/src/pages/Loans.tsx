import { useEffect, useState, FormEvent } from "react";
import {
  Banknote,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  RotateCcw,
  X,
  ChevronDown,
  ChevronUp,
  Receipt,
  AlertTriangle,
  TrendingUp,
  Clock,
  Eye,
  Archive,
  Paperclip,
} from "lucide-react";
import AppSidebar from "../components/AppSidebar";
import AgreementModal from "../components/AgreementModal";
import LoanDetailModal from "../components/LoanDetailModal";
import ProofViewerModal from "../components/ProofViewerModal";
import {
  getLoans,
  createLoan,
  updateLoan,
  deleteLoan,
  addPayment,
  archivePayment,
  getPaymentProof,
  uploadPaymentProof,
  uploadLoanProof,
  getProfile,
  type Loan,
  type LoanPayment,
  type LoanRequest,
  type LoanPaymentRequest,
} from "../api";

interface LoansProps {
  onGoHome: () => void;
  onGoDebtors: () => void;
  onGoEntries: () => void;
  onGoProfile: () => void;
  onGoSettings: () => void;
  onGoCalculator: () => void;
  onLogout: () => void;
  onGoLanding: () => void;
}

const EMPTY_LOAN_FORM = { borrowerName: "", amount: "", description: "", dateLent: "", dueDate: "", interestRate: "", paymentFrequency: "none", penaltyRate: "" };
const today = () => new Date().toISOString().split("T")[0];

function Loans({ onGoHome, onGoDebtors, onGoEntries, onGoProfile, onGoSettings, onGoCalculator, onLogout, onGoLanding }: LoansProps) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "paid">("all");

  const [showLoanForm, setShowLoanForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [loanForm, setLoanForm] = useState(EMPTY_LOAN_FORM);
  const [loanFormError, setLoanFormError] = useState<string | null>(null);
  const [loanSubmitting, setLoanSubmitting] = useState(false);

  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", note: "", paymentDate: today() });
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const [lenderName, setLenderName] = useState("Lender");
  const [agreementLoan, setAgreementLoan] = useState<Loan | null>(null);
  const [detailLoan, setDetailLoan] = useState<Loan | null>(null);
  const [proofViewerBlob, setProofViewerBlob] = useState<Blob | null>(null);

  useEffect(() => {
    getProfile().then((p) => setLenderName(`${p.first_name} ${p.last_name}`.trim() || p.email)).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getLoans()
      .then((data) => { if (active) setLoans(data); })
      .catch((err) => { if (active) setPageError(err instanceof Error ? err.message : "Failed to load loans"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const totalLent = loans.reduce((s, l) => s + Number(l.amount), 0);
  const outstanding = loans.reduce((s, l) => s + Number(l.remaining_balance ?? l.amount), 0);
  const collected = totalLent - outstanding;
  const overdueLoans = loans.filter(
    (l) => l.status === "active" && l.due_date != null && new Date(l.due_date) < new Date()
  );

  const visibleLoans = loans.filter((l) => {
    if (filter === "active") return l.status === "active";
    if (filter === "paid") return l.status === "paid";
    return true;
  });

  const openAdd = () => {
    setEditingLoan(null);
    setLoanForm({ ...EMPTY_LOAN_FORM, dateLent: today() });
    setLoanFormError(null);
    setShowLoanForm(true);
  };

  const openEdit = (loan: Loan) => {
    setEditingLoan(loan);
    setLoanForm({
      borrowerName: loan.borrower_name,
      amount: String(loan.amount),
      description: loan.description ?? "",
      dateLent: loan.date_lent,
      dueDate: loan.due_date ?? "",
      interestRate: loan.interest_rate != null && Number(loan.interest_rate) > 0 ? String(loan.interest_rate) : "",
      paymentFrequency: loan.payment_frequency ?? "none",
      penaltyRate: loan.penalty_rate != null && Number(loan.penalty_rate) > 0 ? String(loan.penalty_rate) : "",
    });
    setLoanFormError(null);
    setShowLoanForm(true);
  };

  const closeLoanForm = () => {
    setShowLoanForm(false);
    setEditingLoan(null);
    setLoanForm(EMPTY_LOAN_FORM);
    setLoanFormError(null);
  };

  const handleLoanSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(loanForm.amount);
    if (!loanForm.borrowerName.trim()) { setLoanFormError("Borrower name is required"); return; }
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setLoanFormError("Amount must be a positive number"); return; }
    if (!loanForm.dateLent) { setLoanFormError("Date lent is required"); return; }

    setLoanSubmitting(true);
    setLoanFormError(null);

    const parsedRate = parseFloat(loanForm.interestRate);
    const parsedPenaltyRate = parseFloat(loanForm.penaltyRate);
    const payload: LoanRequest = {
      borrowerName: loanForm.borrowerName.trim(),
      amount: parsedAmount,
      description: loanForm.description.trim() || undefined,
      dateLent: loanForm.dateLent,
      dueDate: loanForm.dueDate || undefined,
      interestRate: isNaN(parsedRate) || parsedRate < 0 ? 0 : parsedRate,
      paymentFrequency: loanForm.paymentFrequency || "none",
      penaltyRate: isNaN(parsedPenaltyRate) || parsedPenaltyRate < 0 ? 0 : parsedPenaltyRate,
    };

    try {
      if (editingLoan) {
        const updated = await updateLoan(editingLoan.loan_id, { ...payload, status: editingLoan.status });
        setLoans((prev) => prev.map((l) => l.loan_id === updated.loan_id ? updated : l));
        closeLoanForm();
      } else {
        const created = await createLoan(payload);
        setLoans((prev) => [created, ...prev]);
        closeLoanForm();
        setAgreementLoan(created);
      }
    } catch (err) {
      setLoanFormError(err instanceof Error ? err.message : "Failed to save loan");
    } finally {
      setLoanSubmitting(false);
    }
  };

  const handleTogglePaid = async (loan: Loan) => {
    const newStatus = loan.status === "active" ? "paid" : "active";
    const msg = newStatus === "paid"
      ? `Mark "${loan.borrower_name}" as fully paid?`
      : `Reopen loan for "${loan.borrower_name}"?`;
    if (!window.confirm(msg)) return;
    try {
      const updated = await updateLoan(loan.loan_id, {
        borrowerName: loan.borrower_name,
        amount: Number(loan.amount),
        description: loan.description ?? undefined,
        dateLent: loan.date_lent,
        dueDate: loan.due_date ?? undefined,
        status: newStatus,
        interestRate: Number(loan.interest_rate ?? 0),
        paymentFrequency: loan.payment_frequency ?? "none",
        penaltyRate: Number(loan.penalty_rate ?? 0),
      });
      setLoans((prev) => prev.map((l) => l.loan_id === updated.loan_id ? updated : l));
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Failed to update loan");
    }
  };

  const handleDeleteLoan = async (loanId: string) => {
    if (!window.confirm("Delete this loan and all its payment records?")) return;
    try {
      await deleteLoan(loanId);
      setLoans((prev) => prev.filter((l) => l.loan_id !== loanId));
      if (expandedLoanId === loanId) setExpandedLoanId(null);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Failed to delete loan");
    }
  };

  const toggleExpand = (loanId: string) => {
    if (expandedLoanId === loanId) {
      setExpandedLoanId(null);
    } else {
      setExpandedLoanId(loanId);
      setPaymentForm({ amount: "", note: "", paymentDate: today() });
      setPaymentProofFile(null);
      setPaymentError(null);
    }
  };

  const handleAddPayment = async (loan: Loan) => {
    const parsedAmount = parseFloat(paymentForm.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setPaymentError("Amount must be a positive number"); return; }
    if (!paymentForm.paymentDate) { setPaymentError("Payment date is required"); return; }
    if (!paymentProofFile) { setPaymentError("Proof of payment (receipt/photo) is required"); return; }

    setPaymentSubmitting(true);
    setPaymentError(null);

    const payload: LoanPaymentRequest = {
      amount: parsedAmount,
      note: paymentForm.note.trim() || undefined,
      paymentDate: paymentForm.paymentDate,
    };

    try {
      const created = await addPayment(loan.loan_id, payload);
      await uploadPaymentProof(loan.loan_id, created.payment_id, paymentProofFile);
      const withProof = { ...created, proof_filename: "uploaded", proof_mime_type: paymentProofFile.type, is_archived: false, archive_reason: null };
      setLoans((prev) => prev.map((l) => {
        if (l.loan_id !== loan.loan_id) return l;
        const updatedPayments = [...(l.loan_payments ?? []), withProof];
        const paid = updatedPayments.filter((p) => !p.is_archived).reduce((s, p) => s + Number(p.amount), 0);
        return { ...l, loan_payments: updatedPayments, paid_amount: paid, remaining_balance: Number(l.amount) - paid };
      }));
      setPaymentForm({ amount: "", note: "", paymentDate: today() });
      setPaymentProofFile(null);
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Failed to add payment");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleArchivePayment = async (loan: Loan, payment: LoanPayment) => {
    const reason = window.prompt(`Archive reason for payment of ${fmt(Number(payment.amount))}?\n(Leave blank to skip)`) ;
    if (reason === null) return; // cancelled
    try {
      await archivePayment(loan.loan_id, payment.payment_id, reason.trim() || undefined);
      setLoans((prev) => prev.map((l) => {
        if (l.loan_id !== loan.loan_id) return l;
        const updatedPayments = (l.loan_payments ?? []).map((p) =>
          p.payment_id === payment.payment_id ? { ...p, is_archived: true, archive_reason: reason.trim() || null } : p
        );
        const paid = updatedPayments.filter((p) => !p.is_archived).reduce((s, p) => s + Number(p.amount), 0);
        return { ...l, loan_payments: updatedPayments, paid_amount: paid, remaining_balance: Number(l.amount) - paid };
      }));
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Failed to archive payment");
    }
  };

  const handleViewPaymentProof = async (loanId: string, paymentId: string) => {
    try {
      const blob = await getPaymentProof(loanId, paymentId);
      if (blob) setProofViewerBlob(blob);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Failed to load proof");
    }
  };

  const fmt = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fmtDate = (d: string | null) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  };

  const isOverdue = (loan: Loan) =>
    loan.status === "active" && loan.due_date != null && new Date(loan.due_date) < new Date();

  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar
        active="loans"
        onGoHome={onGoHome}
        onGoLoans={() => {}}
        onGoDebtors={onGoDebtors}
        onGoEntries={onGoEntries}
        onGoProfile={onGoProfile}
        onGoSettings={onGoSettings}
        onGoCalculator={onGoCalculator}
        onGoLanding={onGoLanding}
        onLogout={onLogout}
      />

      <main className="md:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">My Loans</h1>
            <p className="text-sm text-slate-500">Track money you've lent out.</p>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" /> Add Loan
          </button>
        </header>

        <div className="space-y-6 p-6">
          {pageError && (
            <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{pageError}</span>
              <button onClick={() => setPageError(null)} className="ml-4 text-red-500 hover:text-red-700"><X className="h-4 w-4" /></button>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Total Lent</p>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                  <Banknote className="h-4 w-4 text-slate-600" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{fmt(totalLent)}</p>
              <p className="mt-1 text-xs text-slate-400">{loans.length} loan{loans.length !== 1 ? "s" : ""} total</p>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Outstanding</p>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
                  <Clock className="h-4 w-4 text-rose-500" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-rose-600">{fmt(outstanding)}</p>
              <p className="mt-1 text-xs text-slate-400">{loans.filter((l) => l.status === "active").length} active</p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Collected</p>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-600">{fmt(collected)}</p>
              <p className="mt-1 text-xs text-slate-400">{loans.filter((l) => l.status === "paid").length} fully paid</p>
            </div>

            <div className={`rounded-2xl border p-5 shadow-sm ${overdueLoans.length > 0 ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Overdue</p>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${overdueLoans.length > 0 ? "bg-amber-100" : "bg-slate-100"}`}>
                  <AlertTriangle className={`h-4 w-4 ${overdueLoans.length > 0 ? "text-amber-600" : "text-slate-400"}`} />
                </span>
              </div>
              <p className={`mt-2 text-2xl font-bold ${overdueLoans.length > 0 ? "text-amber-700" : "text-slate-900"}`}>{overdueLoans.length}</p>
              <p className="mt-1 text-xs text-slate-400">past due date</p>
            </div>
          </div>

          {/* Add / Edit loan form */}
          {showLoanForm && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-w-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">{editingLoan ? "Edit Loan" : "New Loan"}</h2>
                <button onClick={closeLoanForm} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {loanFormError && (
                <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{loanFormError}</p>
              )}
              <form onSubmit={handleLoanSubmit} className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Borrower Name *</label>
                  <input
                    type="text"
                    value={loanForm.borrowerName}
                    onChange={(e) => setLoanForm({ ...loanForm, borrowerName: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Amount (PHP ₱) *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={loanForm.amount}
                    onChange={(e) => setLoanForm({ ...loanForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Date Lent *</label>
                  <input
                    type="date"
                    value={loanForm.dateLent}
                    onChange={(e) => setLoanForm({ ...loanForm, dateLent: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Due Date <span className="text-slate-400">(optional)</span></label>
                  <input
                    type="date"
                    value={loanForm.dueDate}
                    onChange={(e) => setLoanForm({ ...loanForm, dueDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Monthly Interest Rate <span className="text-slate-400">(% add-on, optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={loanForm.interestRate}
                      onChange={(e) => setLoanForm({ ...loanForm, interestRate: e.target.value })}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 pr-8 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Add-on rate per month applied on the principal</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Payment Schedule</label>
                  <select
                    value={loanForm.paymentFrequency}
                    onChange={(e) => setLoanForm({ ...loanForm, paymentFrequency: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  >
                    <option value="none">One-time / On-demand</option>
                    <option value="weekly">Weekly</option>
                    <option value="semimonthly">Semi-Monthly (Bi-Monthly)</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Overdue Penalty Rate <span className="text-slate-400">(% per month, optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={loanForm.penaltyRate}
                      onChange={(e) => setLoanForm({ ...loanForm, penaltyRate: e.target.value })}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 pr-8 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Applied on remaining balance per month overdue</p>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Description <span className="text-slate-400">(optional)</span></label>
                  <input
                    type="text"
                    value={loanForm.description}
                    onChange={(e) => setLoanForm({ ...loanForm, description: e.target.value })}
                    placeholder="What was the loan for?"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeLoanForm}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loanSubmitting}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {loanSubmitting ? "Saving…" : editingLoan ? "Update Loan" : "Add Loan"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
            {(["all", "active", "paid"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition ${
                  filter === tab ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {tab}
                {tab !== "all" && (
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    filter === tab ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    {loans.filter((l) => l.status === tab).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Loan list */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="px-6 py-12 text-center text-sm text-slate-400">Loading…</div>
            ) : visibleLoans.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <Banknote className="mx-auto mb-3 h-10 w-10 text-slate-200" />
                <p className="text-sm font-medium text-slate-500">
                  {filter === "all" ? "No loans yet." : `No ${filter} loans.`}
                </p>
                {filter === "all" && (
                  <p className="mt-1 text-xs text-slate-400">Click "Add Loan" to get started.</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleLoans.map((loan) => {
                  const remaining = Number(loan.remaining_balance ?? loan.amount);
                  const paidAmount = Number(loan.paid_amount ?? 0);
                  const totalAmount = Number(loan.amount);
                  const paidPct = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
                  const isExpanded = expandedLoanId === loan.loan_id;
                  const payments = loan.loan_payments ?? [];
                  const overdue = isOverdue(loan);

                  return (
                    <div key={loan.loan_id}>
                      <div className={`px-5 py-4 ${isExpanded ? "bg-slate-50" : "hover:bg-slate-50/60"} transition`}>
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                            {loan.borrower_name.charAt(0).toUpperCase()}
                          </div>

                          {/* Main info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-slate-900">{loan.borrower_name}</p>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                loan.status === "paid"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : overdue
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}>
                                {loan.status === "paid" ? "Paid" : overdue ? "Overdue" : "Active"}
                              </span>
                              {loan.description && (
                                <span className="text-xs text-slate-400">· {loan.description}</span>
                              )}
                            </div>

                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                              <span>Lent {fmtDate(loan.date_lent)}</span>
                              {loan.due_date && (
                                <span className={overdue ? "font-medium text-red-500" : ""}>
                                  Due {fmtDate(loan.due_date)}
                                </span>
                              )}
                              <span>{payments.length} payment{payments.length !== 1 ? "s" : ""}</span>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-2 flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className={`h-full rounded-full transition-all ${loan.status === "paid" ? "bg-emerald-500" : "bg-sky-400"}`}
                                  style={{ width: `${paidPct}%` }}
                                />
                              </div>
                              <span className="shrink-0 text-xs text-slate-400">{paidPct}%</span>
                            </div>
                          </div>

                          {/* Amounts */}
                          <div className="shrink-0 text-right">
                            <p className="text-base font-bold text-slate-900">{fmt(Number(loan.amount))}</p>
                            <p className={`text-sm font-semibold ${remaining <= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {remaining <= 0 ? "Fully paid" : `${fmt(remaining)} left`}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              onClick={() => setDetailLoan(loan)}
                              title="View full details"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => toggleExpand(loan.loan_id)}
                              title={isExpanded ? "Hide payments" : "Show payments"}
                              className={`rounded-lg p-1.5 transition ${isExpanded ? "bg-slate-200 text-slate-700" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"}`}
                            >
                              <Receipt className="h-4 w-4" />
                              {isExpanded ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />}
                            </button>
                            <button
                              onClick={() => handleTogglePaid(loan)}
                              title={loan.status === "paid" ? "Mark active" : "Mark paid"}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 transition"
                            >
                              {loan.status === "paid" ? <RotateCcw className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => openEdit(loan)}
                              title="Edit"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteLoan(loan.loan_id)}
                              title="Delete"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded payment panel */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50 px-6 py-5">
                          <div className="max-w-2xl space-y-4">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-slate-700">
                                Payment History
                              </p>
                              <p className="text-xs text-slate-500">{fmt(paidAmount)} paid of {fmt(totalAmount)}</p>
                            </div>

                            {payments.length === 0 ? (
                              <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400">
                                No payments recorded yet.
                              </p>
                            ) : (
                              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                                      <th className="px-4 py-2.5">Date</th>
                                      <th className="px-4 py-2.5">Amount</th>
                                      <th className="px-4 py-2.5">Note</th>
                                      <th className="px-4 py-2.5">Proof</th>
                                      <th className="px-4 py-2.5"></th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {[...payments].sort((a, b) => a.payment_date.localeCompare(b.payment_date)).map((p) => (
                                      <tr key={p.payment_id} className={p.is_archived ? "opacity-40" : ""}>
                                        <td className="px-4 py-2.5 text-slate-600">
                                          {fmtDate(p.payment_date)}
                                          {p.is_archived && <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">Archived</span>}
                                        </td>
                                        <td className={`px-4 py-2.5 font-semibold ${p.is_archived ? "text-slate-400 line-through" : "text-emerald-700"}`}>{fmt(Number(p.amount))}</td>
                                        <td className="px-4 py-2.5 text-slate-500">{p.note || <span className="text-slate-300">—</span>}</td>
                                        <td className="px-4 py-2.5">
                                          {p.proof_filename ? (
                                            <button
                                              onClick={() => handleViewPaymentProof(loan.loan_id, p.payment_id)}
                                              className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs text-sky-600 hover:bg-sky-50"
                                            >
                                              <Paperclip className="h-3 w-3" />Receipt
                                            </button>
                                          ) : (
                                            <span className="text-slate-300 text-xs">—</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                          {!p.is_archived && (
                                            <button
                                              onClick={() => handleArchivePayment(loan, p)}
                                              title="Archive payment"
                                              className="rounded-lg p-1 text-slate-300 hover:bg-slate-100 hover:text-amber-600"
                                            >
                                              <Archive className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {remaining > 0 && (
                              <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                  Log a Payment <span className="normal-case font-normal text-slate-500">({fmt(remaining)} remaining)</span>
                                </p>
                                {paymentError && (
                                  <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{paymentError}</p>
                                )}
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 items-end">
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">Amount *</label>
                                    <input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={paymentForm.amount}
                                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                      placeholder="0.00"
                                      className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">Date *</label>
                                    <input
                                      type="date"
                                      value={paymentForm.paymentDate}
                                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                                      className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">Note</label>
                                    <input
                                      type="text"
                                      value={paymentForm.note}
                                      onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                                      placeholder="Optional"
                                      className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">
                                      Proof of Payment *
                                    </label>
                                    <label className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${paymentProofFile ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-dashed border-slate-300 text-slate-500 hover:border-slate-400"}`}>
                                      <Paperclip className="h-3.5 w-3.5 shrink-0" />
                                      <span className="truncate">{paymentProofFile ? paymentProofFile.name : "Attach receipt…"}</span>
                                      <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        className="sr-only"
                                        onChange={(e) => setPaymentProofFile(e.target.files?.[0] ?? null)}
                                      />
                                    </label>
                                  </div>
                                </div>
                                <div className="mt-3 flex justify-end">
                                  <button
                                    onClick={() => handleAddPayment(loan)}
                                    disabled={paymentSubmitting || !paymentProofFile}
                                    className="rounded-xl bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                                  >
                                    {paymentSubmitting ? "Saving…" : "Add Payment"}
                                  </button>
                                </div>
                              </div>
                            )}

                            {remaining <= 0 && (
                              <p className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                                <CheckCircle className="h-4 w-4" /> Fully paid off
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {agreementLoan && (
        <AgreementModal
          lenderName={lenderName}
          borrowerName={agreementLoan.borrower_name}
          amount={Number(agreementLoan.amount)}
          currency="PHP"
          dateLent={agreementLoan.date_lent}
          dueDate={agreementLoan.due_date}
          description={agreementLoan.description}
          onClose={() => setAgreementLoan(null)}
          onSign={async (file) => {
            await uploadLoanProof(agreementLoan.loan_id, file);
            setAgreementLoan(null);
          }}
        />
      )}

      {detailLoan && (
        <LoanDetailModal
          loan={detailLoan}
          lenderName={lenderName}
          onClose={() => setDetailLoan(null)}
          onPenaltyAdded={(penalty) => {
            setLoans((prev) => prev.map((l) =>
              l.loan_id === detailLoan.loan_id
                ? { ...l, loan_penalties: [...(l.loan_penalties ?? []), penalty], total_penalties: (Number(l.total_penalties) || 0) + Number(penalty.amount) }
                : l
            ));
          }}
        />
      )}

      {proofViewerBlob && (
        <ProofViewerModal blob={proofViewerBlob} onClose={() => setProofViewerBlob(null)} />
      )}
    </div>
  );
}

export default Loans;
