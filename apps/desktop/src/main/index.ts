import { app, BrowserWindow } from "electron";
import { join } from "node:path";

// The renderer is the Veritas web app; desktop adds local-file powers via preload.
const WEB_ORIGIN = process.env.VERITAS_WEB_ORIGIN ?? "http://localhost:3000";

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: "Veritas",
    webPreferences: {
      preload: join(import.meta.dirname, "../preload/index.mjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  void win.loadURL(WEB_ORIGIN);
}

void app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
