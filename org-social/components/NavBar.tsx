"use client";

import Link from "next/link";
import { useState } from "react";
import LogoutButton from "./LogoutButton";
import Image from "next/image";

interface NavBarProps {
  role?: "admin" | "staff" | "user"; // optional role-based links
}

export default function NavBar({ role }: NavBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md  ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo / Brand */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="text-xl font-bold text-blue-600">
              <Image src="/logo.webp" alt="Logo" width={200} height={40}/>
            </Link>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex space-x-6 items-center">
            <Link href="/" className="text-gray-700 hover:text-blue-600">
              Home
            </Link>
            <Link
              href="/dashboard"
              className="text-gray-700 hover:text-blue-600"
            >
              Dashboard
            </Link>
            {role === "admin" && (
              <Link href="/admin" className="text-gray-700 hover:text-blue-600">
                Admin Panel
              </Link>
            )}
            <Link href="/about" className="text-gray-700 hover:text-blue-600">
              About
            </Link>
            <LogoutButton/>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-blue-600 focus:outline-none"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <Link
            href="/"
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            Home
          </Link>
          <Link
            href="/dashboard"
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            Dashboard
          </Link>
          {role === "admin" && (
            <Link
              href="/admin"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              Admin Panel
            </Link>
          )}
          <Link
            href="/about"
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            About
          </Link>
          <Link
            href="/logout"
            className="block px-4 py-2 text-red-500 hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            Logout
          </Link>
        </div>
      )}
    </nav>
  );
}
