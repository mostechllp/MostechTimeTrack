/* eslint-disable react-hooks/static-components */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  DocumentTextIcon,
  LogoutIcon,
  UserCircleIcon,
  MenuIcon,
  XIcon,
} from "@heroicons/react/outline";
import ConfirmModal from "./resuable/ConfirmModal";
import logo from "../assets/logo.png";

const Header = () => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const logoutConfirm = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  const Logo = () => (
    <div className="flex items-center">
      <img
        src={logo}
        alt="Mostech Business Solutions"
        className="h-10 w-auto md:h-12"
      />
    </div>
  );

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link
              to={user ? (user.role === "admin" ? "/admin" : "/staff") : "/"}
              className="flex items-center"
            >
              <Logo />
            </Link>
          </div>

          {/* Desktop Navigation */}
          {user && (
            <>
              <nav className="hidden md:flex items-center space-x-1 lg:space-x-4">
                {user.role === "admin" ? (
                  <>
                    <NavLink to="/admin">Dashboard</NavLink>
                    <NavLink to="/admin/staff">Staff</NavLink>
                    <NavLink to="/admin/reports">Reports</NavLink>
                    <NavLink to="/admin/leaves">Leaves</NavLink>
                    <NavLink to="/admin/staff-reports">Daily Reports</NavLink>
                  </>
                ) : (
                  <>
                    <NavLink to="/staff">Dashboard</NavLink>
                    <NavLink to="/staff/leave">Leave Request</NavLink>
                    <NavLink to="/staff/profile">Profile</NavLink>
                  </>
                )}
              </nav>

              {/* Desktop User Section */}
              <div className="hidden md:flex items-center space-x-4">
                {user.role !== "admin" && (
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-white/10 rounded-full backdrop-blur-sm">
                    {user.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt="Profile"
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <UserCircleIcon className="h-6 w-6 text-blue-500" />
                    )}
                    <span className="text-sm font-medium text-black">
                      {user.email}
                    </span>
                  </div>
                )}
                <button
                  onClick={logoutConfirm}
                  className="flex items-center space-x-2 px-4 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-500 rounded-full transition-all duration-200 border border-red-400/30 hover:border-red-400/50"
                >
                  <LogoutIcon className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={toggleMobileMenu}
                className="md:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <XIcon className="h-6 w-6 text-black" />
                ) : (
                  <MenuIcon className="h-6 w-6 text-black" />
                )}
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        {user && isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-700 animate-slideDown">
            <div className="flex flex-col space-y-3">
              {/* Mobile Navigation Links */}
              {user.role === "admin" ? (
                <>
                  <MobileNavLink to="/admin" onClick={closeMobileMenu}>
                    Dashboard
                  </MobileNavLink>
                  <MobileNavLink to="/admin/staff" onClick={closeMobileMenu}>
                    Staff
                  </MobileNavLink>
                  <MobileNavLink to="/admin/reports" onClick={closeMobileMenu}>
                    Reports
                  </MobileNavLink>
                  <MobileNavLink to="/admin/leaves" onClick={closeMobileMenu}>
                    Leaves
                  </MobileNavLink>
                  <MobileNavLink
                    to="/admin/staff-reports"
                    onClick={closeMobileMenu}
                  >
                    <DocumentTextIcon className="h-5 w-5 mr-2" />
                    Daily Reports
                  </MobileNavLink>
                </>
              ) : (
                <>
                  <MobileNavLink to="/staff" onClick={closeMobileMenu}>
                    Dashboard
                  </MobileNavLink>
                  <MobileNavLink to="/staff/leave" onClick={closeMobileMenu}>
                    Leave Request
                  </MobileNavLink>
                  <MobileNavLink to="/staff/profile" onClick={closeMobileMenu}>
                    Profile
                  </MobileNavLink>
                </>
              )}

              {/* Mobile User Info and Logout */}
              <div className="pt-4 mt-2 border-t border-gray-700">
                <div className="flex items-center space-x-2 px-4 py-2 bg-white/5 rounded-lg mb-3">
                  <UserCircleIcon className="h-6 w-6 text-blue-500" />
                  <span className="text-sm text-black break-all">
                    {user.email}
                  </span>
                </div>
                <button
                  onClick={() => {
                    logoutConfirm();
                    closeMobileMenu();
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-500 rounded-lg transition-all duration-200"
                >
                  <LogoutIcon className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Confirm Logging out"
        message="Are you sure to logout?"
      />
    </header>
  );
};

// NavLink component for desktop
const NavLink = ({ to, children, icon }) => (
  <Link
    to={to}
    className="flex items-center space-x-1 px-3 py-2 rounded-lg text-black hover:bg-black/10 transition-all duration-200 text-sm font-medium"
  >
    {icon && <span className="mr-1">{icon}</span>}
    <span>{children}</span>
  </Link>
);

// MobileNavLink component for mobile
const MobileNavLink = ({ to, onClick, children }) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex items-center px-4 py-2.5 rounded-lg text-black hover:bg-black/10 transition-all duration-200"
  >
    {children}
  </Link>
);

export default Header;
