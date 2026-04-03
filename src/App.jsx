import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import StudentLayout from './layouts/StudentLayout';
import AdminLayout from './layouts/AdminLayout';

// Public & Student Pages
import Home from './pages/public/Home';
import Catalog from './pages/public/Catalog';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import ForgotPassword from './pages/public/ForgotPassword';
import ResetPassword from './pages/public/ResetPassword';
import About from './pages/public/About';
import Contact from './pages/public/Contact';
import AllExperts from './pages/public/AllExperts';
import StudentDashboard from './pages/student/Dashboard';
import CourseDetails from './pages/student/CourseDetails';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import Approvals from './pages/admin/Approvals';
import ManageLive from './pages/admin/ManageLive';
import Payments from './pages/admin/Payments';
import Announcements from './pages/admin/Announcements';
import Schedule from './pages/admin/Schedule';
import ManageFreeClass from './pages/admin/ManageFreeClass';
import ManageRecordings from './pages/admin/ManageRecordings';
import ManageTutes from './pages/admin/ManageTutes';
import ManageCatalog from './pages/admin/ManageCatalog';
import ManageSettings from './pages/admin/ManageSettings';
import ManageInstructors from './pages/admin/ManageInstructors';
import Analytics from './pages/admin/Analytics';

import { ToastProvider } from './components/Toast';
import './App.css';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
      <Routes>
        {/* Student/Public Routes */}
        <Route element={<StudentLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<Catalog />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/experts" element={<AllExperts />} />
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/course/:id" element={<CourseDetails />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="payments" element={<Payments />} />
          <Route path="manage-live" element={<ManageLive />} />
          <Route path="free-class" element={<ManageFreeClass />} />
          <Route path="recordings" element={<ManageRecordings />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="tutes" element={<ManageTutes />} />
          <Route path="catalog" element={<ManageCatalog />} />
          <Route path="instructors" element={<ManageInstructors />} />
          <Route path="settings" element={<ManageSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
