import { useEffect, useState } from "react";
import { FileText, Lock, Printer, X } from "lucide-react";
import { type Loan, getLoanProof } from "../api";
import { getAgreementSettings } from "../settingsStore";

interface Props {
  loan: Loan;
  lenderName: string;
  onClose: () => void;
}

const FREQ_LABELS: Record<string, string> = {
  none: "One-time / On-demand",
  weekly: "Weekly",
  semimonthly: "Semi-Monthly (Bi-Monthly)",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const s = d.split("T")[0];
  const [y, m, day] = s.split("-");
  return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function php(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function computeInterest(principal: number, monthlyRate: number, frequency: string, dateLent: string, dueDate: string | null) {
  if (!dueDate || monthlyRate <= 0) return null;

  const start = new Date(dateLent);
  const end = new Date(dueDate);
  const daysDiff = Math.max(0, (end.getTime() - start.getTime()) / 86400000);
  const months = daysDiff / 30.4375;

  let periods: number;
  switch (frequency) {
    case "weekly":       periods = Math.max(1, Math.round(daysDiff / 7)); break;
    case "semimonthly":  periods = Math.max(1, Math.round(months * 2)); break;
    case "monthly":      periods = Math.max(1, Math.round(months)); break;
    case "quarterly":    periods = Math.max(1, Math.round(months / 3)); break;
    default:             periods = Math.max(1, Math.round(months)); break;
  }

  const totalInterest = principal * (monthlyRate / 100) * periods;
  const totalDue = principal + totalInterest;
  const paymentPerPeriod = frequency === "none" ? totalDue : totalDue / periods;

  return { totalInterest, totalDue, periods, paymentPerPeriod };
}

function buildPrintHtml(opts: {
  lenderName: string;
  loan: Loan;
  todayStr: string;
  sigHtml: string;
  additionalTerms: string;
}) {
  const { lenderName, loan, todayStr, sigHtml, additionalTerms } = opts;
  const desc = loan.description?.trim();
  const dueDate = loan.due_date;
  const principal = Number(loan.amount);
  const rate = Number(loan.interest_rate ?? 0);
  const freq = loan.payment_frequency ?? "none";
  const interest = computeInterest(principal, rate, freq, loan.date_lent, dueDate);
  let sec = 1;
  const s = () => `SECTION ${sec++}`;
  const extraTerms = additionalTerms.trim();

  return `<!DOCTYPE html><html><head>
<title>Loan Agreement — ${loan.borrower_name}</title>
<style>
  body{font-family:"Times New Roman",serif;max-width:720px;margin:40px auto;line-height:1.8;color:#111;font-size:14px}
  h1{text-align:center;font-size:20px;text-transform:uppercase;letter-spacing:3px;margin:0 0 6px}
  .subtitle{text-align:center;font-size:11px;color:#555;margin-bottom:4px}
  h2{font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:22px 0 6px}
  hr{border:none;border-top:2px solid #111;margin:18px 0}
  .hr-thin{border:none;border-top:1px solid #aaa;margin:14px 0}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin:18px 0}
  .party-label{font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;color:#444}
  .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:28px}
  .sig-label{font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
  .sig-line{border-bottom:1px solid #333;width:280px;height:72px;display:block}
  .sig-meta{font-size:11px;color:#555;margin-top:4px}
  .footer{text-align:center;font-size:11px;color:#999;margin-top:40px}
  p{margin:0 0 8px}ul{margin:4px 0 8px;padding-left:20px}li{margin-bottom:2px}
</style>
</head><body>
<h1>Personal Loan Agreement</h1>
<p class="subtitle">A Legally Binding Agreement</p>
<hr/>
<p>This Personal Loan Agreement ("Agreement") is entered into as of <strong>${fmtDate(loan.date_lent)}</strong>, by and between:</p>
<div class="parties">
  <div><div class="party-label">Lender</div><p><strong>${lenderName}</strong></p></div>
  <div><div class="party-label">Borrower</div><p><strong>${loan.borrower_name}</strong></p></div>
</div>
<hr/>
<h2>${s()} — Loan Amount</h2>
<p>The Lender agrees to loan the Borrower the principal sum of <strong>${php(principal)}</strong>. The Borrower acknowledges receipt of this amount on <strong>${fmtDate(loan.date_lent)}</strong>.</p>
<h2>${s()} — Repayment</h2>
<p>${dueDate
  ? `The Borrower agrees to repay the full amount due of <strong>${php(interest ? interest.totalDue : principal)}</strong> on or before <strong>${fmtDate(dueDate)}</strong>.`
  : `The Borrower agrees to repay the full amount due of <strong>${php(interest ? interest.totalDue : principal)}</strong> upon demand by the Lender.`}</p>
${interest ? `<h2>${s()} — Interest &amp; Schedule</h2>
<p>A monthly add-on interest rate of <strong>${rate}%</strong> applies. Total interest: <strong>${php(interest.totalInterest)}</strong>. Total amount due: <strong>${php(interest.totalDue)}</strong>. Payment schedule: <strong>${FREQ_LABELS[freq] ?? freq}</strong> — ${interest.periods} payment${interest.periods !== 1 ? "s" : ""} of approximately <strong>${php(interest.paymentPerPeriod)}</strong> each.</p>` : `<h2>${s()} — Interest</h2><p>This loan is granted interest-free. Any interest charges require a separate written amendment signed by both parties.</p>`}
${desc ? `<h2>${s()} — Purpose of Loan</h2><p>${desc}</p>` : ""}
<h2>${s()} — Default</h2>
<p>Should the Borrower fail to repay the loan by the agreed date, the Lender reserves the right to pursue all available legal remedies to recover the outstanding balance, including civil legal action.</p>
${extraTerms ? `<h2>${s()} — Additional Terms</h2><p>${extraTerms.replace(/\n/g, "<br/>")}</p>` : ""}
<h2>${s()} — Acknowledgment &amp; Signatures</h2>
<p>By signing below, each party confirms they have read, understood, and agreed to the terms of this Agreement.</p>
<div class="hr-thin"></div>
<div class="sig-grid">
  <div><div class="sig-label">Lender's Signature</div><span class="sig-line"></span><div class="sig-meta">Name: ${lenderName}<br/>Date: ${todayStr}</div></div>
  <div><div class="sig-label">Borrower's Signature</div>${sigHtml}<div class="sig-meta">Name: ${loan.borrower_name}<br/>Date: ${fmtDate(loan.date_lent)}</div></div>
</div>
<hr/>
<p class="footer">Generated by LoanBuddy &middot; ${todayStr}</p>
</body></html>`;
}

export default function LoanDetailModal({ loan, lenderName, onClose }: Props) {
  const [proofDataUrl, setProofDataUrl] = useState<string | null>(null);
  const [proofLoading, setProofLoading] = useState(true);
  const [additionalTerms, setAdditionalTerms] = useState("");

  useEffect(() => {
    const s = getAgreementSettings();
    const effectiveLender = s.lenderNameOverride.trim() || lenderName;
    void effectiveLender;
    setAdditionalTerms(s.additionalTerms);

    setProofLoading(true);
    getLoanProof(loan.loan_id)
      .then((blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onload = (e) => setProofDataUrl((e.target?.result as string) ?? null);
          reader.readAsDataURL(blob);
        }
      })
      .catch(() => {})
      .finally(() => setProofLoading(false));
  }, [loan.loan_id, lenderName]);

  const payments = [...(loan.loan_payments ?? [])].sort((a, b) => a.payment_date.localeCompare(b.payment_date));
  const principal = Number(loan.amount);
  const monthlyRate = Number(loan.interest_rate ?? 0);
  const freq = loan.payment_frequency ?? "none";
  const interest = computeInterest(principal, monthlyRate, freq, loan.date_lent, loan.due_date);

  const totalDue = interest ? interest.totalDue : principal;
  const paidAmount = Number(loan.paid_amount ?? 0);
  const remaining = Math.max(0, totalDue - paidAmount);
  const paidPct = totalDue > 0 ? Math.min(100, Math.round((paidAmount / totalDue) * 100)) : 0;
  const isOverdue = loan.status === "active" && loan.due_date != null && new Date(loan.due_date) < new Date();

  const settings = getAgreementSettings();
  const effectiveLenderName = settings.lenderNameOverride.trim() || lenderName;
  const todayStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const sigHtml = proofDataUrl
      ? `<img src="${proofDataUrl}" style="max-width:280px;height:72px;object-fit:contain;display:block;" />`
      : `<span class="sig-line"></span>`;
    w.document.write(buildPrintHtml({ lenderName: effectiveLenderName, loan, todayStr, sigHtml, additionalTerms }));
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-full max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white">
              {loan.borrower_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">{loan.borrower_name}</h2>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  loan.status === "paid" ? "bg-emerald-100 text-emerald-700"
                  : isOverdue ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-700"
                }`}>
                  {loan.status === "paid" ? "Paid" : isOverdue ? "Overdue" : "Active"}
                </span>
              </div>
              <p className="text-xs text-slate-400">ID: {loan.loan_id.slice(0, 8)}…</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" /> Print Agreement
            </button>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Financial summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Principal</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{php(principal)}</p>
              {interest && (
                <p className="mt-0.5 text-[11px] text-slate-400">Total due: {php(interest.totalDue)}</p>
              )}
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center">
              <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-500">Paid</p>
              <p className="mt-1 text-lg font-bold text-emerald-700">{php(paidAmount)}</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-center">
              <p className="text-[11px] font-medium uppercase tracking-wider text-rose-400">Remaining</p>
              <p className="mt-1 text-lg font-bold text-rose-700">{php(remaining)}</p>
            </div>
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>Repayment progress</span><span className="font-semibold">{paidPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all ${loan.status === "paid" ? "bg-emerald-500" : "bg-sky-400"}`}
                style={{ width: `${paidPct}%` }}
              />
            </div>
          </div>

          {/* Loan details */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Loan Details</p>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div><dt className="text-[11px] text-slate-400">Date Lent</dt><dd className="font-medium text-slate-800">{fmtDate(loan.date_lent)}</dd></div>
              <div>
                <dt className="text-[11px] text-slate-400">Due Date</dt>
                <dd className={`font-medium ${isOverdue ? "text-red-600" : "text-slate-800"}`}>{fmtDate(loan.due_date)}</dd>
              </div>
              <div><dt className="text-[11px] text-slate-400">Lender</dt><dd className="font-medium text-slate-800">{effectiveLenderName}</dd></div>
              <div><dt className="text-[11px] text-slate-400">Borrower</dt><dd className="font-medium text-slate-800">{loan.borrower_name}</dd></div>
              <div>
                <dt className="text-[11px] text-slate-400">Monthly Interest Rate</dt>
                <dd className="font-medium text-slate-800">{monthlyRate > 0 ? `${monthlyRate}% / month (add-on)` : "None (interest-free)"}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-400">Payment Schedule</dt>
                <dd className="font-medium text-slate-800">{FREQ_LABELS[freq] ?? freq}</dd>
              </div>
              {interest && (
                <>
                  <div>
                    <dt className="text-[11px] text-slate-400">Total Interest</dt>
                    <dd className="font-medium text-amber-700">{php(interest.totalInterest)}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-slate-400">Payment per Period</dt>
                    <dd className="font-medium text-slate-800">{php(interest.paymentPerPeriod)}</dd>
                  </div>
                </>
              )}
              <div><dt className="text-[11px] text-slate-400">Status</dt><dd className="font-medium capitalize text-slate-800">{loan.status}</dd></div>
              <div><dt className="text-[11px] text-slate-400">Payments Made</dt><dd className="font-medium text-slate-800">{payments.length}</dd></div>
              {loan.description && (
                <div className="col-span-2">
                  <dt className="text-[11px] text-slate-400">Description / Purpose</dt>
                  <dd className="font-medium text-slate-800">{loan.description}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Agreement proof — read-only */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Agreement Proof / Borrower Signature</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                <Lock className="h-2.5 w-2.5" /> Read-only
              </span>
            </div>

            {proofLoading ? (
              <p className="text-xs text-slate-400 animate-pulse">Loading…</p>
            ) : proofDataUrl ? (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {proofDataUrl.startsWith("data:application/pdf") ? (
                  <div className="flex items-center gap-2 p-4 text-sm text-slate-600">
                    <FileText className="h-5 w-5 text-rose-400" /> PDF agreement document
                  </div>
                ) : (
                  <img src={proofDataUrl} alt="Borrower signature" className="max-h-48 w-full object-contain p-2" />
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No signature or proof recorded for this loan.</p>
            )}
          </div>

          {/* Payment history */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment History</p>
              <p className="text-xs text-slate-400">{payments.length} record{payments.length !== 1 ? "s" : ""}</p>
            </div>
            {payments.length === 0 ? (
              <p className="text-sm text-slate-400">No payments recorded yet.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {payments.map((p) => (
                      <tr key={p.payment_id}>
                        <td className="px-3 py-2 text-slate-600">{fmtDate(p.payment_date)}</td>
                        <td className="px-3 py-2 font-semibold text-emerald-700">{php(Number(p.amount))}</td>
                        <td className="px-3 py-2 text-slate-500">{p.note || <span className="text-slate-300">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
