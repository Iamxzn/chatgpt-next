import type { ChatMessage, SendMessageOptions } from 'chatgpt';
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createParser } from 'eventsource-parser';
import type { NextApiRequest, NextApiResponse } from 'next';

import type { HttpStatusCode } from '@/utils/constants';
import { getApiKey } from '@/utils/getApiKey';

export type ChatReq = SendMessageOptions & {
  text: string;
};

export type ChatRes = ChatMessage;

interface ErrorResponse {
  code: HttpStatusCode;
  message: string;
}

/**
 * https://github.com/vercel/next.js/issues/9965#issuecomment-587355489
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<ChatRes | ErrorResponse>) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');

  const content = req.query.content as string;
  const encoder = new TextEncoder();

  const parser = createParser((event) => {
    if (event.type === 'event') {
      console.log(event.data);
    }
  });

  (async () => {
    const apiKey = req.cookies?.apiKey;
    const decoder = new TextDecoder();
    console.log('before fetch');

    const fetchResult = await fetch('https://api.openai.com/v1/chat/completions', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getApiKey(apiKey!)}`,
      },
      method: 'POST',
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content }],
        stream: true,
      }),
    });

    console.log('after fetch');

    for await (const chunkUint8Array of streamAsyncIterable(fetchResult.body!)) {
      const chunkString = decoder.decode(chunkUint8Array);
      console.log(chunkString);
      // res.write(encoder.encode(`data: ${chunkString}\n\n`));
      parser.feed(chunkString);
      // writer.write(encoder.encode(`data: ${chunkString}\n\n`));
    }
  })();

  res.write(`event: finish\ndata: 完成\n\n`);
  return;
}

export async function* streamAsyncIterable<T>(stream: ReadableStream<T>) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}
