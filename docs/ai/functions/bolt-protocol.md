# Opurion Execution Protocol

## Purpose

The Opurion execution protocol defines the structured output format used for implementation-oriented responses in build mode.

This protocol exists so Opurion can return implementation-ready output in a form that is predictable, machine-parseable, reviewable by humans, and aligned with the project workbench and editor workflow.

Use this protocol when the response is intended to create, update, or execute project work as part of build-mode output.

The protocol is centered on two XML-like elements:

- `<boltArtifact>`: a container for one implementation unit
- `<boltAction>`: an ordered action inside that implementation unit

## Core Structure Overview

At a high level, a build-mode response is composed of one or more artifact containers, each of which contains one or more actions.

```xml
<boltArtifact id="artifact-id" title="Human Readable Title">
  <boltAction type="file" filePath="/home/project/src/index.ts">
    /* full file content */
  </boltAction>

  <boltAction type="shell">
    pnpm install
  </boltAction>
</boltArtifact>
```

### Nesting Rules

- `<boltAction>` must appear inside a `<boltArtifact>`
- `<boltArtifact>` is the outer execution container
- Actions are evaluated in the order they appear
- Content outside the protocol blocks may be used for short markdown context, but implementation output itself belongs inside protocol blocks

## `<boltArtifact>` Definition

### What It Is

`<boltArtifact>` is the top-level execution container for an implementation unit.

It groups together the actions required to complete a coherent piece of work, such as creating a simple app, updating a feature, or applying a focused project change.

### When It Must Be Used

Use `<boltArtifact>` whenever Opurion is producing build-mode execution output.

If the response contains protocol actions, those actions must be wrapped in a `<boltArtifact>`.

### Required Attributes

`id`

- Required
- A stable machine-friendly identifier for the artifact
- Should be lowercase and hyphenated when practical
- Should reflect the implementation intent

`title`

- Required
- A short human-readable title
- Should describe the implementation task clearly

### What It Contains

`<boltArtifact>` contains one or more `<boltAction>` elements.

### One or Multiple Artifacts

One or multiple artifacts may be used.

Use one artifact when the work is a single coherent implementation unit.

Use multiple artifacts only when the response clearly contains separate implementation units that are better kept isolated.

### Naming Guidance

For `id`:

- Prefer concise, specific names such as `create-auth-service`
- Avoid vague ids such as `update-files`
- Keep ids stable and machine-friendly

For `title`:

- Prefer short descriptive titles such as `Create Auth Service`
- Avoid overly verbose titles
- Make it understandable to a human reviewer scanning execution output

## `<boltAction>` Definition

### What It Is

`<boltAction>` represents a single executable step inside an Opurion artifact.

Examples include writing a file, running an install command, or starting a development server.

### Placement Rule

`<boltAction>` must appear inside a `<boltArtifact>`.

### Allowed `type` Values

The supported action types are:

- `file`
- `shell`
- `start`

### General Rules for All Actions

- Actions must be ordered logically
- Actions must be explicit and unambiguous
- Actions must contain valid content for their type
- Do not emit unsupported action types
- Do not use protocol actions for non-execution filler
- Only include actions that are needed for the implementation

## Action Type Definitions

### `file`

#### Purpose

Use the `file` action to create or replace a project file.

#### Required Attributes

- `type="file"`
- `filePath="..."`

#### Valid Content

The content of a `file` action must be the complete current file content.

#### When to Use It

- Creating a new file
- Rewriting an existing file
- Returning the full authoritative content of a modified file

#### When Not to Use It

- For partial patches
- For diff output
- For line-level edits
- For shell commands

Example:

```xml
<boltAction type="file" filePath="/home/project/src/main.ts">
import './styles.css';

console.log('Hello from Opurion');
</boltAction>
```

### `shell`

#### Purpose

Use the `shell` action to execute command-line steps required by the implementation.

#### Required Attributes

- `type="shell"`

No additional attribute is required for a basic shell action.

#### Valid Content

The content must be executable shell command text.

#### When to Use It

- Installing dependencies
- Running setup commands
- Creating directories when appropriate through shell workflow
- Executing clearly necessary project commands

#### When Not to Use It

- For file contents
- For placeholder or decorative commands
- For unnecessary commands that do not contribute to implementation

Example:

```xml
<boltAction type="shell">
pnpm install
</boltAction>
```

### `start`

#### Purpose

Use the `start` action to start a development server or similar runtime only when needed.

#### Required Attributes

- `type="start"`

#### Valid Content

The content should be the command or startup instruction needed to launch the runtime.

#### When to Use It

- When the implementation requires a running development server
- When the user explicitly expects the project to be started
- When runtime startup is a necessary final step

#### When Not to Use It

- When no running process is needed
- Repeatedly without a clear reason
- Before the required files and dependencies are in place

Example:

```xml
<boltAction type="start">
pnpm run dev
</boltAction>
```

## File Action Rules

The `file` action follows strict replacement semantics.

- Always provide full file content
- Never provide partial fragments as if they were complete files
- Never provide diff output
- Never provide patch syntax
- The `filePath` must point to the target file in the project filesystem
- If a file is being updated, the action content is expected to fully replace the current file content

