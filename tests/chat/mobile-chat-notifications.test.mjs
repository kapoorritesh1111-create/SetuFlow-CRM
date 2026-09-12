import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const safeChat = fs.readFileSync('src/components/chat/crm-chat-fab-safe.tsx', 'utf8');
const smcChat = fs.readFileSync('src/components/chat/crm-chat-fab.tsx', 'utf8');
const smcMobile = fs.readFileSync('src/app/smc/smc-mobile.css', 'utf8');
const messages = fs.readFileSync('src/app/api/chat/messages/route.ts', 'utf8');
const chatThread = fs.readFileSync('src/components/chat/chat-thread.tsx', 'utf8');

test('mobile Chat panels and close controls respect the iPhone safe area', () => {
  assert.match(safeChat, /top: "env\(safe-area-inset-top, 0px\)"/);
  assert.match(safeChat, /aria-label="Close chat"/);
  assert.match(smcChat, /className="crm-chat-panel"/);
  assert.match(smcChat, /className="crm-chat-close" aria-label="Close chat"/);
  assert.match(smcMobile, /\.smc-root \.crm-chat-panel/);
  assert.match(smcMobile, /inset: env\(safe-area-inset-top, 0px\) 0 0 !important/);
  assert.match(smcMobile, /\.smc-root \.crm-chat-close[\s\S]*width: 44px;[\s\S]*height: 44px;/);
});

test('DMs and mentions create CRM-scoped phone push with a working Chat deep link', () => {
  assert.match(messages, /sendWebPushToUsers/);
  assert.match(messages, /type: "chat_message"/);
  assert.match(messages, /\/dashboard\?chat=open&conversation_id=/);
  assert.match(messages, /recipientIds/);
  assert.match(messages, /pushResult\.sent === 0/);
  assert.match(messages, /best-effort and must never roll back the saved message/);
  assert.doesNotMatch(messages, /link: `\/chat\?conversation_id=/);
});

test('a Chat push deep link opens the targeted conversation in the mobile panel', () => {
  assert.match(safeChat, /params\.get\("chat"\) !== "open"/);
  assert.match(safeChat, /setOpen\(true\)/);
  assert.match(safeChat, /setActiveConvId\(conversationId\)/);
  assert.match(safeChat, /setDeepLinkedConversationId\(conversationId\)/);
  assert.match(safeChat, /linked\.conversation_type === "dm"/);
  assert.match(safeChat, /setMobileShowList\(false\)/);
});

test('channel history scroll stays inside the thread and cannot displace mobile Chat controls', () => {
  assert.match(chatThread, /const messageAreaRef = useRef<HTMLDivElement>\(null\)/);
  assert.match(chatThread, /messageArea\.scrollTo\(\{ top: messageArea\.scrollHeight/);
  assert.doesNotMatch(chatThread, /endRef\.current\?\.scrollIntoView/);
  assert.match(chatThread, /minHeight: compact \? 0 : 520/);
  assert.match(chatThread, /flex: 1, minHeight: 0, overflowY: "auto"/);
  assert.match(smcChat, /flex: 1, minHeight: 0, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden"/);
  assert.match(safeChat, /flex: 1, minHeight: 0, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden"/);
});
