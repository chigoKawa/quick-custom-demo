# Custom Flag Manager — implementation plan

A Page-location Contentful app that authors and audits Personalization **custom flags**.
Additive: everything it writes is a normal `nt_experience` entry, fully editable in the
native Variants UI.

**Scope: experiments only.** The app *creates* `nt_type: "nt_experiment"` entries and nothing
else. It still *reads* every experience — including personalizations, which are 31 of the 34
entries in this space — because a flag key colliding across a personalization and an experiment
is exactly as broken as two experiments colliding, and the registry's job is to surface that.
Read everything, write experiments.

Sources of truth used to write this plan:
- UX / copy / validation: the design mock (`Custom Flag Builder.html`), decoded and read in full
  (markup + the `DCLogic` component that carries all state, derivations and copy).
- Entry shape: read live from the space via CMA (`ace0ba6p9v98` / `master`) — see
  [§3.1](#31-verified-entry-shape-not-assumed). Risk 1 is now largely closed.
- Product behaviour: the Contentful Personalization documentation (`how-personalization-works`,
  `component-patterns`, `contentful-integration-guide`, `implementation-examples`, `sdk-selection`,
  `analytics-and-preview`). Where the docs and the live space disagree, the space wins for shape
  and the docs win for behaviour — noted inline.
- App shell conventions: `app/ctf-apps/page-tree/*` (the existing Page-location app).

---

## 1. Inventory

Extracted from the mock, not invented. `⚠️` marked something the mock left ambiguous; every one
is now decided in [§6](#6-committed-assumptions) and the resolution is stated inline. Copy that
changed because of the experiments-only scope is marked **(scope)**.

### 1.0 Prototype-level states (mock `data-props`)

| Prop | Values | Meaning for the build |
|---|---|---|
| `registryState` | `populated` \| `empty` \| `loading` \| `readOnly` | Four registry states that must all render. `readOnly` is a real permission state, not a demo toggle. |
| `simulateWriteError` | boolean | The create submit must have a failure path that preserves input. |

### 1.1 Shell

- [ ] Page header: title **Custom Flag Builder**; subtitle is contextual:
  - registry — `Custom flags across Northwind Commerce · master` (→ real space name · environment)
  - create — `New custom flag · step {n} of 5`
  - success — `Created`
- [ ] `Read only` badge in header when the user cannot write
- [ ] `Component inventory` trigger → modal listing what is Forma 36 vs composed (mock-only dev aid; **drop from the real app**)
- [ ] Primary action `Create flag`; disabled in read-only with tooltip
      `Your role does not permit creating optimizations.`
- [ ] Toast/notification host. Two kinds: neutral (`--blue-500` accent) and `negative` (`--red-500`), dismissable

### 1.2 Registry — controls

- [ ] Search input, placeholder `Search flag key or experience`, aria-label `Search flags`; matches flag key **or** experience name
- [ ] Format filter: `All` `String` `JSON` `Number` `Boolean`
- [ ] Type filter: `All` `Experiments` `Personalizations`
- [ ] `Duplicate keys only ×` toggle chip — the `×` clears it (`clearCollisionFilter`)
- [ ] Row count label: `{shown} of {total} flags`

### 1.3 Registry — collision banner

- [ ] Shown when ≥1 key appears in >1 experience:
      `{n} flag keys are used by more than one experience. Resolution is non-deterministic.`
- [ ] Action `Review` → sets the duplicate-keys-only filter (`reviewCollisions`)

### 1.4 Registry — table

- [ ] Columns: `Flag key` · `Used in` · `Variants` · `Status` · `Health` · `Actions`
- [ ] Flag key cell: monospace key + format badge. Format→colour map is fixed:
      `String` gray-200/700 · `JSON` purple-200/600 · `Number` blue-200/600 · `Boolean` green-200/600
- [ ] Used in: experience name + entry id
- [ ] Variants: count (baseline + n)
- [ ] Status dot + label: `Published` green-500 · `Draft` orange-400 · `Changed` blue-500
- [ ] Health cell, two independent signals:
  - `Key collision` badge (negative)
  - parity icon with tooltip `Variant matches baseline`
- [ ] Actions menu (aria-label `More actions`): `Edit flag` (own icon button, aria-label `Edit flag`),
      `Duplicate`, `Copy developer snippet`, `Delete`
- [ ] Action results (toasts): `Duplicated "{key}" as a draft.` ·
      `Developer snippet for {KEY} copied.` · `Deleted {key} from {experience}.` (negative)
- [ ] `Edit` jumps into the create flow at **step 2**, prefilled ⚠️ (mock never loads real values back
      into the builder — see §6.3)
- [ ] Read-only: row actions disabled, tooltip `Your role does not permit editing optimizations in this space.`,
      edit icon title `Read-only access`

### 1.5 Registry — other states

- [ ] Loading: 6 skeleton rows
- [ ] Empty: heading `No custom flags yet`, body
      `A custom flag is a key–value pair delivered at runtime. Your frontend reads the key and changes behaviour — layout, feature toggles, thresholds — without swapping a content entry.`,
      actions `Create flag` + `Learn about custom flags` ⚠️ (needs a URL — §6.11: real docs link
      or no link at all)
- [ ] No results: `No flags match these filters.`

### 1.6 Collision detail panel (side panel, aria-label `Close panel`)

- [ ] Title `Key collision` + the key
- [ ] `Experiences using this key` — each row: name, entry id, type
- [ ] `Wins today` marker on **the first row after sorting by entry id ascending** — this is the whole point of the panel
- [ ] Remediation options as copy only: `Rename a key`, `Archive one` ⚠️ (no wired behaviour in the
      mock — **stays copy only**: renaming a key is a frontend change too, so the app must not offer
      a one-click fix that silently breaks a deployed `useFlag` call)

### 1.7 Create flow — frame

- [ ] 5 steps: `1 Basics` · `2 Flag definition` · `3 Values` · `4 Delivery` · `5 Review`
      **(scope)** — no personalization branch; step 4 is always Delivery
- [ ] Future steps locked, `opacity 0.55`
- [ ] Sticky footer: `Cancel` · `Back` (step > 1) · `Continue` (steps 1–4) / submit on step 5
- [ ] Blocked reason rendered beside a disabled Continue (opacity 0.5):
      `Name is required.` · `Enter a valid flag key.` · `Distribution must sum to 100%.`

### 1.8 Step 1 — Basics

- [ ] `Name` (required, error `This field is required`)
- [ ] `Description` — help `Optional. Useful for explaining the hypothesis to teammates.`
- [ ] ~~Experiment / personalization type choice~~ **(scope)** — cut. The mock's `type` state drove
      steps 4–5 and the submit label but had no control in the markup; the app is experiments-only,
      so `type` becomes the constant `"nt_experiment"` and every branch on it collapses. A
      personalization is still creatable natively, and the registry lists the ones that exist.

### 1.9 Step 2 — Flag definition

- [ ] `Flag key` — help `Lowercase letters, numbers, underscores and hyphens. No spaces.`
- [ ] Validation `/^[a-z0-9_-]+$/`; error
      `Use lowercase letters, numbers, underscores or hyphens only. No spaces.`
- [ ] Live uniqueness check against the registry → `Use a unique key` + collision must be
      acknowledged before submit (`submitDisabled = creating || (keyCollision && !ack)`)
- [ ] `Format` segmented control (aria-label `Format`) — help
      `Determines the value editor in the next step and the typed default in the developer snippet.`
- [ ] Changing format after values exist → confirm modal:
      `Values already entered for the baseline and every variant will be cleared. This cannot be undone.`
      / `Clear values and change`. Confirm resets every column's value, code and code error, and turns
      the schema off unless the new format is JSON
- [ ] Optional JSON Schema block (aria-label `JSON Schema`): `Apply schema` ·
      `Load checkout layout example` · `Remove schema` · `Schema applied` badge
  - help `When a schema is present, the builder in step 3 renders a guided form instead of a free-form tree: keys become fixed labels and enums become selects.`
  - empty apply → negative toast `Paste a JSON Schema first.`
  - success → `Schema applied. The builder is now guided.` and forces format to JSON
  - the bundled example: object, `required: [layout, left, right]`, `layout.enum = [one-column, two-column]`,
    `left`/`right` arrays over `[hero, order_summary, payment, upsell, trust_badges]`, `additionalProperties: false`

### 1.10 Step 3 — Values

One column per variant: `baseline` (static label) + `Variant A…` (editable label, aria-label
`Variant label`; removable, aria-label `Remove variant`).

- [ ] JSON format: `Builder` / `Code` toggle
- [ ] Builder rows, per node: collapse chevron (aria-label `Expand or collapse`), key input
      (aria-label `Field key`), type select (aria-label `Field type`, options include `Object` `Array` `Null`),
      value control (aria-label `Value`), move up/down (aria-labels `Move up`/`Move down`),
      remove (aria-label `Remove field`), drag handle
- [ ] Indentation `depth * 22`px; array children labelled `[i]`; collapsed parent shows `{n} items`
- [ ] `Add field`; helper `Reorder with the arrow buttons or drag the handle.`
- [ ] Guided (schema on): keys become fixed labels, types fixed, `required` marks on
      layout/left/right, array children render as enum selects, rows not deletable
- [ ] Errors: `Not a number` · `Not allowed by schema`
- [ ] Code view: aria-label `JSON value`; footer
      `Code view uses the standard JSON field editor — parse validation and undo/redo behave as they do in the entry editor. Changes sync back to the builder.`
- [ ] Parse rule is stricter than JSON: top level must be an object, else
      `Invalid JSON — Top level must be an object`. **This rule belongs to the JSON format only** —
      it is gated behind the mock's `isJson`, and the Code view does not exist for the other three.
      A `Number` flag's value is a number; do not let this validator leak into the scalar path.
- [ ] Valid line: `Valid — matches schema` (guided) / `Valid JSON` / the parse error
- [ ] Builder is blocked while the code is invalid; tooltip
      `Fix the JSON in Code view before returning to the builder.`
- [ ] Non-JSON formats: Boolean → switch; Number → input with `Decrease`/`Increase` steppers and
      error `Enter a number`; String → input, becomes a 3-row textarea past 46 characters
- [ ] Parity check per variant: `{label} is identical to the baseline — this variant will produce no change.`
      / `{label} differs from the baseline.`; comparison is on canonical (recursively key-sorted) JSON
- [ ] `Add variant` → clones the baseline tree, `Variant B/C…`, manual share seeded 0

### 1.11 Step 4 — Delivery

**(scope)** Always "Delivery" — the personalization-only "Audience" variant of this step is gone,
but the audience picker itself stays, because an experiment can be audience-targeted.

- [ ] `Primary metric (optional)` — Help
      `Defines how success is measured. Required to enable multi-armed bandit distribution.`
      Resolved: the mock's five hardcoded names are demo data. Metrics are configured in the
      Personalization UI and powered by `track` events; there is no CMA collection for them. The
      select is populated by harvesting the distinct `primaryMetric` UUIDs already in use across
      `nt_experience` (3 in this space), each labelled by the experiences using it, plus
      `No primary metric` — which is a valid, common state (`null` on 9 entries, `""` on 8).
- [ ] `Distribution`: manual / even split / multi-armed bandit
  - manual: per-variant percentage inputs, `Total`, and
    `Percentages must sum to exactly 100%. Adjust before continuing.` — must equal 100 exactly
  - even split: shows a `computed` share, `Math.round((100/n)*10)/10`
  - bandit: disabled without a metric, tooltip `Select a primary metric to enable this.`
    Persisted as `distributionType`; only `"even-split"` and `"manual"` are attested in this space,
    so bandit is cut with the rest of the cut list until a real entry proves its string.
- [ ] `Audience`: real `nt_audience` entries (13 in this space), plus `All visitors` = no link.
      Help `Only visitors in {audience} are eligible.` / `Empty means all visitors are eligible.`
      Resolved: the docs state `nt_audience` is null for experiences targeting all visitors, so an
      audience-less experiment is valid and is the default.
- [ ] ~~`Holdout %`~~ — cut. No `holdout` key exists in any of the 34 entries and none is documented
      for `nt_config`; the concept exists on the SDK's inline `<Personalize holdout={n}>` prop, which
      is not what this app writes. Inventing a key risks confusing the native field editor. The same
      measurement intent is already expressible: give the baseline a larger share of `distribution`.
- [ ] `Traffic allocation` slider (aria-label `Traffic allocation slider`) + percentage input; help
      `The share of eligible visitors who enter this experiment. At 100%, everyone who matches the audience is included.`
- [ ] `Live summary` — stacked bar, one segment per variant, width `(variantPct/100) * traffic`,
      colours gray-500 / blue-500 / purple-500, plus `{100-traffic}% excluded`

### 1.12 Step 5 — Review

- [ ] `Summary` rows, one per step, each with an `Edit` link back to that step
- [ ] Traffic row reads `{n}% (stored as 0.{n})` — the mock is explicit about the stored fraction
- [ ] Schema row reads `Applied — 3 properties, 5 permitted sections`
- [ ] Parity warning: `{labels} matches the baseline and will produce no observable change.`
- [ ] Collision acknowledgement checkbox:
      `I understand only one of these optimizations will apply and the winner is not configurable.`
- [ ] `Developer handoff` block:
  - snippet imports from **`@ninetailed/experience.js-react`**, not the mock's
    `@contentful/personalization-react`. Resolved: `useFlag` in that package is the documented
    custom-flag API and is what this repo already runs (`features/personalization/flagged-slot.tsx`).
    Emit the documented three-value destructure, not just `value`, because `status` is the part
    developers forget:
    ```ts
    const { value, status } = useFlag<{ /* typed default's shape */ }>('checkout_layout', { … });
    if (status === 'loading') return null;   // or a skeleton
    ```
    Offer `useFlagWithManualTracking('key', default) → [flag, track]` as a second tab for the case
    where the developer wants to decide when exposure counts.
  - camelCase variable derived from the key (`checkout_layout` → `checkoutLayout`)
  - typed default per format: JSON pretty-printed, String quoted, Number/Boolean raw
  - `Copy snippet` → `Copied` for 2s, green-100 background
  - collapsible frontend validation schema block
  - **new, from the docs:** a one-line prerequisite note — a custom flag needs no `<Experience>`
    wrapper and no `nt_experiences` field on any entry, but the experiment only *reports* if
    `NinetailedInsightsPlugin` is registered on the provider and the conversion metric is fired with
    `track()`. Without that the flag still delivers and the experiment measures nothing. This is the
    single most useful sentence on the screen and the mock does not have it.
  - `Create Jira ticket` → `Ticket created`, toast `Jira ticket NW-4821 created.`, body
    `Ticket NW-4821 created in Northwind Web with the flag key, format and snippet attached.`
    Resolved: demo theatre, no integration. Keep it as a stub only if it costs nothing; it is first
    on the cut list.
  - notice `JSON flag values are not validated at delivery time. Validate the payload in the frontend before you rely on its shape.`
- [ ] Submit `Create experiment`, `Creating…` while in flight **(scope)** — the
      `Create personalization` label is gone
- [ ] Write failure: inline error + negative toast
      `Could not create the experiment. Your entries are preserved.` — state is **not** reset

### 1.13 Success

- [ ] Title `Experiment created` **(scope)** — the `Personalization created` variant is gone
- [ ] Body `The entry is live in the native Variants UI. Flag {key}`
- [ ] Added: the entry is created as a **draft**, and the docs are explicit that an experience must
      be published to be returned by the Experience API. So the success screen must say so —
      `Publish the entry to start delivering this flag.` — or the demo silently does nothing.
- [ ] `View in Contentful` (mock only flashes `Opening entry in the native Variants UI.`) → real
      `sdk.navigator.openEntry(id, { slideIn: true })`
- [ ] `Create another flag` → resets to the registry

---

## 2. Component mapping

Verified against what is actually installed: `@contentful/f36-components@5.9.0`,
`@contentful/f36-tokens@5.1.0`.

### 2.1 Direct Forma 36 components

| Mock element | Forma 36 |
|---|---|
| Page frame, header, actions | `Workbench`, `Workbench.Header`, `Workbench.Content` — **needs `@contentful/f36-workbench`** (see 2.3) |
| Registry table | `Table` + `Table.Head/Body/Row/Cell` |
| Search | `TextInput` with `MagnifyingGlassIcon` |
| Format / type filters | `Select` (or `Menu` + `Button`) |
| `Duplicate keys only ×` chip | `Pill` (`onClose`) |
| Format badge, `Key collision`, `Read only`, `Schema applied` | `Badge` with `variant` |
| Status | `EntryStatusBadge`-style `Badge` (`positive`/`warning`/`primary`) — keep f36's status colour language |
| Collision banner, parity warning, delivery-validation notice | `Note` (`variant="warning" | "negative" | "primary"`) |
| Row actions | `IconButton` + `Menu`/`Menu.Item` |
| Toasts | `Notification.success/error` |
| Wizard stepper | `ProgressStepper` (better than the mock's tab strip — it is exactly this control) |
| Footer buttons | `Button` (`variant="primary" | "secondary" | "transparent"`) |
| Labels, help text, errors | `FormControl` + `FormControl.Label/HelpText/ValidationMessage` |
| Text/number/textarea/select/switch/checkbox | `TextInput`, `Textarea`, `Select`, `Switch`, `Checkbox` |
| Distribution mode choice | `Radio.Group` + `Radio` (there is no `RadioGroup` export) |
| Disabled-action explanations | `Tooltip` |
| Format-change confirm | `Modal` (or `ModalConfirm`) |
| Loading rows | `SkeletonContainer` + `SkeletonRow` |
| Collapsible schema block | `Accordion` / `Collapse` |
| Copy snippet | `CopyButton` |
| Drag handle | `DragHandle` |
| Typography | `Heading`, `Subheading`, `SectionHeading`, `Paragraph`, `Text` |
| Layout | `Flex`, `Stack`, `Box`, `Grid` |
| Links | `TextLink` |
| Icons | `@contentful/f36-icons` (replaces every inline SVG in the mock) |

### 2.2 Composed from primitives — no Forma 36 equivalent

1. **JSON tree builder row.** `Flex` (indent via `paddingLeft = depth * spacingM`) +
   `IconButton` (chevron) + `TextInput` (key) + `Select` (type) + value control +
   `IconButton`s (up / down / remove) + `DragHandle`. One `TreeRow` component driven by a flat
   row list, exactly like the mock's `flat()` — flatten the tree for rendering, mutate the tree for state.
2. **Guided (schema) row.** Same component, `key` swapped for a `Text` label with an asterisk for
   required, and the value control swapped for a `Select` when the schema declares an enum.
3. **Segmented control** (format). `Button.Group` with `isActive` styling — Forma 36 has no segmented control.
4. **Traffic slider.** Native `<input type="range">` styled with f36 tokens, paired with a
   `TextInput` — there is no f36 slider. Both write one number.
5. **Distribution stacked bar.** `Flex` of token-coloured `Box`es (`gray500`, `blue500`, `purple500`).
6. **Read-only code block** (developer snippet). `Box` with `fontStack.fontStackMonospace` + `CopyButton`.
   No syntax highlighting — drop it; the mock's colouring is cosmetic.
7. **Empty state.** `@contentful/f36-empty-state` only ships the `MissingContent` illustration in this
   version — compose `Flex` + illustration + `Heading` + `Paragraph` + `Button`s.
8. **Summary / review rows.** No `DefinitionList` in 5.9 — use a borderless `Table` or `Flex` rows
   with a fixed-width label column.
9. **Collision side panel.** `@contentful/f36-drawer` is not installed; use `Modal` with
   `position="top"`/`size="large"`, or add the drawer package if a true side panel matters.
10. **Parity status line.** `Flex` + icon + `Text` — a `Note` is too heavy inside a value column.

### 2.3 Dependencies — resolved by installing them

**Added: `@contentful/field-editor-json@4.3.1`** — the Code side of the toggle, per the brief.
Two things about it that the mapping above did not anticipate:

- It pulls its **own Forma 36 v6 stack** (`f36-components@6.19`, `f36-tokens@6`) alongside our v5.
  Accepted: each f36 major emits its own hashed emotion classes, so there is no cascade collision —
  the code box just renders in v6's styling, which inside a monospace box is indistinguishable.
  Mitigation: `next/dynamic` with `ssr: false` so the v6 stack plus CodeMirror stay out of the
  registry bundle entirely and only load when a user opens the Code tab.
- Its only public export is `JsonEditor`, which takes `{ field: FieldAPI, isInitiallyDisabled }`.
  There is no FieldAPI in a Page location, so **write a ~40-line in-memory `FieldAPI` shim**
  (`getValue` / `setValue` / `onValueChanged` / `onIsDisabledChanged` / `removeValue` / `setInvalid`)
  backed by the wizard's own state. `JsonEditorField` — which is exactly the
  `{ value, onChange, isDisabled }` component we want — exists in `dist` but is *not* exported;
  do not deep-import a bundled path.

**Rejected: `@contentful/f36-workbench`.** Installed, inspected, uninstalled. Its latest release is
`4.21.1` — the package never moved to v5, so it drags in a **complete second Forma 36 v4 stack**
(`f36-core@4`, `f36-tokens@4`, `emotion@10`) for what is a header bar and a content area. Two token
majors means our spacing and colour constants stop matching the chrome that frames them, which is
the exact opposite of looking native. `Workbench` is ~40 lines of `Flex` + `Box` over v5 tokens:
compose it locally as `components/workbench.tsx` and keep one token major in the app.

**Not needed: `@contentful/f36-drawer`.** §2.2 item 9 already routes the collision panel through
`Modal`; skip the third duplicate stack.

No hand-rolled CSS module for this app. `page-tree` uses one; that is the pattern this app
deliberately breaks, because it has to look native.

---

## 3. Data layer plan

### 3.1 Verified entry shape (not assumed)

Read from `ace0ba6p9v98 / master` via CMA. Content type `nt_experience` ("Ninetailed Experience"):

| Field | Type | Notes |
|---|---|---|
| `nt_name` | Symbol | **required, unique** |
| `nt_description` | Text | |
| `nt_type` | Symbol | required, `in ["nt_experiment","nt_personalization"]` |
| `nt_config` | Object | required — the flag lives here |
| `nt_audience` | Link→`nt_audience` | single link |
| `nt_variants` | Array\<Link Entry\> | **unused by custom flags** (values are inline) |
| `nt_experience_id` | Symbol | **unique**; native UI sets it to the entry's own `sys.id` |
| `nt_metadata` | Object | native writes `{ "type": "origin" }` |

A custom flag is one `InlineVariable` component inside `nt_config`. Real example
(`6IvPkf6KMm5W4dXfkXye7T`, "Frontend Controlled Experiment"):

```json
{
  "distribution": [0.5, 0.5],
  "traffic": 1,
  "components": [
    {
      "type": "InlineVariable",
      "key": "ticketing-layout",
      "valueType": "Object",
      "baseline": { "value": {} },
      "variants": [ { "value": {} } ]
    }
  ],
  "primaryMetric": "bbbdad70-a45f-4005-85a1-dafd89832980",
  "distributionType": "even-split"
}
```

Facts that fall out of the 34 experiences in this space:
- `nt_config` keys ever seen: `distribution`, `traffic`, `components`, `primaryMetric`, `distributionType`. **Nothing else.**
- `distribution` is an array of fractions summing to 1 — `[0.5, 0.5]` for experiments, `[0, 1]` for personalizations. Index 0 is the baseline.
- `traffic` is a fraction; it is `1` in every entry in this space.
- `distributionType` is `"even-split"` or `"manual"`, and **absent** on personalizations.
- `primaryMetric` is an opaque UUID, sometimes `""`, sometimes absent. Three distinct values in use.
- **Shape drift is already real**, not hypothetical: 4 entries store `components` as a bare object
  instead of an array, and some store `variants` as an object instead of an array. The reader must
  normalise both. This is direct evidence for Risk 1.
- The native Variants UI is the `nt_config` field editor, owned by app definition
  `4QYnIIKna8TpXegJp3oSBi` ("Contentful Personalization"). "View in Contentful" is just the entry editor.

Where the documentation and the space disagree — both are worth knowing:

| | Documented | This space |
|---|---|---|
| `nt_config.traffic` | `number (0-1)`, defaults to `0` when config is null | `1` on all 34 |
| `nt_config.distribution` | `number[]`, defaults to `[0.5, 0.5]` | `[0.5,0.5]` ×3, `[0,1]` ×31 |
| `nt_config.sticky` | `boolean`, defaults to `false` | **absent from all 34 entries** |
| `nt_config.components[]` | documented only in its `EntryReplacement` form (`{baseline:{id}, variants:[{id, hidden?}]}`) | `InlineVariable` ×1, `EntryReplacement` ×27, `None` ×2 |
| `nt_experience_id` | listed as required | absent on 2 of 34 |
| `nt_audience` | "null for experiences targeting All Visitors" | matches — null is common |

Consequences the plan takes on board:
- **`sticky` is a real documented key the app must not clobber.** It is absent here only because
  nothing has set it. `buildConfig` must never write it (leave the native default), and the
  read-modify-write paths (duplicate / delete-one-component) must preserve every unrecognised key
  by spreading the parsed config rather than reconstructing it.
- The documented `components` shape is the entry-swap one, so the **live `InlineVariable` read is the
  only authority for flags** — do not "fix" the app to match the docs.
- The docs describe `nt_config` defaults applied when the field is null. The app should treat a
  missing `traffic` as `1` for *display* rather than `0`, because every real entry says `1`; flag it
  in the registry rather than guessing silently.

### 3.2 Reading and listing

- Client: `sdk.cma` (the `CMAClient` the App SDK hands you) — no token, no `createClient`, no
  `cmaAdapter` plumbing needed. `contentful-management` is only worth adding if you want the typed
  plain client; `sdk.cma.entry.getMany` is enough. Follow `app/ctf-apps/page-tree/cma-service.ts`.
- One query: `entry.getMany({ query: { content_type: "nt_experience", limit: 100, skip, order: "sys.id" } })`,
  looping on `total` — the same `skip += items.length` / `break on empty` loop page-tree already uses.
  34 entries today; one or two pages. Order by `sys.id` so collision "who wins" is stable and free.
  **No `nt_type` filter on this query** — the registry must see personalizations too (§ scope), and
  the docs' own fetchers make the same distinction (`getExperiments()` filters
  `fields.nt_type: 'nt_experiment'`; `getAllExperiences()` does not). This app is the latter.
- Locale: read `nt_*` fields through a `getLocalized(field, defaultLocale)` helper — page-tree
  already has one (locale → `en-US` → first value). `nt_config` is not localized in practice but the
  CMA still returns it locale-keyed.
- Audiences: separate `content_type: "nt_audience"` query (13 today) for the step-4 picker and to
  resolve `nt_audience` links to names in the registry.
- Cache: a module-level `Map` for the audience list and content-type lookups for the session
  (page-tree's `displayFieldCache` pattern). The experience list itself should be refetched on
  mount and after any write — do not cache it; a stale registry is what produces false collision
  verdicts. No pagination in the UI until the list is big enough to need it; the table can render
  a few hundred rows.

### 3.3 Deriving registry rows

```
for each nt_experience entry
  cfg        = localized(nt_config)
  components = Array.isArray(cfg.components) ? cfg.components : [cfg.components]   // drift guard
  for each component where component.type === "InlineVariable"
    emit row {
      key         : component.key,
      format      : formatFromValueType(component.valueType, component.baseline?.value),
      experience  : localized(nt_name) ?? entry.sys.id,
      entryId     : entry.sys.id,
      type        : nt_type === "nt_experiment" ? "Experiment" : "Personalization",
      variants    : 1 + normaliseVariants(component.variants).length,
      status      : deriveStatus(sys),                        // page-tree's helper, verbatim
      baseline    : component.baseline?.value,
      variantVals : normaliseVariants(component.variants).map(v => v.value),
      audienceId  : localized(nt_audience)?.sys?.id ?? null,
    }
```

One entry can in principle carry several `InlineVariable` components, so rows are per *(entry, key)*,
not per entry. The registry is a flatMap, not a map.

Two derived health signals, both computed client-side over the full row set:

- **Collision** — `groupBy(rows, r => r.key)`, keep groups of size > 1. Within a group, the winner is
  `group.sort((a,b) => a.entryId < b.entryId ? -1 : 1)[0]` — alphabetical on entry id, which is why
  the query is ordered by `sys.id`. The banner count is the number of colliding *keys*, not rows.
- **Parity** — `canon(x)` = recursive key-sorted `JSON.stringify`. A variant is at parity when
  `canon(variantVal) === canon(baseline)`. Used both in the registry Health column and live in step 3.

`formatFromValueType`: a one-line lookup — `Object → JSON`, `String → String`, `Number → Number`,
`Boolean → Boolean`. All four are supported by the API; `Object` is simply the only one that happens
to exist in this space today (§6.7). Keep a `typeof baseline.value` fallback anyway, so an entry
written by a newer Personalization release with a `valueType` this table does not know still shows a
correct badge instead of a blank one.

### 3.4 Writing

One `createEntryWithId` call, no variant entries, no side effects:

```ts
const id = generateId();                       // client-side, so nt_experience_id can be set in one write
await sdk.cma.entry.createWithId(
  { contentTypeId: "nt_experience", entryId: id },
  { fields: {
      nt_name:          { [locale]: name },     // UNIQUE — a duplicate name is a 422
      nt_description:   { [locale]: description },
      nt_type:          { [locale]: "nt_experiment" },   // (scope) constant, never branched
      nt_experience_id: { [locale]: id },       // UNIQUE, mirrors sys.id like the native UI
      nt_audience:      audienceId ? { [locale]: { sys: { type: "Link", linkType: "Entry", id: audienceId } } } : undefined,
      nt_config:        { [locale]: config },
      nt_metadata:      { [locale]: { type: "origin" } },
  } }
);
```

`nt_experience_id` being unique and self-referential is exactly why this is `createWithId` rather
than create-then-patch: one round trip, no window where the entry is invalid.

Config assembled in **one** place (see Risk 2):

```ts
{
  components: [{ type: "InlineVariable", key, valueType, baseline: { value }, variants: variantValues.map(value => ({ value })) }],
  distribution: percentsToFractions(percents),        // integers 0–100 → fractions summing to 1
  traffic: pctToFraction(trafficPct),                 // 100 → 1
  distributionType,                                   // (scope) always written — "even-split" | "manual"
  ...(metricId ? { primaryMetric: metricId } : {}),
}
```

Deliberately **not** written: `sticky` (documented, defaulted natively — see §3.1) and `holdout`
(does not exist). Deliberately empty: `nt_variants`, because a custom flag's values are inline.

Leave the entry as a **draft**, and say so on the success screen. The mock's copy ("live in the
native Variants UI") is misleading: the docs are explicit that an experience must be published in
the content source to be returned by the Experience API, so an unpublished flag delivers nothing.
Draft is still the right default — publishing is the author's decision, it keeps the write to one
call, and a half-configured experiment going live is worse than one that does nothing. The fix is
copy plus a `Publish now` secondary action on the success screen (`entry.publish` with the version
returned by the create), not a silent publish.

Custom flags avoid the usual publishing hazard entirely: there are no variant entries to publish
first and no `nt_experiences` link to add to a baseline entry, so there is no ordering problem and
nothing to break on any other entry.

Write-error path: catch, keep all wizard state, render an inline `Note variant="negative"` plus the
negative toast, and re-enable submit. Surface the CMA message for 422s (unique-name violations will
be the common one) rather than the generic copy alone.

Duplicate / delete from the registry are also CMA operations on the parent entry
(`entry.get` → mutate `nt_config.components` → `entry.update` with the fetched `sys.version`).
Note the asymmetry: **deleting a flag whose entry has other components must edit the array, not
delete the entry** — and if it is the entry's only component, deleting the flag means deleting
(or unpublishing) an experience. That is a destructive action needing a confirm the mock does not
have (§6.8).

### 3.5 Read-only degradation

`sdk.access.can("update", "Entry")` (and `can("create", ...)`) once on mount → a single
`canWrite` boolean threaded through the tree. Everything read-only is already specified in the
mock: header badge, disabled primary action with tooltip, disabled row actions with tooltip. Do not
hide the registry — reading the collision report is the most useful thing a read-only user can do.

---

## 4. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| **1** | **`nt_config` is an internal shape, not public API, and can drift.** | High | **Largely closed by reading the space (§3.1).** Drift is already present today (`components` as object vs array), so the reader ships with normalisers from day one. Keep all shape knowledge in one `nt-config.ts` module with `parseConfig` / `buildConfig` and nothing else touching raw JSON. Round-trip test: create a flag with the app, open the native Variants UI, confirm it renders and is editable; then edit it natively and confirm the registry still reads it. |
| **2** | **Traffic and distribution are stored as 0–1 fractions but shown as integer percentages.** | High | Confirmed twice over — live (`traffic: 1`, `distribution: [0.5, 0.5]`) and documented (`traffic: number (0-1)`). Note it bites **twice**: the mock only calls out `traffic`, but `distribution` is the same conversion and is the one that can silently break an experiment. Keep percentages as the only UI representation and convert at exactly two functions in `nt-config.ts` (`pctToFraction`, `fractionToPct`), never inline. Manual distribution must sum to exactly 100 before conversion; after conversion assert the fractions sum to 1 within epsilon and hard-fail the write if not. **Decided: integer percentages only** (§6.9), so `Math.round(pct)/100` is exact and the even-split *display* rounds to one decimal while the stored fractions are re-derived to sum to 1. |
| 3 | `nt_name` and `nt_experience_id` are unique — a duplicate name 422s at submit, after the whole wizard. | Med | Validate the name against the fetched experience list in step 1, the same way the flag key is checked in step 2. Still handle the 422, since another author can win the race. |
| 4 | ~~Holdout has nowhere to store it~~ | Closed | **Cut** (§6.4). No `holdout` key exists in any entry and none is documented for `nt_config`; the SDK's `holdout` is a prop on the inline `<Personalize>` component, not persisted state. The measurement intent is expressed by giving the baseline a larger `distribution` share. |
| 4b | **`sticky` is a documented `nt_config` key that appears in no live entry** — a read-modify-write that reconstructs the config would silently drop it (and any other key added by a future Personalization release). | Med | `parseConfig` keeps the raw object; every write spreads it and overwrites only the keys the app owns. Never build a config from scratch when updating an existing entry. |
| 5 | Metric and audience lists are hardcoded in the mock. | Closed | Audiences: real, query `nt_audience` (13 here); null = all visitors, which the docs confirm is valid. Metrics: the docs place them in the Personalization UI, "powered by `track` events" — there is no CMA collection, so harvest the distinct `primaryMetric` UUIDs in use, label them by the experiences using them, and allow omission (§6.2). |
| 6 | The handoff snippet imports `@contentful/personalization-react`, which is not what runs here. | Closed | **Hardcode `@ninetailed/experience.js-react`** (§6.5): it is the documented `useFlag` package, `sdk-selection` says default to `@ninetailed/experience.js` for existing production projects, and it is what `features/personalization/flagged-slot.tsx` already imports. No config parameter — a settings screen for one string is worse than a correct default. |
| 6b | **The snippet is not enough on its own**: a flag delivers without `<Experience>` or `nt_experiences`, but the experiment only reports with `NinetailedInsightsPlugin` registered and the conversion metric fired via `track()`. An author who copies the snippet and sees no results will blame the flag. | Med | State the prerequisite in the handoff block (§1.12) — one sentence, no code. |
| 7 | Only an `Object` flag exists in this space, so the other three `valueType`s are unexercised here. | Low | Not a gap in the API — it supports all four (§6.7). Keep the mapping in one lookup table and a `typeof` fallback for reading, and cover String / Number / Boolean in the phase-9 round-trip test rather than gating anything on a probe. |
| 8 | Deleting a flag can mean deleting an experience entry. | Med | **Decided: never delete the entry** (§6.8) — remove the component if others remain, otherwise disable the action and point at the entry. |
| 9 | Live Preview / delivery does not validate JSON flag payloads — a broken shape only fails in the frontend. | Low (product, not app) | This is the reason the app exists; keep the mock's notice and the frontend validation schema in the handoff block. |
| 10 | Deep tree state + a controlled JSON editor is where hackathon time disappears. | Med | Flat-render / tree-mutate split from the start (mock's `flat()` + `editTree()`), stable node ids, and `field-editor-json` for the Code side rather than a hand-rolled editor. |
| 11 | Environment is configuration, not a constant (project rule). | Low | Take space and environment from `sdk.ids`, never from env vars or a literal — inside an app the SDK already knows. The subtitle's `· master` comes from `sdk.ids.environment`. |
| 12 | **A draft flag has no effect.** The docs: experiences "must be published in the content source to be returned by the Experience API". The mock's success copy implies the flag is live. | Med | Fix the copy and offer `Publish now` on the success screen (§3.4). Also show publication status in the registry — the Status column already does, so make `draft` visually a warning rather than neutral for flags whose author expects delivery. |

---

## 5. Build order

I agree with read-before-write, and would go further: the **registry is the demo**, because the
collision report is the thing the product genuinely cannot do today. The wizard is the thing that
looks impressive. Build in value order, and explicitly **not** in wizard-step order — step 4
(Delivery) is the least interesting screen and the one with the most unresolved questions, so it
comes last.

- **Phase 0 — probe (done).** Entry shape read from CMA and pinned in §3.1. All four value formats
  are supported by the API, so nothing is gated on further discovery; the non-`Object` formats get
  exercised by the phase-9 round-trip test.
- **Phase 1 — shell.** `page.tsx` + `layout.tsx` + `the-app.tsx` location router copied from
  `page-tree`; Page location only; `Workbench` header; add the two dependencies. Renders "hello" in
  the Contentful UI. Nothing else counts until this is installed and loading.
- **Phase 2 — registry, read-only.** CMA fetch, `parseConfig` normalisers, row derivation, table,
  status and format badges, all four states (populated / loading / empty / no-results), search and
  filters. **Demoable on its own.**
- **Phase 3 — collisions and parity.** Grouping, banner, duplicate-keys chip, Health column, side
  panel with the "wins today" verdict. This is the payload of the demo and it needs no write path.
- **Phase 4 — read-only mode.** `sdk.access.can` + the disabled/tooltip pass. Cheap, and it is a
  stated requirement rather than a nice-to-have. Doing it here keeps it from being retrofitted.
- **Phase 5 — wizard frame.** Stepper, sticky footer, lock/blocked rules, steps 1 and 2 (name,
  key regex, live uniqueness, format segmented control, format-change confirm).
- **Phase 6a — step 3, the scalar formats.** Boolean switch, Number input with steppers and
  `Enter a number`, String input that grows into a textarea past 46 characters, baseline/variant
  columns, add/remove variant, parity line. A day's work at most, and it makes the *whole* create
  flow demoable end to end for a Boolean flag — which means phase 9 can round-trip a trivial value
  before the tree model exists. Do this before 6b, not after.
- **Phase 6b — step 3, the JSON builder.** Tree model, flat render, add/remove/reorder/collapse,
  type switching, the Builder↔Code toggle over `field-editor-json`, the object-at-top-level rule
  (JSON format only — §1.10). The single biggest chunk; budget accordingly. The columns, variant
  controls and parity line are already built by 6a, so this phase is only the tree.
- **Phase 7 — schema-guided mode.** Example preset, apply/remove, fixed keys, enum selects, required
  marks, `Not allowed by schema`. Cut first if time runs short — the free-form builder already beats
  a raw code box, which is the argument the app is making.
- **Phase 8 — step 5 review + developer handoff (done).** Summary rows with edit links, parity
  warning, collision acknowledgement, snippet with camelCase variable and typed default, copy
  button, delivery notice. The validation-schema block ships with phase 7, not here — it is the
  disclosure *for* the schema, so it has nothing to disclose until schema-guided mode exists.
  `lib/snippet.ts` is shared with the registry's `Copy developer snippet` row action (phase 11).
  Two divergences from the mock, both recorded in that file: the import is
  `@ninetailed/experience.js-react` (the mock's `@contentful/personalization-react` does not exist,
  and the GA `@contentful/optimization-*` line ships no custom-flag API), and the snippet
  destructures `value` because the real `useFlag` returns `{ status, value, error }`.
- **Phase 9 — the write.** `buildConfig` + `createWithId`, success screen, `navigator.openEntry`,
  failure path that preserves state. Behind a `Show payload` dev toggle first: render the exact JSON
  the app would POST and diff it by eye against `6IvPkf6KMm5W4dXfkXye7T` before enabling the call.
  Then do the round-trip test from Risk 1.
- **Phase 10 — step 4, delivery.** Metric select (harvested UUIDs + `No primary metric`), audience
  select from `nt_audience`, manual/even-split distribution, sum-to-100 rule, traffic slider, live
  summary bar. Ship a hardcoded even split (`distribution` derived from variant count, `traffic: 1`,
  `distributionType: "even-split"`, no audience) in phase 9 so the write path does not block on this
  screen — and note that hardcoded default is a *correct, complete* experiment, not a stub.
- **Phase 11 — registry write actions.** Duplicate, delete, edit-prefill. Each needs read-modify-write
  on `nt_config.components` and its own confirm.
- **Cut list, in order:** Jira button (demo theatre, §6.6), drag-and-drop reorder (arrow buttons are
  in the mock and are enough), the component-inventory modal (mock scaffolding), syntax highlighting,
  multi-armed bandit (no attested `distributionType` string), edit-prefill.
- **Already cut by decision, not by time:** personalization creation (§ scope), holdout (§6.4), the
  snippet-package config parameter (§6.5).

---

## 6. Committed assumptions

Nothing here is blocking any more. Each is a decision with the evidence behind it; each is
reversible at the cost named in the last column.

| # | Decision | Grounded in | Cost to reverse |
|---|---|---|---|
| 6.1 | **Experiments only.** `nt_type` is the constant `"nt_experiment"`; `distributionType` is always written; the type control, the personalization branch of step 4, and the `Create personalization` / `Personalization created` copy are all removed. The registry still lists personalizations. | Your instruction, plus the fact that a custom flag's whole point is a runtime value under test — the docs' custom-flag examples are experiment-shaped, and `distributionType` is absent on every personalization in this space. | Small. One field value, one conditional, two strings. The write path is identical. |
| 6.2 | **Metrics are harvested, not fetched.** Populate the select with the distinct `primaryMetric` UUIDs already in `nt_experience`, labelled by the experiences using them, plus `No primary metric` as the default. | Docs: metrics are "configured in the CMS UI and powered by `track` events" — grouped with experiments and audiences in a data bucket, with no CMA collection. Live: 3 distinct UUIDs, `null` ×9, `""` ×8, so omission is normal. | None. If an API appears, swap the source behind one function. |
| 6.3 | **Edit is a create-prefilled shortcut, not a round trip.** `Edit` opens the wizard at step 2 with name / key / format filled, exactly as the mock does. Round-trip editing of an existing entry is out of scope; the native Variants UI already edits values, and "View in Contentful" is one click away. | The mock never loads real baseline/variant values back into the builder and never updates an entry — the design itself does not claim this. | Medium. Needs `parseConfig → tree` (the inverse of what phase 6b builds) plus read-modify-write with `sys.version`. Phase 11 territory. |
| 6.4 | **Holdout is cut.** Not modelled, not written. | No `holdout` in any of 34 entries, none documented in `nt_config`; the SDK's `holdout` is a `<Personalize>` prop. Baseline share of `distribution` covers the intent. | None. |
| 6.5 | **The snippet imports `useFlag` from `@ninetailed/experience.js-react`**, hardcoded, and shows the `{ value, status }` destructure with a `loading` guard. `useFlagWithManualTracking` offered as a second tab. | Docs `contentful-integration-guide` §11 and `implementation-examples` §10; `sdk-selection` (default to `@ninetailed/experience.js` for existing production projects, `@contentful/optimization` only for greenfield or on request); and `features/personalization/flagged-slot.tsx`, which already does exactly this. | Trivial — it is a template string. Revisit only if this repo migrates to `@contentful/optimization-react`. |
| 6.6 | **Jira is a stub or cut.** No integration; keep the button only if it is free. | Mock's own toast text is fictional (`NW-4821`, "Northwind Web"). | None. |
| 6.7 | **All four value formats are first-class from day one**: `JSON → Object`, `String → String`, `Number → Number`, `Boolean → Boolean`, as a lookup table in `nt-config.ts` used in both directions. The Personalization API supports every one of these data structures — `Object` is just the only one this space happens to contain. The scalar formats are the *cheaper* half of step 3 (a switch, a number input, a text input), so there is no reason to defer them. | The mock's own format control (`String` · `JSON` · `Number` · `Boolean`) and your confirmation that the API supports all data structures. | N/A — it is the design. |
| 6.8 | **Delete never deletes an entry.** If the flag is one component among several, remove it from `components` and update. If it is the entry's only component, the action is disabled with a tooltip pointing at the entry: removing the last flag means removing the experiment, which belongs in Contentful. | Least-destructive default; the mock has no confirm dialog for this and inventing a destructive one is worse than declining it. | Small — add a confirm modal and an `entry.unpublish`/`delete` call. |
| 6.9 | **Integer percentages only.** UI and storage: `pct/100`, exact for integers. Even split *displays* `Math.round((100/n)*10)/10` (so `33.3%`) but stores fractions re-derived to sum to exactly 1, with the remainder given to the baseline. | The mock's own `Math.round(pct)/100`; three variants is the realistic worst case and the display already shows a decimal the storage cannot hold. | Small, but touches the two conversion functions and the sum assertion — which is precisely why they are the only two places that convert. |
| 6.10 | **Created as a draft**, plus explicit copy that publishing is required for delivery and a `Publish now` secondary action on the success screen. | Docs: experiences must be published in the content source to be returned by the Experience API. Draft-by-default keeps the write to one call and avoids a half-configured experiment going live. | Trivial either way — it is one extra CMA call. |
| 6.11 | **`Learn about custom flags` links to the Contentful Personalization docs' custom-flag section**, not a bare `#`. If no canonical URL is confirmed, the link is removed rather than shipped dead. | An empty-state link that goes nowhere is worse than no link. | None. |
| 6.12 | **Space and environment come from `sdk.ids`.** Nothing in this app reads `NEXT_PUBLIC_CTF_*` or names an environment. The plan was written against `ace0ba6p9v98 / master` because that is what the MCP session authorises; that only affects where it is tested. | Project rule: never hardcode a Contentful environment. Inside an app the SDK already knows. | N/A. |

### The one thing left to observe, and it is not a blocker

Whether a scalar baseline is stored as `{ value: 42 }` — the same envelope as the object case — or
bare. The envelope is by far the likelier of the two: `baseline` and each entry of `variants` are
already `{ value: … }` wrappers around an object, and wrapping is what makes the shape uniform
across value types in the first place. Build for `{ value: <scalar> }`, and let the phase-9
round-trip test (write with the app → open the native Variants UI → edit natively → re-read) confirm
it for one String, one Number and one Boolean. If it turns out to be bare, that is one line in
`buildConfig` and one in `parseConfig`.
