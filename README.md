# Greylist
A search engine experiment


---

## Required `.env` variables

For anyone thinking of forking this project:

```text
# PostgreSQL connection URL
DATABASE_URL

# A crawler shouldn't arrive at servers wearing a fake moustache and no name
# tag. Send a descriptive User-Agent with a way to identify/contact the operator.
CRAWLER_USER_AGENT="GreylistBot/0.1 (+[your project/contact URL here])"

```

TODO: Respect `robots.txt`


---

Okay, for v0.1: 

Rules of the system:

PRIMARY SOURCES are manually approved URL scopes. Their eligible pages are crawled and indext. 

CITED PAGES are individual URLs linked directly from PRIMARY sources. They are fetched and indexed, however, their outbound links do not propagate trust. 

UNKNOWN pages are not indexed

EXCLUDED SOURCES are excluded from normal results but *can* be searched when explicitly requested. (Maybe with a checkbox that says: "include forums," "include social media", "include Reddit", etc.)

SUPPRESSED SOURCES are never fetchecd, indexed, cached, or returned. 

TRUST and RELEVANCE are seperate. Truest determines which corpus a document belongs to. BM25 or similar determines ordering within that corpus. 

Every CITED result retains provenance, including which PRIMARY page linked to it. 

PRIMARY status is *scoped* so we can approve an entire domain, path, or individual page, (rather than pretending that an entire domain means "true.")

PRIMARY sources can have subject classifications, eventually allowing expertise to be contextual. 

NO AUTOMATED PROCESS can promote a site to PRIMARY. PRIMARY requires a HUMAN DECISION. 

HUMANS
══════════════════════════════

User ──────reviews──────► SourcePolicy


THE WEB
══════════════════════════════

Page ──────Link─────────► Page


THE CRAWLER
══════════════════════════════

CrawlJob
   │
   └──── CrawlAttempt
             │
             └────► Page