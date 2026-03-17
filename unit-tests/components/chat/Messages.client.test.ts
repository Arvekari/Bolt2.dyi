/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { Messages } from '../../../app/components/chat/Messages.client';

vi.mock('@remix-run/react', () => ({
  useLocation: () => ({ search: '' }),
}));

vi.mock('../../../app/lib/persistence/useChatHistory', () => ({
  db: null,
  chatId: { get: () => null },
  forkChat: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: { error: vi.fn() },
}));

vi.mock('../../../app/components/chat/AssistantMessage', () => ({
  AssistantMessage: ({ content }: { content: string }) => React.createElement('div', null, content),
}));

vi.mock('../../../app/components/chat/UserMessage', () => ({
  UserMessage: ({ content }: { content: string }) => React.createElement('div', null, content),
}));

describe('app/components/chat/Messages.client.tsx', () => {
  it('shows phase-aware copy while waiting for the first chunk', () => {
    render(
      React.createElement(Messages, {
        isStreaming: true,
        streamingState: 'submitted',
        messages: [],
        addToolResult: vi.fn(),
      }),
    );

    expect(screen.getByText('Request sent. Gathering information (round 1).')).toBeTruthy();
  });

  it('shows working copy while a response is actively streaming', () => {
    render(
      React.createElement(Messages, {
        isStreaming: true,
        streamingState: 'streaming',
        messages: [],
        addToolResult: vi.fn(),
      }),
    );

    expect(screen.getByText('Gathering information (round 1).')).toBeTruthy();
  });

  it('rotates streaming stage after every three rounds', async () => {
    vi.useFakeTimers();

    render(
      React.createElement(Messages, {
        isStreaming: true,
        streamingState: 'streaming',
        messages: [],
        addToolResult: vi.fn(),
      }),
    );

    expect(screen.getByText('Gathering information (round 1).')).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000);
    });

    expect(screen.getByText('Working on the request (round 4).')).toBeTruthy();

    vi.useRealTimers();
  });
});
