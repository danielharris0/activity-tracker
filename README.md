# Activity Progress Tracker

Local web app for logging activity progress to a Google Sheet and visualising it with a Bayesian estimator.

## Getting started

```
npm install
npm run dev
```

On first run, point the app at a Google Sheet you own. The app will create the two tabs below if they don't exist.

## Google Sheets schema

The app expects (or creates) two tabs. Column order matters: rows are appended positionally. Don't reorder, rename, or insert columns.

### Tab: `Activities`

| Column                    | Notes                                      |
| ------------------------- | ------------------------------------------ |
| `id`                      | nanoid, 8 chars                            |
| `name`                    | display name                               |
| `description`             | free text                                  |
| `tags`                    | comma-separated                            |
| `measurementType`         | `count` or `duration`                      |
| `typicalAttemptDuration`  | seconds; only meaningful for `duration`    |

### Tab: `Progress`

| Column                     | Notes                                                             |
| -------------------------- | ----------------------------------------------------------------- |
| `activityId`               | foreign key into `Activities.id`                                  |
| `date`                     | `YYYY-MM-DD`                                                      |
| `time`                     | `HH:mm`                                                           |
| `value`                    | integer for `count`; `HH:mm:ss` for `duration`                    |
| `bestOfType`               | `attempts` or `duration` (required)                               |
| `bestOfValue`              | integer: attempt count, or total seconds of the session           |
| `bestOfTypicalDuration`    | seconds; only set when `bestOfType=duration` and activity has none |

All writes use `valueInputOption: RAW`. Progress rows can be edited directly in the sheet.

## Commands

- `npm run dev` — dev server at http://localhost:5173
- `npm run build` — type-check + production build
- `npm run lint` — ESLint
- `npx tsc --noEmit` — type-check only
