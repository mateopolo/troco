# Firebase Storage CORS setup

The application needs Firebase Storage to accept browser uploads from the
Vercel deployments, the production domains, Firebase Hosting, and local
development servers.

From the repository root, install the Google Cloud SDK, then authenticate and
select the Firebase project:

```powershell
gcloud auth login
gcloud config set project troco-8a6eb
```

Apply and verify the bucket configuration:

```powershell
gsutil cors set cors.json gs://troco-8a6eb.firebasestorage.app
gsutil cors get gs://troco-8a6eb.firebasestorage.app
```

If `gsutil` is unavailable, use:

```powershell
gcloud storage buckets update gs://troco-8a6eb.firebasestorage.app --cors-file=cors.json
```

Allow up to two minutes for propagation, then hard-refresh the Vercel site
and test `.mp3`, `.wav`, `.flac`, and recorded voice messages.
