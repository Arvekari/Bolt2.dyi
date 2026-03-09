#!/usr/bin/env node

import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function parseArgs(argv) {
  const args = {
    sha: 'HEAD',
    repo: '',
    pollSeconds: 20,
    timeoutSeconds: 1800,
    detach: false,
    logFile: '',
    requireImagePublish: false,
    image: 'ghcr.io/arvekari/ebolt2',
    imageTag: '',
    statusFile: '',
    autoFixOnFail: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--sha' && argv[i + 1]) {
      args.sha = argv[++i];
    } else if (arg === '--repo' && argv[i + 1]) {
      args.repo = argv[++i];
    } else if (arg === '--poll' && argv[i + 1]) {
      args.pollSeconds = Number(argv[++i]) || 20;
    } else if (arg === '--timeout' && argv[i + 1]) {
      args.timeoutSeconds = Number(argv[++i]) || 1800;
    } else if (arg === '--detach') {
      args.detach = true;
    } else if (arg === '--log-file' && argv[i + 1]) {
      args.logFile = argv[++i];
    } else if (arg === '--require-image-publish') {
      args.requireImagePublish = true;
    } else if (arg === '--image' && argv[i + 1]) {
      args.image = argv[++i];
    } else if (arg === '--image-tag' && argv[i + 1]) {
      args.imageTag = argv[++i];
    } else if (arg === '--status-file' && argv[i + 1]) {
      args.statusFile = argv[++i];
    } else if (arg === '--auto-fix-on-fail') {
      args.autoFixOnFail = true;
    } else if (arg === '--no-auto-fix-on-fail') {
      args.autoFixOnFail = false;
    }
  }

  return args;
}

function run(command) {
  return execSync(command, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  }).trim();
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function nowIso() {
  return new Date().toISOString();
}

function red(text) {
  return `\x1b[31m${text}\x1b[0m`;
}

function isGitHubRateLimitError(message) {
  const normalized = String(message || '').toLowerCase();
  return normalized.includes('rate limit exceeded') || normalized.includes('api rate limit exceeded');
}

function buildPackagePageUrl(repo) {
  const [owner, name] = String(repo || '').split('/');

  if (!owner || !name) {
    return 'https://github.com';
  }

  return `https://github.com/${owner}?tab=packages&repo_name=${name}`;
}

function printRateLimitOperatorNotice({ repo, sha, image, imageTag }) {
  const packagePageUrl = buildPackagePageUrl(repo);
  const imageRef = image && imageTag ? `${image}:${imageTag}` : image || 'ghcr package image';
  const lines = [
    '',
    '🚨 GitHub API rate limit reached for workflow watcher.',
    'Do publish verification manually now, or use an n8n fallback workflow.',
    `Manual check: ${packagePageUrl}`,
    `Expected image tag: ${imageRef}`,
    `Commit SHA: ${sha}`,
    'n8n fallback (recommended when token is missing):',
    '1) Trigger after push.',
    '2) Poll package page at +10, +20, +30, +40, +50 minutes.',
    '3) Compare latest package publish/update time or sha-tag against pushed commit.',
    '4) Notify user immediately when new image/release is detected (or after +50m timeout).',
  ];

  console.error(red(lines.join('\n')));
}

function logger(logFile) {
  return {
    info(message) {
      const line = `[${nowIso()}] ${message}`;
      console.log(line);

      if (logFile) {
        mkdirSync(dirname(logFile), { recursive: true });
        appendFileSync(logFile, `${line}\n`, 'utf8');
      }
    },
    error(message) {
      const line = `[${nowIso()}] ERROR ${message}`;
      console.error(line);

      if (logFile) {
        mkdirSync(dirname(logFile), { recursive: true });
        appendFileSync(logFile, `${line}\n`, 'utf8');
      }
    },
  };
}

