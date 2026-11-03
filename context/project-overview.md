# Systema

## Overview

Systema is a real-time collaborative system design workspace for solo developers and small teams. Users describe a system in plain English, an AI agent maps that system onto a shared canvas, collaborators refine the architecture together, and the application generates a technical specification from the resulting graph. It replaces output-less whiteboard sessions with a workspace that turns ideas into a usable architecture and a build-ready specification.

## Goals

1. Enable a solo developer to translate a plain-English system idea into an editable, connected architecture graph without starting from a blank canvas.
2. Enable small teams to collaborate on the same system design in real time, including simultaneous editing, presence, and comments.
3. Produce a downloadable Markdown technical specification from the canvas graph, node and edge names/descriptions, and session comments, suitable as input for another AI agent to build a working project.
4. Persist projects so users can save, reopen, and continue their designs.
5. Operate within a zero-cost budget using free-tier services.

## Core User Flow

1. User signs in.
2. User creates or selects a project.
3. User enters the project workspace.
4. User optionally imports a fixed starter system design template into the canvas.
5. User optionally prompts the AI to generate or extend the system design.
6. AI generates nodes and edges in the shared canvas as a background job.
7. Collaborators edit and refine the design.
8. User triggers spec generation from the AI sidebar.
9. App generates and persists the Markdown spec.
10. User reviews, previews, or downloads the spec.
11. User optionally downloads the canvas JSON snapshot.
12. User logs out.

Alternative paths: a user may start from a blank canvas and build the design manually using the available shapes; a user may invite a collaborator at any time during the session.

## Features

### Canvas and Graph Editing

- Users can create, edit, and delete nodes and edges manually.
- Nodes are shapes with meaning; nodes are unnamed by default, and both node and edge names and descriptions are editable so a shape can be repurposed when no dedicated shape exists.
- The same create, edit, and delete operations are available on AI-generated graphs.
- Edges connect services and can be named and edited.

### AI-Assisted Design

- Users can prompt the AI in plain English to generate, extend, or modify a system design on the canvas.
- AI tasks run as background jobs through Trigger.dev.
- A single AI agent pipeline calls Google Gemini as the primary model provider and Groq as a fallback provider on failure.

### Collaboration

- Multiple authenticated users can edit the same canvas simultaneously.
- Presence is shown through live cursors and avatars.
- Users can comment and discuss the current session.
- Conflict handling is provided by Liveblocks.

### AI Sidebar

- A prompt tab where users enter prompts and receive AI feedback on success or failure.
- A comments tab for users to discuss the current session (not a full chat system).
- A spec generation tab that takes the graph, node and edge names/descriptions, and comments into account.

### Templates

- A fixed set of starter templates is stored in the codebase, covering common patterns such as monolith, microservices, event-driven, and serverless.
- Templates can be imported into the canvas and edited collaboratively or solo.
- Templates are not user-created or user-imported.

### Persistence

- Projects are saved and reopenable.
- Canvas changes are autosaved, with a small number of recovery snapshots to support recovery.
- Metadata and artifact paths are stored in Postgres; Markdown specs and canvas snapshots are stored in Vercel Blob.
- Projects can be deleted. Deleting a project removes its metadata from Postgres and its associated blobs from Vercel Blob.

### Specification Generation and Export

- The AI generates a Markdown technical specification from the graph and comments.
- The spec can be previewed in the app using a Markdown renderer.
- The spec can be downloaded by the owner and collaborators.
- The canvas JSON snapshot can be downloaded and is stored in Vercel Blob.

### Authentication, Authorization, and Roles

- Users authenticate through Clerk.
- Roles are Owner and Editor (collaborator). There is no viewer role.
- Any authenticated user can create a project and become its owner.
- Only the owner can add or remove collaborators by email; collaborators must also be authenticated.
- Owners and editors can edit, create, and update canvas graphs, use AI features, comment, and download the spec.

## Scope

### In Scope

- Authentication via Clerk and authorization with Owner and Editor roles.
- Project creation and ownership by authenticated users, each project with its own collaborative canvas and unique URL.
- Owner-only collaborator management by email.
- Manual canvas editing of nodes and edges, including names and descriptions.
- AI generation, extension, and modification of graphs via a single agent pipeline with Gemini primary and Groq fallback, run as Trigger.dev background jobs.
- Fixed starter templates importable into the canvas.
- Real-time simultaneous editing, presence (cursors and avatars), comments, and conflict handling via Liveblocks.
- Autosave with a small number of recovery snapshots.
- AI-generated Markdown spec from the graph and comments, previewable and downloadable.
- Downloadable canvas JSON snapshot stored in Vercel Blob.
- Metadata and artifact paths in Neon Postgres via Prisma.
- Project deletion, including removal of associated metadata and stored blobs.

### Out of Scope

- Billing and payment systems.
- Enterprise tiers or roles beyond Owner and Editor.
- A mobile application; the product is web-only.
- User-created or user-imported custom templates.
- Detailed application layout and screen design, dashboard UI details, AI job-status UI details, and snapshot-restore UI details; these belong in later design documents.

## Success Criteria

1. Only authenticated users can create and own a project.
2. Only owners can add or remove collaborators.
3. Users and collaborators can edit the same canvas and see each other's changes in real time.
4. Users can comment on the current session.
5. A starter template can be imported into the canvas and edited.
6. A plain-English prompt produces a connected graph on the canvas that is editable.
7. Canvas changes autosave and can be recovered from a recovery snapshot.
8. A technical specification Markdown document is generated from the connected graph and comments, can be previewed, and can be downloaded.
9. The canvas JSON snapshot can be downloaded.
10. Users can log out successfully.
11. A project can be deleted, and its metadata and stored blobs are removed.
