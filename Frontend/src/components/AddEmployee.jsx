import { useState, useEffect } from "react";
import "./style.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function AddEmployee() {
  const [employee, setEmployee] = useState({
    name: "",
    email: "",
    password: "",
    salary: "",
    address: "",
    category_id: "",
    image: null,
  });

  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formKey, setFormKey] = useState(Date.now());

  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  axios.defaults.withCredentials = true;

  // 🔹 Load categories
  useEffect(() => {
    axios
      .get(`${apiUrl}/auth/category`)
      .then((response) => {
        setCategories(response.data.categories);
      })
      .catch((err) => console.log(err));
  }, []);

  const handleNavigateBack = () => {
    navigate("/dashboard/employee");
  };

  // 🔹 Submit form
  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", employee.name);
    formData.append("email", employee.email.toLowerCase());
    formData.append("password", employee.password);
    formData.append("address", employee.address);
    formData.append("salary", employee.salary);
    formData.append("category_id", employee.category_id);
    formData.append("image", employee.image);

    axios
      .post(`${apiUrl}/auth/add_employee`, formData)
      .then((result) => {
        if (result.data.success) {
          setSuccessMessage(result.data.message);
          setError("");

          setEmployee({
            name: "",
            email: "",
            password: "",
            salary: "",
            address: "",
            category_id: "",
            image: null,
          });

          setFormKey(Date.now());
        } else {
          setError(result.data.message);
          setSuccessMessage("");
        }
      })
      .catch((err) => {
        console.log(err);
        setError("An error occurred while adding the Employee.");
        setSuccessMessage("");
      });
  };

  return (
    <div className="d-flex justify-content-center align-items-center mt-3 loginPage">
      <div className="p-1 rounded loginForm">
        <div className="" style={{ backgroundColor: "white", padding: "30px", borderRadius: "12px" }}>
          <div className="mb-3">
            <button onClick={handleNavigateBack} className="btn btn-link back-button">
              ← Back to Dashboard
            </button>
          </div>

          <h2>Add Employee</h2>

          <form key={formKey} className="row g-1" onSubmit={handleSubmit}>
            <div className="col-12">
              <label className="form-label bold-form-label">Name:</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter Name"
                value={employee.name}
                onChange={(e) => setEmployee({ ...employee, name: e.target.value })}
              />
            </div>

            <div className="col-12">
              <label className="form-label bold-form-label">Email:</label>
              <input
                type="email"
                className="form-control"
                placeholder="Enter Email"
                value={employee.email}
                onChange={(e) => setEmployee({ ...employee, email: e.target.value })}
              />
            </div>

            <div className="col-12">
              <label className="form-label bold-form-label">Password:</label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter Password"
                value={employee.password}
                onChange={(e) => setEmployee({ ...employee, password: e.target.value })}
              />
            </div>

            <div className="col-12">
              <label className="form-label bold-form-label">Salary:</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter Salary"
                value={employee.salary}
                onChange={(e) => setEmployee({ ...employee, salary: e.target.value })}
              />
            </div>

            <div className="col-12">
              <label className="form-label bold-form-label">Address:</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter Address"
                value={employee.address}
                onChange={(e) => setEmployee({ ...employee, address: e.target.value })}
              />
            </div>

            <div className="col-12">
              <label className="form-label bold-form-label">Category:</label>
              <select
                className="form-select"
                value={employee.category_id}
                onChange={(e) => setEmployee({ ...employee, category_id: e.target.value })}
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 mb-3">
              <label className="form-label bold-form-label">Select Image:</label>
              <input
                type="file"
                className="form-control"
                onChange={(e) => setEmployee({ ...employee, image: e.target.files[0] })}
              />
            </div>

            <div className="col-12">
              <button type="submit" className="w-100 button-74">
                Add Employee
              </button>
            </div>

            {error && <div className="text-danger mt-3">{error}</div>}
            {successMessage && <div className="text-success mt-3">{successMessage}</div>}
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddEmployee;
