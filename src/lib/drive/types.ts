// Shared Drive types with no server-only import, so unit tests can load them.
export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  md5Checksum: string | null;
  modifiedTime: string;
  webViewLink: string | null;
  parents: string[];
  /** EXIF DateTimeOriginal as Drive reports it (imageMediaMetadata.time), if any. */
  takenTime?: string | null;
};

export interface DriveClient {
  /** Can we see this folder at all? Returns its name, or an error message. */
  probeFolder(folderId: string): Promise<{ ok: true; name: string } | { ok: false; error: string }>;
  /** Direct children (files and folders) of a folder. */
  list(folderId: string): Promise<DriveFile[]>;
  /** Range-capable download for streaming (used by the media proxy, item 7). */
  stream(fileId: string, range?: string): Promise<Response>;
}

export const FOLDER_MIME = "application/vnd.google-apps.folder";
