import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { clearAuthCookies } from '~/lib/.server/auth';

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare?.env as Record<string, any> | undefined;
  const headers = new Headers();

  (await clearAuthCookies(request, env)).forEach((cookie) => headers.append('Set-Cookie', cookie));

  return json({ ok: true }, { headers });
}
