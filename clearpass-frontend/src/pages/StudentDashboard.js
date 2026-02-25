import { useEffect, useState } from "react";
import API from "../services/api";

function StudentDashboard() {
  const [data, setData] = useState([]);
  const [progress, setProgress] = useState(0);

  const token = localStorage.getItem("token");
  const studentId = JSON.parse(atob(token.split(".")[1])).id;

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await API.get(`/student/full-dashboard/${studentId}`);
      setData(res.data.subjects);
      setProgress(res.data.percentage);
    } catch (err) {
      console.log(err);
    }
  };

  const getStatusColor = (status) => {
    if (status === "approved") return "success";
    if (status === "pending") return "warning";
    if (status === "rejected") return "danger";
    return "secondary";
  };

  return (
    <div className="container mt-5">
      <h2 className="mb-4">Student Dashboard 🎓</h2>

      {/* Progress Section */}
      <div className="card p-3 mb-4">
        <h5>Clearance Progress</h5>
        <div className="progress">
          <div
            className="progress-bar bg-success"
            style={{ width: `${progress}%` }}
          >
            {progress.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Subjects Table */}
      <div className="card p-3">
        <h5 className="mb-3">Subject Approval Status</h5>

        <table className="table table-bordered text-center">
          <thead className="table-dark">
            <tr>
              <th>Subject</th>
              <th>Teacher</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <td>{item.subject_name}</td>
                <td>{item.teacher_name}</td>
                <td>
                  <span className={`badge bg-${getStatusColor(item.status)}`}>
                    {item.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </div>
  );
}

export default StudentDashboard;