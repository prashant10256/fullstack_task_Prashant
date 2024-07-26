require("dotenv").config(); // Load environment variables from .env file
import express from "express";
import { createServer } from "http";
// import socketIo from "socket.io";
import { createClient } from "redis";
import { connect, Schema, model } from "mongoose";

const app = express();
import cors from "cors";
app.use(cors({ origin: "http://localhost:3000" }));


// Connect to MongoDB
connect(
  "mongodb+srv://prashantsugave125:BRwsTP5ouCvN5ZfV@adddb.ntt7twa.mongodb.net/?retryWrites=true&w=majority&appName=AddDB",
  
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
);

const todoSchema = new Schema({ items: [String] });
const TodoModel = model("Todo", todoSchema);

// Create Redis client
const client = createClient({
  url: "redis://default:dssYpBnYQrl01GbCGVhVq2e4dYvUrKJB@redis-12675.c212.ap-south-1-1.ec2.cloud.redislabs.com:12675",
});

client.on("error", (err) => console.log("Redis Client Error", err));

const server = createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const REDIS_KEY = `FULLSTACK_TASK`;

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the Fullstack Task Management API",
  });
});

app.get("/tasks", async (req, res) => {
  try {
    const tasks = await client.get(REDIS_KEY);
    res.json({
      success: true,
      tasks: tasks ? JSON.parse(tasks) : [],
    });
  } catch (error) {
    console.error("Failed to fetch tasks", error);
    res.status(500).json({ success: false, message: "Failed to fetch tasks" });
  }
});

io.on("connection", (socket) => {
  socket.on("add", async (item) => {
    try {
      const items = await client.get(REDIS_KEY);
      let itemList = items ? JSON.parse(items) : [];

      itemList.push(item);

      if (itemList.length > 50) {
        // Save to MongoDB and clear Redis if items more than 50
        const todo = new TodoModel({ items: itemList });
        await todo.save();
        await client.del(REDIS_KEY);
      } else {
        // Update Redis
        await client.set(REDIS_KEY, JSON.stringify(itemList));
      }
    } catch (error) {
      console.error("Error handling add event:", error);
    }
  });
});

server.listen(3000, () => {
  console.log("Listening on *:3000");
});
