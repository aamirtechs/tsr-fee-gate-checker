# TSR Fee Gate Checker
Live page: https://aamirtechs.github.io/tsr-fee-gate-checker/

Flag any debt relief fee taken before the FTC Telemarketing Sales Rule three-part test is met for that debt, and check state fee caps on the correct basis. In a high volume debt relief operation this check is often done by sampling spreadsheets, if at all. This tool runs it per debt, in the browser, on synthetic or exported rows.

Disclaimer: This is a compliance-support tool, not legal advice. Verify the cap table and every flagged row with qualified counsel before acting.

## Features
- Per-debt check of the FTC Telemarketing Sales Rule three-part test: settled, written agreement agreed to, and at least one payment made
- Editable per-state fee-cap table in JSON, with the cap basis kept explicit: percent of enrolled debt or percent of savings, never conflated
- Flags fee before settlement, fee before agreement, fee before first payment, fee over cap, and missing data, with the exact failed conditions per debt
- Results table with a summary, plus a downloadable audit CSV
- Synthetic sample data only, with a prominent not-legal-advice disclaimer
## How it works
Paste or upload a CSV with one row per debt, including settlement status, agreement and first payment dates, fee amount and fee date, and state. Edit the per-state cap table in JSON, keeping each cap basis explicit. The tool evaluates every debt, shows pass or fail with the exact failed conditions, and exports an audit CSV. It runs entirely in the browser.

## Privacy
Runs 100% in your browser. Your files never leave this device, nothing is uploaded,
and there is no tracking.

## Development
Core logic lives in `src/logic.js` and is shared by the page and the tests.
Run the tests with `npm test`.

## License
MIT, Copyright 2026 Amir Hussain.
