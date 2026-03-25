import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/time-tracker/login" />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/staff" />;
  }

  return children;
};

export default PrivateRoute;