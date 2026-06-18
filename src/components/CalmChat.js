'use client';
// @ts-check
import Link from 'next/link';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef, useState } from 'react';

/**
 * @param {{ parts?: Array<{ type: string, text?: string }> }} [message]
 * @returns {string}
 */
function getMessageText(message) {
  return (message?.parts ?? [])
    .filter((p) => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

/**
 * A gentle, stateless grounding chat. Talks to /api/calm. No tasks, no tools,
 * nothing to finish — the user can leave whenever they feel steadier.
 */
export default function CalmChat() {
  const bottomRef = useRef(/** @type {HTMLDivElement|null} */ (null));
  const startedRef = useRef(false);
  const [input, setInput] = useState('');

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/calm' }),
    onError: (err) => console.error('[calm chat]', err),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // Open with a grounding greeting so the user lands on a soft "you're here,
  // take your time" rather than a blank box that asks them to perform.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    sendMessage({
      text: "[calm:start] The user opened the calm space feeling overwhelmed or anxious. Greet them gently in one or two short sentences, let them know there's nothing they have to do here, and invite them to say what's heavy right now.",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const visibleMessages = messages.filter(
    (m) => !(m.role === 'user' && getMessageText(m).startsWith('[calm:'))
  );

  return (
    <div className="flex flex-col gap-4">
      <div
        role="log"
        aria-live="polite"
        aria-label="Calm companion conversation"
        className="flex flex-col gap-3 min-h-[200px]"
      >
        {visibleMessages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === 'user'
                ? 'self-end max-w-[80%] rounded-2xl rounded-br-sm bg-teal-700 px-4 py-2 text-sm text-white'
                : 'self-start max-w-[85%] rounded-2xl rounded-bl-sm bg-white border border-teal-100 px-4 py-3 text-sm leading-relaxed text-stone-800 shadow-sm'
            }
          >
            {getMessageText(m)}
          </div>
        ))}
        {isLoading && (
          <div
            aria-label="The companion is here"
            className="self-start flex gap-1 rounded-2xl rounded-bl-sm bg-white border border-teal-100 px-4 py-3 shadow-sm"
          >
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce [animation-delay:0ms]" />
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce [animation-delay:150ms]" />
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce [animation-delay:300ms]" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div
          role="alert"
          className="self-start max-w-[85%] rounded-2xl rounded-bl-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {error.message ||
            "Couldn't reach the companion just now — give it another moment and try again."}
        </div>
      )}

      {/* A quiet way out — sitting with the breathing scene is also enough. */}
      <div className="flex justify-end">
        <Link
          href="/app/meditate"
          className="rounded-full border border-teal-200 px-3 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50 transition-colors"
        >
          Just want to breathe →
        </Link>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput('');
        }}
        className="flex gap-2 border-t border-teal-100 pt-4"
      >
        <input
          className="flex-1 rounded-xl border border-teal-200 bg-white px-4 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-300"
          placeholder="What's heavy right now?"
          aria-label="Message to the calm companion"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          autoFocus
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 transition-colors disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
