# TamGam Web

TamGam is a Next.js app for the UPSC study buddy product.

## Production stack

- `Cloud Run` for the web app and API routes
- `Firestore` for users, reports, feedback, billing, refunds, and admin current-affairs state
- `Cloud Tasks` and `Cloud Scheduler` for background and timed jobs
- `Secret Manager` for production secrets
- `Cloud Storage` only for generated outputs if needed

## What is stored

- User profile and subscription state
- Mains and Prelims reports
- Strength and weakness signals
- Session ratings and feedback
- Billing and refund ledger
- Admin current-affairs pack metadata and filtered text

## What is not stored

- Uploaded study material
- Uploaded newspapers from users
- Uploaded handwritten answers
- Raw uploaded source documents for notes

The app keeps those uploads session-scoped or temporary to avoid piracy-sensitive retention.

## Data-store behavior

- `Development`: local JSON fallback is allowed
- `Production`: Firestore is required by default
- If `NODE_ENV=production` or `APP_ENV=production` and Firestore is missing, local JSON fallback is blocked unless `ALLOW_LOCAL_JSON_STORE=true` is set intentionally

## Environment

Use `.env.local` in development. Start from `.env.example`.

### Local Firestore admin credentials

```env
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Cloud Run production

On Cloud Run, prefer the service account path instead of a long-lived key:

- attach a service account with Firestore access
- inject app secrets from Secret Manager
- let Application Default Credentials handle Firestore admin auth

## Local run

```bash
npm install
npm run dev
```

## Production build check

```bash
npm run build
npm run start
```

## Health endpoint

Use:

```text
/api/health
```

It reports:

- environment
- storage mode
- Firestore init mode
- auth/payment/OpenAI config presence
- whether the app is production-ready

In production, the health endpoint returns `503` if Firestore is not configured.

## Cloud Run deployment

This app includes:

- `Dockerfile`
- `.dockerignore`
- `cloudbuild.yaml`
- `firestore.indexes.json`
- `firestore.rules`

### Suggested region

- `asia-south1`

### One-time setup

1. Create a Firestore database in Native mode.
2. Create an Artifact Registry Docker repository.
3. Create a Cloud Run service account with Firestore access.
4. Store OpenAI, NextAuth, Google OAuth, and Razorpay secrets in Secret Manager.
5. Deploy Firestore indexes.

### Example deploy flow

```bash
gcloud builds submit --config cloudbuild.yaml
```

After deployment, set the runtime secrets and env vars on Cloud Run:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `BILLING_ADMIN_EMAILS`
- `APP_ENV=production`

## Firestore indexes

Current composite indexes cover:

- reports by user and created time
- feedback by user and created time
- billing by user and created time
- refunds by user and updated time
