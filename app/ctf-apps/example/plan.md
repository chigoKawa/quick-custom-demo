# Newsletter Preview App – Plan

## Content model

Configurable **Newsletter** content type (ID chosen by user, default `newsletter`). Fields:

- `subject` – Symbol, required
- `senderName` – Symbol, required
- `senderEmail` – Symbol or Text, required
- `replyToEmail` – Symbol or Text, optional
- `preheader` – Symbol, optional
- `content` – Rich Text, required (main email body)

Requirements:

- Installer is **idempotent**.
- If the configured content type already exists, app **never deletes or renames** fields.
- When existing content type is detected, config screen:
  - Shows that it exists.
  - Lets the user either keep using it or specify a new content type ID/name.
- Installer ensures required fields exist (adds missing ones) and leaves existing fields/validations intact.
- All fields should support **all locales**, and previews should default to the **active editor locale**, with sensible fallback to default locale.

## Configuration & installer behavior

Config screen options:

- `newsletterContentTypeId` (string)
  - Default: `newsletter`.
  - User can change if another ID is preferred.
- (Future) toggles for optional fields or integrations.

On configuration/installation:

- Use App SDK `cma` client and `sdk.ids.environment`.
- If the chosen `newsletterContentTypeId` exists:
  - Do not override it automatically.
  - Show info/warning, but still allow user to keep using it.
  - When running installer, **append** any missing newsletter fields.
- If it doesn’t exist:
  - Create content type with full newsletter schema.
  - Publish it.

Uninstall (optional initial behavior):

- For now, we can either:
  - Provide a no-op uninstall stub, or
  - Optionally delete entries/content type in a "danger zone" action (like Countries app) once behavior is agreed.

## App locations & behavior

### 1. Page location (informational)

- Simple F36-based page explaining:
  - What the Newsletter Preview app does.
  - How to configure the newsletter content type.
  - That the app can later integrate with external email tools.

### 2. Entry sidebar location (newsletter preview)

- Intended to be added to the **newsletter content type**.
- Behavior:
  - Detect current entry and locale (active editor locale if available, else default).
  - Read newsletter fields from the entry.
  - Render an **email campaign-style preview**, roughly like an inbox + detail pane:
    - Header with From (senderName, senderEmail), Reply-To, Subject, Preheader.
    - Body rendered from Rich Text `content` field.
  - Read-only preview; users edit fields via native Contentful editor.

### 3. Entry editor location (full preview)

- Separate full-page preview location for the same newsletter entry.
- Behavior:
  - Full-width email preview using the same layout as sidebar, but larger and more "inbox-like" (e.g. full email body, larger typography).
  - No editing; navigation back to the entry handled by Contentful chrome.

### 4. Locales

- Previews should:
  - Try to read values from the **current editor locale**.
  - If a field is missing in that locale, fall back to the default locale.
  - Support spaces with multiple locales without extra configuration.

## Implementation phases

1. **Installer & config**
   - Implement `runInstallation` and `runUninstall` in `install.ts` using the pattern from `countries/install.ts`.
   - Build a proper `ConfigScreen` component that:
     - Reads/writes `newsletterContentTypeId` via `sdk.parameters.installation`.
     - Checks if that content type exists and shows appropriate messaging.
     - On configuration completed, runs `runInstallation` once.

2. **Location routing**
   - Update `components/the-app.tsx` to route to:
     - Config screen in `LOCATION_APP_CONFIG`.
     - Sidebar preview in `LOCATION_ENTRY_SIDEBAR`.
     - Entry-editor preview in `LOCATION_ENTRY_EDITOR`.
     - Informational `app-page` for `LOCATION_PAGE`.

3. **Preview UIs**
   - Implement reusable preview component (e.g. `EmailPreview`) that:
     - Takes a `Newsletter`-shaped object and a locale.
     - Renders email header + body.
   - Sidebar location wraps `EmailPreview` in a compact layout.
   - Entry editor location wraps `EmailPreview` in a full-width layout.

4. **Future work (not in initial scope)**
   - Add integration hooks to send/preflight newsletters with an external email provider.
   - Add status fields, scheduling, and logs to the content model.
