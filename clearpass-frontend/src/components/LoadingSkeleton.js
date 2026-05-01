// --- LOADING SKELETON ---
export function SkeletonLine({ className = "" }) {
  return (
    <div
      className={`animate-pulse bg-[#1e1e35] rounded ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-[#111120] rounded-xl border border-[#1e1e35] p-5 space-y-3" aria-hidden="true">
      <SkeletonLine className="h-3 w-1/2" />
      <SkeletonLine className="h-8 w-2/5" />
      <SkeletonLine className="h-3 w-3/4" />
    </div>
  );
}

export function SkeletonTableRows({ rows = 5, cols = 4 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} aria-hidden="true">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className={`animate-pulse bg-[#1e1e35] rounded h-3 ${j === 0 ? "w-4/5" : j === 1 ? "w-3/5" : "w-2/5"}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
