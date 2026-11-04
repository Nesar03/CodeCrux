import { Routes, Route, Navigate } from "react-router";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Homepage from "./pages/Homepage";
import { useDispatch, useSelector } from 'react-redux';
import { checkAuth } from "./authSlice";
import { useEffect, useState } from "react";
import AdminPanel from "./components/AdminPanel";
import AdminUpdate from "./components/AdminUpdate";
import ProblemPage from "./pages/ProblemPage";
import Admin from "./pages/Admin";
import AdminVideo from "./components/AdminVideo";
import AdminDelete from "./components/AdminDelete";
import AdminUpload from "./components/AdminUpload";
import AdminRegister from "./components/AdminRegister";

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  // Only block the UI during the very first session check.
  // (Using the shared `loading` flag would unmount the Login/Signup pages
  //  every time a login request was in flight.)
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    dispatch(checkAuth()).finally(() => setCheckingSession(false));
  }, [dispatch]);

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  const isAdmin = isAuthenticated && user?.role === 'admin';

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Homepage /> : <Navigate to="/signup" />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to="/" /> : <Signup />} />
      <Route path="/admin" element={isAdmin ? <Admin /> : <Navigate to="/" />} />
      <Route path="/admin/create" element={isAdmin ? <AdminPanel /> : <Navigate to="/" />} />
      <Route path="/admin/update" element={isAdmin ? <AdminUpdate /> : <Navigate to="/" />} />
      <Route path="/admin/update/:problemId" element={isAdmin ? <AdminUpdate /> : <Navigate to="/" />} />
      <Route path="/admin/delete" element={isAdmin ? <AdminDelete /> : <Navigate to="/" />} />
      <Route path="/admin/video" element={isAdmin ? <AdminVideo /> : <Navigate to="/" />} />
      <Route path="/admin/register" element={isAdmin ? <AdminRegister /> : <Navigate to="/" />} />
      <Route path="/admin/upload/:problemId" element={isAdmin ? <AdminUpload /> : <Navigate to="/" />} />
      <Route path="/problem/:problemId" element={isAuthenticated ? <ProblemPage /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
