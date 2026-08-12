# ByteForge — Backend + Razorpay Checkout

A real Node.js/Express backend for the ByteForge site: signup/login with
hashed passwords and session tokens, plus Razorpay payment integration.
Data is stored in a local `data.json` file — good for getting started;
swap it for Postgres/MongoDB later if you outgrow it.

## 1. Install

```bash
npm install
```

## 2. Configure

```bash
cp .env.example .env
```

Open `.env` and fill in:
- `JWT_SECRET` — any long random string (used to sign login sessions)
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — from your Razorpay dashboard:
  1. Sign up at https://dashboard.razorpay.com/signup
  2. Go to **Settings → API Keys**
  3. Generate **Test mode** keys first (no real money moves in test mode)
  4. Paste both values into `.env`

Without these two Razorpay values, the site works fully (signup, login,
browsing, dashboard) — only the "Pay & Enroll" button will show a clear
error until you add them.

## 3. Run

```bash
npm start
```

Then open **http://localhost:3000** — the frontend is served automatically.

## 4. Test a payment (Razorpay test mode)

Once your test keys are in `.env`, use Razorpay's test card when the
checkout popup opens:
- Card number: `4111 1111 1111 1111`
- Expiry: any future date
- CVV: any 3 digits
- OTP (if asked): `1234` (Razorpay's canned test OTP)

No real money moves in test mode — it's a full simulation of the flow.

## 5. Automatic invoice & offer letter emails

When a payment is verified, the server now:
1. Always generates a PDF invoice and emails it to the student
2. If the course is an **internship** track (see `type: 'internship'` on
   the course in `server.js`), also generates and attaches a PDF offer
   letter

To turn this on, fill in the `SMTP_*` values in `.env` — instructions for
Gmail, Resend, and Brevo are all in `.env.example` (pick any one). Without
these filled in, enrollment still works and the site keeps functioning —
you'll just see a note in the server log that the email was skipped.

Invoice numbers (`INV-2026-00001`) and offer letter IDs (`OFR-2026-00001`)
are generated with simple auto-incrementing counters stored in `data.json`.

## 6. Deploy so students can actually reach it

Pushing this to GitHub only stores the code — it does **not** run it.
`localhost:3000` only exists on your own machine. To let real students
sign up and enroll, the backend needs to be running on a public server.
The fastest free path:

1. Push this folder to a GitHub repo (see the checklist below first).
2. Go to https://render.com → **New → Web Service** → connect your GitHub repo.
3. Build command: `npm install` · Start command: `npm start`.
4. Under **Environment**, add the same variables from your `.env` file
   (`JWT_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `SMTP_*`, etc.)
   — never commit `.env` itself.
5. Deploy. Render gives you a live HTTPS URL
   (e.g. `https://byteforge.onrender.com`) — that's the link you share
   with students. The frontend in `public/` is served automatically from
   the same URL, so there's nothing separate to host.
6. Free-tier Render instances sleep after inactivity; a request to
   `/api/health` wakes it back up (point a free uptime pinger like
   UptimeRobot at that URL if you want it always warm).

Railway or a small VPS work the same way if you prefer those instead.

## Before pushing to GitHub — checklist

- [ ] `.env` is **not** in the repo (the included `.gitignore` already
      excludes it — double check with `git status` before your first commit)
- [ ] `data.json` is **not** in the repo — it will contain real students'
      names, emails, and password hashes once people sign up
- [ ] `JWT_SECRET` in your **deployed** environment is a long random
      string, not the `dev-secret-change-me` fallback
- [ ] Razorpay keys are switched from **test** to **live** mode once
      you've tested a full payment end-to-end
- [ ] SMTP values are filled in (Gmail/Resend/Brevo) so invoice/offer
      emails actually send instead of just logging "skipped"

## What's real here vs. what to add before going live

**Already real:**
- Passwords are hashed with bcrypt, never stored in plain text
- Login sessions are signed JWTs, verified on every protected request
- Payment signatures are cryptographically verified server-side (this is
  the part that actually stops someone from faking a "successful" payment)

**Before accepting real customers, you should also add:**
- A proper database (Postgres/MongoDB) instead of the JSON file — the
  JSON file isn't safe for concurrent writes at any real scale
- Email verification on signup
- HTTPS (required by Razorpay in live mode anyway)
- Switch Razorpay keys from **test** to **live** mode once you've tested
  thoroughly
- A real hosting provider for the backend — Render, Railway, or a small
  VPS all work well for a Node/Express app like this

## Project structure

```
byteforge/
├── server.js         # Express app, all API routes
├── db.js             # tiny JSON file "database" helper
├── data.json          # created automatically on first run
├── .env               # your secrets (not committed)
├── .env.example        # template for the above
├── package.json
└── public/
    └── index.html      # the frontend (calls the API above)
```
