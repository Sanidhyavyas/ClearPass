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
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Request Breakdown</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 1px 6px rgba(0,0,0,0.08)", fontSize: "12px" }}
            cursor={{ fill: "rgba(0,0,0,0.03)" }}
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
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">User Distribution</h3>
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
            labelLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 1px 6px rgba(0,0,0,0.08)", fontSize: "12px" }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span style={{ fontSize: "11px", color: "#64748b" }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
