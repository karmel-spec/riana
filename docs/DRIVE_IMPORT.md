# Drive import: connecting the shared folders

The binder reads documents from Google Drive through its own **service account**: a robot Google identity that sees only the folders you explicitly share with it. It never uses Rich's, Diana's or Karmel's personal Google logins, and it has read-only access.

## One-time setup (about 15 minutes)

1. **Create the service account.**
   Go to [console.cloud.google.com](https://console.cloud.google.com). Create a project called `greene-binder` (or reuse one). In the left menu: **APIs & Services → Library**, search *Google Drive API*, **Enable**. Then **IAM & Admin → Service Accounts → Create service account**. Name: `binder-import`. Skip the optional role steps. Open the new account → **Keys → Add key → Create new key → JSON**. A file downloads. Keep it in 1Password; it is a credential.

2. **Give the app the key.**
   In Netlify: *Site configuration → Environment variables* → add `GOOGLE_SERVICE_ACCOUNT_JSON` with the **entire contents** of that JSON file as the value. (If Netlify complains about newlines, base64-encode the file first; the app accepts either.) Trigger a deploy.

3. **Share the folders.**
   The service account's email looks like `binder-import@greene-binder.iam.gserviceaccount.com`. It's shown at the top of **Admin → Drive import** once the key is in. In Google Drive, for each folder in the list below: right-click → **Share** → paste that email → choose **Viewer** → uncheck "Notify people" → Share.

   | Folder | Who should share it |
   |---|---|
   | Web App Import (root), with its subfolders History & Keepsakes - Rich, Home & Property, Health | Karmel |
   | History & Keepsakes - Diana's Drive | Karmel |
   | Rich_Greene_Sing-A-Long/MP3_Files | Karmel |
   | VA & CHAMPVA | Karmel |
   | Taxes | Karmel (admin-only in the app) |
   | Legal Docs | Karmel |
   | 2022 Widow Book | Karmel (admin-only in the app) |

   Sharing the root folder covers its subfolders automatically.

4. **Check and run.**
   In the app, **Admin → Drive import → Check access now**. Any folder that isn't readable is listed in red with the reason. When all are green, click **Dry run** to see every file and where it will be filed, then **Apply**.

## What the import does and doesn't do

- It stores a *pointer* for each file: Drive file id, name, size, checksum, last-modified time, the Drive link, and which section it belongs to. **File contents are never copied into the database or the code repository.**
- Running it again is safe: unchanged files are skipped, changed files are marked updated, and a file that exists in two places (the song in both Drives) is recorded once with the other marked as a duplicate.
- Files land in a **review queue**. Nothing shows to the family until an admin approves it. Taxes, the Widow Book and bulk contact lists are admin-only even after approval.
- A file whose name doesn't match any rule is still recorded, filed under the folder's default section, and flagged "Needs a rule" so it isn't lost.

## Where the rules live

`src/lib/drive/manifest.ts` lists the folders and the filename rules from Update Brief #2. To change where a file goes, edit a rule there; `npm test` checks the rules against a fake Drive that mirrors the manifest.

## Until the key exists

Without `GOOGLE_SERVICE_ACCOUNT_JSON`, the import screen runs against a stand-in Drive with made-up file names so the flow can be seen and tested. The banner at the top of the page says which mode it's in.

## Photos (Google Takeout) and shared albums

Google Photos has no API that lets an app read a whole library, so photos reach the binder two ways:

1. **Takeout → Drive, every 2 months.** At [takeout.google.com](https://takeout.google.com) choose *Google Photos* only, delivery method *Add to Drive*, frequency *Every 2 months for 1 year*. Takeout writes a folder into Drive; move or share it so it sits under **Web App Import → Photos (Takeout)** (the folder the manifest expects). Each sync then:
   - imports every photo and video it finds (`photo-takeout` rule),
   - **skips duplicates by content hash** even when the file name changed (a re-export or a "Copy of…"),
   - reads the **date the photo was taken** from EXIF (as Drive reports it), else from the Takeout sidecar `.json` next to the file, and uses it to place the photo on the Family History timeline. The sidecars themselves are never imported.
2. **Shared album links.** In Google Photos, open an album → Share → *Create link*, then paste it under **Family History → Shared albums → Add album link**. The app stores the link as a reference only; the photos stay in the album.

Both go through the usual review: imported files wait in **Admin → Drive import** until approved, then **Family History → Sync media** adds them to the archive.
