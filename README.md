# Recruiting Challenge - RAG mit Next.js & Supabase

## Aufgabenstellung (Original)
Ziel:
Entwickle ein kleines End-to-End-Feature auf Basis eines Retrieval-Augmented-Generation-Systems (RAG).
Das System soll auf einer eigenen Wissensbasis (z. B. Docs, FAQs, Produktdaten) Fragen beantworten koennen
und ueber ein einfaches Frontend interaktiv nutzbar sein.

Stack (vorgegeben, minimal):
- Backend / API: Next.js (Route Handler / API Routes)
- Persistenz: Supabase (Postgres + Vector Store / pgvector o. ae.)
- Frontend: Next.js (React)
- Andere Libraries/Services sind erlaubt, solange Next.js und Supabase die Basis bilden.

Leitplanken (minimal):
- End-to-End Interface: Es gibt ein einfach nutzbares UI (Webseite), ueber das ein User eine Frage stellen
  und eine Antwort sehen kann.
- RAG-Idee: Antworten stutzen sich auf eine von dir gewaehlte Wissensbasis. Umsetzung von Embeddings,
  Retrieval und LLM ist frei.
- Persistenz: Daten sollen in Supabase gespeichert werden (z. B. Dokumente, Chunks, Embeddings).
- README: Kurzbeschreibung des Problems, grobe Architektur, Setup/Run-Anleitung und Design-Entscheidungen.
- Optional: Trennung mehrerer Workspaces/Mandanten im Datenmodell ist nice to have, aber kein Muss.

Zeitrahmen:
- Geplanter Zeitaufwand: ca. 2-4 Stunden.
- Fokus auf nachvollziehbarem Loesungsansatz, nicht auf Perfektion.

Abgabe:
- Repo-Link (z. B. GitHub/GitLab) oder ZIP.
- README (siehe oben).
- Optional: Link zu einem Deployment (z. B. Vercel + Supabase-Projekt).

## Kurzbeschreibung (Loesung)
Ein kleines End-to-End RAG-Feature auf Basis von Next.js und Supabase.
Die App erlaubt es, Wissen (Text oder Dateien) zu indexieren und darauf basierend Fragen zu stellen.
Als LLM wird die ChatGPT API (OpenAI Chat Completions) verwendet.

Repo-Struktur:
- `everlast-rag/`: Next.js App (UI + API Routes + Server Actions)
- `database/setup.sql`: Supabase/Postgres Schema inkl. pgvector, RLS und RPCs

## Features (Umsetzung)
- Auth: Registrierung, Login, Logout ueber Supabase Auth.
- Profile:
  - Auto-Profil via DB-Trigger bei Signup (Fallback: Upsert in Settings).
  - OpenAI API Key pro User (Challenge-only).
  - Editierbarer System-Prompt.
- Wissensbasis:
  - Text-Paste Ingest (Chunking + Embeddings + Speicherung).
  - Datei-Upload (.txt, .md, .pdf; max 1MB) inkl. PDF-Text-Extraktion.
  - Ingestion-Status pro Dokument, Dokumentliste, Loeschen.
- RAG Chat:
  - Chat-Sessions mit Titel (auto-title beim ersten Prompt).
  - Titel ist editierbar (PATCH /api/chat/session).
  - Retrieval via pgvector (RPC `match_chunks`), Top-K konfigurierbar (UI nutzt 6).
  - Quellen/Chunk-Snippets in der Antwort (Zitationen).
  - Token- und Kostenanzeige pro Session.
  - Modell-Auswahl im UI (Whitelist ueber `chat-models.json`).
- Multi-Tenant Isolation ueber `owner_id` + RLS-Policies.
- Health-Check: `/api/ping`.

## Architektur (High-Level)
```
Browser
  -> Next.js App (UI + Server Actions + API Routes)
     -> Supabase (Auth + Postgres + pgvector)
     -> OpenAI API (ChatGPT API + Embeddings)
```

RAG-Ablauf:
1) Ingest: Text/PDF -> Chunking -> Embeddings -> `document_chunks`.
2) Query: Frage -> Query-Embedding -> `match_chunks` -> Kontext-Prompt -> LLM.
3) Antwort + Quellen werden als Message gespeichert und im UI gerendert.

## Modelle und Konfiguration
- Die erlaubten Modelle und Pricing-Daten liegen in `everlast-rag/lib/chat-models.json`.
- Backend und UI lesen diese Liste, die guenstigste Option ist Default.
- Anpassung der Datei ermoeglicht neue Modelle, Labels oder Pricing ohne Codeaenderung.

## Setup / Run

### 1) Supabase Projekt
1. Neues Supabase Projekt anlegen.
2. In der SQL Console `database/setup.sql` ausfuehren.
3. Optional (Demo): In Auth Settings `confirm_email` deaktivieren.

### 2) Environment
Erstelle `everlast-rag/.env.local`:
```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # optional (aktuell nicht genutzt)
  CHATGPT_API_KEY=...            # Fallback, wenn in /settings kein User-Key gesetzt ist
```
Hinweis: Es werden die Legacy anon/service_role Keys verwendet, um das Setup schlank zu halten.

### 3) App starten
```
cd everlast-rag
npm install
npm run dev
```
Dann http://localhost:3000 oeffnen, registrieren, OpenAI Key in `/settings` setzen,
Wissen ingestieren und im Chat testen.

## Datenmodell (Supabase)
Kernauswahl aus `database/setup.sql`:
- `profiles`: optionale App-Profile + OpenAI Key + System-Prompt.
- `documents`: Dokumente inkl. Status, Quelle, raw_text.
- `document_chunks`: Chunk-Text + Embeddings (vector(1536)).
- `chat_sessions`: Chat-Sessions je User.
- `messages`: Chat-Historie inkl. Metadata (Quellen, Usage).
- RPC: `match_chunks(query_embedding, match_count)` fuer Similarity Search.
- Trigger: `handle_new_user` legt Profile bei Signup an.

## API Endpoints (Auszug)
- `POST /api/ingest`: Text ingestieren.
- `POST /api/ingest-file`: Datei ingestieren (.txt/.md/.pdf).
- `POST /api/chat`: RAG-Antwort erzeugen.
- `PATCH /api/chat/session`: Chat-Titel aktualisieren.
- `GET /api/ping`: Health-Check.

## Designentscheidungen (Stichpunkte)
- Supabase RLS + `owner_id` in allen Tabellen sorgt fuer klare Mandantentrennung.
- `match_chunks` als RPC kapselt Similarity Search serverseitig und respektiert RLS.
- Chunking ist bewusst simpel und deterministisch (Absatz-basiert, max 900 Zeichen),
  damit das System leicht nachvollziehbar bleibt.
- ChatGPT API (OpenAI Chat Completions) fuer Antworten, Embeddings via `text-embedding-3-small`.
- OpenAI Key wird pro User in `profiles` gespeichert (Challenge-only, nicht prod-ready).
- System-Prompt ist pro User konfigurierbar; Kontext wird serverseitig angehaengt.
- Chat-Historie wird persistent gespeichert (Sessions + Messages), inkl. Quellen-Metadata.
- PDF-Parsing erfolgt serverseitig (pdf-parse) mit Groessenlimit, um Failure Cases klein zu halten.
- UI zeigt Tokenverbrauch und Kosten, berechnet aus `chat-models.json`.
