# REST API Reference

The Romanager API is built with the [Hono](https://hono.dev/) framework and served on port `8000` by default.

---

## Base URL
```
http://localhost:8000/api
```

---

## 1. System Health

### `GET /api/health`
Returns the operational health of the server.

- **Response `200 OK`**:
  ```json
  {
    "status": "ok"
  }
  ```

---

## 2. Games (`/api/games`)

### `GET /api/games`
Retrieve all games, or filter by platform, search term, or slug.

- **Query Parameters**:
  - `systemId` *(optional, string)*: Filter games containing ROMs mapped to this system ID.
  - `slug` *(optional, string)*: Find a specific game by canonical slug.
  - `search` *(optional, string)*: Search game titles matching the query string.
- **Response `200 OK`**:
  ```json
  [
    {
      "id": "game:super-mario-world",
      "name": "Super Mario World",
      "slug": "super-mario-world",
      "description": "<p>A 1990 platform game developed by Nintendo...</p>",
      "backgroundImage": "https://media.rawg.io/media/games/...",
      "released": "1990-11-21",
      "rating": 4.5,
      "platforms": [
        {
          "id": "snes",
          "name": "Super Nintendo",
          "slug": "snes"
        }
      ]
    }
  ]
  ```

### `GET /api/games/:id`
Fetch a single game by its canonical ID or RAWG ID, fully enriched with platforms and ROM file details.

- **Response `200 OK`**:
  ```json
  {
    "id": "game:super-mario-world",
    "name": "Super Mario World",
    "slug": "super-mario-world",
    "description": "...",
    "backgroundImage": "...",
    "released": "1990",
    "rating": 4.5,
    "platforms": [
      {
        "id": "snes",
        "name": "Super Nintendo",
        "slug": "snes",
        "roms": [
          {
            "id": "e838cb35-b280-4cfd-b2a8-f9b8ecf30bdf",
            "gameId": "game:super-mario-world",
            "systemId": "snes",
            "filename": "Super Mario World (USA).sfc",
            "path": "/roms/snes/Super Mario World (USA).sfc",
            "size": 524288,
            "region": "USA",
            "crc32": "B19ED489",
            "md5": "cdd3c8c373200e88f45e22304a2fe1e1",
            "pendingDelete": false
          }
        ]
      }
    ]
  }
  ```
- **Response `404 Not Found`**: Game does not exist.

### `POST /api/games/add`
Add a new game and its associated platforms to the catalog.

- **Request Body**:
  ```json
  {
    "id": "game:chrono-trigger",
    "name": "Chrono Trigger",
    "slug": "chrono-trigger",
    "description": "Classic RPG",
    "backgroundImage": "https://...",
    "released": "1995",
    "rating": 4.8,
    "platforms": [
      {
        "id": "snes",
        "name": "Super Nintendo Entertainment System",
        "slug": "snes"
      }
    ]
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "status": "success",
    "id": "game:chrono-trigger"
  }
  ```
- **Response `400 Bad Request`**: Payload failed schema validation.

### `DELETE /api/games/:id`
Deletes a game from the catalog and optionally purges underlying ROM files from disk.

- **Query Parameters**:
  - `deleteFiles` *(boolean, optional, default `false`)*: When `true`, physically deletes all associated ROM files from disk.
- **Response `202 Accepted`**:
  ```json
  {
    "success": true,
    "message": "Game game:chrono-trigger deleted."
  }
  ```

---

## 3. ROMs (`/api/roms`)

### `GET /api/roms`
List all active ROM files registered in the library (excludes items with `pendingDelete: true`).

- **Response `200 OK`**:
  ```json
  [
    {
      "id": "e838cb35-b280-4cfd-b2a8-f9b8ecf30bdf",
      "gameId": "game:super-mario-world",
      "systemId": "snes",
      "filename": "Super Mario World (USA).sfc",
      "path": "/roms/snes/Super Mario World (USA).sfc",
      "size": 524288,
      "region": "USA",
      "crc32": "B19ED489",
      "md5": "cdd3c8c373200e88f45e22304a2fe1e1",
      "pendingDelete": false
    }
  ]
  ```

### `DELETE /api/roms/:id`
Marks a ROM as `pendingDelete: true` and queues it for physical removal by the background deletion worker.

- **Response `202 Accepted`**:
  ```json
  {
    "success": true,
    "message": "ROM e838cb35-b280-4cfd-b2a8-f9b8ecf30bdf marked for deletion."
  }
  ```

---

## 4. Systems & Platforms (`/api/systems`)

### `GET /api/systems`
List all supported emulation systems.

- **Response `200 OK`**:
  ```json
  [
    {
      "id": "snes",
      "name": "Super Nintendo",
      "slug": "snes",
      "path": "snes"
    }
  ]
  ```

### `POST /api/systems`
Manually create a new platform mapping.

- **Request Body**:
  ```json
  {
    "id": "ps2",
    "name": "PlayStation 2",
    "slug": "ps2",
    "path": "ps2"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "status": "success",
    "system": { "id": "ps2", "name": "PlayStation 2", "slug": "ps2", "path": "ps2" }
  }
  ```

### `GET /api/systems/:slug`
Fetch a specific system by slug along with its mapped firmware definitions and associated games.

- **Response `200 OK`**:
  ```json
  {
    "id": "snes",
    "name": "Super Nintendo",
    "slug": "snes",
    "path": "snes",
    "firmware": [],
    "games": []
  }
  ```

---

## 5. Directory Scanning (`/api/scans`)

### `GET /api/scans`
Lists all files currently staged in the `scanned_files` table.

- **Response `200 OK`**:
  ```json
  [
    {
      "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "filename": "Pokemon Emerald.gba",
      "path": "/roms/gba/Pokemon Emerald.gba",
      "size": 16777216,
      "ignored": false,
      "createdAt": "2026-09-19 12:00:00"
    }
  ]
  ```

### `POST /api/scans`
Starts an asynchronous background scan on the designated directory.

- **Request Body** *(optional)*:
  ```json
  {
    "path": "/roms"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "status": "started"
  }
  ```

---

## 6. ROM Ingestion (`/api/import`)

### `POST /api/import`
Maps a staged file from `scanned_files` to a Game and creates a corresponding `roms` entry.

- **Request Body**:
  ```json
  {
    "scannedFileId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "systemId": "gba",
    "region": "USA",
    "gameId": "game:pokemon-emerald-version",
    "gameData": {
      "title": "Pokemon Emerald Version",
      "description": "...",
      "coverUrl": "https://...",
      "year": "2004",
      "rating": 4.6
    }
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "status": "success"
  }
  ```

---

## 7. Unmapped Files (`/api/unmapped`)

### `GET /api/unmapped`
Returns all staged scanned files that have not been ignored.

### `POST /api/unmapped/:id/ignore`
Marks a specific scanned file as ignored so it no longer appears in triage.

- **Response `200 OK`**: `{"success": true}`

### `POST /api/unmapped/bulk-ignore`
Ignores multiple staged files in a single operation.

- **Request Body**:
  ```json
  {
    "ids": ["id-1", "id-2", "id-3"]
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "count": 3
  }
  ```

### `DELETE /api/unmapped` (or `POST /api/unmapped/clear`)
Clears all staged records from the unmapped files table, allowing a clean rescan.

- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "All unmapped files cleared."
  }
  ```

---

## 8. Firmware & BIOS (`/api/firmware`)

### `GET /api/firmware`
List all mapped system firmware files.

### `POST /api/firmware`
Map a physical file as required firmware for a specific system.

- **Request Body**:
  ```json
  {
    "systemId": "psx",
    "filename": "scph1001.bin",
    "path": "/roms/bios/scph1001.bin",
    "description": "PlayStation BIOS (USA)",
    "md5": "924e392ed05558ffdb115408c163d860",
    "crc32": "371573f4"
  }
  ```
- **Response `200 OK`**: Returns the inserted firmware record.
- **Response `409 Conflict`**: Path already mapped.

### `DELETE /api/firmware/:id`
Unmaps a firmware entry (does not delete physical file on disk).

- **Response `200 OK`**: `{"success": true, "message": "Firmware ... removed."}`

---

## 9. Settings (`/api/settings`)

### `GET /api/settings`
Returns all key-value settings.

### `POST /api/settings`
Updates or inserts a setting. If `key === "roms_dir"`, automatically dispatches a library scan in the background.

- **Request Body**:
  ```json
  {
    "key": "roms_dir",
    "value": "/mnt/storage/roms"
  }
  ```

---

## 10. External Metadata (`/api/metadata`)

### `GET /api/metadata/search?q=:query`
Search the external RAWG database for game titles.

### `GET /api/metadata/platforms`
Retrieve the complete platform list from RAWG.

---

## 11. Real-Time Events (`/api/events`)

### `GET /api/events`
Opens a persistent Server-Sent Events (SSE) stream.

- **Headers**:
  ```http
  Content-Type: text/event-stream
  Cache-Control: no-cache
  Connection: keep-alive
  ```
- **Event format**:
  ```
  event: update
  id: 1726715000000
  data: {"type":"progress","count":120,"currentFile":"Sonic.bin"}
  ```

---

## 12. WebDAV (`/webdav/*`)

The embedded WebDAV server handles network file requests rooted in the configured `roms_dir`.

Supported methods: `PROPFIND`, `GET`, `HEAD`, `OPTIONS`, `PUT`, `DELETE`, `MKCOL`, `MOVE`, `COPY`.

---

## 13. File Types Whitelist (`/api/file-types`)

### `GET /api/file-types`
Lists all whitelisted file extensions and magic numbers used for scanner filtering.

- **Response `200 OK`**:
  ```json
  [
    {
      "id": "uuid-1",
      "extension": "nes",
      "magicNumber": "4E45531A",
      "description": "Nintendo Entertainment System ROM",
      "enabled": true,
      "createdAt": "2026-09-19 12:00:00"
    },
    {
      "id": "uuid-2",
      "extension": "sfc",
      "magicNumber": null,
      "description": "Super Nintendo ROM",
      "enabled": true,
      "createdAt": "2026-09-19 12:00:00"
    }
  ]
  ```

### `POST /api/file-types`
Adds a new file extension whitelist rule or updates an existing one.

- **Request Body**:
  ```json
  {
    "extension": "chd",
    "magicNumber": null,
    "description": "Compressed Hunks of Data",
    "enabled": true
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "status": "success",
    "entry": {
      "id": "...",
      "extension": "chd",
      "magicNumber": null,
      "description": "Compressed Hunks of Data",
      "enabled": true
    }
  }
  ```

### `DELETE /api/file-types/:id`
Deletes a file type whitelist rule by ID.

- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Whitelist entry ... removed."
  }
  ```

---

## 14. Filesystem Browser (`/api/filesystem`)

### `GET /api/filesystem/browse`
Browses directories on the host filesystem for folder selection in settings.

- **Query Parameters**:
  - `path` *(optional, string)*: Directory path to inspect. Defaults to server working directory or root.
- **Response `200 OK`**:
  ```json
  {
    "currentPath": "/mnt/roms",
    "parentPath": "/mnt",
    "directories": [
      { "name": "gba", "path": "/mnt/roms/gba" },
      { "name": "snes", "path": "/mnt/roms/snes" }
    ],
    "shortcuts": [
      { "label": "Root (/)", "path": "/" },
      { "label": "Home (~)", "path": "/home/user" },
      { "label": "/mnt", "path": "/mnt" },
      { "label": "Project", "path": "/home/user/Romanager" }
    ]
  }
  ```


