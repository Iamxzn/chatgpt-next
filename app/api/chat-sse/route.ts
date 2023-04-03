import { NextResponse } from 'next/server';

import { HttpStatusCode } from '@/app/utils/constants';
import { sleep } from '@/app/utils/sleep';
import { getTask } from '@/app/utils/task';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json(
      { code: HttpStatusCode.BadRequest, message: 'taskId 未设置' },
      { status: HttpStatusCode.BadRequest },
    );
  }

  const task = getTask(taskId);

  if (!task) {
    return NextResponse.json(
      { code: HttpStatusCode.BadRequest, message: '不存在此 task' },
      { status: HttpStatusCode.BadRequest },
    );
  }

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // const fetchResult: Response = await task.run();

  (async () => {
    for (let i = 0; i < 8; i++) {
      writer.write(encoder.encode(`data: hello ${i}\n\n`));
      await sleep(100);
    }
    // for await (const trunkUint8Array of fetchResult.body as any as IterableIterator<Uint8Array>) {
    //   writer.write(encoder.encode('data: hello\n\n'));
    //   writer.write(
    //     encoder.encode(
    //       `${decoder
    //         .decode(trunkUint8Array)
    //         .split('\n')
    //         .map((trunk) => `data: ${trunk}`)
    //         .join('\n')}\n\n`,
    //     ),
    //   );
    // }
    writer.write(encoder.encode(`event: finish\ndata: 已读取完毕\n\n`));
  })();

  // // 读取数据
  // function read() {
  //   reader?.read().then(({ value, done }) => {
  //     if (done) {
  //       writer.write(encoder.encode(`event: finish\ndata: 已读取完毕\n\n`));
  //       return;
  //     }
  // writer.write(
  //   encoder.encode(
  //     `${decoder
  //       .decode(value)
  //       .split('\n')
  //       .map((trunk) => `data: ${trunk}`)
  //       .join('\n')}\n\n`,
  //   ),
  // );

  //     // 继续读取下一个数据
  //     read();
  //   });
  // }

  // 开始读取
  // read();

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
