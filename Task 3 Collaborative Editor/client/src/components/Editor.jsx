import { useEffect, useMemo, useRef, useState } from "react";
import { saveDocument } from "../api";
import { socket } from "../socket";

export default function Editor({ docId }) {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("Connecting...");
  const [isSynced, setIsSynced] = useState(true);
  const isRemoteUpdateRef = useRef(false);
  const saveTimerRef = useRef(null);

  const room = useMemo(() => ({ docId }), [docId]);

  useEffect(() => {
    socket.connect();
    socket.emit("join-document", room);

    const onLoaded = ({ content: loadedContent }) => {
      setContent(loadedContent || "");
      setStatus("Connected");
      setIsSynced(true);
    };

    const onUpdated = ({ content: nextContent }) => {
      isRemoteUpdateRef.current = true;
      setContent(nextContent || "");
      setIsSynced(true);
    };

    const onError = (message) => {
      setStatus(message || "Connection issue");
    };

    socket.on("document-loaded", onLoaded);
    socket.on("document-updated", onUpdated);
    socket.on("editor-error", onError);

    return () => {
      socket.off("document-loaded", onLoaded);
      socket.off("document-updated", onUpdated);
      socket.off("editor-error", onError);
      socket.disconnect();
    };
  }, [room]);

  useEffect(() => {
    // Skip outgoing emit when this change came from another collaborator.
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    if (status !== "Connected") return;

    socket.emit("document-change", { docId, content });
    setIsSynced(false);
  }, [content, docId, status]);

  useEffect(() => {
    if (status !== "Connected") return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Save to REST endpoint after user pauses typing.
    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveDocument(docId, content);
        socket.emit("save-document", { docId, content });
        setIsSynced(true);
      } catch (error) {
        setStatus("Save failed. Please check server.");
      }
    }, 1200);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [content, docId, status]);

  return (
    <section className="editor-wrap">
      <div className="editor-toolbar">
        <p>
          Document ID: <strong>{docId}</strong>
        </p>
        <p className={isSynced ? "ok" : "warn"}>
          {isSynced ? "All changes saved" : "Saving changes..."}
        </p>
      </div>

      <textarea
        className="editor"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Start typing..."
      />
    </section>
  );
}
