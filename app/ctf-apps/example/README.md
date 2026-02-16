# Newsletter Preview App

This folder contains the **Newsletter Preview** Contentful app.

The app provides an email-style preview for a "Newsletter" content type inside the Contentful entry editor. It focuses on:

- A consistent, live, email-like preview in the **entry sidebar** and **entry editor**.
- A **dialog-based full-screen preview** opened from the sidebar.
- Correct rendering of **Rich Text** content, including **embedded image assets**.
- Simple **"real email" feel** controls (theme, client preset, viewport in the editor).

The app is intentionally self-contained and does **not** send emails or integrate with ESPs like Mailchimp/Braze; it is a Contentful-side authoring and QA tool.

---

## Content model

On installation / configuration, the app expects (and can create) a **Newsletter** content type with the following fields:

- `subject` – Short text, required.
- `senderName` – Short text, required.
- `senderEmail` – Short text, required.
- `replyToEmail` – Short text, optional.
- `preheader` – Short text, optional.
- `content` – **Rich Text**, used as the email body.

The actual content type ID is configurable in the app's config screen; the installer is idempotent and will create or update the content type as needed.

---

## Installation & configuration

The app follows the same patterns as other apps in `app/ctf-apps`:

- `manifest.json` declares locations for:
  - `app-config` – configuration screen.
  - `entry-sidebar` – live sidebar preview.
  - `entry-editor` – full-page preview.
  - `dialog` – full-screen preview opened from the sidebar.

- `install.ts` provides an idempotent installer that:
  - Creates or updates the newsletter content type with the fields above.
  - Can be re-run safely from the config screen.

- `locations/config-screen.tsx` lets editors:
  - Choose / confirm the newsletter content type ID.
  - Run the installer from the UI.
  - Automatically wire the app into the selected content type's **sidebar** and **entry editor** via `targetState.EditorInterface`.

---

## App locations & behavior

### Entry sidebar – live preview

File: `locations/entry-sidebar/stats-sidebar.tsx`

Behavior:

- Uses `SidebarAppSDK` and field APIs to read the current entry values for:
  - `subject`, `senderName`, `senderEmail`, `replyToEmail`, `preheader`, `content`.
- Derives the active locale from `sdk.locales`, and falls back to the default locale when needed.
- Subscribes to `onValueChanged` for key fields so the preview updates live as the editor types.
- Resolves embedded assets in the Rich Text `content` field by:
  - Walking the Rich Text document for `embedded-asset-block` IDs.
  - Calling `sdk.cma.asset.getMany` to fetch full asset objects.
  - Passing an `assetsById` map to the preview renderer so images can be displayed.
- Renders an email-style preview using `EmailPreview`.
- Shows a **floating magnifying glass button** that opens the app in `dialog` location with the current preview data and view settings.

### Entry editor – full-page preview

File: `locations/editor/newsletter-editor.tsx`

Behavior:

- Uses `EditorAppSDK` to read entry fields via field APIs (no direct `sdk.field` access).
- Applies the same locale fallback logic as the sidebar.
- Resolves embedded assets in `content` using the same `sdk.cma.asset.getMany` enrichment pattern.
- Renders the same `EmailPreview` component, inside a centered container.
- Exposes local controls (see **Real email controls** below) so editors can experiment with different presets and viewports without affecting the sidebar.

### Dialog – full-screen preview

File: `components/the-app.tsx` (Dialog branch)

Behavior:

- The sidebar opens the dialog via `sdk.dialogs.openCurrentApp`, passing:
  - Newsletter fields (subject, sender, preheader, content).
  - View settings (theme, client preset, viewport).
- `DialogPreview`:
  - Receives the parameters and re-runs asset enrichment using `sdk.cma.asset.getMany`.
  - Passes content + `assetsById` + view settings into `EmailPreview`.
  - Renders within a scrollable container sized for a full-screen dialog.

### Config screen

File: `locations/config-screen.tsx`

Behavior:

- Lets admins choose which content type ID to treat as "Newsletter".
- Invokes the installer when saving config.
- Uses `targetState.EditorInterface` to attach the app to:
  - The chosen content type's **entry sidebar**.
  - The chosen content type's **entry editor**.

---

## Email preview rendering

File: `components/email-preview.tsx`

Responsibilities:

- Render an email-style frame that looks like an inbox message:
  - Avatar with sender initial.
  - Sender name and email.
  - "Just now • Preview" meta line.
  - Subject and preheader.
  - Optional reply-to line.

- Render Rich Text content using `@contentful/rich-text-react-renderer`:
  - Paragraphs and headings.
  - Unordered and ordered lists with explicit `list-style-type` so bullets/numbers are visible.
  - Embedded entries as small stub boxes with the target ID.
  - Embedded assets:
    - Prefer a fully fetched asset from the `assetsById` map.
    - Fall back to any `fields` present directly on the Rich Text node.
    - If an image URL is available, render an `<img>` with `max-width: 100%` and a subtle border.
    - Otherwise, render a stub box mentioning the asset ID.

If `content` is empty, the preview shows a subtle `(No content)` placeholder.

---

## Real email controls

To better approximate real inbox clients, `EmailPreview` supports simple view controls.

### Supported props

- `theme`: `"light" | "dark"`
  - Controls background, borders, and text color.
  - Sidebar defaults to **dark**.

- `viewport`: `"desktop" | "mobile"`
  - Controls `max-width` of the preview container (`720px` vs `414px`).
  - In the sidebar the viewport is fixed to `desktop`.
  - In the editor, viewport can be toggled by the user.

- `clientPreset`: `"gmail" | "appleMail" | "outlook"`
  - Controls the font stack to mimic common email clients:
    - Gmail → `Roboto`-based stack.
    - Apple Mail → `-apple-system` / SF Pro stack.
    - Outlook → `"Segoe UI"`, Tahoma, etc.

### Where controls appear

- **Sidebar**
  - Buttons to toggle **Light / Dark** theme.
  - Dropdown to choose **Gmail / Apple Mail / Outlook**.
  - View settings are passed into the dialog so the full-screen preview matches the sidebar.

- **Editor**
  - Buttons to toggle **Light / Dark** theme.
  - Buttons to toggle **Desktop / Mobile** viewport.
  - Dropdown for **Gmail / Apple Mail / Outlook**.
  - Settings are local to the editor view.

---

## Limitations & non-goals

- The app **does not send emails** and does not call external ESP APIs (Mailchimp, Braze, etc.).
- Personalization tokens (e.g. `{{firstName}}`) are rendered as-is; there is no token-evaluation layer.
- The preview aims to be visually similar to inbox clients but is not a pixel-perfect rendering engine.

These trade-offs keep the app lightweight, safe to install in any space, and focused on authoring-time preview rather than delivery.

