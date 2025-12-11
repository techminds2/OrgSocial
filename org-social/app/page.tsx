"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

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

      setUser(data.user);
      // alert("Login successful! Cookies stored automatically.");
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
        onSubmit={handleLogin}
        className="bg-white p-8 rounded shadow-md w-full max-w-md text-black"
      >
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.webp" alt="Logo" className="w-60 h-auto "></img>
          <h2 className="font-semibold  text-black text-lg">Wecome back</h2>
          <p className=" mb-4 text-gray-500 text-sm">Sign into your account</p>
        </div>

        <label htmlFor="username" className="block mb-2 text-black text-sm">
          Username
        </label>
        <input
          type="text"
          placeholder="you@example.techminds.com.np"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full mb-4 p-2 border rounded text-black"
          required
        />

        <label htmlFor="password" className="block mb-2 text-black text-sm">
          Password
        </label>
        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded text-black "
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-lg"
          >
            {showPassword ? "👁️" : "👁️‍🗨️"}
          </button>
        </div>

        <button
          type="submit"
          className="w-full bg-primary text-white py-2 rounded hover:bg-secondary"
        >
          Login
        </button>
        <div className="mt-4 text-center">
          <Link
            href="/forgot-password"
            className="text-gray-500 text-sm hover:underline"
          >
            Forgot your password?
          </Link>
        </div>
        {error && <p className="text-red-500 mt-4">{error}</p>}
        {user && (
          <pre className="mt-4 bg-gray-100 p-2 rounded text-sm overflow-auto text-black">
            {JSON.stringify(user, null, 2)}
          </pre>
        )}
      </form>
    </div>
  );
}
