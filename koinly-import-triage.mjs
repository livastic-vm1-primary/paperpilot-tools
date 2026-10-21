'use strict';
// Non-personal, static triage for common Koinly import symptoms.
// No wallet, uploads, tax calculations, API access or automatic edits.
export const plans = Object.freeze({
  skipped: Object.freeze({
    heading: 'Rows were skipped · 일부 행이 건너뛰어짐',
    explanation: 'A skipped count is not proof of missing data. Review the specific reason in the Koinly import summary before changing any source file.',
    steps: Object.freeze([
      'Open the original Koinly import summary and record the reason for each skipped class (duplicate, internal exchange transfer, already imported, or another reason).',
      'Compare one known real transaction against the original export and the imported wallet; do not upload a second overlapping file just to force a row count.',
      'If a specific original transaction is genuinely absent, inspect that source and use Koinly support or the native integration first. Keep your original export unchanged.'
    ]),
    source: 'https://support.koinly.io/en/articles/9490012-errors-when-importing-transactions',
    sourceTitle: 'Koinly: import errors and skipped transactions',
    offer: 'If one unsupported CSV header needs a manual mapping, a separate 5 Base USDC scope can be discussed in writing.'
  }),
  duplicates: Object.freeze({
    heading: 'API + CSV duplicates · API와 CSV 중복 의심',
    explanation: 'Overlapping API and CSV imports may describe the same underlying transaction differently, so exact-match duplicate detection may not catch them.',
    steps: Object.freeze([
      'List the source methods and covered UTC date ranges for one wallet. Check whether both API and CSV, or orders and fills, cover the same trade.',
      'Compare original reference IDs, currencies, amounts, timezones, and import provenance before treating two rows as duplicates. Partial fills can share an order ID.',
      'Follow Koinly guidance to avoid overlapping imports going forward. Do not mass-delete transactions or claim a match based on amounts alone.'
    ]),
    source: 'https://support.koinly.io/en/articles/9789363-how-duplicate-detection-works-in-koinly',
    sourceTitle: 'Koinly: exact-match duplicate limits',
    offer: 'A narrow one-source 10-row structural mapping review is available for inquiry; cross-wallet tax reconciliation is not included.'
  }),
  missing: Object.freeze({
    heading: 'Missing purchase history · 취득 기록 누락 경고',
    explanation: 'This warning signals incomplete or inconsistent imported history. An unknown purchase price must never be guessed or silently treated as verified.',
    steps: Object.freeze([
      'Verify that relevant exchange, wallet and earlier-year records are included. Look for missing acquisitions, transfers, fee rows or wrong timezone.',
      'Compare original source events with the relevant wallet balance and transaction chronology. A warning hidden by a dust-value threshold is not a fixed record.',
      'Use Koinly official troubleshooting or an appropriately qualified tax professional for cost-basis conclusions. Keep a written list of facts still needing evidence.'
    ]),
    source: 'https://support.koinly.io/en/articles/9490037-missing-purchase-history-for-xyz',
    sourceTitle: 'Koinly: missing purchase history',
    offer: 'We can optionally quote a source-evidence exception checklist. We do not calculate, invent or certify tax basis.'
  }),
  'strike-2026': Object.freeze({
    heading: 'Strike iOS CSV "Unknown file" · 2026년 10월 보고',
    explanation: 'An independent Koinly user reported an October 2026 Strike iOS CSV rejected as "Unknown file". This is one user report, not proof of a universally changed Strike schema. Koinly lists Strike as a supported CSV integration. Koinly expressly advises contacting its support rather than altering a supported export when it asks you to map an unknown file.',
    steps: Object.freeze([
      'Save the original Strike iOS export unchanged and note the exact export date, app version, import warning and Koinly wallet selected. First check that you exported the supported account-statement file as Koinly documents; do not import the same history twice.',
      'If Koinly labels that original Strike file "Unknown file", contact Koinly support through the official application/chat. Provide a sanitized header-only screenshot or column-name list if support asks, without account numbers, amounts, addresses or a live full transaction CSV in a public forum.',
      'Wait for Koinly to confirm whether its Strike integration needs a format update. Do NOT blindly rename headers, fabricate UTC offsets, infer buy/sell directions, delete existing transactions or convert supported CSV to a Koinly template before getting that guidance.'
    ]),
    source: 'https://support.koinly.io/en/articles/9885319-how-to-modify-csv-files-to-import-them-to-koinly',
    sourceTitle: 'Koinly official: supported CSV + "Unknown file" = contact support before reformatting',
    offer: 'Free support-first route. A separate 5 Base USDC unsupported-source header review is NOT a recommended first step for supported Strike exports. No paid buyer, automatic mapping, confirmed October schema change or repair is claimed.'
  }),
  rejected: Object.freeze({
    heading: 'File rejected / unrecognized · 파일 인식 실패',
    explanation: 'A rejected file is different from a successfully imported file with skipped rows. Check format and source before any conversion.',
    steps: Object.freeze([
      'Look at the precise Koinly import error and confirm the source exchange/export type. If Koinly supports that export natively, prefer its documented original format.',
      'If the exporter is unsupported, inspect column headers and Koinly official Simple, Trades or Universal templates. Keep the exact original file intact.',
      'Try the separate free, browser-local manual header mapper only if the source values genuinely supply the required fields. It must not infer missing trades or UTC offsets.'
    ]),
    source: 'https://support.koinly.io/en/articles/9490012-errors-when-importing-transactions',
    sourceTitle: 'Koinly: rejected, invalid and unrecognized files',
    offer: 'One explicitly authorized, up-to-10-row header mapping is an optional separately agreed 5 native Base USDC service.'
  })
});
export const validIds = Object.freeze(Object.keys(plans));
export function getPlan(id) { return Object.hasOwn(plans, id) ? plans[id] : plans.skipped; }
export function safeId(id) { return validIds.includes(id) ? id : 'skipped'; }
