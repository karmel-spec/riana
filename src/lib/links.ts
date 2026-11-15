// Links to family documents that live in Google Drive. Document ids are public
// identifiers for private files and reveal nothing by themselves.

/** The health records index: one row per record, with a link to each scanned file. */
export const HEALTH_RECORDS_INDEX_URL = "https://docs.google.com/spreadsheets/d/19b28UiWuSz18yplOPro7MbtUfhv357nacBNQ3FQvJlg/edit";

/** Google Photos album of the cars, for picking vehicle photos. */
export const VEHICLES_ALBUM_URL = "https://photos.app.goo.gl/8M6osmGDvvFoEYuY8";
/** Extra Google Photos albums with car pictures. */
export const VEHICLES_ALBUM_URLS: { label: string; url: string }[] = [
  { label: "Car photos album", url: VEHICLES_ALBUM_URL },
  { label: "More car photos", url: "https://photos.app.goo.gl/jfJwSuSnMk924fwa8" },
];

/** The StarLar app: the Tumwater rentals and the loans to Mike and Karmel against them. */
export const STARLAR_URL = "https://starlar.netlify.app";

/** The id of a Drive file link (drive.google.com/file/d/ID/…), or null for folders, docs and other links. */
export function driveFileId(url: string): string | null {
  const m = /drive\.google\.com\/file\/d\/([\w-]+)/.exec(url);
  return m ? m[1] : null;
}
