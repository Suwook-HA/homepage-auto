import { mkdir, readFile, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");

// Simple in-memory rate limit: 5 submissions per IP per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

async function readMessages(): Promise<object[]> {
  try {
    const raw = await readFile(MESSAGES_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function appendMessage(msg: object): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const messages = await readMessages();
  messages.unshift(msg);
  await writeFile(MESSAGES_FILE, JSON.stringify(messages.slice(0, 200), null, 2), "utf8");
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many messages. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const { name, email, subject, message, _hp } = body as Record<string, string>;

  // Honeypot check
  if (_hp) {
    return NextResponse.json({ ok: true });
  }

  // Validate
  if (!name || name.trim().length < 2) {
    return NextResponse.json({ ok: false, error: "Name is required." }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Valid email is required." }, { status: 400 });
  }
  if (!message || message.trim().length < 10) {
    return NextResponse.json(
      { ok: false, error: "Message must be at least 10 characters." },
      { status: 400 },
    );
  }

  const msg = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim().slice(0, 100),
    email: email.trim().slice(0, 200),
    subject: (subject ?? "").trim().slice(0, 200),
    message: message.trim().slice(0, 2000),
    receivedAt: new Date().toISOString(),
    read: false,
  };

  try {
    await appendMessage(msg);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to save message." }, { status: 500 });
  }
}
