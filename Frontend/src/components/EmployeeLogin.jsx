import { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function EmployeeLogin() {
    const apiUrl = import.meta.env.VITE_API_URL;

    const [values, setValues] = useState({
        email: "",
        password: ""
    });

    const navigate = useNavigate();
    axios.defaults.withCredentials = true;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setValues({ ...values, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!values.email || !values.password) {
            toast.error("Email and password are required.");
            return;
        }

        try {
            const result = await axios.post(
                `${apiUrl}/employee/employeelogin`,
                values
            );

            if (result.data.loginStatus) {
                localStorage.setItem("valid", true);
                toast.success("Login successful");
                navigate(`/employeedetail/${result.data.id}`);
            } else {
                toast.error(result.data.error || "Invalid email or password");
            }
        } catch (error) {
            console.log("Login error:", error);
            toast.error("Invalid email or password");
        }
    };

    return (
        <div id="form-body">
            <div className="d-flex justify-content-center align-items-center vh-100 loginPage2">
                <div className="p-1 rounded loginForm">
                    <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "12px" }}>
                        <h2>Login Page</h2>

                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label className="form-label">
                                    <span className="bold-form-label">Email:</span>
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={values.email}
                                    onChange={handleInputChange}
                                    className="form-control"
                                    placeholder="example@gmail.com"
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label">
                                    <span className="bold-form-label">Password:</span>
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={values.password}
                                    onChange={handleInputChange}
                                    className="form-control"
                                    placeholder="Your password"
                                />
                            </div>

                            {/* 🔥 IMPORTANT: Actual working submit button */}
                            <button type="submit" className="button-74">
                                Log in
                            </button>
                        </form>

                    </div>
                </div>
            </div>
        </div>
    );
}

export default EmployeeLogin;
