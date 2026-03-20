const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// === CONFIGURATION ===
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const ICAL_FILE = path.join(DATA_DIR, 'calendar.ics');
const ICAL_PATH = '/calendar.ics';
const WEBHOOK_PATH = '/api/calendar-sync';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load persisted data on startup
let calendarEvents = [];
let lastSyncedAt = null;

try {
  if (fs.existsSync(EVENTS_FILE)) {
    const saved = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
    calendarEvents = saved.events || [];
    lastSyncedAt = saved.syncedAt || null;
    console.log(`Loaded ${calendarEvents.length} events from disk`);
  }
} catch (err) {
  console.error('Failed to load saved events:', err.message);
}

// ---- iCal generation ----

function escapeIcal(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatIcalDate(isoString) {
  // Convert "2026-03-17T14:30:00.000Z" -> "20260317T143000Z"
  return isoString.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function formatLocalDate(isoString) {
  // Convert "2026-03-17T14:30:00-04:00" -> "20260317T143000" (no Z, used with TZID)
  // Strip UTC offset and Z BEFORE removing hyphens/colons, otherwise the offset's
  // minus sign gets removed and the digits linger (e.g. "0400" left on the end).
  return isoString
    .replace(/[+-]\d{2}:\d{2}$/, '')  // strip UTC offset first (e.g. -04:00)
    .replace(/Z$/, '')
    .replace(/\.?\d{3}$/, '')          // strip optional milliseconds
    .replace(/[-:]/g, '');             // then compact to iCal format
}

function generateUid(eventId) {
  const hash = crypto.createHash('md5').update(eventId).digest('hex');
  return `${hash}@calendar-bridge`;
}

function buildIcal(events) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CalendarBridge//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Work Calendar (Synced)`,
  ];

  if (lastSyncedAt) {
    lines.push(`X-LAST-SYNCED:${lastSyncedAt}`);
  }

  for (const event of events) {
    lines.push('BEGIN:VEVENT');

    // Use iCalUID from Google if available, otherwise generate one
    lines.push(`UID:${event.iCalUID || generateUid(event.id)}`);
    lines.push(`SUMMARY:${escapeIcal(event.title)}`);

    // Date/time handling
    if (event.allDay) {
      const startDate = event.start.slice(0, 10).replace(/-/g, '');
      const endDate = event.end.slice(0, 10).replace(/-/g, '');
      lines.push(`DTSTART;VALUE=DATE:${startDate}`);
      lines.push(`DTEND;VALUE=DATE:${endDate}`);
    } else if (event.timeZone) {
      // Use TZID when we have timezone info (more accurate than UTC)
      lines.push(`DTSTART;TZID=${event.timeZone}:${formatLocalDate(event.start)}`);
      lines.push(`DTEND;TZID=${event.timeZone}:${formatLocalDate(event.end)}`);
    } else {
      lines.push(`DTSTART:${formatIcalDate(event.start)}`);
      lines.push(`DTEND:${formatIcalDate(event.end)}`);
    }

    // Description — append Meet link and conference details for easy access
    let desc = event.description || '';
    if (event.meetLink) {
      desc += (desc ? '\\n\\n' : '') + '--- Join Meeting ---\\n' + event.meetLink;
    }
    if (event.conference?.entryPoints) {
      for (const ep of event.conference.entryPoints) {
        if (ep.type === 'phone' && ep.uri) {
          desc += '\\nPhone: ' + ep.uri;
          if (ep.pin) desc += ' PIN: ' + ep.pin;
        }
      }
    }
    if (desc) {
      lines.push(`DESCRIPTION:${escapeIcal(desc)}`);
    }

    // Location
    if (event.location) {
      lines.push(`LOCATION:${escapeIcal(event.location)}`);
    }

    // URL — Google Meet link or the calendar event link
    if (event.meetLink) {
      lines.push(`URL:${event.meetLink}`);
    } else if (event.hangoutLink) {
      lines.push(`URL:${event.hangoutLink}`);
    } else if (event.htmlLink) {
      lines.push(`URL:${event.htmlLink}`);
    }

    // Google Meet conference as X-GOOGLE properties
    if (event.meetLink) {
      lines.push(`X-GOOGLE-MEET:${event.meetLink}`);
    }
    if (event.conference?.conferenceId) {
      lines.push(`X-GOOGLE-CONFERENCE-ID:${event.conference.conferenceId}`);
    }

    // Status
    if (event.status) {
      const statusMap = {
        confirmed: 'CONFIRMED',
        tentative: 'TENTATIVE',
        cancelled: 'CANCELLED',
      };
      lines.push(`STATUS:${statusMap[event.status] || 'CONFIRMED'}`);
    }

    // Transparency (busy/free)
    if (event.transparency === 'transparent') {
      lines.push('TRANSP:TRANSPARENT');
    } else {
      lines.push('TRANSP:OPAQUE');
    }

    // Visibility
    if (event.visibility && event.visibility !== 'default') {
      const visMap = { public: 'PUBLIC', private: 'PRIVATE', confidential: 'CONFIDENTIAL' };
      if (visMap[event.visibility]) {
        lines.push(`CLASS:${visMap[event.visibility]}`);
      }
    }

    // Organizer
    if (event.organizer) {
      const cn = event.organizer.name ? `;CN=${escapeIcal(event.organizer.name)}` : '';
      lines.push(`ORGANIZER${cn}:mailto:${event.organizer.email}`);
    }

    // Attendees
    if (event.attendees && event.attendees.length > 0) {
      for (const attendee of event.attendees) {
        const parts = [];
        if (attendee.name) parts.push(`CN=${escapeIcal(attendee.name)}`);
        if (attendee.status) {
          const partstatMap = {
            accepted: 'ACCEPTED',
            declined: 'DECLINED',
            tentative: 'TENTATIVE',
            needsAction: 'NEEDS-ACTION',
          };
          parts.push(`PARTSTAT=${partstatMap[attendee.status] || 'NEEDS-ACTION'}`);
        }
        if (attendee.optional) {
          parts.push('ROLE=OPT-PARTICIPANT');
        } else {
          parts.push('ROLE=REQ-PARTICIPANT');
        }
        if (attendee.resource) {
          parts.push('CUTYPE=ROOM');
        }
        const params = parts.length > 0 ? ';' + parts.join(';') : '';
        lines.push(`ATTENDEE${params}:mailto:${attendee.email}`);
      }
    }

    // Attachments
    if (event.attachments && event.attachments.length > 0) {
      for (const att of event.attachments) {
        const fmttype = att.mimeType ? `;FMTTYPE=${att.mimeType}` : '';
        const title = att.title ? `;X-FILENAME=${escapeIcal(att.title)}` : '';
        lines.push(`ATTACH${fmttype}${title}:${att.fileUrl}`);
      }
    }

    // Timestamps
    if (event.created) {
      lines.push(`CREATED:${formatIcalDate(event.created)}`);
    }
    if (event.updated) {
      lines.push(`LAST-MODIFIED:${formatIcalDate(event.updated)}`);
    }
    lines.push(`DTSTAMP:${formatIcalDate(new Date().toISOString())}`);

    // Color as category hint
    if (event.colorId) {
      lines.push(`X-GOOGLE-COLOR-ID:${event.colorId}`);
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  // iCal spec: lines joined by CRLF
  return lines.join('\r\n') + '\r\n';
}

// ---- HTTP server ----

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // --- Webhook: receive calendar data from Apps Script ---
  if (req.method === 'POST' && url.pathname === WEBHOOK_PATH) {
    try {
      const body = await readBody(req);
      const data = JSON.parse(body);

      calendarEvents = data.events || [];
      lastSyncedAt = data.syncedAt || new Date().toISOString();

      // Persist events to disk
      fs.writeFileSync(EVENTS_FILE, JSON.stringify({
        syncedAt: lastSyncedAt,
        events: calendarEvents,
      }, null, 2));

      // Pre-generate the ical file
      const ical = buildIcal(calendarEvents);
      fs.writeFileSync(ICAL_FILE, ical);

      console.log(
        `[${new Date().toISOString()}] Synced ${calendarEvents.length} events (saved to disk)`
      );

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          received: calendarEvents.length,
        })
      );
    } catch (err) {
      console.error('Webhook error:', err.message);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }
    return;
  }

  // --- iCal feed: serve the .ics file ---
  if (req.method === 'GET' && url.pathname === ICAL_PATH) {
    const ical = buildIcal(calendarEvents);
    res.writeHead(200, {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="calendar.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(ical);
    return;
  }

  // --- JSON feed: raw event data for AI consumption ---
  if (req.method === 'GET' && url.pathname === '/api/events.json') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(JSON.stringify({
      syncedAt: lastSyncedAt,
      eventCount: calendarEvents.length,
      events: calendarEvents,
    }, null, 2));
    return;
  }

  // --- Health / status ---
  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        events: calendarEvents.length,
        lastSyncedAt,
        /*endpoints: {
          webhook: WEBHOOK_PATH,
          ical: ICAL_PATH,
          json: '/api/events.json',
        },*/
      })
    );
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Calendar bridge running on http://localhost:${PORT}`);
  console.log(`  Webhook:    POST ${WEBHOOK_PATH}`);
  console.log(`  iCal feed:  GET ${ICAL_PATH}`);
  console.log(`  JSON feed:  GET /api/events.json`);
  console.log(`  Status:     GET /`);
});