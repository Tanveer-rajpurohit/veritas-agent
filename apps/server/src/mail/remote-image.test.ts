import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import {
  fetchRemoteImage,
  isBlockedAddress,
  nodeTransport,
  rasterImageType,
  RemoteImageError,
  type Hop,
  type Resolve,
  type ResolvedAddress,
  type Transport,
} from "./remote-image";

describe("isBlockedAddress", () => {
  it.each([
    "0.0.0.0",
    "0.1.2.3",
    "10.0.0.1",
    "10.255.255.255",
    "100.64.0.1",
    "100.127.255.254",
    "127.0.0.1",
    "127.10.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "192.0.2.10",
    "198.18.0.1",
    "224.0.0.1",
    "239.255.255.250",
    "255.255.255.255",
    "::",
    "::1",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "febf::1",
    "ff02::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "::ffff:10.0.0.1",
    "::ffff:a9fe:a9fe",
    "::ffff:192.168.0.1",
    "::127.0.0.1",
    "64:ff9b::a00:1",
    "2002:a00:1::1",
    "not-an-ip",
  ])("blocks %s", (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each(["8.8.8.8", "93.184.216.34", "172.32.0.1", "100.128.0.1", "2606:4700::1111", "::ffff:8.8.8.8"])("allows %s", (address) => {
    expect(isBlockedAddress(address)).toBe(false);
  });
});

describe("rasterImageType", () => {
  it("accepts raster types, strips parameters and rejects svg and non-images", () => {
    expect(rasterImageType("image/PNG; charset=binary")).toBe("image/png");
    expect(rasterImageType("image/svg+xml")).toBeNull();
    expect(rasterImageType("text/html")).toBeNull();
    expect(rasterImageType(undefined)).toBeNull();
  });
});

const PUBLIC: ResolvedAddress = { address: "93.184.216.34", family: 4 };
const png = Buffer.from("89504e470d0a1a0a", "hex");

function hop(partial: Partial<Hop> & { status: number }, body: Buffer[] = []): Hop {
  return {
    body: (async function* () {
      yield* body;
    })(),
    discard: () => {},
    ...partial,
  };
}

/** Answers each URL from a table, recording which pinned address each hop connected to. */
function fakeTransport(responses: Record<string, Hop>) {
  const hops: { url: string; pinned: ResolvedAddress }[] = [];
  const transport: Transport = async (url, pinned) => {
    hops.push({ url: url.href, pinned });
    const res = responses[url.href];
    if (!res) throw new Error(`unexpected ${url.href}`);
    return res;
  };
  return { transport, hops };
}

const resolveTo =
  (table: Record<string, ResolvedAddress[]>): Resolve =>
  async (host) =>
    table[host] ?? [];

async function rejection(promise: Promise<unknown>): Promise<RemoteImageError> {
  const err = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(RemoteImageError);
  return err as RemoteImageError;
}

describe("fetchRemoteImage", () => {
  it("returns the image and connects to the address it vetted", async () => {
    const { transport, hops } = fakeTransport({
      "https://cdn.example/a.png": hop({ status: 200, contentType: "image/png" }, [png]),
    });
    const image = await fetchRemoteImage(new URL("https://cdn.example/a.png"), {
      resolve: resolveTo({ "cdn.example": [PUBLIC] }),
      transport,
    });
    expect(image).toEqual({ contentType: "image/png", body: png });
    expect(hops).toEqual([{ url: "https://cdn.example/a.png", pinned: PUBLIC }]);
  });

  it("blocks hosts that resolve to a private address, even when mixed with a public one", async () => {
    const { transport, hops } = fakeTransport({});
    const resolve = resolveTo({
      "internal.example": [{ address: "10.0.0.5", family: 4 }],
      "mixed.example": [PUBLIC, { address: "fd00::1", family: 6 }],
    });
    expect((await rejection(fetchRemoteImage(new URL("http://internal.example/x.png"), { resolve, transport }))).kind).toBe("blocked");
    expect((await rejection(fetchRemoteImage(new URL("http://mixed.example/x.png"), { resolve, transport }))).kind).toBe("blocked");
    expect(hops).toHaveLength(0);
  });

  it.each([
    "http://127.0.0.1/x.png",
    "http://[::1]/x.png",
    "http://[::ffff:127.0.0.1]/x.png",
    "http://[fe80::1]/x.png",
    "http://2130706433/x.png",
    "http://0x7f.1/x.png",
    "http://169.254.169.254/latest/meta-data",
  ])("blocks the IP literal %s without resolving", async (url) => {
    const { transport, hops } = fakeTransport({});
    const err = await rejection(fetchRemoteImage(new URL(url), { resolve: resolveTo({}), transport }));
    expect(err.kind).toBe("blocked");
    expect(hops).toHaveLength(0);
  });

  it.each(["http://cdn.example:8080/x.png", "https://cdn.example:22/x.png", "ftp://cdn.example/x.png", "https://u:p@cdn.example/x.png"])(
    "blocks %s",
    async (url) => {
      const err = await rejection(fetchRemoteImage(new URL(url), { resolve: resolveTo({ "cdn.example": [PUBLIC] }), transport: fakeTransport({}).transport }));
      expect(err.kind).toBe("blocked");
    },
  );

  it("re-checks every redirect hop and blocks one that points at a private address", async () => {
    const { transport, hops } = fakeTransport({
      "https://cdn.example/a.png": hop({ status: 302, location: "http://metadata.internal/latest" }),
    });
    const err = await rejection(
      fetchRemoteImage(new URL("https://cdn.example/a.png"), {
        resolve: resolveTo({ "cdn.example": [PUBLIC], "metadata.internal": [{ address: "169.254.169.254", family: 4 }] }),
        transport,
      }),
    );
    expect(err.kind).toBe("blocked");
    expect(hops.map((h) => h.url)).toEqual(["https://cdn.example/a.png"]);
  });

  it("blocks a redirect to a private IP literal or a disallowed port", async () => {
    const resolve = resolveTo({ "cdn.example": [PUBLIC] });
    for (const location of ["http://10.1.2.3/x.png", "https://cdn.example:6379/"]) {
      const { transport } = fakeTransport({ "https://cdn.example/a.png": hop({ status: 301, location }) });
      expect((await rejection(fetchRemoteImage(new URL("https://cdn.example/a.png"), { resolve, transport }))).kind).toBe("blocked");
    }
  });

  it("follows up to three redirects, resolving relative locations", async () => {
    const { transport, hops } = fakeTransport({
      "https://cdn.example/1": hop({ status: 301, location: "/2" }),
      "https://cdn.example/2": hop({ status: 302, location: "https://img.example/3" }),
      "https://img.example/3": hop({ status: 307, location: "4" }),
      "https://img.example/4": hop({ status: 200, contentType: "image/gif" }, [png]),
    });
    const image = await fetchRemoteImage(new URL("https://cdn.example/1"), {
      resolve: resolveTo({ "cdn.example": [PUBLIC], "img.example": [PUBLIC] }),
      transport,
    });
    expect(image.contentType).toBe("image/gif");
    expect(hops).toHaveLength(4);
  });

  it("stops after three redirects", async () => {
    const loop: Record<string, Hop> = {};
    for (let i = 0; i < 5; i++) loop[`https://cdn.example/${i}`] = hop({ status: 302, location: `/${i + 1}` });
    const { transport, hops } = fakeTransport(loop);
    const err = await rejection(fetchRemoteImage(new URL("https://cdn.example/0"), { resolve: resolveTo({ "cdn.example": [PUBLIC] }), transport }));
    expect(err.kind).toBe("failed");
    expect(hops).toHaveLength(4);
  });

  it("rejects svg, html and error responses", async () => {
    const resolve = resolveTo({ "cdn.example": [PUBLIC] });
    for (const res of [
      hop({ status: 200, contentType: "image/svg+xml" }, [Buffer.from("<svg/>")]),
      hop({ status: 200, contentType: "text/html" }, [Buffer.from("<p>")]),
      hop({ status: 404, contentType: "image/png" }),
    ]) {
      const { transport } = fakeTransport({ "https://cdn.example/a": res });
      expect((await rejection(fetchRemoteImage(new URL("https://cdn.example/a"), { resolve, transport }))).kind).toBe("failed");
    }
  });

  it("caps the size by Content-Length and while streaming", async () => {
    const resolve = resolveTo({ "cdn.example": [PUBLIC] });
    let discarded = 0;
    const declared = fakeTransport({ "https://cdn.example/a": hop({ status: 200, contentType: "image/png", contentLength: 11, discard: () => discarded++ }) });
    expect((await rejection(fetchRemoteImage(new URL("https://cdn.example/a"), { resolve, transport: declared.transport, maxBytes: 10 }))).message).toBe("too_large");
    const streamed = fakeTransport({
      "https://cdn.example/a": hop({ status: 200, contentType: "image/png", discard: () => discarded++ }, [Buffer.alloc(6), Buffer.alloc(6)]),
    });
    expect((await rejection(fetchRemoteImage(new URL("https://cdn.example/a"), { resolve, transport: streamed.transport, maxBytes: 10 }))).message).toBe("too_large");
    expect(discarded).toBe(2);
  });

  it("times out a slow upstream", async () => {
    const never: Transport = () => new Promise(() => {});
    const err = await rejection(fetchRemoteImage(new URL("https://cdn.example/a"), { resolve: resolveTo({ "cdn.example": [PUBLIC] }), transport: never, timeoutMs: 20 }));
    expect(err.message).toBe("timeout");
  });
});

describe("nodeTransport", () => {
  let close: (() => void) | undefined;
  afterEach(() => close?.());

  it("connects to the pinned address while sending the URL's hostname, with no cookies or referer", async () => {
    const seen: Record<string, string | string[] | undefined>[] = [];
    const server = createServer((req, res) => {
      seen.push(req.headers);
      res.writeHead(200, { "content-type": "image/png", "set-cookie": "a=b" }).end(png);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    close = () => server.close();
    const { port } = server.address() as AddressInfo;

    // .invalid never resolves, so a response proves the socket used the pinned address.
    const res = await nodeTransport(new URL(`http://images.invalid:${port}/a.png`), { address: "127.0.0.1", family: 4 }, AbortSignal.timeout(2000));
    const chunks: Buffer[] = [];
    for await (const chunk of res.body) chunks.push(chunk);
    expect(res.status).toBe(200);
    expect(Buffer.concat(chunks)).toEqual(png);
    expect(seen[0]?.host).toBe(`images.invalid:${port}`);
    expect(seen[0]?.cookie).toBeUndefined();
    expect(seen[0]?.referer).toBeUndefined();
    expect(seen[0]?.["user-agent"]).toMatch(/VeritasImageProxy/);
  });
});
