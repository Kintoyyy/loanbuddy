import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Printer, X } from "lucide-react";
import SignaturePad from "./SignaturePad";
import { getAgreementSettings } from "../settingsStore";

interface Props {
  lenderName: string;
  borrowerName: string;
  amount: number;
  currency?: string;
  dateLent: string;
  dueDate?: string | null;
  description?: string | null;
  onClose: () => void;
  onSign: (signature: File) => Promise<void>;
}

function fmtLongDate(d: string) {
  const [y, m, day] = d.split("-");
  return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function fmtMoney(n: number, currency: string) {
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildAgreementHtml(opts: {
  lenderName: string;
  borrowerName: string;
  amount: number;
  currency: string;
  dateLent: string;
  dueDate?: string | null;
  description?: string | null;
  additionalTerms?: string;
  todayStr: string;
  sigHtml: string;
}) {
  const { lenderName, borrowerName, amount, currency, dateLent, dueDate, description, additionalTerms, todayStr, sigHtml } = opts;
  const desc = description?.trim();
  const extraTerms = additionalTerms?.trim();
  const s = (n: number) => `SECTION ${n}`;
  let sec = 1;
  return `<!DOCTYPE html><html><head>
<title>Loan Agreement — ${borrowerName}</title>
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
  .sig-line{border-bottom:1px solid #333;width:280px;height:72px}
  .sig-meta{font-size:11px;color:#555;margin-top:4px}
  .footer{text-align:center;font-size:11px;color:#999;margin-top:40px}
  p{margin:0 0 8px}
  ul{margin:4px 0 8px;padding-left:20px}
  li{margin-bottom:2px}
</style>
</head><body>
<h1>Personal Loan Agreement</h1>
<p class="subtitle">A legally binding agreement between the parties named below</p>
<hr/>
<p>This Personal Loan Agreement ("Agreement") is entered into as of <strong>${fmtLongDate(dateLent)}</strong>, by and between:</p>
<div class="parties">
  <div><div class="party-label">Lender</div><p><strong>${lenderName}</strong></p></div>
  <div><div class="party-label">Borrower</div><p><strong>${borrowerName}</strong></p></div>
</div>
<hr/>
<h2>${s(sec++)} — Loan Amount</h2>
<p>The Lender agrees to loan the Borrower the principal sum of <strong>${fmtMoney(amount, currency)}</strong>. The Borrower hereby acknowledges receipt of this amount on <strong>${fmtLongDate(dateLent)}</strong>.</p>
<h2>${s(sec++)} — Repayment</h2>
<p>${dueDate
    ? `The Borrower agrees to repay the full principal amount of <strong>${fmtMoney(amount, currency)}</strong> to the Lender on or before <strong>${fmtLongDate(dueDate)}</strong>.`
    : `The Borrower agrees to repay the full principal amount of <strong>${fmtMoney(amount, currency)}</strong> to the Lender upon demand.`
}</p>
${desc ? `<h2>${s(sec++)} — Purpose of Loan</h2><p>${desc}</p>` : ""}
<h2>${s(sec++)} — Interest</h2>
<p>This loan is granted interest-free. Any interest charges require a separate written amendment to this Agreement executed by both parties.</p>
<h2>${s(sec++)} — Default</h2>
<p>In the event the Borrower fails to repay the loan amount by the agreed date, the Lender reserves the right to pursue all available legal remedies to recover the outstanding balance, including but not limited to civil legal action.</p>
<h2>${s(sec++)} — Entire Agreement</h2>
<p>This Agreement constitutes the entire understanding between the parties with respect to the subject matter hereof and supersedes all prior discussions, negotiations, and agreements.</p>
${extraTerms ? `<h2>${s(sec++)} — Additional Terms</h2><p>${extraTerms.replace(/\n/g, "<br/>")}</p>` : ""}
<h2>${s(sec++)} — Acknowledgment &amp; Signatures</h2>
<p>By signing below, each party confirms they have read, understood, and voluntarily agreed to the terms of this Agreement:</p>
<ul>
  <li>The Borrower acknowledges receipt of the loan amount stated above.</li>
  <li>The Borrower agrees to the repayment terms and schedule.</li>
  <li>Both parties accept the obligations set forth in this Agreement.</li>
</ul>
<div class="hr-thin"></div>
<div class="sig-grid">
  <div>
    <div class="sig-label">Lender's Signature</div>
    <div class="sig-line"></div>
    <div class="sig-meta">Name: ${lenderName}<br/>Date: ${todayStr}</div>
  </div>
  <div>
    <div class="sig-label">Borrower's Signature</div>
    ${sigHtml}
    <div class="sig-meta">Name: ${borrowerName}<br/>Date: ${todayStr}</div>
  </div>
</div>
<hr/>
<p class="footer">Generated by LoanBuddy &middot; ${todayStr}</p>
</body></html>`;
}

export default function AgreementModal({
  lenderName, borrowerName, amount, currency = "PHP",
  dateLent, dueDate, description, onClose, onSign,
}: Props) {
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [effectiveLenderName, setEffectiveLenderName] = useState(lenderName);
  const [additionalTerms, setAdditionalTerms] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = getAgreementSettings();
    setEffectiveLenderName(s.lenderNameOverride.trim() || lenderName);
    setAdditionalTerms(s.additionalTerms);
  }, [lenderName]);

  const todayStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const handleSigned = useCallback((file: File) => {
    setSignatureFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setSignatureDataUrl((e.target?.result as string) ?? null);
    reader.readAsDataURL(file);
  }, []);

  const handleClear = useCallback(() => {
    setSignatureFile(null);
    setSignatureDataUrl(null);
  }, []);

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const sigHtml = signatureDataUrl
      ? `<img src="${signatureDataUrl}" style="max-width:280px;height:72px;object-fit:contain;display:block;border-bottom:1px solid #333;" />`
      : `<div class="sig-line"></div>`;
    w.document.write(buildAgreementHtml({ lenderName: effectiveLenderName, borrowerName, amount, currency, dateLent, dueDate, description, additionalTerms, todayStr, sigHtml }));
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  const handleSign = async () => {
    if (!signatureFile) return;
    setSigning(true);
    try {
      await onSign(signatureFile);
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-full max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-600" />
            <h2 className="text-base font-semibold text-slate-900">Loan Agreement</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" /> Print / Save PDF
            </button>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Document body */}
        <div className="flex-1 overflow-y-auto">
          <div ref={ref} className="p-8 font-serif leading-relaxed text-slate-800">

            <h1 className="text-center text-[22px] font-bold uppercase tracking-[0.15em]">
              Personal Loan Agreement
            </h1>
            <p className="mt-1 text-center text-[11px] text-slate-400 uppercase tracking-widest">
              A Legally Binding Agreement
            </p>

            <div className="my-5 border-t-2 border-slate-800" />

            <p className="text-sm">
              This Personal Loan Agreement ("Agreement") is entered into as of{" "}
              <strong>{fmtLongDate(dateLent)}</strong>, by and between:
            </p>

            <div className="my-5 grid grid-cols-2 gap-8">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Lender</p>
                <p className="font-semibold text-slate-900">{effectiveLenderName}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Borrower</p>
                <p className="font-semibold text-slate-900">{borrowerName}</p>
              </div>
            </div>

            <div className="my-5 border-t border-slate-300" />

            {([
              ["Section 1 — Loan Amount",
                <p className="text-sm" key="s1">
                  The Lender agrees to loan the Borrower the principal sum of{" "}
                  <strong>{fmtMoney(amount, currency)}</strong>. The Borrower hereby
                  acknowledges receipt of this amount on{" "}
                  <strong>{fmtLongDate(dateLent)}</strong>.
                </p>
              ],
              ["Section 2 — Repayment",
                <p className="text-sm" key="s2">
                  {dueDate
                    ? <>The Borrower agrees to repay the full principal amount of{" "}
                        <strong>{fmtMoney(amount, currency)}</strong> on or before{" "}
                        <strong>{fmtLongDate(dueDate)}</strong>.</>
                    : <>The Borrower agrees to repay the full principal amount of{" "}
                        <strong>{fmtMoney(amount, currency)}</strong> upon demand by the Lender.</>
                  }
                </p>
              ],
              ...(description?.trim() ? [["Section 3 — Purpose of Loan",
                <p className="text-sm" key="s3">{description.trim()}</p>
              ]] : []),
              [`Section ${description?.trim() ? "4" : "3"} — Interest`,
                <p className="text-sm" key="s4">
                  This loan is granted interest-free. Any interest charges require a
                  separate written amendment signed by both parties.
                </p>
              ],
              [`Section ${description?.trim() ? "5" : "4"} — Default`,
                <p className="text-sm" key="s5">
                  Should the Borrower fail to repay the loan by the agreed date, the
                  Lender reserves the right to pursue all available legal remedies to
                  recover the outstanding balance.
                </p>
              ],
              [`Section ${description?.trim() ? "6" : "5"} — Acknowledgment`,
                <>
                  <p className="text-sm" key="s6a">
                    By signing below, each party confirms they have read, understood,
                    and voluntarily agreed to the terms of this Agreement:
                  </p>
                  <ul className="mt-1 list-disc list-inside space-y-0.5 text-sm" key="s6b">
                    <li>The Borrower acknowledges receipt of the loan amount stated above.</li>
                    <li>The Borrower agrees to the repayment terms and schedule.</li>
                    <li>Both parties accept the obligations set forth in this Agreement.</li>
                  </ul>
                </>
              ],
            ] as [string, React.ReactNode][]).map(([title, body]) => (
              <div key={title as string} className="mt-5">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">{title as string}</p>
                {body}
              </div>
            ))}

            {additionalTerms.trim() && (
              <div className="mt-5">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Additional Terms</p>
                <p className="whitespace-pre-wrap text-sm">{additionalTerms.trim()}</p>
              </div>
            )}

            <div className="my-6 border-t border-slate-300" />

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Lender's Signature
                </p>
                <div className="h-16 border-b border-slate-400" />
                <p className="mt-1.5 text-[11px] text-slate-500">Name: {effectiveLenderName}</p>
                <p className="text-[11px] text-slate-500">Date: {todayStr}</p>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Borrower's Signature
                </p>
                <SignaturePad onSigned={handleSigned} onClear={handleClear} />
                <p className="mt-1.5 text-[11px] text-slate-500">Name: {borrowerName}</p>
                <p className="text-[11px] text-slate-500">Date: {todayStr}</p>
              </div>
            </div>

            <div className="my-5 border-t border-slate-300" />
            <p className="text-center text-[11px] text-slate-400">
              Generated by LoanBuddy &middot; {todayStr}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <p className="text-xs text-slate-400">
            {signatureFile ? "Signature captured — click Save to store it." : "Draw the borrower's signature above, then save."}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={handleSign}
              disabled={!signatureFile || signing}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {signing ? "Saving…" : "Sign & Save Agreement"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