function getRepoFromOrigin() {
  const remoteUrl = run('git remote get-url origin');

  const sshMatch = remoteUrl.match(/github\.com:([^/]+)\/([^/]+?)(\.git)?$/);

  if (sshMatch) {
    return `${sshMatch[1]}/${sshMatch[2]}`;
  }

  const httpsMatch = remoteUrl.match(/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/);

  if (httpsMatch) {
    return `${httpsMatch[1]}/${httpsMatch[2]}`;
  }

  throw new Error(`Unable to parse GitHub repo from origin URL: ${remoteUrl}`);
}

function resolveSha(rawSha) {
  if (rawSha === 'HEAD') {
    return run('git rev-parse HEAD');
  }

  return rawSha;
}

function resolveImageTag(args, sha) {
  if (args.imageTag) {
    return args.imageTag;
  }

  return `sha-${sha.slice(0, 7)}`;
}

function resolveStatusFile(args, sha) {
  if (args.statusFile) {
    return args.statusFile;
  }

  return resolve('.git', `gh-watch-${sha}.status.json`);
}

function writeFinalStatus(statusFile, payload) {
  mkdirSync(dirname(statusFile), { recursive: true });
  writeFileSync(statusFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function getGitHubToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env['bolt2.dyi_GitHub_token'] || '';
}

async function fetchRuns(repo, sha) {
  const token = getGitHubToken();
  const headers = {
    'User-Agent': 'bolt2-dyi-gh-watcher',
    Accept: 'application/vnd.github+json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=100`, {
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API request failed (${response.status}): ${text}`);
  }

  const parsed = await response.json();
  const runs = Array.isArray(parsed.workflow_runs) ? parsed.workflow_runs : [];

  return runs.filter((runItem) => runItem.head_sha === sha);
}

function summarizeFailures(runs) {
  return runs
    .filter((runItem) => runItem.status === 'completed' && !['success', 'skipped'].includes(runItem.conclusion || ''))
    .map((runItem) => ({
      id: runItem.id,
      name: runItem.name,
      conclusion: runItem.conclusion,
      url: runItem.html_url,
    }));
}

async function triggerAutoFix(repo, failures, log) {
  const token = getGitHubToken();

  if (!token) {
    log.error('Auto-fix skipped: missing GitHub token for rerun API call.');
    return;
  }

  for (const failure of failures) {
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/actions/runs/${failure.id}/rerun-failed-jobs`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'bolt2-dyi-gh-watcher',
          Accept: 'application/vnd.github+json',
        },
      });

      if (!response.ok) {
        const text = await response.text();
        log.error(`Auto-fix rerun failed for ${failure.name}: ${response.status} ${text}`);
        continue;
      }

      log.info(`Auto-fix triggered: rerun failed jobs for ${failure.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error(`Auto-fix error for ${failure.name}: ${message}`);
    }
  }
}

function imageExists(imageRef) {
  try {
    run(`docker manifest inspect ${imageRef}`);
    return true;
  } catch {
    return false;
  }
}

async function waitForPublishedImage(args, sha, log) {
  const imageTag = resolveImageTag(args, sha);
  const imageRef = `${args.image}:${imageTag}`;
  const start = Date.now();

  log.info(`Verifying Docker image publication: ${imageRef}`);

  while (Date.now() - start < args.timeoutSeconds * 1000) {
    if (imageExists(imageRef)) {
      log.info(`Published image detected: ${imageRef}`);
      return;
    }

    log.info(`Image not published yet: ${imageRef}; waiting...`);
    await sleep(args.pollSeconds * 1000);
  }

  throw new Error(`Timed out waiting for published Docker image: ${imageRef}`);
}

async function watch(args) {
  const log = logger(args.logFile);

  const repo = args.repo || getRepoFromOrigin();
  const sha = resolveSha(args.sha);
  const hasToken = Boolean(getGitHubToken());
  const statusFile = resolveStatusFile(args, sha);

  log.info(`Watching GitHub Actions for repo=${repo} sha=${sha}`);
  log.info(`GitHub API auth token present: ${hasToken ? 'yes' : 'no (using anonymous API limits)'}`);

  const start = Date.now();
  let observedRun = false;

  while (Date.now() - start < args.timeoutSeconds * 1000) {
    const runs = await fetchRuns(repo, sha);

    if (runs.length === 0) {
      log.info('No workflow runs found for SHA yet; waiting...');
      await sleep(args.pollSeconds * 1000);
      continue;
    }

    observedRun = true;

    const inProgress = runs.filter((runItem) => runItem.status !== 'completed');
    const failures = summarizeFailures(runs);

    const summary = runs
      .map((runItem) => `${runItem.name}:${runItem.status}/${runItem.conclusion || 'pending'}`)
      .join(' | ');

    log.info(`Runs: ${summary}`);

    if (inProgress.length > 0) {
      await sleep(args.pollSeconds * 1000);
      continue;
    }

    if (failures.length > 0) {
      failures.forEach((failure) => log.error(`Failure: ${failure.name} (${failure.conclusion}) ${failure.url}`));

      if (args.autoFixOnFail) {
        await triggerAutoFix(repo, failures, log);
      }

      writeFinalStatus(statusFile, {
        status: 'fail',
        repo,
        sha,
        observedAt: nowIso(),
        failures,
        autoFixOnFail: args.autoFixOnFail,
      });
      process.exit(1);
    }

    log.info('All workflows for this SHA completed without failures.');

    if (args.requireImagePublish) {
      await waitForPublishedImage(args, sha, log);
    }

    writeFinalStatus(statusFile, {
      status: 'success',
      repo,
      sha,
      observedAt: nowIso(),
      requireImagePublish: args.requireImagePublish,
      image: args.image,
      imageTag: resolveImageTag(args, sha),
    });

    process.exit(0);
  }

  if (!observedRun) {
    log.error('Timed out waiting for workflows to appear for this SHA.');
  } else {
    log.error('Timed out waiting for workflows to complete.');
  }

  writeFinalStatus(statusFile, {
    status: 'fail',
    repo,
    sha,
    observedAt: nowIso(),
    reason: observedRun ? 'workflow-timeout' : 'workflow-not-found-timeout',
    autoFixOnFail: args.autoFixOnFail,
  });

  process.exit(1);
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const scriptPath = fileURLToPath(import.meta.url);
  const repo = args.repo || getRepoFromOrigin();
  const sha = resolveSha(args.sha);

  if (args.detach) {
    const forwardArgs = process.argv.slice(2).filter((arg) => arg !== '--detach');
    const detachedLog = args.logFile || resolve('.git/gh-watch.log');
    const detachedStatusFile = resolveStatusFile(args, sha);
    const hasStatusFileArg = forwardArgs.includes('--status-file');

    if (!hasStatusFileArg) {
      forwardArgs.push('--status-file', detachedStatusFile);
    }

    const child = spawn(process.execPath, [scriptPath, ...forwardArgs, '--log-file', detachedLog], {
      detached: true,
      stdio: 'ignore',
    });

    child.unref();
    console.log(`Started detached GitHub Actions watcher. Log: ${detachedLog} Status: ${detachedStatusFile}`);
    process.exit(0);
  }

  try {
    await watch(args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const statusFile = resolveStatusFile(args, sha);

    if (isGitHubRateLimitError(message)) {
      const imageTag = resolveImageTag(args, sha);

      printRateLimitOperatorNotice({
        repo,
        sha,
        image: args.image,
        imageTag,
      });

      writeFinalStatus(statusFile, {
        status: 'fail',
        repo,
        sha,
        observedAt: nowIso(),
        reason: 'github-api-rate-limit',
        requireImagePublish: args.requireImagePublish,
        image: args.image,
        imageTag,
        packagePageUrl: buildPackagePageUrl(repo),
        operatorActionRequired: true,
        suggestedPollingMinutes: [10, 20, 30, 40, 50],
      });

      process.exit(1);
    }

    console.error(`[${nowIso()}] ERROR ${message}`);

    writeFinalStatus(statusFile, {
      status: 'fail',
      repo,
      sha,
      observedAt: nowIso(),
      reason: 'watcher-error',
      error: message,
      requireImagePublish: args.requireImagePublish,
      image: args.image,
      imageTag: resolveImageTag(args, sha),
    });

    process.exit(1);
  }
})();
