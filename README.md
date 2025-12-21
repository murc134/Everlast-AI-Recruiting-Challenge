# Recruiting Challenge – RAG mit Next.js & Supabase

## Aufgabe
Entwickle ein kleines End-to-End-Feature auf Basis eines Retrieval-Augmented-Generation-Systems (RAG).  
Das System soll auf einer eigenen Wissensbasis (z. B. Docs, FAQs, Produktdaten) Fragen beantworten können und über ein einfaches Frontend interaktiv nutzbar sein.

### Stack (vorgegeben, minimal)
- **Backend / API:** Next.js (Route Handler / API Routes)
- **Persistenz:** Supabase (Postgres + Vector Store / pgvector o. ä.)
- **Frontend:** Next.js (React)
- **Weitere Libraries/Services:** erlaubt, solange Next.js und Supabase die Basis bilden

### Leitplanken (minimal)
- **End-to-End Interface:** Einfaches UI (Webseite), über das ein User eine Frage stellen und eine Antwort sehen kann
- **RAG-Idee:** Antworten basieren auf einer frei wählbaren Wissensbasis (z. B. Dokumente, FAQ, Produktinfos). Umsetzung von Embeddings, Retrieval und LLM ist frei
- **Persistenz:** Speicherung der Daten in Supabase (z. B. Dokumente, Chunks, Embeddings oder sinnvoll für dein Design)
- **README:** Kurzbeschreibung des Problems, grobe Architektur, Setup-/Run-Anleitung sowie Stichpunkte zu Design-Entscheidungen
- **Optional:** Trennung mehrerer „Workspaces“ oder „Mandanten“ im Datenmodell (nice to have)

### Zeitrahmen
Geplanter Zeitaufwand: ca. 2–4 Stunden.  
Fokus auf einem nachvollziehbaren Lösungsansatz, nicht auf Vollständigkeit oder Perfektion.

### Abgabe
- Repo-Link (z. B. GitHub/GitLab) oder ZIP
- README (siehe oben)
- Optional: Link zu einem Deployment (z. B. Vercel + Supabase-Projekt)

##Setup

###Windows

Ich habe das ganze unter Windows ohne WSL2 implementiert und später über Vercel gehostet

1) Installie Node.js v24 LTS: https://nodejs.org/en/download/archive/v24.12.0 aus den Installer Packages
2) Installiere Python 3.9.13

Powershell:
> node -v
v24.12.0
> npm -v
11.6.2
> python --version
Python 3.9.13

###Supabase (Nur bei verwendung einer eigenene Datenbank)

####Project anlegen

Project Name: Everlast AI Recruiting Challenge 
Database password: Everlast_ist_mein_neuer_Arbeitgeb3r!

####Project Settings

Editiere die Datei .env . 

Die folgenden Werte findest du in deinem Supabase Projekt unter "Project Settings"

NEXT_PUBLIC_SUPABASE_URL => unter dem Reiter "Data API" deine URL (RESTful endpoint for querying and managing your database)
NEXT_PUBLIC_SUPABASE_ANON_KEY => unter dem Reiter "API Keys" "Legacy anon, service_role API keys" wählen, dann das unter "anon public"
SUPABASE_SERVICE_ROLE_KEY => unter dem Reiter "API Keys" "Legacy anon, service_role API keys" wählen, dann das unter "service_role secret"

Verwendung von anon/service_role-Schlüssel von Supabase
Wir haben für die Challenge bewusst die alten anon/service_role-Schlüssel von Supabase verwendet, um die Einrichtung minimal zu halten und sie an die aktuellen Supabase-RAG-Beispiele anzupassen. Die Migration zu publishable/secret-Schlüsseln wäre ein einfacher nächster Schritt.


#Notizen

