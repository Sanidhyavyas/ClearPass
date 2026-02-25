import { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

function Login() {
  const [isRegister, setIsRegister] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: ""
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isRegister) {
        // REGISTER
        await API.post("/register", form);
        alert("User Registered Successfully ✅");
        setIsRegister(false);
      } else {
        // LOGIN
        const res = await API.post("/login", {
          email: form.email,
          password: form.password
        });

        localStorage.setItem("token", res.data.token);
        localStorage.setItem("role", res.data.role);

        if (res.data.role === "student") navigate("/student");
        if (res.data.role === "teacher") navigate("/teacher");
        if (res.data.role === "admin") navigate("/admin");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: "400px" }}>
      <h2 className="text-center mb-4">
        {isRegister ? "Register" : "Login"}
      </h2>

      <form onSubmit={handleSubmit}>

        {isRegister && (
          <>
            <input
              name="name"
              placeholder="Full Name"
              className="form-control mb-2"
              onChange={handleChange}
              required
            />

            <select
              name="role"
              className="form-control mb-2"
              onChange={handleChange}
              required
            >
              <option value="">Select Role</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </>
        )}

        <input
          name="email"
          type="email"
          placeholder="Email"
          className="form-control mb-2"
          onChange={handleChange}
          required
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          className="form-control mb-3"
          onChange={handleChange}
          required
        />

        <button className="btn btn-primary w-100">
          {isRegister ? "Register" : "Login"}
        </button>
      </form>

      <div className="text-center mt-3">
        {isRegister ? (
          <p>
            Already have an account?{" "}
            <span
              style={{ color: "blue", cursor: "pointer" }}
              onClick={() => setIsRegister(false)}
            >
              Login
            </span>
          </p>
        ) : (
          <p>
            New user?{" "}
            <span
              style={{ color: "blue", cursor: "pointer" }}
              onClick={() => setIsRegister(true)}
            >
              Register here
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export default Login;