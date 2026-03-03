# Compliance Review App

Automated compliance review for `topicDefinition` entries using a third-party scoring API.

## Files

```
compliance-review/
├── contentful-app-manifest.json   # App manifest with function
├── functions/
│   └── compliance-review-handler.ts  # Function code (edit this)
├── page.tsx                       # App UI entry
├── components/the-app.tsx         # App component
└── locations/config-screen.tsx    # Config UI
```

## Content Model Fields (already added to `topicDefinition`)

- `complianceStatus` - pending/approved/rejected/error
- `complianceScore` - Number 0-100
- `complianceNotes` - Text feedback
- `complianceRequestId` - External ID
- `complianceRequestedAt` / `complianceCompletedAt` - Dates
- `complianceRequestedForVersion` - Integer

## Setup

1. Create app definition in Contentful UI
2. Upload function code
3. Create App Action linking to the function
4. Create Workflow with "Compliance Review" step
5. Create Automation to trigger App Action on step entry

The function handler in `functions/compliance-review-handler.ts` is a template - customize it for your third-party API.
