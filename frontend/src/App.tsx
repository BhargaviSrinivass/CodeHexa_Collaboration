import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SocketProvider } from "./contexts/SocketContext";
import { ToastProvider } from "./components/ui/Toast";
import { ProtectedRoute, PublicRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./layouts/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProblemsPage } from "./pages/ProblemsPage";
import { ProblemPage } from "./pages/ProblemPage";
import { JoinRoomPage } from "./pages/JoinRoomPage";
import { ProgressPage } from "./pages/ProgressPage";
import { FriendsPage } from "./pages/FriendsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { SessionsPage } from "./pages/SessionsPage";
import { BookmarksPage } from "./pages/BookmarksPage";
import { SearchPage } from "./pages/SearchPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RoomPageWrapper } from "./pages/RoomPageWrapper";
import { useGlobalNotifications } from "./hooks/useGlobalNotifications";

function NotificationBridge() {
  useGlobalNotifications();
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <SocketProvider>
            <ToastProvider>
              <NotificationBridge />
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                <Route element={<PublicRoute />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                </Route>

                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/problems" element={<ProblemsPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/progress" element={<ProgressPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/leaderboard" element={<LeaderboardPage />} />
                    <Route path="/friends" element={<FriendsPage />} />
                    <Route path="/sessions" element={<SessionsPage />} />
                    <Route path="/bookmarks" element={<BookmarksPage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/join" element={<JoinRoomPage />} />
                  </Route>
                  <Route path="/problems/:id" element={<ProblemPage />} />
                  <Route path="/room/:id" element={<RoomPageWrapper />} />
                </Route>
              </Routes>
            </ToastProvider>
          </SocketProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
