import React, { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for stored user on initial load
    const initializeAuth = () => {
      const userInfo = localStorage.getItem("userInfo");
      if (userInfo) {
        try {
          const parsedUser = JSON.parse(userInfo);
          setUser(parsedUser);
          // Set default axios header
          axios.defaults.headers.common["Authorization"] =
            `Bearer ${parsedUser.token}`;
        } catch (error) {
          console.error("Error parsing user info:", error);
          localStorage.removeItem("userInfo");
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await axios.post(
        "http://localhost:5000/api/auth/login",
        {
          email,
          password,
        },
      );

      // Store in localStorage
      localStorage.setItem("userInfo", JSON.stringify(data));

      // Set axios default header
      axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;

      setUser(data);

      toast.success("Login successful!");

      if (data.isFirstLogin) {
        navigate("/change-password");
      } else {
        navigate(data.role === "admin" ? "/admin" : "/staff");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    }
  };

  const logout = () => {
    localStorage.removeItem("userInfo");
    setUser(null);
    // Remove axios default header
    delete axios.defaults.headers.common["Authorization"];
    navigate("/login");
    toast.success("Logged out successfully");
  };

  // Function to update token
  const updateToken = (newToken) => {
    if (user) {
      const updatedUser = { ...user, token: newToken };
      localStorage.setItem("userInfo", JSON.stringify(updatedUser));
      setUser(updatedUser);
      axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    }
  };

  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem("userInfo", JSON.stringify(updatedUser));
    // Also update axios headers if needed
    axios.defaults.headers.common["Authorization"] =
      `Bearer ${updatedUser.token}`;
  };

  const value = {
    user,
    login,
    logout,
    loading,
    updateToken,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
