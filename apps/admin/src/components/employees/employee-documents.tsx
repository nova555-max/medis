"use client";

import { useActionState, useTransition } from "react";
import {
  deleteEmployeeDocumentAction,
  getDocumentSignedUrlAction,
  uploadEmployeeDocumentAction,
  type ActionResult,
} from "@/lib/actions/documents";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initial: ActionResult = {};

type Doc = {
  id: string;
  title: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
};

export function EmployeeDocuments({
  employeeId,
  documents,
}: {
  employeeId: string;
  documents: Doc[];
}) {
  const [state, formAction, pending] = useActionState(
    uploadEmployeeDocumentAction,
    initial,
  );
  const [deleting, startDelete] = useTransition();

  async function openDoc(path: string) {
    const res = await getDocumentSignedUrlAction(path);
    if (res.url) window.open(res.url, "_blank", "noopener,noreferrer");
    else alert(res.error || "سەرنەکەوت");
  }

  return (
    <div className="panel space-y-4 p-5">
      <div>
        <h2 className="text-lg font-semibold">بەڵگەنامەکان</h2>
        <p className="mt-1 text-sm text-ink-muted">
          گرێبەست، ناسنامە، و فایلەکانی تری کارمەند
        </p>
      </div>

      <form action={formAction} className="grid gap-3 md:grid-cols-3">
        <input type="hidden" name="employeeId" value={employeeId} />
        <div>
          <Label htmlFor="title">ناونیشان</Label>
          <Input id="title" name="title" required placeholder="گرێبەست / ناسنامە" />
        </div>
        <div>
          <Label htmlFor="file">فایل</Label>
          <Input id="file" name="file" type="file" required />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "بارکردن..." : "بارکردن"}
          </Button>
        </div>
      </form>

      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-brand-700">{state.success}</p>
      )}

      <ul className="divide-y divide-line rounded-xl border border-line">
        {documents.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-ink-muted">
            هێشتا بەڵگەنامە نییە
          </li>
        ) : (
          documents.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="font-medium">{d.title}</p>
                <p className="text-xs text-ink-muted" dir="ltr">
                  {new Date(d.created_at).toLocaleString()}
                  {d.file_size != null
                    ? ` · ${Math.round(d.file_size / 1024)} KB`
                    : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => openDoc(d.file_path)}
                >
                  بینین
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-600"
                  disabled={deleting}
                  onClick={() =>
                    startDelete(async () => {
                      await deleteEmployeeDocumentAction(d.id, employeeId);
                    })
                  }
                >
                  سڕینەوە
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
