import { useState } from "react";
import API from "../services/api";

function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await API.post("/register", form);
      alert("Registered Successfully");
    } catch (err) {
      alert(err.response?.data?.message || "Registration Failed");
    }
  };

  return (
    <div className="container mt-5">
      <h2>Register</h2>

      <form onSubmit={handleSubmit}>
        <input name="name" placeholder="Name"
          className="form-control mb-2"
          onChange={handleChange}
        />

        <input name="email" type="email"
          placeholder="Email"
          className="form-control mb-2"
          onChange={handleChange}
        />

        <input name="password" type="password"
          placeholder="Password"
          className="form-control mb-2"
          onChange={handleChange}
        />

        <select name="role"
          className="form-control mb-3"
          onChange={handleChange}
        >
          <option value="">Select Role</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>

        <button className="btn btn-success">Register</button>
      </form>
    </div>
  );
}

export default Register;