/**
 * client.js
 * ---------
 * Central place for every HTTP call the frontend makes to the FastAPI
 * backend. Keeping all requests here means components stay focused on
 * rendering, and the API base URL only needs to be changed in one place.
 */

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
