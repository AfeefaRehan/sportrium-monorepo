import { httpPost } from '@/lib/http';

/**
 * Send a chat turn to backend.
 * @param {Array<{role:'user'|'assistant'|'system', content:string}>} messages
 * @param {string|number=} userId optional logged-in user id for context
 */
export async function sendChat(messages, userId) {
  // the backend endpoint we will standardize on:
  // POST {VITE_API_URL}/chat  body: {messages, userId?}
  return await httpPost('/chat', { messages, userId });
}
