---
title: Auto-Archive Requested Emails
type: imap_email:new_email
pattern: "contains(subject, 'archive this') || contains(subject, 'Archive this') || contains(subject, 'Archive This') || contains(subject, 'ARCHIVE THIS')"
model: claude-haiku-4-5
effort: low
enabled: true
notification: notify
notificationLevel: info
notifyUsers:
  - all
pushMessage: false
---

A new email was received that contains "archive this" in the subject line. Please archive this email using the archive_email tool.

Here is the email:

{{details}}

Instructions:
1. Use the `imap_email_archive_email` tool with the `uid` from the email details above to archive this email
2. Confirm what you did in a brief response
