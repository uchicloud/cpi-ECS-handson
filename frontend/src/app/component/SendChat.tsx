"use client";
import { useState } from "react";

export default function SendChat() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");

  const handleSend = async () => {
    const reply = await fetch('/api/chat', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });
    const json = await reply.json();
    if (!json.reply) {
      throw new Error("No reply received from chat API");
    }
    setReply(json.reply);
    setMessage("");
  }

  return (
    <div className="text-center">
      <h3 className="text-2xl font-bold mb-2">Send a chat message</h3>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="border border-gray-300 p-2 rounded mb-2 text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Type your message here"
      />
      <button
        onClick={handleSend}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Send
      </button>
      {reply && <p className="mt-2 text-gray-500">Reply: {reply}</p>}
    </div>
  );
}