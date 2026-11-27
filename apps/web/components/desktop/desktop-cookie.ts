/** Which desktop a viewer last used in a workspace; read by the server layout, written by the client. */
export const desktopCookieName = (workspaceId: string) => `vt-desktop-${workspaceId}`;
