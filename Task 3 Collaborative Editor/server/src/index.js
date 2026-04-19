import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { Server } from "socket.io";
import { connectDB } from "./config/db.js";
import { Document } from "./models/Document.js";
import { registerDocumentSocket } from "./socket/documentSocket.js";

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(helmet());
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "collab-editor-server" });
});

app.get("/api/documents/:docId", async (req, res) => {
  const { docId } = req.params;

  if (!docId) {
    return res.status(400).json({ message: "docId is required" });
  }

  try {
    const doc = await Document.findOneAndUpdate(
      { docId },
      { $setOnInsert: { content: "Start typing here..." } },
      { upsert: true, new: true },
    );

    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch document" });
  }
});

app.put("/api/documents/:docId", async (req, res) => {
  const { docId } = req.params;
  const { content } = req.body;

  if (!docId || typeof content !== "string") {
    return res.status(400).json({ message: "Invalid payload" });
  }

  try {
    const updated = await Document.findOneAndUpdate(
      { docId },
      { content },
      { upsert: true, new: true },
    );

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: "Failed to save document" });
  }
});

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
});

registerDocumentSocket(io);

async function startServer() {
  try {
    await connectDB(process.env.MONGODB_URI);

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
