import React, { Suspense } from "react";

 // Async component to fetch and render data
async function Hello() {
  const res = await fetch("http://localhost:3000/api/hello", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }
  const data: { message: string } = await res.json();

  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-2">get from /api/hello</h1>
      <p className="text-gray-500">{data.message}</p>
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Suspense fallback={<div className="text-center">Loading...</div>}>
        <Hello />
      </Suspense>
    </main>
  );
}
