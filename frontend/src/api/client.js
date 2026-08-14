import axios from "axios";

export const API_BASE_URL = "http://localhost:8000";

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Normalizes axios errors into a plain, human-readable message that
// components can display directly without knowing about axios internals.
function friendlyError(error) {
  if (error.response) {
    const detail = error.response.data?.detail;
    return new Error(
      typeof detail === "string" ? detail : `Request failed with status ${error.response.status}.`
    );
  }
  if (error.request) {
    return new Error(
      "Could not reach the backend. Make sure the FastAPI server is running on http://localhost:8000."
    );
  }
  return new Error(error.message || "An unknown error occurred.");
}

async function request(promise) {
  try {
    const response = await promise;
    return response.data;
  } catch (error) {
    throw friendlyError(error);
  }
}

// ---------- Questions ----------

export const getQuestions = ({ search, category } = {}) =>
  request(client.get("/api/questions", { params: { search, category } }));

export const getCategories = () => request(client.get("/api/questions/categories"));

export const createQuestion = (payload) => request(client.post("/api/questions", payload));

export const updateQuestion = (id, payload) => request(client.put(`/api/questions/${id}`, payload));

export const deleteQuestion = (id) => request(client.delete(`/api/questions/${id}`));

// ---------- Practice ----------

export const getNextQuestion = () => request(client.get("/api/practice/next"));

export const skipQuestion = (logId) => request(client.post(`/api/practice/skip/${logId}`));

export const resetPracticeCycle = () => request(client.post("/api/practice/reset"));

// ---------- Transcription ----------

export const transcribeAnswer = (logId, audioBlob) => {
  const formData = new FormData();
  formData.append("audio", audioBlob, "answer.webm");
  return request(
    client.post(`/api/transcribe/${logId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    })
  );
};

// ---------- Review ----------

export const getReviewItems = ({ status, category } = {}) =>
  request(client.get("/api/review", { params: { status, category } }));

export const deleteReviewItem = (logId) => request(client.delete(`/api/review/${logId}`));

// ---------- Statistics ----------

export const getStatistics = () => request(client.get("/api/stats"));

// ---------- Health ----------

export const checkHealth = () => request(client.get("/api/health"));

//Get retry questions

function retryError(err, fallback) {
  return new Error(err?.response?.data?.detail || fallback);
}

export async function listRetryQuestions() {
  try {
    const res = await client.get("/api/retry");
    return res.data;
  } catch (err) {
    throw retryError(err, "Could not load your revision list.");
  }
}

export async function getRetryIds() {
  try {
    const res = await client.get("/api/retry/ids");
    return res.data;
  } catch (err) {
    throw retryError(err, "Could not load your revision list.");
  }
}

export async function markForRetry(questionId, reason = null) {
  try {
    const res = await client.post(`/api/retry/${questionId}`, { reason });
    return res.data;
  } catch (err) {
    throw retryError(err, "Could not save that question for revision.");
  }
}

export async function unmarkRetry(questionId) {
  try {
    const res = await client.delete(`/api/retry/${questionId}`);
    return res.data;
  } catch (err) {
    throw retryError(err, "Could not remove that question from revision.");
  }
}

export async function clearRetryPool() {
  try {
    const res = await client.delete("/api/retry");
    return res.data;
  } catch (err) {
    throw retryError(err, "Could not clear your revision list.");
  }
}

export async function startRetryAttempt(questionId) {
  try {
    const res = await client.post(`/api/retry/${questionId}/attempt`);
    return res.data;
  } catch (err) {
    throw retryError(err, "Could not start that revision question.");
  }
}