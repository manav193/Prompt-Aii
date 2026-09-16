import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "@/pages/Landing";
import NimoChat from "@/pages/NimoChat";
import Dashboard from "@/pages/Dashboard";
import Generate from "@/pages/Generate";
import ReversePrompt from "@/pages/ReversePrompt";
import Marketplace from "@/pages/Marketplace";
import PromptDetail from "@/pages/PromptDetail";
import Collections from "@/pages/Collections";
import CollectionDetail from "@/pages/CollectionDetail";
import Convert from "@/pages/Convert";
import HistoryPage from "@/pages/HistoryPage";
import Saved from "@/pages/Saved";
import Billing from "@/pages/Billing";
import Settings from "@/pages/Settings";
import Admin from "@/pages/Admin";

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/nimo-chat" element={<NimoChat />} />

      {/* Authentication UI is temporarily hidden while the auth flow is being finalized. */}
      <Route path="/signin" element={<Navigate to="/" replace />} />
      <Route path="/signup" element={<Navigate to="/" replace />} />
      <Route path="/forgot-password" element={<Navigate to="/" replace />} />
      <Route path="/reset-password" element={<Navigate to="/" replace />} />
      <Route path="/verify-email" element={<Navigate to="/" replace />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/generate" element={<ProtectedRoute><Generate /></ProtectedRoute>} />
      <Route path="/reverse-prompt" element={<ProtectedRoute><ReversePrompt /></ProtectedRoute>} />
      <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
      <Route path="/promptlets/:slug" element={<ProtectedRoute><PromptDetail /></ProtectedRoute>} />
      <Route path="/collections" element={<ProtectedRoute><Collections /></ProtectedRoute>} />
      <Route path="/collections/:slug" element={<ProtectedRoute><CollectionDetail /></ProtectedRoute>} />
      <Route path="/convert" element={<ProtectedRoute><Convert /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
      <Route path="/saved" element={<ProtectedRoute><Saved /></ProtectedRoute>} />
      <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />

      <Route path="/favorites" element={<Navigate to="/saved" replace />} />
      <Route path="/account" element={<Navigate to="/settings" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRouter />
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: "rgba(15,23,42,0.85)",
              border: "1px solid rgba(0,229,255,0.25)",
              color: "#fff",
              backdropFilter: "blur(20px)",
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
