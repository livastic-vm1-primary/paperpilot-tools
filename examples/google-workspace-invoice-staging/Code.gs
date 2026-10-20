/*
 * Copyright 2026 PaperPilot Tools — MIT-licensed original sample.
 * AI-assisted for ONE actual beneficial owner. No third-party API / no wallet.
 *
 * Gmail labeled PDF attachment -> Drive archive -> Sheets staging register.
 * Default: preview ONLY. Deliberately does NOT write Movimentos/SAGE books.
 * Manual explicit archive requires Script Property ALLOW_ARCHIVE_COMMIT=YES.
 *
 * Access is limited by the Google OAuth permissions granted to the installing
 * business owner. Only run on mail/files you own or have permission to use.
 */
var InvoiceIntake = (function () {
  "use strict";

  var HEADERS = ["sha256", "gmailMessageId", "archiveFileId", "status", "createdAtUTC"];
  var MAX_THREADS = 40;
  var MAX_SCAN_THREADS = 200;
  var MAX_SCAN_PDFS = 250;
  var MAX_FILES_PER_RUN = 25;
  var MAX_PDF_BYTES = 5 * 1024 * 1024;
  var DEFAULT_QUERY = "label:invoice-review has:attachment newer_than:30d";

  function settings() {
    var p = PropertiesService.getScriptProperties();
    var sheetId = String(p.getProperty("STAGING_SHEET_ID") || "").trim();
    var folderId = String(p.getProperty("ARCHIVE_FOLDER_ID") || "").trim();
    var allowCommit = String(p.getProperty("ALLOW_ARCHIVE_COMMIT") || "").trim();
    var query = String(p.getProperty("INVOICE_GMAIL_QUERY") || DEFAULT_QUERY).trim();
    if (!/^[A-Za-z0-9_-]{10,160}$/.test(sheetId) ||
        !/^[A-Za-z0-9_-]{10,160}$/.test(folderId)) {
      throw new Error("Set valid STAGING_SHEET_ID and ARCHIVE_FOLDER_ID in Script Properties.");
    }
    if (!query || query.length > 180 || !/\blabel:/.test(query) ||
        /[\r\n]/.test(query)) {
      throw new Error("Gmail query must be bounded and explicitly include a label:.");
    }
    return {sheetId: sheetId, folderId: folderId, query: query,
            allowCommit: allowCommit === "YES"};
  }

  function fingerprint(bytes) {
    var hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes);
    return hash.map(function (value) {
      var byte = (value + 256) % 256;
      return ("0" + byte.toString(16)).slice(-2);
    }).join("");
  }

  function registryRows(sheet) {
    var vals = sheet.getDataRange().getValues();
    if (!Array.isArray(vals) || vals.length < 1) {
      throw new Error("Staging sheet must contain the five exact header cells before running.");
    }
    if (vals.length > 10001) throw new Error("Registry >10,000 records: manual review required.");
    if (vals[0].length !== HEADERS.length ||
        vals[0].some(function (v, i) {return String(v) !== HEADERS[i];})) {
      throw new Error("Staging header mismatch; refusing to alter an existing workbook.");
    }
    var seen = {};
    vals.slice(1).forEach(function (row) {
      if (typeof row[0] === "string" && /^[a-f0-9]{64}$/.test(row[0])) {
        seen[row[0]] = true;
      }
    });
    return seen;
  }

  function findPdfAttachments(query) {
    var results = [];
    var metrics = {messages: 0, attachmentsSeen: 0, oversized: 0, notPdf: 0,
                   truncated: false};
    // Scan multiple Gmail pages so repeated manual runs can progress beyond
    // already archived documents. Only 25 NEW PDFs are written per run.
    // Never mark messages read or alter Gmail labels automatically.
    outer: for (var start = 0; start < MAX_SCAN_THREADS; start += MAX_THREADS) {
      var threads = GmailApp.search(query, start, MAX_THREADS);
      if (!Array.isArray(threads)) throw new Error("Unexpected Gmail search result.");
      for (var t = 0; t < threads.length; t++) {
        var messages = threads[t].getMessages();
        for (var m = 0; m < messages.length; m++) {
          metrics.messages++;
          var message = messages[m];
          var attachments = message.getAttachments({
            includeInlineImages: false, includeAttachments: true
          });
          for (var a = 0; a < attachments.length; a++) {
            if (results.length >= MAX_SCAN_PDFS) {
              metrics.truncated = true;
              break outer;
            }
            var attachment = attachments[a];
            metrics.attachmentsSeen++;
            var name = String(attachment.getName() || "");
            var mime = String(attachment.getContentType() || "").toLowerCase();
            if (!/\.pdf$/i.test(name) || mime !== "application/pdf") {
              metrics.notPdf++;
              continue;
            }
            var size = Number(attachment.getSize());
            if (!Number.isFinite(size) || size < 1 || size > MAX_PDF_BYTES) {
              metrics.oversized++;
              continue;
            }
            results.push({messageId: String(message.getId()),
                          attachment: attachment});
          }
        }
      }
      if (threads.length < MAX_THREADS) break;
    }
    return {items: results, metrics: metrics};
  }

  function _process(commit) {
    var config = settings();
    if (commit && !config.allowCommit) {
      throw new Error("Commit disabled. Set ALLOW_ARCHIVE_COMMIT to YES explicitly.");
    }
    var lock = null;
    if (commit) {
      lock = LockService.getScriptLock();
      if (!lock.tryLock(10000)) throw new Error("Another intake is running. No changes made.");
    }
    try {
      var workbook = SpreadsheetApp.openById(config.sheetId);
      var sheet = workbook.getSheetByName("InvoiceStaging");
      if (!sheet) throw new Error("Create a sheet named InvoiceStaging first.");
      var recorded = registryRows(sheet);
      var found = findPdfAttachments(config.query);
      var folder = commit ? DriveApp.getFolderById(config.folderId) : null;
      var out = {mode: commit ? "COMMIT" : "PREVIEW_ONLY",
                 scannedMessages: found.metrics.messages,
                 pdfCandidates: found.items.length,
                 duplicateDocuments: 0, newDocuments: 0,
                 archivedAndRegistered: 0, tooLarge: found.metrics.oversized,
                 otherAttachments: found.metrics.notPdf,
                 limitReached: found.metrics.truncated,
                 processingErrors: 0};
      // The digest of entire file content deduplicates forwarded and resent
      // identical PDFs even when Gmail message IDs differ.
      for (var i = 0; i < found.items.length; i++) {
        var item = found.items[i];
        try {
          var bytes = item.attachment.getBytes();
          if (bytes.length > MAX_PDF_BYTES || bytes.length < 1) {
            out.tooLarge++;
            continue;
          }
          var digest = fingerprint(bytes);
          if (recorded[digest]) {
            out.duplicateDocuments++;
            continue;
          }
          // Repeated runs skip earlier archived documents and process the
          // next 25 distinct PDFs rather than permanently starving an inbox.
          if (out.newDocuments >= MAX_FILES_PER_RUN) {
            out.limitReached = true;
            break;
          }
          // Also prevent duplicates within the current batch, including
          // a forwarded invoice attached to a different email.
          recorded[digest] = true;
          out.newDocuments++;
          if (!commit) continue;

          var archiveName = "invoice-" + digest + ".pdf";
          var iterator = folder.getFilesByName(archiveName);
          var file;
          if (iterator.hasNext()) {
            // Recover from interrupted post-Drive, pre-Sheet runs.
            file = iterator.next();
          } else {
            file = folder.createFile(
              item.attachment.copyBlob().setName(archiveName)
            );
          }
          sheet.appendRow([digest, item.messageId, file.getId(),
                           "NEEDS_HUMAN_REVIEW", new Date().toISOString()]);
          out.archivedAndRegistered++;
        } catch (err) {
          // Do not expose invoice file names, addresses or file contents in
          // console/log messages. Failed items are safe to retry later.
          out.processingErrors++;
        }
      }
      return out;
    } finally {
      if (lock) lock.releaseLock();
    }
  }

  return {
    preview: function () {return _process(false);},
    archive: function () {return _process(true);},
    headers: function () {return HEADERS.slice();},
    fingerprint: fingerprint
  };
})();

// Explicit, intentionally different names: no installed time trigger.
// First call PREVIEW on a TEST WORKSPACE, review counts, then manually
// set Script Property ALLOW_ARCHIVE_COMMIT=YES before the commit function.
function previewInvoiceIntake() {return InvoiceIntake.preview();}
function archiveInvoicesToStaging() {return InvoiceIntake.archive();}
