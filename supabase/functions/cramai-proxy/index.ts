import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function asNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CRAMAI_API_URL = Deno.env.get('VITE_CRAMAI_API_URL');
    const CRAMAI_API_KEY = Deno.env.get('VITE_CRAMAI_API_KEY');

    if (!CRAMAI_API_URL || !CRAMAI_API_KEY) {
      console.error('Missing CramAI configuration');
      // Return 200 so the frontend gets a structured error instead of a generic invoke() failure
      return jsonResponse({ error: 'CramAI API not configured', status: 500 });
    }

    const parsedBody = await req.json().catch(() => null);
    if (!parsedBody || typeof parsedBody !== 'object') {
      return jsonResponse({ error: 'Invalid JSON body', status: 400 });
    }

    const { endpoint, ...body } = parsedBody as Record<string, unknown>;
    const endpointStr = asNonEmptyString(endpoint);

    if (!endpointStr) {
      return jsonResponse({ error: 'Missing endpoint parameter', status: 400 });
    }

    console.log(`Proxying request to: ${endpointStr}`);

    // Normalize payloads for backends that expect `question`.
    // (Your CramAI backend returns "Invalid question" when `question` is missing.)
    const normalizedBody: Record<string, unknown> = { ...body };
    if (endpointStr.startsWith('/api/chat')) {
      const question =
        asNonEmptyString(normalizedBody.question) ||
        asNonEmptyString(normalizedBody.message) ||
        asNonEmptyString(normalizedBody.problem) ||
        asNonEmptyString(normalizedBody.concept) ||
        '';

      if (question.trim().length < 10) {
        return jsonResponse({
          error: 'Please provide a valid question (at least 10 characters)',
          status: 400,
        });
      }

      normalizedBody.question = question;
      // Keep existing fields too (harmless if the backend ignores them)
      if (normalizedBody.message === undefined) normalizedBody.message = question;
    }

    const response = await fetch(`${CRAMAI_API_URL}${endpointStr}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CRAMAI_API_KEY,
      },
      body: JSON.stringify(normalizedBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CramAI API error: ${response.status} - ${errorText}`);

      let message = errorText || `API error: ${response.status}`;
      try {
        const parsed = JSON.parse(errorText);
        message =
          (typeof parsed?.message === 'string' && parsed.message) ||
          (typeof parsed?.error === 'string' && parsed.error) ||
          message;

        // Some backends embed JSON inside `error`
        if (typeof parsed?.error === 'string' && parsed.error.trim().startsWith('{')) {
          try {
            const nested = JSON.parse(parsed.error);
            message =
              (typeof nested?.message === 'string' && nested.message) ||
              (typeof nested?.error === 'string' && nested.error) ||
              message;
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }

      // Return 200 so invoke() doesn't wrap it as "Edge function returned 400..."
      return jsonResponse({ error: message, status: response.status });
    }

    const data = await response.json();
    console.log('CramAI API response received successfully');

    return jsonResponse(data);
  } catch (error) {
    console.error('Proxy error:', error);
    // Return 200 for consistent client parsing.
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error', status: 500 },
      200
    );
  }
});
