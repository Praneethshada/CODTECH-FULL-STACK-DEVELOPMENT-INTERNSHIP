import { useMemo, useState } from "react";
import Editor from "./components/Editor";

function createDefaultDocId() {
  return `doc-${Math.random().toString(36).slice(2, 8)}`;
}

function getDocIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const docId = params.get("docId");
  return docId && docId.trim() ? docId.trim() : null;
}

export default function App() {
  const [docIdInput, setDocIdInput] = useState("");
  const [activeDocId, setActiveDocId] = useState(
    () => getDocIdFromUrl() || createDefaultDocId()
  );

  const shareUrl = useMemo(() => {
    const base = window.location.origin;
    return `${base}?docId=${activeDocId}`;
  }, [activeDocId]);

  const openDocument = () => {
    const cleaned = docIdInput.trim();
    if (cleaned) {
      setActiveDocId(cleaned);
      window.history.replaceState({}, "", `?docId=${encodeURIComponent(cleaned)}`);
      return;
    }

    const generated = createDefaultDocId();
    setActiveDocId(generated);
    window.history.replaceState(
      {},
      "",
      `?docId=${encodeURIComponent(generated)}`
    );
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch (error) {
      console.error("Failed to copy link", error);
    }
  };

  return (
    <main className="page">
      <header className="hero">
        <h1>Real-Time Collaborative Document Editor</h1>
        <p>
          Open the same Document ID in multiple tabs or systems to see live
          collaboration.
        </p>
      </header>

      <section className="controls">
        <label htmlFor="doc-id">Document ID</label>
        <div className="controls-row">
          <input
            id="doc-id"
            type="text"
            value={docIdInput}
            onChange={(event) => setDocIdInput(event.target.value)}
            placeholder="Enter existing id or leave blank for new one"
          />
          <button onClick={openDocument}>Open</button>
          <button className="secondary" onClick={copyLink}>
            Copy Share Link
          </button>
        </div>
        <small>Current: {activeDocId}</small>
      </section>

      <Editor docId={activeDocId} />
    </main>
  );
}
