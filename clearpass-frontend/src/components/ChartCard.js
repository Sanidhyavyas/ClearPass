// --- CHART CARD ---
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = {
  pending: "#f59e0b",
  approved: "#16a34a",
  rejected: "#dc2626",
  students: "#2563eb",
  teachers: "#7c3aed",
  admins: "#ea580c",
};

export function StatusBarChart({ pending = 0, approved = 0, rejected = 0 }) {
  const data = [
    { name: "Pending",  value: pending,  fill: COLORS.pending  },
    { name: "Approved", value: approved, fill: COLORS.approved },
    { name: "Rejected", value: rejected, fill: COLORS.rejected },
  ];

  return (
    <div className="bg-[#111120] rounded-xl border border-[#1e1e35] p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">Request Breakdown</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: "8px", border: "1px solid #252550", background: "#1a1a2e", color: "#e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.4)", fontSize: "12px" }}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function UserPieChart({ students = 0, teachers = 0, admins = 0 }) {
  const data = [
    { name: "Students", value: students, fill: COLORS.students },
    { name: "Teachers", value: teachers, fill: COLORS.teachers },
    { name: "Admins",   value: admins,   fill: COLORS.admins   },
  ].filter((d) => d.value > 0);

  if (!data.length) return null;

  return (
    <div className="bg-[#111120] rounded-xl border border-[#1e1e35] p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">User Distribution</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={72}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={{ stroke: "#475569", strokeWidth: 1 }}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: "8px", border: "1px solid #252550", background: "#1a1a2e", color: "#e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.4)", fontSize: "12px" }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span style={{ fontSize: "11px", color: "#94a3b8" }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * ModuleBarChart — stacked bar of approved/pending/rejected per module.
 * Props: moduleStats = [{ module_name, approved, pending, rejected }]
 */
export function ModuleBarChart({ moduleStats = [] }) {
  const data = moduleStats.map((m) => ({
    name:     m.module_name.charAt(0).toUpperCase() + m.module_name.slice(1),
    Approved: m.approved,
    Pending:  m.pending,
    Rejected: m.rejected,
  }));

  if (!data.length) return null;

  return (
    <div className="bg-[#111120] rounded-xl border border-[#1e1e35] p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">Module-wise Clearance Status</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: "8px", border: "1px solid #252550", background: "#1a1a2e", color: "#e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.4)", fontSize: "12px" }}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: "11px", color: "#94a3b8" }}>{v}</span>} />
          <Bar dataKey="Approved" stackId="a" fill={COLORS.approved} radius={[0, 0, 0, 0]} />
          <Bar dataKey="Pending"  stackId="a" fill={COLORS.pending}  radius={[0, 0, 0, 0]} />
          <Bar dataKey="Rejected" stackId="a" fill={COLORS.rejected} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * SemesterBreakdownChart — grouped bar chart showing clearance stats per semester.
 * Props: semesterBreakdown = [{ year, semester, total, approved, pending, rejected }]
 */
export function SemesterBreakdownChart({ semesterBreakdown = [] }) {
  const data = semesterBreakdown.map((s) => ({
    name:     `Y${s.year}S${s.semester}`,
    Approved: s.approved,
    Pending:  s.pending,
    Rejected: s.rejected,
  }));

  if (!data.length) return null;

  return (
    <div className="bg-[#111120] rounded-xl border border-[#1e1e35] p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">Clearance Stats per Semester</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: "8px", border: "1px solid #252550", background: "#1a1a2e", color: "#e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.4)", fontSize: "12px" }}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: "11px", color: "#94a3b8" }}>{v}</span>} />
          <Bar dataKey="Approved" fill={COLORS.approved} radius={[0, 0, 0, 0]} />
          <Bar dataKey="Pending"  fill={COLORS.pending}  radius={[0, 0, 0, 0]} />
          <Bar dataKey="Rejected" fill={COLORS.rejected} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ModuleAvgChart({ moduleStats = [] }) {
  const data = moduleStats
    .filter((m) => m.avg_hours_to_approve > 0)
    .map((m) => ({
      name: m.module_name.charAt(0).toUpperCase() + m.module_name.slice(1),
      "Avg Hours": m.avg_hours_to_approve,
    }));

  if (!data.length) return null;

  return (
    <div className="bg-[#111120] rounded-xl border border-[#1e1e35] p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">Avg Approval Time (hours)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(v) => [`${v}h`, "Avg Hours"]}
            contentStyle={{ borderRadius: "8px", border: "1px solid #252550", background: "#1a1a2e", color: "#e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.4)", fontSize: "12px" }}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <Bar dataKey="Avg Hours" fill="#7c3aed" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
