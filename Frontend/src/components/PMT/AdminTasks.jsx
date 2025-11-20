import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import {
  Table,
  Button,
  Container,
  Form,
  Modal,
  Row,
  Col,
} from "react-bootstrap";

const socket = io(import.meta.env.VITE_API_URL);

const AdminTasks = () => {
  const { projectId } = useParams();
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);

  const [newTask, setNewTask] = useState({
    description: "",
    employee_ids: [],
    deadline: "",
    project_id: projectId || "",
    status: "pending",
  });

  const [editTask, setEditTask] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [filter, setFilter] = useState({ project: "", employee: "" });

  const apiUrl = import.meta.env.VITE_API_URL;

  // Fetch tasks
  const fetchTasks = () => {
    axios
      .get(`${apiUrl}/tasks?project_id=${projectId}`)
      .then((res) => {
        if (res.data.success) {
          setTasks(res.data.tasks);
        }
      })
      .catch((err) => console.error("Error fetching tasks:", err));
  };

  // Fetch employees
  const fetchEmployees = () => {
    axios
      .get(`${apiUrl}/tasks/list`)
      .then((res) => {
        if (res.data.success) {
          setEmployees(res.data.employees);
        }
      })
      .catch((err) => console.error("Error fetching employees:", err));
  };

  // Fetch projects
  const fetchProjects = () => {
    axios
      .get(`${apiUrl}/projects`)
      .then((res) => {
        if (res.data.success) {
          setProjects(res.data.projects);
        }
      })
      .catch((err) => console.error("Error fetching projects:", err));
  };

  useEffect(() => {
    fetchTasks();
    fetchEmployees();
    fetchProjects();

    socket.on("taskUpdated", (updatedTask) => {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.task_id === updatedTask.task_id ? updatedTask : task
        )
      );
    });

    return () => {
      socket.off("taskUpdated");
    };
  }, [projectId]);

  // Add task (FIXED version)
  const handleAddTask = () => {
    axios
      .post(`${apiUrl}/tasks`, {
        description: newTask.description,
        deadline: newTask.deadline,
        status: newTask.status,
        project_id: newTask.project_id || projectId,
        employee_ids: newTask.employee_ids, // IMPORTANT FIX
      })
      .then((res) => {
        if (res.data.success) {
          setTasks([...tasks, res.data.task]);
          setShowModal(false);

          setNewTask({
            description: "",
            employee_ids: [],
            deadline: "",
            project_id: projectId || "",
            status: "pending",
          });

          socket.emit("taskAssigned", res.data.task);
        }
      })
      .catch((err) => console.error("Error adding task:", err));
  };

  // Delete task
  const handleDeleteTask = (taskId) => {
    axios
      .delete(`${apiUrl}/tasks/${taskId}`)
      .then((res) => {
        if (res.data.success) {
          setTasks(tasks.filter((t) => t.task_id !== taskId));
        }
      })
      .catch((err) => console.error("Error deleting task:", err));
  };

  // Open edit modal
  const openEditModal = (task) => {
    setEditTask(task);
    setShowEditModal(true);
  };

  // Edit task (FIXED version)
  const handleEditTask = () => {
    axios
      .put(`${apiUrl}/tasks/${editTask.task_id}`, {
        description: editTask.description,
        deadline: editTask.deadline,
        status: editTask.status,
        project_id: editTask.project_id,
        employee_ids: editTask.employee_ids, // IMPORTANT FIX
      })
      .then((res) => {
        if (res.data.success) {
          setTasks((prevTasks) =>
            prevTasks.map((t) =>
              t.task_id === editTask.task_id ? res.data.task : t
            )
          );

          setShowEditModal(false);
          setEditTask(null);
        }
      })
      .catch((err) => console.error("Error updating task:", err));
  };

  const handleFilterChange = (e) => {
    setFilter({ ...filter, [e.target.name]: e.target.value });
  };

  const filteredTasks = tasks.filter((task) => {
    const matchProject = filter.project
      ? task.project_id === parseInt(filter.project)
      : true;

    const matchEmployee = filter.employee
      ? task.employee_ids.includes(parseInt(filter.employee))
      : true;

    return matchProject && matchEmployee;
  });

  return (
    <Container className="mt-4">
      <h2 className="mb-3">Project Tasks</h2>

      {/* FILTERS */}
      <Row className="mb-3">
        <Col>
          <Form.Select name="project" onChange={handleFilterChange}>
            <option value="">Filter by Project</option>
            {projects.map((p) => (
              <option key={p.project_id} value={p.project_id}>
                {p.title}
              </option>
            ))}
          </Form.Select>
        </Col>

        <Col>
          <Form.Select name="employee" onChange={handleFilterChange}>
            <option value="">Filter by Employee</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.role})
              </option>
            ))}
          </Form.Select>
        </Col>
      </Row>

      {/* ADD BUTTON */}
      <Button
        variant="success"
        className="mb-3"
        onClick={() => setShowModal(true)}
      >
        + Add New Task
      </Button>

      {/* TASK TABLE */}
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>ID</th>
            <th>Description</th>
            <th>Assigned Employees</th>
            <th>Deadline</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredTasks.map((task) => (
            <tr key={task.task_id}>
              <td>{task.task_id}</td>
              <td>{task.description}</td>

              {/* SHOW EMPLOYEES */}
              <td>{task.employee_names?.join(", ") || "N/A"}</td>

              <td>
                {task.deadline
                  ? new Date(task.deadline).toLocaleString()
                  : "N/A"}
              </td>

              <td>{task.status}</td>

              <td>
                <Button
                  variant="info"
                  size="sm"
                  className="me-2"
                  onClick={() => openEditModal(task)}
                >
                  Edit
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteTask(task.task_id)}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* ADD TASK MODAL */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Assign Task</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {/* DESCRIPTION */}
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                value={newTask.description}
                onChange={(e) =>
                  setNewTask({ ...newTask, description: e.target.value })
                }
              />
            </Form.Group>

            {/* EMPLOYEES */}
            <Form.Group className="mb-3">
              <Form.Label>Assign Employees</Form.Label>
              <Form.Control
                as="select"
                multiple
                value={newTask.employee_ids}
                onChange={(e) =>
                  setNewTask({
                    ...newTask,
                    employee_ids: Array.from(
                      e.target.selectedOptions,
                      (opt) => parseInt(opt.value)
                    ),
                  })
                }
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </Form.Control>
            </Form.Group>

            {/* PROJECT */}
            <Form.Group className="mb-3">
              <Form.Label>Project</Form.Label>
              <Form.Select
                value={newTask.project_id}
                onChange={(e) =>
                  setNewTask({ ...newTask, project_id: e.target.value })
                }
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.project_id} value={p.project_id}>
                    {p.title}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {/* DEADLINE */}
            <Form.Group className="mb-3">
              <Form.Label>Deadline</Form.Label>
              <Form.Control
                type="datetime-local"
                value={newTask.deadline}
                onChange={(e) =>
                  setNewTask({ ...newTask, deadline: e.target.value })
                }
              />
            </Form.Group>

            <Button variant="primary" onClick={handleAddTask}>
              Assign Task
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* EDIT TASK */}
      {editTask && (
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Edit Task</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              {/* DESCRIPTION */}
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  value={editTask.description}
                  onChange={(e) =>
                    setEditTask({ ...editTask, description: e.target.value })
                  }
                />
              </Form.Group>

              {/* EMPLOYEES */}
              <Form.Group className="mb-3">
                <Form.Label>Assign Employees</Form.Label>
                <Form.Control
                  as="select"
                  multiple
                  value={editTask.employee_ids}
                  onChange={(e) =>
                    setEditTask({
                      ...editTask,
                      employee_ids: Array.from(
                        e.target.selectedOptions,
                        (opt) => parseInt(opt.value)
                      ),
                    })
                  }
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </Form.Control>
              </Form.Group>

              {/* PROJECT */}
              <Form.Group className="mb-3">
                <Form.Label>Project</Form.Label>
                <Form.Select
                  value={editTask.project_id}
                  onChange={(e) =>
                    setEditTask({ ...editTask, project_id: e.target.value })
                  }
                >
                  <option value="">Select Project</option>
                  {projects.map((p) => (
                    <option key={p.project_id} value={p.project_id}>
                      {p.title}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              {/* DEADLINE */}
              <Form.Group className="mb-3">
                <Form.Label>Deadline</Form.Label>
                <Form.Control
                  type="datetime-local"
                  value={editTask.deadline}
                  onChange={(e) =>
                    setEditTask({ ...editTask, deadline: e.target.value })
                  }
                />
              </Form.Group>

              {/* STATUS */}
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={editTask.status}
                  onChange={(e) =>
                    setEditTask({ ...editTask, status: e.target.value })
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </Form.Select>
              </Form.Group>

              <Button variant="primary" onClick={handleEditTask}>
                Save Changes
              </Button>
            </Form>
          </Modal.Body>
        </Modal>
      )}
    </Container>
  );
};

export default AdminTasks;
