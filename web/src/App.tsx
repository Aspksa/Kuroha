import { FormEvent, useMemo, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ChatResponse = {
  reply: string;
  session_id: string;
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Kuroha online. Send a message, or try /ping, /about, /history.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string>();
  const [pending, setPending] = useState(false);

  const canSend = useMemo(() => input.trim().length > 0 && !pending, [input, pending]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || pending) return;

    setInput("");
    setPending(true);
    setMessages((current) => [...current, { role: "user", content: message }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, session_id: sessionId }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = (await response.json()) as ChatResponse;
      setSessionId(data.session_id);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.reply },
      ]);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unknown error";
      setMessages((current) => [
        ...current,
        { role: "assistant", content: `Connection error: ${text}` },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="shell">
      <header className="header">
        <div>
          <span className="eyebrow">KUROHA / WEB</span>
          <h1>Core console</h1>
        </div>
        <span className="status"><i /> online</span>
      </header>

      <section className="chat" aria-live="polite">
        {messages.map((message, index) => (
          <article className={`message ${message.role}`} key={index}>
            <span>{message.role === "user" ? "YOU" : "KUROHA"}</span>
            <p>{message.content}</p>
          </article>
        ))}
        {pending && (
          <article className="message assistant pending">
            <span>KUROHA</span>
            <p>processing…</p>
          </article>
        )}
      </section>

      <form className="composer" onSubmit={submit}>
        <input
          autoFocus
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Message Kuroha…"
          aria-label="Message"
        />
        <button disabled={!canSend} type="submit">Send</button>
      </form>
    </main>
  );
}
