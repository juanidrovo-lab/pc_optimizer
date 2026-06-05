import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Cleaner from "./pages/Cleaner";
import Health from "./pages/Health";
import Startup from "./pages/Startup";
import Services from "./pages/Services";
import Network from "./pages/Network";
import History from "./pages/History";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cleaner" element={<Cleaner />} />
        <Route path="/health" element={<Health />} />
        <Route path="/startup" element={<Startup />} />
        <Route path="/services" element={<Services />} />
        <Route path="/network" element={<Network />} />
        <Route path="/history" element={<History />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
