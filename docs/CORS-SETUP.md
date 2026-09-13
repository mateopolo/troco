# Firebase Storage CORS setup

The application needs Firebase Storage to accept browser uploads from the
Vercel deployment, the production domain, and the local development server.

From the repository root, install and authenticate the Google Cloud Storage
CLI, then apply the configuration:

```powershell
gsutil cors set cors.json gs://troco-8a6eb.firebasestorage.app
```

After applying the configuration, test uploads for `.mp3`, `.wav`, `.flac`,
and recorded voice messages from both the Vercel deployment and the local
development server.
