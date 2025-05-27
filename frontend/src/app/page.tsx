import React, { Suspense } from "react";
import Loading from "./loading";
import SendChat from "./component/SendChat";

// Async component to fetch and render main greeting
async function Hello() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/hello`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error("Failed to fetch greeting");
  }
  const data: { message: string } = await res.json();

  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-2">get from /api/hello</h1>
      <p className="text-gray-500">{data.message}</p>
    </div>
  );
}

// Async component to fetch and render a proverb with artificial delay
async function Proverb() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/proverb`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error("Failed to fetch proverb");
  }
  const data: { message: string } = await res.json();

  return <p className="text-sm text-gray-400">{data.message}</p>;
}


export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 space-y-4">
      <Suspense fallback={<Loading />}>
        <Hello />
      </Suspense>

      <div>
        <Suspense fallback={<Loading />}>
          <Proverb />
        </Suspense>
      </div>
      <SendChat />
    </main>
  );
}
