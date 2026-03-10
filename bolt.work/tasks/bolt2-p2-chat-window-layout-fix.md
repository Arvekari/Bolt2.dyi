# Task Attachment: [taskId: bolt2-p2-chat-window-layout-fix]

## Refactor Correction Specification (Applied)

Purpose: Correct main app shell UX from legacy chat-sidebar feel to modern navigation-based AI workspace.

Source spec:

- `docs/development/ux-desing.txt`

## Current Problem

Main window still felt like legacy chat shell with patched controls.

## Target UX

App Layout

- Left navigation sidebar:
  - New chat
  - Search
  - Chats
  - Projects
  - Artifacts
  - Code
  - Bottom: Settings and profile
- Top workspace bar:
  - Context + provider/model controls
- Main chat area:
  - Messages area
  - Composer aligned and integrated with workspace

## Required Corrections

1. Replace chat-only sidebar behavior with navigation-first sidebar pattern.
2. Keep Projects as a first-class section (not random standalone block in chat list area).
3. Keep API key management out of main chat area.
4. Improve top bar integration for model/provider controls.
5. Align composer within main chat workspace (not detached floating feel).

## Implementation Notes

Applied in:

- `app/components/sidebar/Menu.client.tsx`
- `app/components/sidebar/CollabPanel.tsx`
- `app/components/header/Header.tsx`
- `app/components/chat/BaseChat.tsx`

Behavior:

- Sidebar now follows modern app navigation hierarchy.
- Project collaboration panel integrated under Projects section.
- Share action uses email-based payload.
- Header refined as top workspace bar with context chip.
- Composer integrated with chat layout using anchored workspace panel styling.

## Acceptance Criteria

- Sidebar works as modern navigation structure.
- Projects and Artifacts are first-class nav sections.
- Collaboration controls are under Projects.
- Top bar feels deliberate and integrated.
- Composer position is aligned with conversation workspace.

## Verification Checklist Against Source Spec

- Sidebar follows modern navigation hierarchy (`New chat`, `Search`, `Chats`, `Projects`, `Artifacts`, `Code`).
- Project collaboration controls are inside `Projects` section.
- Top workspace bar contains integrated model/provider controls.
- Main chat composer is anchored inside workspace flow, not detached.
