# Task Attachment: [taskId: bolt2-p1-settings-control-panel-grid-cards-ux]

## Refactor Correction Specification (Applied)

Purpose: Correct the Settings UX to match the requested structure and remove control-panel launcher behavior.

Source spec:

- `docs/development/ux-desing.txt`

## Current Problem

The control-panel implementation behaved like a launcher/dashboard instead of a structured settings workspace.

## Target UX

Settings Workspace

- Left persistent settings navigation
- Right main content panel
- Category-based navigation and grouped settings sections
- Optional mobile selector fallback

## Required Corrections

1. Remove card-launcher-as-default behavior for settings.
2. Keep settings experience structured as `left-nav + right-content`.
3. Add collapsible left navigation mode:

- Expanded: icon + label
- Collapsed: icon-only + tooltip labels

4. Keep settings scalable and consistent for desktop and mobile.

## Implementation Notes

Applied in:

- `app/components/@settings/core/ControlPanel.tsx`
- `app/components/@settings/core/SettingsNavigation.tsx`
- `app/components/@settings/core/SettingsContentPanel.tsx`

Behavior:

- Full-screen workspace feel for settings panel.
- Navigation collapse toggle in settings left rail.
- Icon-only compact mode with hover tooltip labels.
- Mobile category selector retained.

## Acceptance Criteria

- Settings is not a tile dashboard default.
- Left navigation + right content structure is primary.
- Left nav collapse/expand works.
- Icon-only mode shows tooltip labels.
- No regressions in tab content rendering.

## Verification Checklist Against Source Spec

- Default settings experience is structured left-nav + right-content.
- No tile-launcher-first settings home behavior.
- Settings navigation is persistent while in settings.
