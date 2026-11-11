import "./setup.ts";
import { assertEquals } from "@repo/tests/utils/assert";
import "../../../apps/ui/src/components/app-settings-platforms/app-settings-platforms.ts";
import type { AppSettingsPlatforms } from "../../../apps/ui/src/components/app-settings-platforms/app-settings-platforms.ts";

test("AppSettingsPlatforms: renders multi-file firmware with badge and allows expanding child files", async () => {
    const mockPlatforms = [
        {
            id: "ps2",
            name: "Sony PlayStation 2",
            slug: "ps2",
            path: "ps2",
            romCount: 10,
            firmware: [
                {
                    id: "fw-ps2-bundle",
                    systemId: "ps2",
                    name: "PS2 BIOS SCPH-39001",
                    filename: "scph39001.bin",
                    path: "/bios/ps2/scph39001",
                    totalSize: 4194304,
                    files: [
                        {
                            id: "f1",
                            firmwareId: "fw-ps2-bundle",
                            filename: "scph39001.bin",
                            relPath: "scph39001.bin",
                            path: "/bios/ps2/scph39001/scph39001.bin",
                            size: 4194304,
                        },
                        {
                            id: "f2",
                            firmwareId: "fw-ps2-bundle",
                            filename: "scph39001.nvm",
                            relPath: "scph39001.nvm",
                            path: "/bios/ps2/scph39001/scph39001.nvm",
                            size: 1024,
                        },
                    ],
                },
            ],
        },
    ];

    globalThis.fetch = ((url: string) => {
        if (url.includes("/api/platforms")) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockPlatforms),
            });
        }
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
        });
    }) as unknown as typeof fetch;

    const el = document.createElement("app-settings-platforms") as AppSettingsPlatforms;
    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 20));
    await el.updateComplete;

    // Verify badge shows 2 files
    const badge = el.shadowRoot?.querySelector("ui-badge[variant='secondary']");
    assertEquals(!!badge, true);

    const fwCard = el.shadowRoot?.querySelector(".firmware-item-container");
    assertEquals(!!fwCard, true);

    // Verify View Files button
    const viewFilesBtn = fwCard?.querySelector("ui-button[variant='secondary']") as HTMLElement;
    assertEquals(!!viewFilesBtn, true);

    // Click View Files
    viewFilesBtn.click();
    await el.updateComplete;

    // Verify child files list is rendered
    const childList = fwCard?.querySelector(".firmware-child-files");
    assertEquals(!!childList, true);
    const childFiles = childList?.querySelectorAll(".firmware-child-file");
    assertEquals(childFiles?.length, 2);

    document.body.removeChild(el);
});

test("AppSettingsPlatforms: opens upload dialog and submits multipart firmware", async () => {
    let uploadFormData: FormData | null = null;

    globalThis.fetch = ((url: string, options?: RequestInit) => {
        if (url === "/api/firmware/upload" && options?.method === "POST") {
            uploadFormData = options.body as FormData;
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ status: "success" }),
            });
        }
        if (url.includes("/api/platforms")) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve([
                    {
                        id: "psx",
                        name: "Sony PlayStation",
                        slug: "psx",
                        path: "psx",
                        romCount: 5,
                        firmware: [],
                    },
                ]),
            });
        }
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
        });
    }) as unknown as typeof fetch;

    const el = document.createElement("app-settings-platforms") as AppSettingsPlatforms;
    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 20));
    await el.updateComplete;

    assertEquals(el.isUploadDialogOpen, false);

    // Open upload dialog for platform
    const uploadBtn = el.shadowRoot?.querySelector(".firmware-section ui-button[variant='primary']") as HTMLElement;
    assertEquals(!!uploadBtn, true);
    uploadBtn.click();
    await el.updateComplete;

    assertEquals(el.isUploadDialogOpen, true);
    assertEquals(el.uploadPlatformId, "psx");

    // Add files to selectedUploadFiles
    const file1 = new File(["BIOS DATA"], "scph5501.bin", { type: "application/octet-stream" });
    el.selectedUploadFiles = [file1];
    el.uploadCustomName = "SCPH-5501 BIOS";
    await el.updateComplete;

    // Submit upload form
    await el.submitFirmwareUpload(new Event("submit"));
    await el.updateComplete;

    assertEquals(uploadFormData !== null, true);
    assertEquals(uploadFormData?.get("systemId"), "psx");
    assertEquals(uploadFormData?.get("name"), "SCPH-5501 BIOS");
    assertEquals(el.isUploadDialogOpen, false);

    document.body.removeChild(el);
});
