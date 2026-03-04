import { streamText } from '~/lib/.server/llm/stream-text';

export async function executeCoreChatStream(input: {
  system: string;
  message: string;
  env?: Record<string, any>;
}) {
  return streamText({
    options: {
      system: input.system,
    },
    messages: [
      {
        role: 'user',
        content: input.message,
      },
    ],
    env: input.env,
  });
}
