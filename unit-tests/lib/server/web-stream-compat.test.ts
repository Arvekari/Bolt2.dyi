import { describe, expect, it } from 'vitest';
import { ensureWebStreamCompatibility } from '~/lib/.server/llm/web-stream-compat';

describe('web-stream-compat', () => {
  it('provides a TextDecoderStream compatible with global ReadableStream.pipeThrough', async () => {
    ensureWebStreamCompatibility();

    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('hello'));
        controller.close();
      },
    });

    const decoded = source.pipeThrough(new TextDecoderStream());
    const reader = decoded.getReader();
    const chunks: string[] = [];

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      chunks.push(value);
    }

    expect(chunks.join('')).toBe('hello');
  });
});
