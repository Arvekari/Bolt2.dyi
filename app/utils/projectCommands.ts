import type { Message } from 'ai';
import { generateId } from './fileUtils';

export interface ProjectCommands {
  type: string;
  setupCommand?: string;
  startCommand?: string;
  followupMessage: string;
}

interface FileContent {
  content: string;
  path: string;
}

interface ParsedPackageJson {
  file: FileContent;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
}

function buildBuiltinPreviewServerCommand(simulatePhp = false): string {
  const phpTransform = simulatePhp
    ? "if(ext==='.php'){const rendered=stripPhp(content.toString('utf8')).trim();res.setHeader('X-Bolt-Preview-Mode','php-static-fallback');res.setHeader('Content-Type','text/html; charset=utf-8');res.end(rendered||'<!doctype html><html><body><main style=\"font-family:system-ui,sans-serif;padding:24px\"><h1>PHP preview fallback</h1><p>PHP execution is not available in this environment, so this preview renders the PHP template shell without running server-side logic.</p></main></body></html>');return;}"
    : '';

  return `node -e "const http=require('http');const fs=require('fs');const path=require('path');const root=process.cwd();const port=Number(process.env.PORT||4173);const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.txt':'text/plain; charset=utf-8'};const stripPhp=(source)=>source.replace(/<\\?(?:php|=)[\\s\\S]*?\\?>/g,'');const resolvePath=(requestPath)=>{const clean=decodeURIComponent((requestPath||'/').split('?')[0]);const relative=clean==='/'?'':clean.replace(/^\\//,'');const direct=path.join(root,relative);if(relative&&fs.existsSync(direct)&&fs.statSync(direct).isFile())return direct;if(relative&&fs.existsSync(direct)&&fs.statSync(direct).isDirectory()){const htmlIndex=path.join(direct,'index.html');const phpIndex=path.join(direct,'index.php');if(fs.existsSync(htmlIndex))return htmlIndex;if(fs.existsSync(phpIndex))return phpIndex;}const rootHtml=path.join(root,'index.html');const rootPhp=path.join(root,'index.php');if(fs.existsSync(rootHtml))return rootHtml;if(fs.existsSync(rootPhp))return rootPhp;return direct;};const server=http.createServer((req,res)=>{const filePath=resolvePath(req.url||'/');if(!fs.existsSync(filePath)||!fs.statSync(filePath).isFile()){res.statusCode=404;res.setHeader('Content-Type','text/plain; charset=utf-8');res.end('Not Found');return;}const ext=path.extname(filePath).toLowerCase();const content=fs.readFileSync(filePath);${phpTransform}res.setHeader('Content-Type',mime[ext]||'application/octet-stream');res.end(content);});server.listen(port,'0.0.0.0',()=>console.log('Preview server listening on http://0.0.0.0:'+port));"`;
}

// Helper function to make any command non-interactive
function makeNonInteractive(command: string): string {
  // Set environment variables for non-interactive mode
  const envVars = 'export CI=true DEBIAN_FRONTEND=noninteractive FORCE_COLOR=0';

  // Common interactive packages and their non-interactive flags
  const interactivePackages = [
    { pattern: /npx\s+([^@\s]+@?[^\s]*)\s+init/g, replacement: 'echo "y" | npx --yes $1 init --defaults --yes' },
    { pattern: /npx\s+create-([^\s]+)/g, replacement: 'npx --yes create-$1 --template default' },
    { pattern: /npx\s+([^@\s]+@?[^\s]*)\s+add/g, replacement: 'npx --yes $1 add --defaults --yes' },
    { pattern: /npm\s+install(?!\s+--)/g, replacement: 'npm install --yes --no-audit --no-fund --silent' },
    { pattern: /yarn\s+add(?!\s+--)/g, replacement: 'yarn add --non-interactive' },
    { pattern: /pnpm\s+add(?!\s+--)/g, replacement: 'pnpm add --yes' },
  ];

  let processedCommand = command;

  // Apply replacements for known interactive patterns
  interactivePackages.forEach(({ pattern, replacement }) => {
    processedCommand = processedCommand.replace(pattern, replacement);
  });

  return `${envVars} && ${processedCommand}`;
}

