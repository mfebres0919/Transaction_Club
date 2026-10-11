/* ==========================================================================
   CLOSING GIFT REQUESTS → GOOGLE SHEET + EMAIL
   Lives in the Google Sheet (Extensions → Apps Script), not on the website.
   The homepage gift form (index.html #closing-gift, javascript/script.js)
   posts here. Each request:
     1. adds a row to the "Gift Requests" tab with Status "New"
     2. emails the details to NOTIFY_EMAILS

   Setup (once per Sheet):
     1. Paste this file into Extensions → Apps Script, save.
     2. Run setup() from the toolbar and allow access when Google asks.
        It creates the tab, headers and the Status dropdown.
     3. Deploy → New deployment → Web app.
          Execute as: Me    Who has access: Anyone
        Copy the Web app URL into GIFT_FORM_URL in javascript/script.js.
   After editing this code: Deploy → Manage deployments → Edit (pencil) →
   Version: New version → Deploy. The URL stays the same.
   ========================================================================== */

// Who gets an email for each request. TESTING: Miguelle only.
// At handoff, switch to Peter and Jiang.
const NOTIFY_EMAILS = ['miguelle@migsflow.com'];

const SHEET_NAME = 'Gift Requests';
const HEADERS = ['Submitted', 'Agent name', 'Mailing address', 'Listing address', 'Status', 'Notes'];
const STATUSES = ['New', 'Hand-delivered', 'Mailed', 'Done'];
const STATUS_COLUMN = 5;

/* Creates the tab, bold frozen headers and the Status dropdown. Safe to run again. */
function setup() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = book.getSheetByName(SHEET_NAME) || book.insertSheet(SHEET_NAME);

  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#1f3a5f').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidths(2, 3, 260);
  sheet.setColumnWidth(STATUS_COLUMN, 140);
  sheet.setColumnWidth(6, 260);

  const dropdown = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build();
  sheet.getRange(2, STATUS_COLUMN, sheet.getMaxRows() - 1, 1).setDataValidation(dropdown);
}

/* Visiting the Web app URL in a browser shows this: a quick "is it live?" check. */
function doGet() {
  return ContentService.createTextOutput('Closing gift form is connected.');
}

function doPost(e) {
  const form = (e && e.parameter) || {};

  // Honeypot: real visitors never see or fill this field
  if (form.company) return reply({ ok: true });

  const request = {
    name: clean(form.name),
    address: clean(form.address),
    listing: clean(form.listing_address),
  };
  if (!request.name || !request.address || !request.listing) {
    return reply({ ok: false, error: 'Missing name, mailing address or listing address.' });
  }

  // One at a time, so two requests at once can't land on the same row
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Run setup() first.');
    sheet.appendRow([new Date(), safe(request.name), safe(request.address), safe(request.listing), 'New', '']);
  } finally {
    lock.releaseLock();
  }

  try {
    notify(request);
  } catch (error) {
    // The row is saved either way; the email is a bonus
    console.error('Email failed', error);
  }
  return reply({ ok: true });
}

function notify(request) {
  const sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  const row = (label, value) =>
    `<p style="margin:0 0 14px;"><strong style="color:#141414;">${label}</strong><br>${escape(value)}</p>`;

  MailApp.sendEmail({
    to: NOTIFY_EMAILS.join(','),
    subject: `New closing gift request – ${request.name}`,
    name: 'The Transaction Club Website',
    body: `Agent name\n${request.name}\n\nMailing address\n${request.address}\n\nListing address\n${request.listing}\n\nGift sheet: ${sheetUrl}`,
    htmlBody: `
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#3d3a35;max-width:520px;">
        <h2 style="margin:0 0 18px;font-size:20px;color:#1f3a5f;">New closing gift request</h2>
        ${row('Agent name', request.name)}
        ${row('Mailing address', request.address)}
        ${row('Listing address', request.listing)}
        <p style="margin:22px 0 0;"><a href="${sheetUrl}" style="color:#1f3a5f;font-weight:bold;">Open the gift sheet</a> to update its status.</p>
      </div>`,
  });
}

/* ---------- Helpers ---------- */

const clean = (value) => String(value || '').trim().slice(0, 500);

// Stops text that starts with = + - @ from running as a spreadsheet formula
const safe = (value) => (/^[=+\-@]/.test(value) ? "'" + value : value);

const escape = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const reply = (data) => ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
