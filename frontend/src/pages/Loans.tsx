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
} from "lucide-react";
import AppSidebar from "../components/AppSidebar";
import {
  getLoans,
  createLoan,
  updateLoan,
  deleteLoan,
  addPayment,
  deletePayment,
  Loan,
  LoanPayment,
  LoanRequest,
  LoanPaymentRequest,
} from "../api";

interface LoansProps {
  onGoHome: () => void;
  onGoDebtors: () => void;
  onGoEntries: () => void;
  onGoProfile: () => void;
  onLogout: () => void;
  onGoLanding: () => void;
}

const EMPTY_LOAN_FORM = { borrowerName: "", amount: "", description: "", dateLent: "", dueDate: "" };
const today = () => new Date().toISOString().split("T")[0];

function Loans({ onGoHome, onGoDebtors, onGoEntries, onGoProfile, onLogout, onGoLanding }: LoansProps) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Loan form state
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [loanForm, setLoanForm] = useState(EMPTY_LOAN_FORM);
  const [loanFormError, setLoanFormError] = useState<string | null>(null);
  const [loanSubmitting, setLoanSubmitting] = useState(false);

  // Payment panel state
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", note: "", paymentDate: today() });
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getLoans()
      .then((data) => { if (active) setLoans(data); })
      .catch((err) => { if (active) setPageError(err instanceof Error ? err.message : "Failed to load loans"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const totalLent = loans.reduce((sum, l) => sum + Number(l.amount), 0);
  const outstanding = loans.reduce((sum, l) => sum + Number(l.remaining_balance ?? l.amount), 0);
  const collected = totalLent - outstanding;

  // ── Loan form handlers ─────────────────────────────────────────────────────

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

    const payload: LoanRequest = {
      borrowerName: loanForm.borrowerName.trim(),
      amount: parsedAmount,
      description: loanForm.description.trim() || undefined,
      dateLent: loanForm.dateLent,
      dueDate: loanForm.dueDate || undefined,
    };

    try {
      if (editingLoan) {
        const updated = await updateLoan(editingLoan.loan_id, { ...payload, status: editingLoan.status });
        setLoans((prev) => prev.map((l) => l.loan_id === updated.loan_id ? updated : l));
      } else {
        const created = await createLoan(payload);
        setLoans((prev) => [created, ...prev]);
      }
      closeLoanForm();
    } catch (err) {
      setLoanFormError(err instanceof Error ? err.message : "Failed to save loan");
    } finally {
      setLoanSubmitting(false);
    }
  };

  const handleTogglePaid = async (loan: Loan) => {
    const newStatus = loan.status === "active" ? "paid" : "active";
    try {
      const updated = await updateLoan(loan.loan_id, {
        borrowerName: loan.borrower_name,
        amount: Number(loan.amount),
        description: loan.description ?? undefined,
        dateLent: loan.date_lent,
        dueDate: loan.due_date ?? undefined,
        status: newStatus,
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

  // ── Payment handlers ───────────────────────────────────────────────────────

  const toggleExpand = (loanId: string) => {
    if (expandedLoanId === loanId) {
      setExpandedLoanId(null);
    } else {
      setExpandedLoanId(loanId);
      setPaymentForm({ amount: "", note: "", paymentDate: today() });
      setPaymentError(null);
    }
  };

  const handleAddPayment = async (loan: Loan) => {
    const parsedAmount = parseFloat(paymentForm.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setPaymentError("Amount must be a positive number"); return; }
    if (!paymentForm.paymentDate) { setPaymentError("Payment date is required"); return; }

    setPaymentSubmitting(true);
    setPaymentError(null);

    const payload: LoanPaymentRequest = {
      amount: parsedAmount,
      note: paymentForm.note.trim() || undefined,
      paymentDate: paymentForm.paymentDate,
    };

    try {
      const created = await addPayment(loan.loan_id, payload);
      setLoans((prev) => prev.map((l) => {
        if (l.loan_id !== loan.loan_id) return l;
        const updatedPayments = [...(l.loan_payments ?? []), created];
        const paid = updatedPayments.reduce((s, p) => s + Number(p.amount), 0);
        return { ...l, loan_payments: updatedPayments, paid_amount: paid, remaining_balance: Number(l.amount) - paid };
      }));
      setPaymentForm({ amount: "", note: "", paymentDate: today() });
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Failed to add payment");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleDeletePayment = async (loan: Loan, payment: LoanPayment) => {
    if (!window.confirm(`Delete payment of ${fmt(Number(payment.amount))}?`)) return;
    try {
      await deletePayment(loan.loan_id, payment.payment_id);
      setLoans((prev) => prev.map((l) => {
        if (l.loan_id !== loan.loan_id) return l;
        const updatedPayments = (l.loan_payments ?? []).filter((p) => p.payment_id !== payment.payment_id);
        const paid = updatedPayments.reduce((s, p) => s + Number(p.amount), 0);
        return { ...l, loan_payments: updatedPayments, paid_amount: paid, remaining_balance: Number(l.amount) - paid };
      }));
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Failed to delete payment");
    }
  };

  // ── Formatters ─────────────────────────────────────────────────────────────

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const fmtDate = (d: string | null) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  };

  const isOverdue = (loan: Loan) =>
    loan.status === "active" && loan.due_date != null && new Date(loan.due_date) < new Date();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppSidebar
        active="loans"
        onGoHome={onGoHome}
        onGoLoans={() => {}}
        onGoDebtors={onGoDebtors}
        onGoEntries={onGoEntries}
        onGoProfile={onGoProfile}
        onGoLanding={onGoLanding}
        onLogout={onLogout}
      />

      {/* Main */}
      <main className="ml-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-6">
          <div>
            <h1 className="text-lg font-semibold">My Loans</h1>
            <p className="text-sm text-slate-600">Track money you've lent to friends.</p>
          </div>
          <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            <Plus className="h-4 w-4" /> Add Loan
          </button>
        </header>

        <div className="p-6 space-y-6">
          {pageError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex justify-between">
              {pageError}
              <button onClick={() => setPageError(null)} className="underline">Dismiss</button>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Total Lent", value: fmt(totalLent), sub: `${loans.length} loan${loans.length !== 1 ? "s" : ""}` },
              { label: "Outstanding", value: fmt(outstanding), sub: `${loans.filter(l => l.status === "active").length} active` },
              { label: "Collected", value: fmt(collected), sub: `${loans.filter(l => l.status === "paid").length} fully paid` },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">{s.label}</p>
                <p className="mt-1 text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Add / Edit loan form */}
          {showLoanForm && (
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">{editingLoan ? "Edit Loan" : "New Loan"}</h2>
                <button onClick={closeLoanForm} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
              </div>
              {loanFormError && (
                <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{loanFormError}</p>
              )}
              <form onSubmit={handleLoanSubmit} className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Borrower Name *</label>
                  <input type="text" value={loanForm.borrowerName} onChange={(e) => setLoanForm({ ...loanForm, borrowerName: e.target.value })} placeholder="e.g. John Doe" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (USD) *</label>
                  <input type="number" min="0.01" step="0.01" value={loanForm.amount} onChange={(e) => setLoanForm({ ...loanForm, amount: e.target.value })} placeholder="0.00" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date Lent *</label>
                  <input type="date" value={loanForm.dateLent} onChange={(e) => setLoanForm({ ...loanForm, dateLent: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                  <input type="date" value={loanForm.dueDate} onChange={(e) => setLoanForm({ ...loanForm, dueDate: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <input type="text" value={loanForm.description} onChange={(e) => setLoanForm({ ...loanForm, description: e.target.value })} placeholder="What was the loan for?" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none" />
                </div>
                <div className="md:col-span-2 flex justify-end gap-3">
                  <button type="button" onClick={closeLoanForm} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={loanSubmitting} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                    {loanSubmitting ? "Saving…" : editingLoan ? "Update Loan" : "Add Loan"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Loans table */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b px-6 py-4">
              <h2 className="text-base font-semibold">Loan Records</h2>
            </div>

            {loading ? (
              <div className="px-6 py-12 text-center text-sm text-slate-400">Loading…</div>
            ) : loans.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Banknote className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">No loans yet. Click "Add Loan" to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">Borrower</th>
                      <th className="px-4 py-3">Loaned</th>
                      <th className="px-4 py-3">Remaining</th>
                      <th className="px-4 py-3">Lent On</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map((loan) => {
                      const remaining = Number(loan.remaining_balance ?? loan.amount);
                      const isExpanded = expandedLoanId === loan.loan_id;
                      const payments = loan.loan_payments ?? [];

                      return (
                        <>
                          <tr key={loan.loan_id} className={`border-b hover:bg-slate-50 ${isExpanded ? "bg-slate-50" : ""}`}>
                            <td className="px-4 py-3 font-medium">{loan.borrower_name}</td>
                            <td className="px-4 py-3 font-semibold">{fmt(Number(loan.amount))}</td>
                            <td className="px-4 py-3">
                              <span className={remaining <= 0 ? "text-green-600 font-semibold" : "font-semibold text-amber-600"}>
                                {fmt(remaining)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{fmtDate(loan.date_lent)}</td>
                            <td className="px-4 py-3">
                              {loan.due_date
                                ? <span className={isOverdue(loan) ? "text-red-600 font-medium" : "text-slate-600"}>{fmtDate(loan.due_date)}</span>
                                : <span className="text-slate-400">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${loan.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                {loan.status === "paid" ? "Paid" : "Active"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button onClick={() => toggleExpand(loan.loan_id)} title={isExpanded ? "Hide payments" : "Show payments"} className={`rounded p-1 hover:bg-slate-100 ${isExpanded ? "text-slate-700" : "text-slate-400 hover:text-slate-700"}`}>
                                  <Receipt className="h-4 w-4" />
                                  {isExpanded ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />}
                                </button>
                                <button onClick={() => handleTogglePaid(loan)} title={loan.status === "paid" ? "Mark active" : "Mark paid"} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-green-600">
                                  {loan.status === "paid" ? <RotateCcw className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                </button>
                                <button onClick={() => openEdit(loan)} title="Edit" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleDeleteLoan(loan.loan_id)} title="Delete" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded payment panel */}
                          {isExpanded && (
                            <tr key={`${loan.loan_id}-payments`}>
                              <td colSpan={7} className="border-b bg-slate-50 px-6 py-4">
                                <div className="max-w-2xl space-y-4">
                                  <p className="text-sm font-semibold text-slate-700">
                                    Payment History — {fmt(Number(loan.paid_amount ?? 0))} paid of {fmt(Number(loan.amount))}
                                  </p>

                                  {payments.length === 0 ? (
                                    <p className="text-sm text-slate-400">No payments recorded yet.</p>
                                  ) : (
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                                          <th className="pb-2">Date</th>
                                          <th className="pb-2">Amount</th>
                                          <th className="pb-2">Note</th>
                                          <th className="pb-2"></th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {[...payments].sort((a, b) => a.payment_date.localeCompare(b.payment_date)).map((p) => (
                                          <tr key={p.payment_id} className="text-sm">
                                            <td className="py-2 pr-4 text-slate-600">{fmtDate(p.payment_date)}</td>
                                            <td className="py-2 pr-4 font-medium text-green-700">{fmt(Number(p.amount))}</td>
                                            <td className="py-2 pr-4 text-slate-500">{p.note || "—"}</td>
                                            <td className="py-2">
                                              <button onClick={() => handleDeletePayment(loan, p)} className="rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-red-500">
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}

                                  {/* Add payment form */}
                                  {remaining > 0 && (
                                    <div className="border-t border-slate-200 pt-4">
                                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                                        Log a Payment ({fmt(remaining)} remaining)
                                      </p>
                                      {paymentError && (
                                        <p className="mb-3 text-sm text-red-600">{paymentError}</p>
                                      )}
                                      <div className="flex flex-wrap gap-3 items-end">
                                        <div>
                                          <label className="block text-xs font-medium text-slate-600 mb-1">Amount *</label>
                                          <input type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder="0.00" className="w-28 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none" />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-slate-600 mb-1">Date *</label>
                                          <input type="date" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none" />
                                        </div>
                                        <div className="flex-1 min-w-32">
                                          <label className="block text-xs font-medium text-slate-600 mb-1">Note</label>
                                          <input type="text" value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} placeholder="Optional note" className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none" />
                                        </div>
                                        <button onClick={() => handleAddPayment(loan)} disabled={paymentSubmitting} className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                                          {paymentSubmitting ? "Saving…" : "Add Payment"}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  {remaining <= 0 && (
                                    <p className="text-sm font-medium text-green-600">Fully paid off.</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Loans;
