import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildSystemPrompt } from '../../../lib/ai/systemPrompt';
import type { AnalyticsOutput } from '../../../types/analytics';

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured in .env.local' }, { status: 503 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const body = await req.json();
    const { messages, analytics } = body as {
      messages: Array<{ role: string; content: string }>;
      analytics: AnalyticsOutput | null;
    };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 });
    }

    // Revive Date objects from JSON (they come as strings)
    let systemPrompt = 'You are Workforce Pulse AI. No dataset context available — please load data files first.';
    if (analytics) {
      const revived = {
        ...analytics,
        dateRange: {
          start: new Date(analytics.dateRange.start),
          end: new Date(analytics.dateRange.end),
        },
        weeklyData: analytics.weeklyData.map((w: any) => ({
          ...w,
          start_date: new Date(w.start_date),
          end_date: new Date(w.end_date),
        })),
      } as AnalyticsOutput;
      systemPrompt = buildSystemPrompt(revived);
    }

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
      temperature: 0.2, // low temperature for factual grounded responses
      max_tokens: 1500,
    });

    // Stream response as SSE
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const data = JSON.stringify(chunk);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('[AI Chat Error]', error);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
