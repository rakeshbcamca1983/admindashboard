import axios from "axios";
import { useEffect, useState } from "react";
import { Container, Row, Col, Card, Table } from "react-bootstrap";
import { Bar } from "react-chartjs-2";
import Chart from "chart.js/auto";
import "./Home.css";

const Home = () => {
  const [ongoingProjects, setOngoingProjects] = useState([]);
  const [ongoingTasks, setOngoingTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [attendanceData, setAttendanceData] = useState({
    present: 0,
    absent: 0,
  });

  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchOngoingProjects();
    fetchOngoingTasks();
    fetchNotifications();
    fetchAttendanceData();
  }, []);

  /* ---------------------- PROJECTS ---------------------- */
  const fetchOngoingProjects = () => {
    axios
      .get(`${apiUrl}/projects/ongoing`)
      .then((result) => {
        setOngoingProjects(
          Array.isArray(result.data.projects) ? result.data.projects : []
        );
      })
      .catch((error) =>
        console.error("Error fetching ongoing projects:", error)
      );
  };

  /* ---------------------- TASKS ---------------------- */
  const fetchOngoingTasks = () => {
    axios
      .get(`${apiUrl}/tasks/ongoing`)
      .then((result) => {
        setOngoingTasks(
          Array.isArray(result.data.tasks) ? result.data.tasks : []
        );
      })
      .catch((error) => console.error("Error fetching ongoing tasks:", error));
  };

  /* ---------------------- NOTIFICATIONS ---------------------- */
  const fetchNotifications = () => {
    axios
      .get(`${apiUrl}/notifications`)
      .then((result) => {
        setNotifications(
          Array.isArray(result.data.notifications)
            ? result.data.notifications
            : []
        );
      })
      .catch((error) => console.error("Error fetching notifications:", error));
  };

  /* ---------------------- ATTENDANCE ---------------------- */
  const fetchAttendanceData = () => {
    axios
      .get(`${apiUrl}/attendance`)
      .then((result) => {
        setAttendanceData(result.data.attendance || { present: 0, absent: 0 });
      })
      .catch((error) =>
        console.error("Error fetching attendance data:", error)
      );
  };

  /* ---------------------- CHART ---------------------- */
  const attendanceChartData = {
    labels: ["Present", "Absent"],
    datasets: [
      {
        label: "Attendance",
        data: [attendanceData.present, attendanceData.absent],
        backgroundColor: ["#4CAF50", "#F44336"],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
    },
  };

  return (
    <Container fluid className="home-container">

      {/* Row 1: Notifications + Attendance */}
      <Row className="mb-4">
        
        {/* NOTIFICATIONS */}
        <Col md={6}>
          <Card className="h-100 home-card">
            <Card.Body>
              <Card.Title className="home-card-title">
                Notifications & Alerts
              </Card.Title>

              <ul className="notification-list">
                {(notifications || []).map((notification) => (
                  <li key={notification.id} className="notification-item">
                    {notification.message}
                  </li>
                ))}
              </ul>
            </Card.Body>
          </Card>
        </Col>

        {/* ATTENDANCE */}
        <Col md={6}>
          <Card className="h-100 home-card">
            <Card.Body>
              <Card.Title className="home-card-title">
                Employee Attendance Overview
              </Card.Title>

              <div className="chart-wrapper" style={{ height: "200px" }}>
                <Bar data={attendanceChartData} options={chartOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>

      </Row>

      {/* Row 2: Projects + Tasks */}
      <Row>

        {/* PROJECTS */}
        <Col md={6}>
          <Card className="h-100 home-card">
            <Card.Body>
              <Card.Title className="home-card-title">Ongoing Projects</Card.Title>

              <Table striped bordered hover responsive className="home-table mb-0">
                <thead>
                  <tr>
                    <th style={{ width: "50%" }}>Name</th>
                    <th>Start Date</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {(ongoingProjects || []).map((project) => (
                    <tr key={project.project_id}>
                      <td>{project.title}</td>
                      <td>
                        {project.start_date
                          ? new Date(project.start_date).toLocaleDateString()
                          : "—"}
                      </td>
                      <td>{project.status}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>

            </Card.Body>
          </Card>
        </Col>

        {/* TASKS */}
        <Col md={6}>
          <Card className="h-100 home-card">
            <Card.Body>
              <Card.Title className="home-card-title">Ongoing Tasks</Card.Title>

              <Table striped bordered hover responsive className="home-table mb-0">
                <thead>
                  <tr>
                    <th style={{ width: "40%" }}>Name</th>
                    <th>Deadline</th>
                    <th>Assigned To</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {(ongoingTasks || []).map((task) => (
                    <tr key={task.task_id}>
                      <td>{task.description}</td>

                      <td>
                        {task.deadline
                          ? new Date(task.deadline).toLocaleDateString()
                          : "—"}
                      </td>

                      <td>
                        {Array.isArray(task.employee_names)
                          ? task.employee_names.join(", ")
                          : "—"}
                      </td>

                      <td>{task.status}</td>
                    </tr>
                  ))}
                </tbody>

              </Table>
            </Card.Body>
          </Card>
        </Col>

      </Row>
    </Container>
  );
};

export default Home;
