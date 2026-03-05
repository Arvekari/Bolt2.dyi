declare module 'react-dom/server.browser' {
  import type * as React from 'react';

  export interface RenderToReadableStreamOptions {
    signal?: AbortSignal;
    onError?: (error: unknown) => void;
  }

  export interface ReactDOMServerBrowser {
    renderToReadableStream(
      children: React.ReactNode,
      options?: RenderToReadableStreamOptions,
    ): Promise<ReadableStream<Uint8Array> & { allReady: Promise<void> }>;
  }

  export const renderToReadableStream: ReactDOMServerBrowser['renderToReadableStream'];
}
