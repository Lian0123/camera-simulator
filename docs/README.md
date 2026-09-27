# Development notes

See the top-level README for install, validation, local data, and GitHub Pages instructions. Application modules are organized by the camera model (`src/camera`), reusable panels (`src/components`), translations (`src/i18n`), and browser photo library (`src/storage`).

The `schemaVersion` field on a settings export is an intentional compatibility boundary. Increment it before changing the public JSON shape.
