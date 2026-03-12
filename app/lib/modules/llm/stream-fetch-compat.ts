function isEventStreamResponse(response: Response): boolean {
  const contentType = response.headers.get('content-type') || '';

  return contentType.toLowerCase().includes('text/event-stream');
}

export function createStreamCompatibleFetch(baseFetch: typeof fetch = fetch): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await baseFetch(input, init);

    if (!isEventStreamResponse(response) || !response.body) {
      return response;
    }

    const reader = (response.body as any).getReader?.();

    if (!reader) {
      return response;
    }

    const normalizedBody = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const { done, value } = await reader.read();

        if (done) {
          controller.close();
          return;
        }

        if (value instanceof Uint8Array) {
          controller.enqueue(value);
          return;
        }

        if (value instanceof ArrayBuffer) {
          controller.enqueue(new Uint8Array(value));
          return;
        }

        if (ArrayBuffer.isView(value)) {
          controller.enqueue(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
          return;
        }

        controller.enqueue(new TextEncoder().encode(String(value ?? '')));
      },
      async cancel(reason) {
        await reader.cancel?.(reason);
      },
    });

    return new Response(normalizedBody, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers),
    });
  }) as typeof fetch;
}
