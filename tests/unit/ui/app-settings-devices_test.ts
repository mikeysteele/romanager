import "./setup.ts";
import { assertEquals } from "@std/assert";
import "../../../apps/ui/src/components/app-settings-devices/app-settings-devices.ts";
import type { AppSettingsDevices } from "../../../apps/ui/src/components/app-settings-devices/app-settings-devices.ts";

Deno.test("AppSettingsDevices: fetches devices on load and renders cards", async () => {
  let fetchedDevices = false;
  globalThis.fetch = ((url: string) => {
    if (url === "/api/devices") {
      fetchedDevices = true;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: "dev-test-1",
              name: "Living Room Batocera",
              preset: "batocera",
              storageBudgetBytes: 10737418240,
              lastSeenAt: "2026-10-04T12:00:00Z",
              lastSyncAt: "2026-10-04T12:30:00Z",
              agentVersion: "1.0.0",
              profile: {
                deviceId: "dev-test-1",
                regionPreference: "USA,EUR,JPN",
                oneRomPerGame: false,
                includeFirmware: true,
              },
            },
          ]),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    });
  }) as unknown as typeof fetch;

  const el = document.createElement("app-settings-devices") as AppSettingsDevices;
  document.body.appendChild(el);
  await el.updateComplete;

  await new Promise((r) => setTimeout(r, 150));
  el.requestUpdate();
  await el.updateComplete;

  assertEquals(fetchedDevices, true);
  assertEquals(el.devices.length, 1);
  assertEquals(el.devices[0].name, "Living Room Batocera");

  const shadow = el.shadowRoot!;
  const nameEl = shadow.querySelector(".device-name");
  assertEquals(nameEl?.textContent?.trim(), "Living Room Batocera");

  document.body.removeChild(el);
});

Deno.test("AppSettingsDevices: renders empty state when no devices enrolled", async () => {
  globalThis.fetch = (() => {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    });
  }) as unknown as typeof fetch;

  const el = document.createElement("app-settings-devices") as AppSettingsDevices;
  document.body.appendChild(el);
  await el.updateComplete;

  await new Promise((r) => setTimeout(r, 30));
  await el.updateComplete;

  assertEquals(el.devices.length, 0);
  const shadow = el.shadowRoot!;
  const emptyEl = shadow.querySelector(".empty-state");
  assertEquals(emptyEl !== null, true);

  document.body.removeChild(el);
});
