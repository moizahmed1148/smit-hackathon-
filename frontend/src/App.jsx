
import { useEffect, useState } from "react";
import { Navigate,Route,Routes,useLocation} from "react-router-dom";

import { apiRequest } from "./utils/api";
import DashboardLayout from "./layouts/DashboardLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Attendance from "./pages/Attendance";
import Leaves from "./pages/Leaves";
import Payroll from "./pages/Payroll";
import Settings from "./pages/Settings";
import Announcements from "./pages/Announcements";
import AIAssistant from "./pages/AIAssistant";

function ProtectedPage({ user, roles, children }) {
  const role = String(user?.role || "").toUpperCase();

  if (roles && !roles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-sm font-medium text-slate-600">
        Loading your workspace...
      </p>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const token = localStorage.getItem("token");

      if (!token) {
        if (active) setAuthLoading(false);
        return;
      }

      try {
        const data = await apiRequest("/auth/me");

        if (active) {
          setUser(data.user || data);
        }
      } catch {
        localStorage.removeItem("token");

        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Login onLogin={setUser} />
          )
        }
      />

      <Route
        element={
          user ? (
            <DashboardLayout user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace state={{ from: location }} />
          )
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route
          path="/employees"
          element={
            <ProtectedPage user={user} roles={["ADMIN", "HR"]}>
              <Employees />
            </ProtectedPage>
          }
        />
        <Route
            path="/settings"
            element={
              <ProtectedPage user={user} roles={["ADMIN"]}>
                <Settings />
              </ProtectedPage>
            }
          />
        <Route path="/attendance" element={<Attendance />} />
        <Route
          path="/announcements"
          element={<Announcements user={user} />}
        />
   <Route
  path="/ai-assistant"
  element={
    <ProtectedPage user={user}>
      <AIAssistant />
    </ProtectedPage>
  }
/>
        <Route path="/leaves" element={<Leaves />} />
        <Route path="/payroll" element={<Payroll />} />
      </Route>

      <Route
        path="*"
        element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
      />
    </Routes>
  );
}
