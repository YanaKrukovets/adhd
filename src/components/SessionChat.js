'use client';
// @ts-check
import Link from 'next/link';
import { useChat } from 'ai/react';
import { useEffect, useRef } from 'react';

/**
 * @param {object} props
 * @param {string} props.sessionId
 * @param {string} props.taskTitle
 * @param {string} props.firstAction
 */
export default function SessionChat({ sessionId, taskTitle, firstAction }) {
  const bottomRef = useRef(/** @type {HTMLDivElement|null} */ (null));
  const checkinTimerRef = useRef(/** @type {ReturnType<typeof setTimeout>|null} */ (null));
  const sessionStartedRef = useRef(false);
  const sessionEndedRef = useRef(false);

  const { messages, input, handleInputChange, handleSubmit, isLoading, append, status } = useChat({
    api: `/api/session/${sessionId}`,
    id: sessionId,
    onError: (err) => console.error('[session chat]', err),
  });

  // Trigger initial agent greeting once on mount
  useEffect(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    append({ role: 'user', content: `[session:start] task="${taskTitle}" first_action="${firstAction}"` });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Watch for set_checkin_timer tool results and schedule browser check-ins
  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== 'assistant') continue;
      for (const inv of msg.toolInvocations ?? []) {
        if (inv.toolName === 'set_checkin_timer' && inv.state === 'result' && inv.result?.minutes) {
          if (checkinTimerRef.current) clearTimeout(checkinTimerRef.current);
          const ms = inv.result.minutes * 60_000;
          checkinTimerRef.current = setTimeout(() => {
            if (!sessionEndedRef.current) {
              append({
                role: 'user',
                content: `[session:checkin] ${inv.result.minutes} minutes elapsed. Still going?`,
              });
            }
          }, ms);
        }
        if (inv.toolName === 'end_session' && inv.state === 'result') {
          sessionEndedRef.current = true;
          if (checkinTimerRef.current) clearTimeout(checkinTimerRef.current);
        }
      }
    }
  }, [messages, append]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (checkinTimerRef.current) clearTimeout(checkinTimerRef.current);
    };
  }, []);

  const isEnded = messages.some((m) =>
    m.role === 'assistant' &&
    (m.toolInvocations ?? []).some((inv) => inv.toolName === 'end_session' && inv.state === 'result')
  );

  const visibleMessages = messages.filter(
    (m) => !(m.role === 'user' && typeof m.content === 'string' && m.content.startsWith('[session:'))
  );

  if (isEnded) {
    const endInv = messages
      .flatMap((m) => m.toolInvocations ?? [])
      .find((inv) => inv.toolName === 'end_session' && inv.state === 'result');
    return (
      <div className="mt-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-lg font-medium text-stone-900">Session wrapped up.</p>
        {endInv?.result?.summary && (
          <p className="mt-2 text-stone-600 text-sm">{endInv.result.summary}</p>
        )}
        {endInv?.result?.tomorrow_first_action && (
          <div className="mt-4 rounded-lg bg-stone-50 px-4 py-3">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Next time</p>
            <p className="mt-1 text-stone-800">{endInv.result.tomorrow_first_action}</p>
          </div>
        )}
        <Link
          href="/app"
          className="mt-5 inline-block rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 transition-colors"
        >
          Back to today
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Message thread */}
      <div role="log" aria-live="polite" aria-label="Session conversation" className="flex flex-col gap-3 min-h-[200px]">
        {visibleMessages.map((m) => (
          <div
            key={m.id}
            className={m.role === 'user'
              ? 'self-end max-w-[80%] rounded-2xl rounded-br-sm bg-stone-900 px-4 py-2 text-sm text-white'
              : 'self-start max-w-[85%] rounded-2xl rounded-bl-sm bg-white border border-stone-200 px-4 py-3 text-sm text-stone-800 shadow-sm'
            }
          >
            {typeof m.content === 'string' ? m.content : null}
          </div>
        ))}
        {isLoading && (
          <div aria-label="Focus Copilot is thinking" className="self-start flex gap-1 rounded-2xl rounded-bl-sm bg-white border border-stone-200 px-4 py-3 shadow-sm">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:0ms]" />
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:150ms]" />
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:300ms]" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-stone-100 pt-4"
      >
        <input
          className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
          placeholder="What's happening?"
          aria-label="Message to Focus Copilot"
          value={input}
          onChange={handleInputChange}
          disabled={isLoading}
          autoFocus
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 transition-colors disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
