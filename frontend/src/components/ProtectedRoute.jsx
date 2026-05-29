import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { userInfo } = useSelector((state) => state.auth);

  // If user is not logged in, redirect to login page
  if (!userInfo) {
    return <Navigate to="/login" replace />;
  }

  // If page requires administrator privileges but user is a standard customer
  if (adminOnly && userInfo.role !== 'admin') {
    return <Navigate to="/scanner" replace />;
  }

  return children;
};

export default ProtectedRoute;
