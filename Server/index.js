import express from "express";
import cors from "cors";
import { adminRouter } from "./Routes/AdminRoute.js";
import { employeeRouter } from "./Routes/EmployeeRoute.js";
import { projectRouter } from "./Routes/ProjectRoute.js";
import { clientsRouter } from "./Routes/ClientsRoute.js";
import { taskStatusRouter } from "./Routes/TaskStatusRoute.js";
import { notificationRouter } from "./Routes/NotificationsRoute.js";
import { attendanceRouter } from "./Routes/AttendanceRoute.js";
import { officeRouter } from "./Routes/OfficeRoute.js"; 
import { taskRouter } from "./Routes/TaskRoute.js";       
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(express.static("Public"));

// ROUTES
app.use("/auth", adminRouter);
app.use("/employee", employeeRouter);
app.use("/projects", projectRouter);
app.use("/clients", clientsRouter);
app.use("/taskstatus", taskStatusRouter);
app.use("/notifications", notificationRouter);
app.use("/attendance", attendanceRouter);
app.use("/office", officeRouter);     
app.use("/tasks", taskRouter);       

// SOCKET SERVER
const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// SOCKET EVENTS
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} joined room user_${userId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// START SERVER
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
