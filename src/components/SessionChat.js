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
 * @param {{ parts?: Array<any> }} [message]
 * @param {string} toolName
 */
function findToolOutput(message, toolName) {
  return (message?.parts ?? []).find(
    (p) => p.type === `tool-${toolName}` && p.state === 'output-available'
  )?.output;
}

/**
 * @param {object} props
 * @param {string} props.sessionId
 * @param {string} props.taskTitle
 * @param {string} props.firstAction
 * @param {Array<any>} [props.initialMessages] persisted transcript to rehydrate on reload
 */
export default function SessionChat({ sessionId, taskTitle, firstAction, initialMessages = [] }) {
  const bottomRef = useRef(/** @type {HTMLDivElement|null} */ (null));
  const checkinTimerRef = useRef(/** @type {ReturnType<typeof setTimeout>|null} */ (null));
  const sessionStartedRef = useRef(false);
  const sessionEndedRef = useRef(false);
  const [input, setInput] = useState('');

  const { messages, sendMessage, status, error } = useChat({
    id: sessionId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: `/api/session/${sessionId}` }),
    onError: (err) => console.error('[session chat]', err),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // Trigger initial agent greeting once on mount — but only for a genuinely
  // fresh session. When we rehydrated a transcript on reload, the conversation
  // is already underway, so re-greeting would duplicate the opener.
  useEffect(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    if (initialMessages.length > 0) return;
    sendMessage({ text: `[session:start] task="${taskTitle}" first_action="${firstAction}"` });
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
      const checkin = findToolOutput(msg, 'set_checkin_timer');
      if (checkin?.minutes) {
        if (checkinTimerRef.current) clearTimeout(checkinTimerRef.current);
        const ms = checkin.minutes * 60_000;
        checkinTimerRef.current = setTimeout(() => {
          if (!sessionEndedRef.current) {
            sendMessage({
              text: `[session:checkin] ${checkin.minutes} minutes elapsed. Still going?`,
            });
          }
        }, ms);
      }
      if (findToolOutput(msg, 'end_session')) {
        sessionEndedRef.current = true;
        if (checkinTimerRef.current) clearTimeout(checkinTimerRef.current);
      }
    }
  }, [messages, sendMessage]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (checkinTimerRef.current) clearTimeout(checkinTimerRef.current);
    };
  }, []);

  const endResult = messages
    .filter((m) => m.role === 'assistant')
    .map((m) => findToolOutput(m, 'end_session'))
    .find(Boolean);

  // Surface a failed state write. If the task couldn't be updated (e.g. no task
  // bound to the session), the agent's reply alone would look like success
  // while the task quietly stays in today's list — so flag it plainly.
  const stateUpdateFailed = messages
    .filter((m) => m.role === 'assistant')
    .map((m) => findToolOutput(m, 'update_task_state'))
    .some((out) => out && out.ok === false);

  const visibleMessages = messages.filter((m) => !(m.role === 'user' && getMessageText(m).startsWith('[session:')));

  if (endResult) {
    return (
      <div className="mt-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-lg font-medium text-stone-900">Session wrapped up.</p>
        {endResult.summary && (
          <p className="mt-2 text-stone-600 text-sm">{endResult.summary}</p>
        )}
        {endResult.tomorrow_first_action && (
          <div className="mt-4 rounded-lg bg-stone-50 px-4 py-3">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Next time</p>
            <p className="mt-1 text-stone-800">{endResult.tomorrow_first_action}</p>
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
            {getMessageText(m)}
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

      {/* Surface assistant errors (e.g. free-tier usage limit) plainly so the
          user knows what happened, not just the console. */}
      {error && (
        <div role="alert" className="self-start max-w-[85%] rounded-2xl rounded-bl-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error.message || "Couldn't reach the assistant just now — give it another moment and try again."}
        </div>
      )}

      {stateUpdateFailed && (
        <div role="alert" className="self-start max-w-[85%] rounded-2xl rounded-bl-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          We couldn&apos;t save that change just now, so this task may still show up under today. Try again in a moment.
        </div>
      )}

      {/* Quick actions */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() =>
            sendMessage({
              text: `[session:complete] The user marked the whole task done. Confirm it's complete, call update_task_state done, then wrap up the session.`,
            })
          }
          disabled={isLoading}
          className="rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition-colors disabled:opacity-40"
        >
          This task is done
        </button>
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput('');
        }}
        className="flex gap-2 border-t border-stone-100 pt-4"
      >
        <input
          className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
          placeholder="What's happening?"
          aria-label="Message to Focus Copilot"
          value={input}
          onChange={(e) => setInput(e.target.value)}
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
