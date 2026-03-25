import React, { createContext, useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axiosInstance from "../utils/axiosConfig";

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = () => {
      const userInfo = localStorage.getItem("userInfo");
      if (userInfo) {
        try {
          const parsedUser = JSON.parse(userInfo);
          setUser(parsedUser);
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
      const { data } = await axiosInstance.post("/auth/login", {
        email,
        password,
      });


      // Check for deleted account (though this should be caught by error)
      if (data.isDeleted) {
        toast.error(
          "Your account has been deactivated. Please contact administrator.",
          { duration: 5000 }
        );
        return;
      }

      // Store in localStorage
      localStorage.setItem("userInfo", JSON.stringify(data));
      setUser(data);

      toast.success("Login successful!");

      if (data.isFirstLogin) {
        navigate("/change-password");
      } else {
        navigate(data.role === "admin" ? "/admin" : "/staff");
      }
    } catch (error) {
      console.error('Login error:', error);
      
      const message = error.response?.data?.message;
      const status = error.response?.status;
      
      if (status === 401 && message && message.includes("deactivated")) {
        toast.error(
          "Your account has been deactivated. Please contact the administrator.",
          { duration: 5000 }
        );
      } else if (status === 401) {
        toast.error("Invalid email or password. Please try again.", { duration: 4000 });
      } else {
        toast.error(error.response?.data?.message || "Login failed. Please try again.", { duration: 4000 });
      }
    }
  };

  const logout = () => {
    localStorage.removeItem("userInfo");
    setUser(null);
    navigate("/login");
    toast.success("Logged out successfully");
  };

  const updateToken = (newToken) => {
    if (user) {
      const updatedUser = { ...user, token: newToken };
      localStorage.setItem("userInfo", JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem("userInfo", JSON.stringify(updatedUser));
  };

  const value = {
    user,
    login,
    logout,
    loading,
    updateToken,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};