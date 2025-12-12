"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    const token = document.cookie.split("; ").find((c) => c.startsWith("accessToken="));
    if (token) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundImage: "url('/bg.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <form
        className="bg-white p-8 rounded shadow-md w-full max-w-md text-black relative z-10"
        onSubmit={handleLogin}
      >
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.webp" alt="Logo" className="w-60 h-auto" />
          <h2 className="font-semibold text-black text-lg">Welcome back</h2>
          <p className="mb-4 text-gray-500 text-sm">Sign into your account</p>
        </div>

        <label className="block mb-2 text-black text-sm">Username</label>
        <input
          type="text"
          placeholder="you@example.techminds.com.np"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full mb-4 p-2 border rounded text-black"
          required
        />

        <label className="block mb-2 text-black text-sm">Password</label>
        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded text-black mb-4"
          required
        />

        <button
          type="submit"
          className="w-full bg-primary text-white py-2 rounded hover:bg-secondary"
        >
          Login
        </button>

        <div className="mt-4 text-center">
          <Link href="/forgot-password" className="text-gray-500 text-sm hover:underline">
            Forgot your password?
          </Link>
        </div>

        {error && <p className="text-red-500 mt-4">{error}</p>}
      </form>
    </div>
  );
}