function toPosixPath(value: string): string {
  return value.replace(/\\/g, '/');
}

function getDirectoryPath(filePath: string): string {
  const normalized = toPosixPath(filePath);
  const lastSlash = normalized.lastIndexOf('/');

  if (lastSlash === -1) {
    return '';
  }

  return normalized.slice(0, lastSlash);
}

function getPathDepth(filePath: string): number {
  return toPosixPath(filePath)
    .split('/')
    .filter(Boolean).length;
}

function getShallowestFile(files: FileContent[], predicate: (file: FileContent) => boolean): FileContent | undefined {
  return files.filter(predicate).sort((left, right) => getPathDepth(left.path) - getPathDepth(right.path))[0];
}

function makeCommandWithDirectoryPrefix(command: string, directory: string): string {
  if (!directory) {
    return command;
  }

  return `cd ${directory} && ${command}`;
}

function normalizeWorkspaceRelativeDirectory(directory: string): string {
  const normalized = toPosixPath(directory).replace(/\/+$/, '');

  if (!normalized || normalized === '/') {
    return '';
  }

  // Strip /home/project WebContainer root prefix.
  // package.json at /home/project/package.json → project root → no cd needed (return '').
  // package.json at /home/project/packages/app/package.json → cd packages/app.
  if (normalized === '/home/project' || normalized === 'home/project') {
    return '';
  }

  if (normalized.startsWith('/home/project/')) {
    return normalized.slice('/home/project/'.length);
  }

  if (normalized.startsWith('home/project/')) {
    return normalized.slice('home/project/'.length);
  }

  const withoutLeadingSlash = normalized.replace(/^\/+/, '');

  if (withoutLeadingSlash === 'workspace') {
    return '';
  }

  return withoutLeadingSlash.replace(/^workspace\//, '');
}

function detectPackageManager(files: FileContent[], packageDirectory: string): 'npm' | 'pnpm' | 'yarn' {
  const normalizedDir = packageDirectory.replace(/^\/+/, '').replace(/\/+$/, '');

  const hasLockFile = (lockFileName: string) => {
    return files.some((file) => {
      const normalizedPath = toPosixPath(file.path).replace(/^\/+/, '');
      const candidatePath = normalizedDir ? `${normalizedDir}/${lockFileName}` : lockFileName;
      return normalizedPath.endsWith(candidatePath);
    });
  };

  if (hasLockFile('pnpm-lock.yaml')) {
    return 'pnpm';
  }

  if (hasLockFile('yarn.lock')) {
    return 'yarn';
  }

  return 'npm';
}

function buildStartCommand(packageManager: 'npm' | 'pnpm' | 'yarn', script: string): string {
  if (packageManager === 'yarn') {
    return `yarn ${script}`;
  }

  if (packageManager === 'pnpm') {
    return `pnpm run ${script}`;
  }

  return `npm run ${script}`;
}

function buildInstallCommand(packageManager: 'npm' | 'pnpm' | 'yarn'): string {
  if (packageManager === 'yarn') {
    return 'yarn install --non-interactive';
  }

  if (packageManager === 'pnpm') {
    return 'pnpm install --frozen-lockfile=false';
  }

  return 'npm install';
}

export async function detectProjectCommands(files: FileContent[]): Promise<ProjectCommands> {
  const hasFile = (name: string) => files.some((f) => f.path.endsWith(name));
  const hasFileContent = (name: string, content: string) =>
    files.some((f) => f.path.endsWith(name) && f.content.includes(content));

  const packageJsonFiles = files.filter((f) => f.path.endsWith('package.json'));

  if (packageJsonFiles.length > 0) {
    const parsedPackageJsons: ParsedPackageJson[] = [];

    for (const packageJsonFile of packageJsonFiles) {
      try {
        const packageJson = JSON.parse(packageJsonFile.content);
        parsedPackageJsons.push({
          file: packageJsonFile,
          scripts: packageJson?.scripts || {},
          dependencies: {
            ...(packageJson?.dependencies || {}),
            ...(packageJson?.devDependencies || {}),
          },
        });
      } catch (error) {
        console.error('Error parsing package.json:', error);
      }
    }

    if (parsedPackageJsons.length === 0) {
      return { type: '', setupCommand: '', followupMessage: '' };
    }

    const preferredCommands = ['dev', 'start', 'preview'];

    parsedPackageJsons.sort((left, right) => getPathDepth(left.file.path) - getPathDepth(right.file.path));

    const packageWithPreferredCommand = parsedPackageJsons.find((entry) =>
      preferredCommands.some((command) => entry.scripts[command]),
    );

    const selectedPackage = packageWithPreferredCommand || parsedPackageJsons[0];
    const availableCommand = preferredCommands.find((command) => selectedPackage.scripts[command]);
    const packageDirectory = normalizeWorkspaceRelativeDirectory(getDirectoryPath(selectedPackage.file.path));
    const packageManager = detectPackageManager(files, packageDirectory);

    // Check if this is a shadcn project
    const isShadcnProject =
      hasFileContent('components.json', 'shadcn') ||
      Object.keys(selectedPackage.dependencies).some((dep) => dep.includes('shadcn')) ||
      hasFile('components.json');

    let baseSetupCommand = buildInstallCommand(packageManager);

    if (isShadcnProject) {
      baseSetupCommand += ' && npx shadcn@latest init';
    }

    const setupCommand = makeNonInteractive(makeCommandWithDirectoryPrefix(baseSetupCommand, packageDirectory));

    if (availableCommand) {
      const startCommand = makeCommandWithDirectoryPrefix(
        buildStartCommand(packageManager, availableCommand),
        packageDirectory,
      );

      return {
        type: 'Node.js',
        setupCommand,
        startCommand,
        followupMessage: `Found "${availableCommand}" script in package.json. Running "${startCommand}" after installation.`,
      };
    }

    return {
      type: 'Node.js',
      setupCommand,
      followupMessage:
        'Would you like me to inspect package.json to determine the available scripts for running this project?',
    };
  }

  const hasRequirementsTxt = hasFile('requirements.txt');
  const hasPyprojectToml = hasFile('pyproject.toml');

  if (hasRequirementsTxt || hasPyprojectToml || hasFile('manage.py') || hasFile('app.py') || hasFile('main.py')) {
    const pythonSetupCommand = hasRequirementsTxt ? 'python -m pip install -r requirements.txt' : undefined;

    if (hasFile('manage.py')) {
      return {
        type: 'Python',
        setupCommand: pythonSetupCommand,
        startCommand: 'python manage.py runserver 0.0.0.0:8000',
        followupMessage: 'Detected a Django-style project. Starting development server with manage.py.',
      };
    }

    if (hasFileContent('main.py', 'FastAPI')) {
      return {
        type: 'Python',
        setupCommand: pythonSetupCommand,
        startCommand: 'uvicorn main:app --host 0.0.0.0 --port 8000',
        followupMessage: 'Detected FastAPI app in main.py. Starting with uvicorn.',
      };
    }

    if (hasFileContent('app.py', 'FastAPI')) {
      return {
        type: 'Python',
        setupCommand: pythonSetupCommand,
        startCommand: 'uvicorn app:app --host 0.0.0.0 --port 8000',
        followupMessage: 'Detected FastAPI app in app.py. Starting with uvicorn.',
      };
    }

    if (hasFile('main.py')) {
      return {
        type: 'Python',
        setupCommand: pythonSetupCommand,
        startCommand: 'python main.py',
        followupMessage: 'Detected Python project entrypoint main.py. Starting with python main.py.',
      };
    }

    if (hasFile('app.py')) {
      return {
        type: 'Python',
        setupCommand: pythonSetupCommand,
        startCommand: 'python app.py',
        followupMessage: 'Detected Python project entrypoint app.py. Starting with python app.py.',
      };
    }

    return {
      type: 'Python',
      setupCommand: pythonSetupCommand,
      followupMessage: 'Detected Python project files. An explicit server entrypoint could not be inferred safely.',
    };
  }

  const phpEntryFile =
    getShallowestFile(files, (file) => /(?:^|\/)index\.php$/i.test(toPosixPath(file.path))) ||
    getShallowestFile(files, (file) => /\.php$/i.test(toPosixPath(file.path)));

  if (phpEntryFile) {
    const phpDirectory = normalizeWorkspaceRelativeDirectory(getDirectoryPath(phpEntryFile.path));

    return {
      type: 'PHP',
      startCommand: makeCommandWithDirectoryPrefix(buildBuiltinPreviewServerCommand(true), phpDirectory),
      followupMessage:
        'Detected a PHP-style project. Starting a built-in preview server with PHP-template fallback rendering so the preview can be verified even without a native PHP runtime.',
    };
  }

  const htmlEntryFile = getShallowestFile(files, (file) => /(?:^|\/)index\.html$/i.test(toPosixPath(file.path)));

  if (htmlEntryFile) {
    const staticDirectory = normalizeWorkspaceRelativeDirectory(getDirectoryPath(htmlEntryFile.path));

    return {
      type: 'Static',
      startCommand: makeCommandWithDirectoryPrefix(buildBuiltinPreviewServerCommand(false), staticDirectory),
      followupMessage: 'Detected a static site entrypoint. Starting the built-in preview server.',
    };
  }

  return { type: '', setupCommand: '', followupMessage: '' };
}

export function createCommandsMessage(commands: ProjectCommands): Message | null {
  if (!commands.setupCommand && !commands.startCommand) {
    return null;
  }

  let commandString = '';

  if (commands.setupCommand) {
    commandString += `
<boltAction type="shell">${commands.setupCommand}</boltAction>`;
  }

  if (commands.startCommand) {
    commandString += `
<boltAction type="start">${commands.startCommand}</boltAction>
`;
  }

  return {
    role: 'assistant',
    content: `
${commands.followupMessage ? `\n\n${commands.followupMessage}` : ''}
<boltArtifact id="project-setup" title="Project Setup">
${commandString}
</boltArtifact>`,
    id: generateId(),
    createdAt: new Date(),
  };
}

export function escapeBoltArtifactTags(input: string) {
  // Regular expression to match boltArtifact tags and their content
  const regex = /(<boltArtifact[^>]*>)([\s\S]*?)(<\/boltArtifact>)/g;

  return input.replace(regex, (match, openTag, content, closeTag) => {
    // Escape the opening tag
    const escapedOpenTag = openTag.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Escape the closing tag
    const escapedCloseTag = closeTag.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Return the escaped version
    return `${escapedOpenTag}${content}${escapedCloseTag}`;
  });
}

export function escapeBoltAActionTags(input: string) {
  // Regular expression to match boltArtifact tags and their content
  const regex = /(<boltAction[^>]*>)([\s\S]*?)(<\/boltAction>)/g;

  return input.replace(regex, (match, openTag, content, closeTag) => {
    // Escape the opening tag
    const escapedOpenTag = openTag.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Escape the closing tag
    const escapedCloseTag = closeTag.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Return the escaped version
    return `${escapedOpenTag}${content}${escapedCloseTag}`;
  });
}

export function escapeBoltTags(input: string) {
  return escapeBoltArtifactTags(escapeBoltAActionTags(input));
}

// We have this seperate function to simplify the restore snapshot process in to one single artifact.
export function createCommandActionsString(commands: ProjectCommands): string {
  if (!commands.setupCommand && !commands.startCommand) {
    // Return empty string if no commands
    return '';
  }

  let commandString = '';

  if (commands.setupCommand) {
    commandString += `
<boltAction type="shell">${commands.setupCommand}</boltAction>`;
  }

  if (commands.startCommand) {
    commandString += `
<boltAction type="start">${commands.startCommand}</boltAction>
`;
  }

  return commandString;
}
