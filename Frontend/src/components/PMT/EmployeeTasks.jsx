import React, { useState, useEffect } from "react";
import { Table, Button, Container } from "react-bootstrap";
import io from "socket.io-client";
import axios from "axios";
import "./EmployeeTasks.css";

const socket = io(import.meta.env.VITE_API_URL);

const EmployeeTasks = ({ employeeId }) => {
  const [tasks, setTasks] = useState([]);
  const apiUrl = import.meta.env.VITE_API_URL;

  // FETCH TASKS
  useEffect(() => {
    if (!employeeId) return;

    axios
      .get(`${apiUrl}/tasks/employee/${employeeId}`)
      .then((res) => {
        console.log("TASK RESPONSE:", res.data);

        if (res.data.success && Array.isArray(res.data.tasks)) {
          setTasks(res.data.tasks);
        } else {
          setTasks([]);
        }
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setTasks([]);
      });
  }, [employeeId]);

  // SOCKET LISTENERS
  useEffect(() => {
    socket.on("taskUpdated", (data) => {
      const id = data.taskId || data.task_id;

      setTasks((prev) =>
        prev.map((task) =>
          task.task_id === id
            ? { ...task, status: data.status || task.status }
            : task
        )
      );
    });

    socket.on("taskAssigned", (newTask) => {
      if (!newTask) return;

      const normalized = {
        task_id: newTask.task_id || newTask.taskId,
        description: newTask.description || "New Task",
        deadline: newTask.deadline || null,
        status: newTask.status || "pending",
        project_title: newTask.project_title || "N/A",
      };

      setTasks((prev) => [...prev, normalized]);
    });

    socket.on("taskDeleted", (info) => {
      setTasks((prev) =>
        prev.filter((task) => task.task_id !== info.taskId)
      );
    });

    return () => {
      socket.off("taskUpdated");
      socket.off("taskAssigned");
      socket.off("taskDeleted");
    };
  }, []);

  // STATUS CHANGE
  const handleTaskStatusChange = (taskId, status) => {
    axios
      .patch(`${apiUrl}/tasks/${taskId}/status`, { status })
      .then((res) => {
        if (res.data.success) {
          setTasks((prev) =>
            prev.map((t) =>
              t.task_id === taskId ? { ...t, status } : t
            )
          );

          socket.emit("updateTask", { taskId, status });
        }
      })
      .catch((err) => console.log("Status update error:", err));
  };

  return (
    <Container className="mt-4">
      <h2 className="text-center mb-3">Your Assigned Tasks</h2>

      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Task</th>
            <th>Project</th>
            <th>Deadline</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {tasks.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-center">
                No tasks assigned.
              </td>
            </tr>
          ) : (
            tasks.map((task) => (
              <tr key={task.task_id}>
                <td>{task.description}</td>
                <td>{task.project_title || "N/A"}</td>
                <td>
                  {task.deadline
                    ? new Date(task.deadline).toLocaleString()
                    : "N/A"}
                </td>
                <td>{task.status}</td>
                <td>
                  {task.status !== "completed" && (
                    <>
                      {task.status !== "in_progress" && (
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() =>
                            handleTaskStatusChange(
                              task.task_id,
                              "in_progress"
                            )
                          }
                          className="me-2"
                        >
                          Mark In Progress
                        </Button>
                      )}

                      <Button
                        variant="success"
                        size="sm"
                        onClick={() =>
                          handleTaskStatusChange(
                            task.task_id,
                            "completed"
                          )
                        }
                      >
                        Mark Completed
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </Container>
  );
};

export default EmployeeTasks;
