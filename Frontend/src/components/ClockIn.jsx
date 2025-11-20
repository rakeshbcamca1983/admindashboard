import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import "bootstrap-icons/font/bootstrap-icons.css";

const ClockIn = () => {
  const { id } = useParams();
  const apiUrl = import.meta.env.VITE_API_URL;

  const [loading, setLoading] = useState(false);
  const [clockedIn, setClockedIn] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("clockInStatus");
    if (saved) setClockedIn(JSON.parse(saved));
  }, []);

  const updateClockState = (value) => {
    localStorage.setItem("clockInStatus", JSON.stringify(value));
    setClockedIn(value);
  };

  // ================= CLOCK IN =================
  const handleClockIn = async () => {
    setLoading(true);

    try {
      const res = await axios.post(
        `${apiUrl}/employee/employee_clockin/${id}`,
        { work_from_type: "Office" }
      );

      if (res.data.success === true) {
        updateClockState(true);
        toast.success("Clock-In Successful");
      } else {
        toast.error("Clock-In Failed");
      }
    } catch (error) {
      toast.error("Clock-In Failed");
    }

    setLoading(false);
  };

  // ================= CLOCK OUT =================
  const handleClockOut = async () => {
    setLoading(true);

    try {
      const res = await axios.post(
        `${apiUrl}/employee/employee_clockout/${id}`
      );

      if (res.data.success === true) {
        updateClockState(false);
        toast.success("Clock-Out Successful");
      } else {
        toast.error("Clock-Out Failed");
      }
    } catch (error) {
      toast.error("Clock-Out Failed");
    }

    setLoading(false);
  };

  return (
    <div>
      {!clockedIn ? (
        <button
          className="btn btn-primary d-flex align-items-center"
          onClick={handleClockIn}
          disabled={loading}
        >
          <i className="bi bi-box-arrow-in-right me-2"></i>
          Clock In
        </button>
      ) : (
        <button
          className="btn btn-danger d-flex align-items-center"
          onClick={handleClockOut}
          disabled={loading}
        >
          <i className="bi bi-box-arrow-right me-2"></i>
          Clock Out
        </button>
      )}
    </div>
  );
};

export default ClockIn;
