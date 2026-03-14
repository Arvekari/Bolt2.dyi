import { json, type ActionFunction } from '@remix-run/cloudflare';

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const body = (await request.json().catch(() => ({}))) as { intent?: string; targetVersion?: string };

  if (body.intent === 'auto') {
    return json(
      {
        ok: false,
        canAutoUpdate: false,
        message:
          'Automatic self-update is not available in this runtime. Please update manually from Arvekari/Opurion.',
        targetVersion: body.targetVersion || null,
        instructions: [
          '1. Navigate to the project directory',
          '2. Run: git fetch origin',
          '3. Run: git pull --ff-only origin main',
          '4. Run: pnpm install',
          '5. Rebuild/restart the application',
        ],
      },
      { status: 501 },
    );
  }

  return json(
    {
      error: 'Updates must be performed manually in a server environment',
      instructions: [
        '1. Navigate to the project directory',
        '2. Run: git fetch origin',
        '3. Run: git pull --ff-only origin main',
        '4. Run: pnpm install',
        '5. Run: pnpm run build',
      ],
    },
    { status: 400 },
  );
};
