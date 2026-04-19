const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function getDocument(docId) {
  const response = await fetch(`${API_BASE_URL}/api/documents/${docId}`);
  if (!response.ok) {
    throw new Error("Failed to load document");
  }

  return response.json();
}

export async function saveDocument(docId, content) {
  const response = await fetch(`${API_BASE_URL}/api/documents/${docId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error("Failed to save document");
  }

  return response.json();
}
