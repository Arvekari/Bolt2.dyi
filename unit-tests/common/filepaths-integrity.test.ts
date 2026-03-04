import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

type ImportReference = {
  sourceFile: string;
  specifier: string;
};

const ROOT = process.cwd();
const SCAN_DIRS = [
  'app',
  'core',
  'electron',
  'extensions',
  'infrastructure',
  'integrations',
  'platform',
  'scripts',
  'ui',
  'unit-tests',
];

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.git', '.wrangler', '.next']);
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const RESOLVABLE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.scss'];

function walkFiles(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        walkFiles(fullPath, files);
      }
      continue;
    }

    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractImportSpecifiers(content: string, filePath: string): string[] {
  const specifiers = new Set<string>();

  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

  function addSpecifier(value: string | undefined) {
    if (value) {
      specifiers.add(value);
    }
  }

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        addSpecifier(node.moduleSpecifier.text);
      }
    }

    if (ts.isCallExpression(node)) {
      const [firstArg] = node.arguments;

      if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'require' &&
        firstArg &&
        ts.isStringLiteral(firstArg)
      ) {
        addSpecifier(firstArg.text);
      }

      if (
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        firstArg &&
        ts.isStringLiteral(firstArg)
      ) {
        addSpecifier(firstArg.text);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return [...specifiers];
}

function isPathImport(specifier: string): boolean {
  return specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('~/');
}

function stripQuery(specifier: string): string {
  const queryIndex = specifier.indexOf('?');
  return queryIndex === -1 ? specifier : specifier.slice(0, queryIndex);
}

function resolveAliasPath(specifier: string): string {
  if (specifier.startsWith('~/')) {
    return path.join(ROOT, 'app', specifier.slice(2));
  }

  return specifier;
}

function candidatePaths(basePath: string): string[] {
  const ext = path.extname(basePath);
  const candidates = RESOLVABLE_EXTENSIONS.map((candidateExt) => `${basePath}${candidateExt}`);

  if (ext && RESOLVABLE_EXTENSIONS.includes(ext)) {
    candidates.push(basePath);
  }

  if (ext) {
    const withoutExt = basePath.slice(0, -ext.length);
    candidates.push(...RESOLVABLE_EXTENSIONS.map((candidateExt) => `${withoutExt}${candidateExt}`));
  }

  candidates.push(
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
    path.join(basePath, 'index.js'),
    path.join(basePath, 'index.jsx'),
    path.join(basePath, 'index.mjs'),
    path.join(basePath, 'index.cjs'),
    path.join(basePath, 'index.json'),
  );

  return [...new Set(candidates)];
}

function canResolveImport(sourceFile: string, specifier: string): boolean {
  if (!isPathImport(specifier)) {
    return true;
  }

  const cleanedSpecifier = stripQuery(specifier);
  const rawBase = cleanedSpecifier.startsWith('~/')
    ? resolveAliasPath(cleanedSpecifier)
    : path.resolve(path.dirname(sourceFile), cleanedSpecifier);

  const candidates = candidatePaths(rawBase);
  return candidates.some((candidate) => fs.existsSync(candidate));
}

function collectPathImports(files: string[]): ImportReference[] {
  const references: ImportReference[] = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const specifiers = extractImportSpecifiers(content, filePath);

    for (const specifier of specifiers) {
      if (isPathImport(specifier)) {
        references.push({
          sourceFile: filePath,
          specifier,
        });
      }
    }
  }

  return references;
}

describe('File path integrity after restructure', () => {
  it('resolves all relative and ~/ alias imports in project source files', () => {
    const sourceFiles = SCAN_DIRS.flatMap((dir) => walkFiles(path.join(ROOT, dir)));
    const pathImports = collectPathImports(sourceFiles);

    const missing = pathImports.filter((ref) => !canResolveImport(ref.sourceFile, ref.specifier));

    if (missing.length > 0) {
      const message = missing
        .slice(0, 50)
        .map((m) => `${path.relative(ROOT, m.sourceFile)} -> ${m.specifier}`)
        .join('\n');

      throw new Error(
        `Found ${missing.length} unresolved path imports after directory restructure:\n${message}`,
      );
    }

    expect(missing).toHaveLength(0);
  });
});
