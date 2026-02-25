import React, { useEffect, useState } from "react";
import axios from "axios";

const TeacherDashboard = () => {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/teacher/students");
      setStudents(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.put(
        `http://localhost:5000/api/teacher/update-status/${id}`,
        { status }
      );
      fetchStudents();
    } catch (error) {
      console.error(error);
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(search.toLowerCase()) ||
      student.email.toLowerCase().includes(search.toLowerCase());

    const matchesDepartment =
      departmentFilter === "All" ||
      student.department === departmentFilter;

    return matchesSearch && matchesDepartment;
  });

  const total = students.length;
  const approved = students.filter(
    (s) => s.clearance_status === "Approved"
  ).length;
  const pending = students.filter(
    (s) => s.clearance_status === "Pending"
  ).length;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Teacher Dashboard</h2>

      {/* Card Summary */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        <div style={cardStyle}>Total: {total}</div>
        <div style={cardStyle}>Approved: {approved}</div>
        <div style={cardStyle}>Pending: {pending}</div>
      </div>

      {/* Search & Filter */}
      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "8px", marginRight: "10px" }}
        />

        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          style={{ padding: "8px" }}
        >
          <option value="All">All Departments</option>
          <option value="CSE">CSE</option>
          <option value="ECE">ECE</option>
          <option value="ME">ME</option>
        </select>
      </div>

      {/* Table */}
      <table border="1" cellPadding="10" width="100%">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredStudents.map((student) => (
            <tr key={student.id}>
              <td>{student.name}</td>
              <td>{student.email}</td>
              <td>{student.department}</td>
              <td>
                <span
                  style={{
                    color:
                      student.clearance_status === "Approved"
                        ? "green"
                        : student.clearance_status === "Rejected"
                        ? "red"
                        : "orange",
                    fontWeight: "bold",
                  }}
                >
                  {student.clearance_status}
                </span>
              </td>
              <td>
                <button
                  onClick={() => updateStatus(student.id, "Approved")}
                  style={{ marginRight: "5px" }}
                >
                  Approve
                </button>
                <button
                  onClick={() => updateStatus(student.id, "Rejected")}
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const cardStyle = {
  padding: "15px",
  backgroundColor: "#f4f4f4",
  borderRadius: "8px",
  fontWeight: "bold",
};

export default TeacherDashboard;