Valid:

```xml
<boltAction type="file" filePath="/home/project/package.json">
{
  "name": "example-app",
  "private": true,
  "scripts": {
    "dev": "vite"
  }
}
</boltAction>
```

Invalid:

```xml
<boltAction type="file" filePath="/home/project/package.json">
+ "dev": "vite"
</boltAction>
```

## Shell Action Rules

Shell actions should contain executable command text only.

- Keep commands explicit
- Keep commands minimal and necessary
- Order shell commands logically relative to file actions
- Avoid decorative or redundant commands
- Avoid commands that do not materially contribute to implementation

Good:

```xml
<boltAction type="shell">
pnpm install
</boltAction>
```

Poor:

```xml
<boltAction type="shell">
echo "Installing things now"
</boltAction>
```

## Start Action Rules

Use `start` only when necessary.

"Necessary" usually means one of the following:

- the user expects the project to be run
- the workflow requires a dev server to be launched
- the final implementation step is incomplete without startup

Do not use `start` repeatedly without reason.

Do not start before:

- required files exist
- dependencies are installed when needed
- the project is in a runnable state

## Execution Ordering Rules

Actions should be ordered in the same order a disciplined contributor would apply them.

Typical ordering rules:

1. Create or update configuration and source files first
2. Write `package.json` before dependency installation when a Node.js project is being created
3. Install dependencies before starting the project
4. Start runtime only after the project is runnable
5. Only touch files that actually need changes

Good ordering example:

1. write `package.json`
2. write source files
3. run `pnpm install`
4. run `pnpm run dev`

Poor ordering example:

1. start server
2. install dependencies
3. write package manifest

## Valid Examples

### Minimal Valid Example

```xml
<boltArtifact id="create-readme" title="Create README">
  <boltAction type="file" filePath="/home/project/README.md">
# Example Project

Generated by Opurion.
  </boltAction>
</boltArtifact>
```

### Simple HTML Example

```xml
<boltArtifact id="create-html-page" title="Create Simple HTML Page">
  <boltAction type="file" filePath="/home/project/index.html">
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Example</title>
  </head>
  <body>
    <h1>Hello from Opurion</h1>
  </body>
</html>
  </boltAction>
</boltArtifact>
```

### `package.json` + Install + Start Example

```xml
<boltArtifact id="create-vite-app" title="Create Vite App">
  <boltAction type="file" filePath="/home/project/package.json">
{
  "name": "vite-app",
  "private": true,
  "scripts": {
    "dev": "vite"
  },
  "devDependencies": {
    "vite": "^5.4.0"
  }
}
  </boltAction>

  <boltAction type="file" filePath="/home/project/index.html">
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
  </boltAction>

  <boltAction type="file" filePath="/home/project/src/main.js">
document.querySelector('#app').textContent = 'Hello from Opurion';
  </boltAction>

  <boltAction type="shell">
pnpm install
  </boltAction>

  <boltAction type="start">
pnpm run dev
  </boltAction>
</boltArtifact>
```

## Invalid Examples

### Missing `filePath`

Invalid because `file` actions require `filePath`.

```xml
<boltArtifact id="bad-file-action" title="Bad File Action">
  <boltAction type="file">
console.log('missing filePath');
  </boltAction>
</boltArtifact>
```

### Diff Output

Invalid because file actions must contain full file content, not a patch.

```xml
<boltArtifact id="bad-diff" title="Bad Diff Output">
  <boltAction type="file" filePath="/home/project/src/main.js">
-console.log('old');
+console.log('new');
  </boltAction>
</boltArtifact>
```

### Action Outside Artifact

Invalid because actions must be nested inside an artifact.

```xml
<boltAction type="shell">
pnpm install
</boltAction>
```

### Incomplete File Content

Invalid because only a fragment is supplied.

```xml
<boltArtifact id="incomplete-file" title="Incomplete File">
  <boltAction type="file" filePath="/home/project/src/app.ts">
function startApp() {
  </boltAction>
</boltArtifact>
```

### Invalid Action Type

Invalid because `patch` is not a supported action type.

```xml
<boltArtifact id="bad-action-type" title="Bad Action Type">
  <boltAction type="patch" filePath="/home/project/src/app.ts">
console.log('unsupported type');
  </boltAction>
</boltArtifact>
```

## Best Practices

- Keep outputs clean and focused
- Prefer a modular project structure
- Avoid unnecessary file churn
- Only modify files that need changes
- Keep artifact ids and titles specific
- Keep shell commands minimal and useful
- Keep file actions authoritative and complete
- Prefer maintainable, reviewable project output over clever shortcuts

## Notes for AI Prompt and Runtime Usage

This document should be treated as the human-facing source-of-truth protocol reference for the Opurion execution protocol.

Runtime prompt modules may inject only the subset of protocol rules that are relevant for a given model, context size, or execution environment.

That means:

- this document is the canonical human-readable spec
- prompt/runtime systems may derive smaller protocol slices from it
- smaller models may receive abbreviated protocol guidance extracted from this document

The human-facing document should remain complete and explicit even if model-facing prompt slices are more compact.

## Related Docs

- [AI Functions Index](README.md)
- [Docs Home](../../index.md)
