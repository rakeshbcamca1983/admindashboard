import { useState, useEffect } from "react";
import axios from "axios";
import io from "socket.io-client";
import {
  Card,
  Button,
  Container,
  Row,
  Col,
  Modal,
  Form,
} from "react-bootstrap";

const socket = io(import.meta.env.VITE_API_URL, {
  transports: ["websocket"],
});

const AdminProjects = () => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [filter, setFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    status: "Not Started",
    completion_date: "",
    start_date: "",
    priority: "Medium",
    client_id: "",
  });

  const [editProject, setEditProject] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL;

  const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d)) return null;

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  };

  useEffect(() => {
    fetchProjects();
    fetchClients();

    socket.on("taskUpdated", () => fetchProjects());

    return () => socket.off("taskUpdated");
  }, []);

  const fetchProjects = () => {
    axios
      .get(`${apiUrl}/projects`)
      .then((res) => {
        if (res.data.success && Array.isArray(res.data.projects)) {
          setProjects(res.data.projects);
        } else {
          setProjects([]);
        }
      })
      .catch(() => setProjects([]));
  };

  const fetchClients = () => {
    axios
      .get(`${apiUrl}/clients`)
      .then((res) => {
        if (res.data.success && Array.isArray(res.data.clients)) {
          setClients(res.data.clients);
        } else {
          setClients([]);
        }
      })
      .catch(() => setClients([]));
  };

  const handleAddProject = () => {
    const projectData = {
      ...newProject,
      completion_date: formatDate(newProject.completion_date),
      start_date: formatDate(newProject.start_date),
    };

    axios
      .post(`${apiUrl}/projects`, projectData)
      .then((res) => {
        if (res.data.success) {
          setProjects([...projects, res.data.project]);
          setShowModal(false);

          setNewProject({
            title: "",
            description: "",
            status: "Not Started",
            completion_date: "",
            start_date: "",
            priority: "Medium",
            client_id: "",
          });
        }
      })
      .catch((err) => console.error("Error adding project:", err));
  };

  const handleEditProject = () => {
    const updatedData = {
      ...editProject,
      completion_date: formatDate(editProject.completion_date),
      start_date: formatDate(editProject.start_date),
    };

    axios
      .put(`${apiUrl}/projects/${editProject.project_id}`, updatedData)
      .then((res) => {
        if (res.data.success) {
          setProjects((prev) =>
            prev.map((p) =>
              p.project_id === editProject.project_id ? res.data.project : p
            )
          );
          setShowEditModal(false);
          setEditProject(null);
        }
      })
      .catch((err) => console.error("Error editing project:", err));
  };

  const handleDeleteProject = () => {
    axios
      .delete(`${apiUrl}/projects/${projectToDelete.project_id}`)
      .then((res) => {
        if (res.data.success) {
          setProjects((p) =>
            p.filter((pr) => pr.project_id !== projectToDelete.project_id)
          );
          setShowDeleteModal(false);
        }
      })
      .catch((err) => console.error("Error deleting project:", err));
  };

  const filteredProjects = projects
    .filter((p) => p && p.project_id)
    .filter((project) => {
      const now = new Date();
      const projectDate = project.start_date
        ? new Date(project.start_date)
        : null;

      if (!projectDate) return true;

      if (filter === "today") {
        return (
          projectDate.getDate() === now.getDate() &&
          projectDate.getMonth() === now.getMonth() &&
          projectDate.getFullYear() === now.getFullYear()
        );
      }

      if (filter === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return projectDate >= weekAgo && projectDate <= now;
      }

      if (filter === "month") {
        return (
          projectDate.getMonth() === now.getMonth() &&
          projectDate.getFullYear() === now.getFullYear()
        );
      }

      return true;
    });

  return (
    <Container className="mt-2 p-5">
      <h2 className="mb-3">Project Management</h2>

      <Button variant="success" className="mb-3" onClick={() => setShowModal(true)}>
        + Create New Project
      </Button>

      <Form.Select className="mb-3" value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="all">All Projects</option>
        <option value="today">Today's Projects</option>
        <option value="week">This Week’s Projects</option>
        <option value="month">This Month’s Projects</option>
      </Form.Select>

      <Row>
        {filteredProjects.map((project) => (
          <Col md={6} key={project.project_id} className="mb-2">
            <Card className="h-100">
              <Card.Body>
                <Card.Title>{project.title || "Untitled Project"}</Card.Title>
                <Card.Text>{project.description || "No Description"}</Card.Text>

                <p><strong>Status:</strong> {project.status || "N/A"}</p>
                <p><strong>Priority:</strong> {project.priority || "N/A"}</p>

                <p>
                  <strong>Client:</strong>{" "}
                  {clients.find((c) => c.client_id == project.client_id)?.name ||
                    "Unknown Client"}
                </p>

                <p>
                  <strong>Start:</strong>{" "}
                  {project.start_date
                    ? new Date(project.start_date).toLocaleDateString()
                    : "N/A"}
                </p>

                <p>
                  <strong>Completion:</strong>{" "}
                  {project.completion_date
                    ? new Date(project.completion_date).toLocaleDateString()
                    : "N/A"}
                </p>

                <Button
                  variant="info"
                  className="me-2"
                  onClick={() => {
                    setEditProject(project);
                    setShowEditModal(true);
                  }}
                >
                  Edit
                </Button>

                <Button
                  variant="danger"
                  onClick={() => {
                    setProjectToDelete(project);
                    setShowDeleteModal(true);
                  }}
                >
                  Delete
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* CREATE PROJECT MODAL */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create New Project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {/* Title */}
            <Form.Group className="mb-3">
              <Form.Label>Project Title</Form.Label>
              <Form.Control
                type="text"
                value={newProject.title}
                onChange={(e) =>
                  setNewProject({ ...newProject, title: e.target.value })
                }
              />
            </Form.Group>

            {/* Description */}
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                value={newProject.description}
                onChange={(e) =>
                  setNewProject({ ...newProject, description: e.target.value })
                }
              />
            </Form.Group>

            {/* Status */}
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={newProject.status}
                onChange={(e) =>
                  setNewProject({ ...newProject, status: e.target.value })
                }
              >
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
                <option value="Canceled">Canceled</option>
              </Form.Select>
            </Form.Group>

            {/* Completion Date */}
            <Form.Group className="mb-3">
              <Form.Label>Completion Date</Form.Label>
              <Form.Control
                type="date"
                value={newProject.completion_date}
                onChange={(e) =>
                  setNewProject({
                    ...newProject,
                    completion_date: e.target.value,
                  })
                }
              />
            </Form.Group>

            {/* Start Date */}
            <Form.Group className="mb-3">
              <Form.Label>Start Date</Form.Label>
              <Form.Control
                type="date"
                value={newProject.start_date}
                onChange={(e) =>
                  setNewProject({ ...newProject, start_date: e.target.value })
                }
              />
            </Form.Group>

            {/* Priority */}
            <Form.Group className="mb-3">
              <Form.Label>Priority</Form.Label>
              <Form.Select
                value={newProject.priority}
                onChange={(e) =>
                  setNewProject({ ...newProject, priority: e.target.value })
                }
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </Form.Select>
            </Form.Group>

            {/* Client */}
            <Form.Group className="mb-3">
              <Form.Label>Client</Form.Label>
              <Form.Select
                value={newProject.client_id}
                onChange={(e) =>
                  setNewProject({ ...newProject, client_id: e.target.value })
                }
              >
                <option value="">Select Client</option>
                {clients.map((c) => (
                  <option key={c.client_id} value={c.client_id}>
                    {c.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Button variant="primary" onClick={handleAddProject}>
              Create Project
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* EDIT MODAL */}
      {editProject && (
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Edit Project</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              {/* Title */}
              <Form.Group className="mb-3">
                <Form.Label>Project Title</Form.Label>
                <Form.Control
                  type="text"
                  value={editProject.title}
                  onChange={(e) =>
                    setEditProject({ ...editProject, title: e.target.value })
                  }
                />
              </Form.Group>

              {/* Description */}
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  value={editProject.description}
                  onChange={(e) =>
                    setEditProject({
                      ...editProject,
                      description: e.target.value,
                    })
                  }
                />
              </Form.Group>

              {/* Status */}
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={editProject.status}
                  onChange={(e) =>
                    setEditProject({ ...editProject, status: e.target.value })
                  }
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                  <option value="Canceled">Canceled</option>
                </Form.Select>
              </Form.Group>

              {/* Completion Date */}
              <Form.Group className="mb-3">
                <Form.Label>Completion Date</Form.Label>
                <Form.Control
                  type="date"
                  value={editProject.completion_date}
                  onChange={(e) =>
                    setEditProject({
                      ...editProject,
                      completion_date: e.target.value,
                    })
                  }
                />
              </Form.Group>

              {/* Start Date */}
              <Form.Group className="mb-3">
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  value={editProject.start_date}
                  onChange={(e) =>
                    setEditProject({
                      ...editProject,
                      start_date: e.target.value,
                    })
                  }
                />
              </Form.Group>

              {/* Priority */}
              <Form.Group className="mb-3">
                <Form.Label>Priority</Form.Label>
                <Form.Select
                  value={editProject.priority}
                  onChange={(e) =>
                    setEditProject({ ...editProject, priority: e.target.value })
                  }
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </Form.Select>
              </Form.Group>

              {/* Client */}
              <Form.Group className="mb-3">
                <Form.Label>Client</Form.Label>
                <Form.Select
                  value={editProject.client_id}
                  onChange={(e) =>
                    setEditProject({
                      ...editProject,
                      client_id: e.target.value,
                    })
                  }
                >
                  {clients.map((client) => (
                    <option key={client.client_id} value={client.client_id}>
                      {client.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Button variant="primary" onClick={handleEditProject}>
                Save Changes
              </Button>
            </Form>
          </Modal.Body>
        </Modal>
      )}

      {/* DELETE MODAL */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete{" "}
          <strong>{projectToDelete?.title || "this project"}</strong>?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteProject}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminProjects;
