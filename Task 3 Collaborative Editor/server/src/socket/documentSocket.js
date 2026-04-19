import { Document } from "../models/Document.js";

// In-memory timers to avoid writing to MongoDB on every keystroke.
const saveTimers = new Map();

function scheduleSave(docId, content) {
  if (saveTimers.has(docId)) {
    clearTimeout(saveTimers.get(docId));
  }

  const timer = setTimeout(async () => {
    try {
      await Document.findOneAndUpdate(
        { docId },
        { content },
        { upsert: true, new: true },
      );
    } catch (error) {
      console.error("Auto-save failed:", error.message);
    } finally {
      saveTimers.delete(docId);
    }
  }, 800);

  saveTimers.set(docId, timer);
}

export function registerDocumentSocket(io) {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join-document", async ({ docId }) => {
      if (!docId || typeof docId !== "string") return;

      socket.join(docId);

      try {
        const doc = await Document.findOneAndUpdate(
          { docId },
          { $setOnInsert: { content: "Start typing here..." } },
          { upsert: true, new: true },
        );

        socket.emit("document-loaded", {
          docId,
          content: doc.content,
        });
      } catch (error) {
        socket.emit("editor-error", "Failed to load document");
      }
    });

    socket.on("document-change", ({ docId, content }) => {
      if (!docId || typeof content !== "string") return;

      // Share latest document with everyone except the sender.
      socket.to(docId).emit("document-updated", { content });
      scheduleSave(docId, content);
    });

    socket.on("save-document", async ({ docId, content }) => {
      if (!docId || typeof content !== "string") return;

      try {
        await Document.findOneAndUpdate(
          { docId },
          { content },
          { upsert: true, new: true },
        );
      } catch (error) {
        socket.emit("editor-error", "Failed to save document");
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
}
