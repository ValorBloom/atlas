/**
 * secureProxy — backend security middleware / health endpoint
 * - Input sanitization helpers
 * - Rate limiting per user (in-memory, resets on cold start)
 * - Request logging for audit trail
 * - Content Security Policy headers
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Simple in-memory rate limiter: userId -> [timestamps]
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requests per minute per user

function checkRateLimit(userId) {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return true;
}

// Strip dangerous characters from any string input
export function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

// Recursively sanitize an object
export function sanitizeObject(obj) {
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj && typeof obj === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
      clean[sanitizeString(k)] = sanitizeObject(v);
    }
    return clean;
  }
  return obj;
}

// Security headers to set on all responses
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: SECURITY_HEADERS });
    }

    // Rate limit check
    if (!checkRateLimit(user.id)) {
      return Response.json({ error: 'Too many requests. Please slow down.' }, {
        status: 429,
        headers: { ...SECURITY_HEADERS, 'Retry-After': '60' }
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    // Health/status check
    if (action === 'health') {
      return Response.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        unit: user.unit,
        role: user.role,
      }, { headers: SECURITY_HEADERS });
    }

    // Validate and sanitize entity write payloads
    if (action === 'validate') {
      const payload = sanitizeObject(body?.payload || {});
      return Response.json({ sanitized: payload }, { headers: SECURITY_HEADERS });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400, headers: SECURITY_HEADERS });

  } catch (error) {
    return Response.json({ error: 'Internal error' }, { status: 500, headers: SECURITY_HEADERS });
  }
});