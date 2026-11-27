# WIMS Showcase Site: Design

Date: 2026-11-27. Status: awaiting approval.

## Intent
Recruiters won't log in and test WIMS themselves. A public page shows every function of the app working,
so a recruiter scrolling for about a minute understands what it does and how it was built.

## Goals
- Every function shown with real screenshots or short clips from the live app, each with 2–3 plain captions.
- Skimmable on a laptop and on a phone.
- Links to the GitHub repo and the live demo (with the test accounts, for the rare visitor who wants to try).
- A short "How it's built" section: stack, architecture, tests, CI/CD, deployment.

## Non-goals
- No backend, no live data, no interactive replica (approach A was not chosen).
- No changes to the WIMS app itself.

## Anti-goals (a failure even if it works)
- A wall of text a recruiter won't read.
- Screenshots too small to read on a phone.
- Broken or slow-loading media.

## Approaches
- A. Self-playing replica with built-in sample data. Most impressive, never stale, most work. Not chosen.
- **B. Screenshot and clip tour of the real app. Chosen by the owner.** Shows the real thing; can go stale.
- C. Embedded video walkthrough. Not chosen: recruiters may not press play, and it can't be skimmed.

## Decided (by the owner)
- Approach B; the audience is recruiters.

## My calls (correct any of these)
1. **Capture by script, from a local copy of the real app** (changed 2026-11-27, after approval). The live backend
   (Render) accepted connections but never answered on 2026-11-27, and `backend/config/db.js` exits when MongoDB is
   unreachable, so the live demo can't be captured. The script instead runs the real WIMS backend and frontend on
   this PC against a throwaway in-memory MongoDB, seeds clean sample data through the app's own API, and captures
   every screen. Re-running it refreshes the site when the app changes.
2. **Nothing is written to the live database** (replaces the earlier "sample records in the live demo" call).
3. **Flows as step-by-step screenshots** (changed from videos: no ffmpeg on this PC). Each flow is an
   auto-advancing sequence of screenshots with a numbered caption per step; it works in every browser.
4. **Static site:** one `index.html` plus a `media/` folder, no framework, ready for GitHub Pages or Vercel.
   Hosting is a separate step after it's built.
5. **Solo project:** the repo has a single contributor (Danica-YI), so the site presents it as one person's work.

## Page outline
1. Hero: name, one-line pitch, dashboard screenshot, "Live demo" and "GitHub" buttons.
2. The core loop (one clip): outbound shipment → stock below threshold → low-stock alert → admin reorders →
   purchase order moves draft → pending → approved → shipped → received.
3. One section per function, with an Admin/Staff badge:
   login and roles (admin and staff dashboards side by side), stock, inbound/outbound, low-stock alerts,
   purchase orders and tracking, suppliers, stock adjustments, user management, search.
4. How it's built: React + Vite, Express, MongoDB Atlas, JWT; a simple architecture diagram; Mocha/Chai/Sinon tests;
   GitHub Actions CI; deployed on Vercel + Render, previously AWS EC2 with Nginx and PM2.
5. Footer: links and test accounts.
Click any screenshot to open it full size.

## Left to the builder
Visual style, exact captions, image sizes and compression, the order of feature sections.

## Location
`C:\Users\25475\wims-showcase\` (this doc in `docs/`).
