import { requireSuperAdmin } from "@/lib/session";
import { driveSetup, lastFolderStatus, listImportedFiles, listRuns } from "@/lib/drive/service";
import { FOLDERS } from "@/lib/drive/manifest";
import { PageHeader } from "@/components/ui";
import { ImportConsole } from "./import-console";

export const metadata = { title: "Riana Drive import" };

export default async function ImportPage() {
  const v = await requireSuperAdmin();
  const [setup, folders, files, runs] = await Promise.all([driveSetup(v), lastFolderStatus(v), listImportedFiles(v), listRuns(v)]);
  return (
    <>
      <PageHeader eyebrow="Riana integration · phase 1" title="Riana Drive import"
        intro="The app reads the shared Google Drive folders and files each document under the right section for review. It keeps a pointer to every file (name, size, Drive link) and never copies the file itself into the database." />
      <ImportConsole
        setup={setup}
        manifest={FOLDERS.map((f) => ({ key: f.key, name: f.name, sensitivity: f.sensitivity, hasId: !!f.driveFolderId, parent: f.parentKey ?? null, notes: f.notes ?? null }))}
        folders={folders}
        files={files}
        runs={runs}
      />
    </>
  );
}
