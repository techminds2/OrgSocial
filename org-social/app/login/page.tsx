"use client";

import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);

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

      setUser(data.user);
      alert("Login successful! Cookies stored automatically.");
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded shadow-md w-full max-w-md text-black"
      >
        <h2 className="text-2xl font-semibold mb-6 text-black">Login</h2>

        <label htmlFor="username" className="block mb-2 text-black">
          Username
        </label>
        <input
          type="text"
          placeholder=""
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full mb-4 p-2 border rounded text-black placeholder-black"
          required
        />

        <label htmlFor="password" className="block mb-2 text-black">
          Password
        </label>
        <input
          type="password"
          placeholder=""
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 p-2 border rounded text-black placeholder-black"
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          Login
        </button>

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
