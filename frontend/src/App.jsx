import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Questions from "./pages/Questions.jsx";
import Practice from "./pages/Practice.jsx";
import Review from "./pages/Review.jsx";
import Statistics from "./pages/Statistics.jsx";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 min-w-0 px-4 py-6 md:px-10 md:py-10">
        <div className="max-w-6xl mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/questions" element={<Questions />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/review" element={<Review />} />
            <Route path="/statistics" element={<Statistics />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
