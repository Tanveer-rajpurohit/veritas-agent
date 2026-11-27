import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("veritasDesktop", { platform: process.platform });
