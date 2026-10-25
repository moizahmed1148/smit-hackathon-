
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../utils/api";

const suggestions = [
  {
    icon: "♙",
    title: "Employee overview",
    description: "How many employees do we have?",
    prompt: "How many employees do we have?",
  },
  {
    icon: "◷",
    title: "Attendance",
    description: "Show today's attendance summary",
    prompt: "Show me today's attendance summary",
  },
  {
    icon: "▤",
    title: "Leave requests",
    description: "Are there pending leave requests?",
    prompt: "Are there any pending leave requests?",
  },
  {
    icon: "＄",
    title: "Payroll insights",
    description: "Give me a payroll summary",
    prompt: "Give me a payroll summary",
  },
];

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I'm your HCM assistant. I can help you explore employee information, attendance, leave requests, and payroll. What would you like to know?",
      time: new Date(),
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, error]);

  async function sendMessage(message = input) {
    const question = message.trim();

    if (!question || loading) return;

    setError("");
    setInput("");

    setMessages((previous) => [
      ...previous,
      { role: "user", content: question, time: new Date() },
    ]);

    setLoading(true);

    try {
      const data = await apiRequest("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: question }),
      });

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.reply || "I couldn't generate a response.",
          time: new Date(),
        },
      ]);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage();
  }

  function formatTime(time) {
    return new Date(time).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-6xl flex-col gap-6">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            PeoplePulse Intelligence
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            AI Assistant
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
            Your intelligent HR companion. Ask questions and get insights from
            the data you're authorized to access.
          </p>
        </div>

        <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Assistant ready
        </div>
      </div>

      {/* Main chat panel */}
      <section className="flex min-h-[560px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:min-h-[650px]">
        {/* Chat header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-xl text-white shadow-sm shadow-indigo-200">
              ✦
            </div>

            <div className="min-w-0">
              <h2 className="font-semibold text-slate-900">HCM Copilot</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                HR data · AI-powered assistance
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 sm:flex">
            <span>✧</span>
            Natural language
          </div>
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto bg-slate-50/70 px-4 py-6 sm:px-8">
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            {messages.map((message, index) => (
              <div
                key={`${index}-${message.role}`}
                className={`flex items-end gap-2.5 sm:gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="mb-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700">
                    ✦
                  </div>
                )}

                <div
                  className={`flex max-w-[88%] flex-col gap-1.5 sm:max-w-[78%] ${
                    message.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <span className="px-1 text-xs font-medium text-slate-500">
                    {message.role === "user" ? "You" : "HCM Copilot"}
                  </span>

                  <div
                    className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3.5 text-sm leading-7 ${
                      message.role === "user"
                        ? "rounded-br-md bg-indigo-600 text-white shadow-sm"
                        : "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm"
                    }`}
                  >
                    {message.content}
                  </div>

                  <span className="px-1 text-[11px] text-slate-400">
                    {formatTime(message.time)}
                  </span>
                </div>

                {message.role === "user" && (
                  <div className="mb-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-xs font-bold text-slate-600">
                    You
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-end gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm text-indigo-700">
                  ✦
                </div>

                <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500 [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500 [animation-delay:300ms]" />
                    </span>
                    <span className="text-xs text-slate-500">
                      Thinking through your question...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="ml-10 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                <p className="font-semibold">Unable to get a response</p>
                <p className="mt-1 break-words">{error}</p>
                <button
                  type="button"
                  onClick={() => setError("")}
                  className="mt-2 text-xs font-semibold underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Suggestions and composer */}
        <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-5 sm:px-6 sm:pb-5">
          <div className="mx-auto max-w-3xl">
            {messages.length === 1 && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-slate-800">
                  Get started with a question
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Choose a suggestion or type your own below.
                </p>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.title}
                      type="button"
                      disabled={loading}
                      onClick={() => sendMessage(suggestion.prompt)}
                      className="group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/60 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg text-slate-600 transition group-hover:bg-indigo-100 group-hover:text-indigo-700">
                        {suggestion.icon}
                      </span>

                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-800">
                          {suggestion.title}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          {suggestion.description}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.length > 1 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.title}
                    type="button"
                    disabled={loading}
                    onClick={() => sendMessage(suggestion.prompt)}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
                  >
                    {suggestion.title}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50 sm:gap-3"
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSubmit(event);
                  }
                }}
                placeholder="Ask about employees, attendance, leave..."
                rows={1}
                maxLength={4000}
                className="max-h-32 min-h-11 flex-1 resize-y bg-transparent px-2 py-3 text-sm leading-5 text-slate-800 outline-none placeholder:text-slate-400"
              />

              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:px-5"
              >
                <span>Send</span>
                <span aria-hidden="true">↑</span>
              </button>
            </form>

            <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">
              AI can make mistakes. Verify important HR information before
              making decisions.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
