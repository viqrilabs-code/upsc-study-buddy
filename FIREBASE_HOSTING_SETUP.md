# Firebase Hosting Setup For `tamgam.in`

This repo is configured so Firebase Hosting sits in front of the deployed Cloud Run service:

- Cloud Run service: `tamgam-web`
- Region: `asia-south1`
- Project: `tamgam-upsc`

## What Is Already Done

- [firebase.json](/c:/Users/amiti/Desktop/viqri-labs/upsc-study-buddy/firebase.json) rewrites all traffic to Cloud Run.
- [.firebaserc](/c:/Users/amiti/Desktop/viqri-labs/upsc-study-buddy/.firebaserc) points Firebase CLI at `tamgam-upsc`.

## Current Blocker

The Firebase CLI on this machine is logged into `amitinger26@gmail.com`, but the GCP project owner workflow is using `guptaamit.work@gmail.com`.

Because of that, this command failed with permission denied:

```powershell
firebase projects:addfirebase tamgam-upsc
```

## Fix The Firebase Login

Run:

```powershell
firebase logout
firebase login --reauth
firebase login:list
```

Make sure the final command shows:

```text
Logged in as guptaamit.work@gmail.com
```

## Enable Firebase On The Project

Run:

```powershell
firebase projects:addfirebase tamgam-upsc
```

After that, confirm the Hosting site exists:

```powershell
firebase hosting:sites:list --project tamgam-upsc
```

You should see the default site for `tamgam-upsc`.

## Deploy Firebase Hosting In Front Of Cloud Run

From the repo root, run:

```powershell
firebase deploy --only hosting --project tamgam-upsc
```

This does not replace your app. It puts Firebase Hosting in front of the existing Cloud Run app.

## Move `tamgam.in` From The Old Firebase Project

Because `tamgam.in` is currently attached to another Firebase Hosting site:

1. Open the old Firebase project that currently owns `tamgam.in`.
2. Remove `tamgam.in` from that Hosting custom domain list.
3. Open Firebase Console for `tamgam-upsc`.
4. Go to `Hosting`.
5. Add custom domain: `tamgam.in`
6. Add `www.tamgam.in` too if you want.
7. Follow the DNS records Firebase shows in the wizard.

Important:

- Remove any old `A`, `AAAA`, or `CNAME` records that still point to the previous Firebase site once the new wizard tells you to.
- If Firebase shows a TXT verification record, add that in GoDaddy first and wait for verification.

## Final Auth Update After Domain Goes Live

Once `https://tamgam.in` is serving the app, update Cloud Run:

```powershell
gcloud run services update tamgam-web `
  --project tamgam-upsc `
  --region asia-south1 `
  --update-env-vars NEXTAUTH_URL=https://tamgam.in
```

Then update Google OAuth settings for the production domain:

- Authorized JavaScript origin:
  `https://tamgam.in`
- Authorized redirect URI:
  `https://tamgam.in/api/auth/callback/google`

If you use `www.tamgam.in`, add those too.
