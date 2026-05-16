// --- LOADING SKELETON ---
export function SkeletonLine({ className = "" }) {
  return (
    <div
      className={`animate-pulse bg-[#1e1e35] rounded ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCircle({ size = "h-10 w-10" }) {
  return (
    <div
      className={`animate-pulse bg-[#1e1e35] rounded-full ${size}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonAvatar({ size = "h-12 w-12" }) {
  return (
    <div className={`animate-pulse bg-[#1e1e35] rounded-full ${size} flex items-center justify-center`} aria-hidden="true">
      <div className="h-1/2 w-1/2 bg-[#2a2a4a] rounded-full" />
    </div>
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
        <tr key={`skel-row-${i}`} aria-hidden="true">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={`skel-col-${j}`} className="px-4 py-3">
              <div className={`animate-pulse bg-[#1e1e35] rounded h-3 ${j === 0 ? "w-4/5" : j === 1 ? "w-3/5" : "w-2/5"}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
