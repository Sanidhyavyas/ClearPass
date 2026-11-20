import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import API from "../services/api";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatStatus = (value) => {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3 border-b border-[#1e1e35] last:border-b-0">
      <dt className="text-sm text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-slate-100 text-right">{value}</dd>
    </div>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-[#09090f] flex flex-col">
      <header className="px-6 sm:px-8 py-5 border-b border-[#1e1e35]">
        <Link to="/login" className="inline-flex items-center gap-2.5" aria-label="ClearPass home">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <span className="text-white font-semibold text-lg tracking-wide">ClearPass</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-lg">{children}</div>
      </main>

      <footer className="px-6 py-5 text-center text-xs text-slate-500">
        ClearPass — Academic Clearance System
      </footer>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="bg-[#111120] rounded-2xl border border-[#1e1e35] p-8 text-center shadow-xl" role="status" aria-live="polite">
      <div className="mx-auto w-12 h-12 rounded-full border-2 border-[#252550] border-t-blue-500 animate-spin" aria-hidden="true" />
      <h1 className="mt-5 text-lg font-semibold text-slate-100">Verifying certificate</h1>
      <p className="mt-2 text-sm text-slate-400">Please wait while we check this certificate.</p>
    </div>
  );
}

function InvalidState() {
  return (
    <div className="bg-[#111120] rounded-2xl border border-[#1e1e35] p-8 text-center shadow-xl">
      <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM10.34 3.94l-7.5 13A1.5 1.5 0 004.16 19h15.68a1.5 1.5 0 001.32-2.06l-7.5-13a1.5 1.5 0 00-2.64 0z" />
        </svg>
      </div>
      <h1 className="mt-5 text-lg font-semibold text-slate-100">Certificate not found</h1>
      <p className="mt-2 text-sm text-slate-400">
        This verification link is invalid or the certificate is no longer available.
      </p>
      <Link to="/login" className="inline-flex mt-6 px-4 py-2 rounded-lg bg-[#1a1a2e] border border-[#252550] text-sm font-medium text-slate-200 hover:bg-[#252540] transition-colors">
        Return to ClearPass
      </Link>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="bg-[#111120] rounded-2xl border border-[#1e1e35] p-8 text-center shadow-xl">
      <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 6.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h1 className="mt-5 text-lg font-semibold text-slate-100">Verification unavailable</h1>
      <p className="mt-2 text-sm text-slate-400">{message || "We could not reach the verification service."}</p>
      <button type="button" onClick={onRetry} className="mt-6 px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-500 transition-colors">
        Try again
      </button>
    </div>
  );
}

function ValidState({ data }) {
  const approved = String(data.clearance_status || "").toLowerCase() === "approved";

  return (
    <div className="bg-[#111120] rounded-2xl border border-[#1e1e35] shadow-xl overflow-hidden">
      <div className="px-8 pt-8 pb-6 text-center border-b border-[#1e1e35]">
        <div className={`mx-auto w-14 h-14 rounded-full border flex items-center justify-center ${
          approved
            ? "bg-emerald-500/10 border-emerald-500/30"
            : "bg-blue-500/10 border-blue-500/30"
        }`} aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-7 w-7 ${approved ? "text-emerald-400" : "text-blue-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="mt-5 text-xl font-bold text-slate-100">Certificate verified</h1>
        <p className="mt-2 text-sm text-slate-400">
          This certificate was issued by ClearPass and the record is valid.
        </p>
        <span className={`inline-flex mt-4 items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
          approved
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            : "bg-blue-500/10 border-blue-500/30 text-blue-300"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${approved ? "bg-emerald-400" : "bg-blue-400"}`} aria-hidden="true" />
          {formatStatus(data.clearance_status)}
        </span>
      </div>

      <dl className="px-8 py-4">
        <DetailRow label="Student" value={data.student_name || "—"} />
        <DetailRow label="Department" value={data.department || "—"} />
        <DetailRow label="Clearance status" value={formatStatus(data.clearance_status)} />
        <DetailRow label="Issued on" value={formatDate(data.issued_at)} />
        <DetailRow label="Approved on" value={formatDate(data.approved_at)} />
      </dl>

      <div className="px-8 pb-8 pt-2">
        <p className="text-xs text-slate-500 leading-relaxed">
          This page confirms the certificate record stored by ClearPass. If you believe this record is incorrect, contact your institution.
        </p>
      </div>
    </div>
  );
}

function VerifyCertificate() {
  const { token } = useParams();
  const [state, setState] = useState({ status: "loading", data: null, message: "" });

  useEffect(() => {
    let cancelled = false;
    document.title = "Certificate Verification – ClearPass";

    const load = async () => {
      if (!token) {
        setState({ status: "invalid", data: null, message: "" });
        return;
      }

      setState({ status: "loading", data: null, message: "" });

      try {
        const res = await API.get(`/api/verify/${encodeURIComponent(token)}`);
        if (cancelled) return;

        if (res.data?.valid) {
          setState({ status: "valid", data: res.data, message: "" });
        } else {
          setState({ status: "invalid", data: null, message: "" });
        }
      } catch (error) {
        if (cancelled) return;

        if (error.response?.status === 404) {
          setState({ status: "invalid", data: null, message: "" });
        } else {
          setState({
            status: "error",
            data: null,
            message: error.response?.data?.message || "We could not reach the verification service.",
          });
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      document.title = "ClearPass";
    };
  }, [token]);

  return (
    <Shell>
      {state.status === "loading" && <LoadingState />}
      {state.status === "valid" && <ValidState data={state.data} />}
      {state.status === "invalid" && <InvalidState />}
      {state.status === "error" && (
        <ErrorState
          message={state.message}
          onRetry={() => {
            setState({ status: "loading", data: null, message: "" });
            API.get(`/api/verify/${encodeURIComponent(token)}`)
              .then((res) => {
                if (res.data?.valid) {
                  setState({ status: "valid", data: res.data, message: "" });
                } else {
                  setState({ status: "invalid", data: null, message: "" });
                }
              })
              .catch((error) => {
                if (error.response?.status === 404) {
                  setState({ status: "invalid", data: null, message: "" });
                } else {
                  setState({
                    status: "error",
                    data: null,
                    message: error.response?.data?.message || "We could not reach the verification service.",
                  });
                }
              });
          }}
        />
      )}
    </Shell>
  );
}

export default VerifyCertificate;
