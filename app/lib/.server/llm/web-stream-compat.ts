let initialized = false;

class CompatibleTextDecoderStream {
  readable: ReadableStream<string>;
  writable: WritableStream<BufferSource>;

  constructor(label: string = 'utf-8', options?: TextDecoderOptions) {
    const decoder = new TextDecoder(label, options);
    const Readable = globalThis.ReadableStream;
    const Writable = globalThis.WritableStream;

    let readableController: ReadableStreamDefaultController<string> | undefined;

    this.readable = new Readable<string>({
      start(controller) {
        readableController = controller;
      },
    });

    this.writable = new Writable<BufferSource>({
      write(chunk) {
        const text = decoder.decode(chunk, { stream: true });

        if (text.length > 0) {
          readableController?.enqueue(text);
        }
      },
      close() {
        const text = decoder.decode();

        if (text.length > 0) {
          readableController?.enqueue(text);
        }

        readableController?.close();
      },
      abort(reason) {
        readableController?.error(reason);
      },
    });
  }
}

export function ensureWebStreamCompatibility() {
  if (initialized) {
    return;
  }

  initialized = true;

  // In some Remix/Cloudflare Node runtimes, fetch() responses use a
  // web-streams-polyfill ReadableStream while TextDecoderStream can be native.
  // That mixed implementation breaks pipeThrough() in AI SDK stream parsers.
  // Force TextDecoderStream to be built on the active global TransformStream.
  (globalThis as any).TextDecoderStream = CompatibleTextDecoderStream;
}
