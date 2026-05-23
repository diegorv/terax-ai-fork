import { describe, expect, it } from "vitest";
import {
  commitWebUrl,
  hostLabel,
  parseRemoteWebUrl,
  type RemoteWebInfo,
} from "./remoteWebUrl";

describe("parseRemoteWebUrl", () => {
  it("parses https github url", () => {
    expect(parseRemoteWebUrl("https://github.com/owner/repo.git")).toEqual({
      host: "github",
      hostname: "github.com",
      owner: "owner",
      repo: "repo",
      baseUrl: "https://github.com/owner/repo",
    });
  });

  it("parses scp-style github url", () => {
    expect(parseRemoteWebUrl("git@github.com:owner/repo.git")).toEqual({
      host: "github",
      hostname: "github.com",
      owner: "owner",
      repo: "repo",
      baseUrl: "https://github.com/owner/repo",
    });
  });

  it("recognizes gitlab and bitbucket", () => {
    expect(parseRemoteWebUrl("https://gitlab.com/g/r.git")?.host).toBe(
      "gitlab",
    );
    expect(parseRemoteWebUrl("https://bitbucket.org/g/r.git")?.host).toBe(
      "bitbucket",
    );
  });

  it("returns null for empty / null / blank input", () => {
    expect(parseRemoteWebUrl(null)).toBeNull();
    expect(parseRemoteWebUrl(undefined)).toBeNull();
    expect(parseRemoteWebUrl("")).toBeNull();
    expect(parseRemoteWebUrl("   ")).toBeNull();
  });

  it("returns null for unsupported hosts", () => {
    expect(parseRemoteWebUrl("https://gitea.example.com/x/y.git")).toBeNull();
    expect(parseRemoteWebUrl("git@codeberg.org:x/y.git")).toBeNull();
  });

  it("returns null for malformed urls", () => {
    expect(parseRemoteWebUrl("not a url")).toBeNull();
    expect(parseRemoteWebUrl("https://github.com/just-owner")).toBeNull();
  });

  it("strips .git suffix and trailing slash segments", () => {
    expect(parseRemoteWebUrl("https://github.com/o/r")?.repo).toBe("r");
    expect(parseRemoteWebUrl("https://github.com/o/r.git")?.repo).toBe("r");
  });

  it("normalizes hostname casing", () => {
    expect(parseRemoteWebUrl("https://GitHub.com/o/r")?.hostname).toBe(
      "github.com",
    );
  });

  it("accepts www. variants", () => {
    expect(parseRemoteWebUrl("https://www.github.com/o/r")?.host).toBe(
      "github",
    );
  });
});

describe("commitWebUrl", () => {
  const sha = "abc123";

  it("uses /commit/ for github", () => {
    const info: RemoteWebInfo = {
      host: "github",
      hostname: "github.com",
      owner: "o",
      repo: "r",
      baseUrl: "https://github.com/o/r",
    };
    expect(commitWebUrl(info, sha)).toBe(`https://github.com/o/r/commit/${sha}`);
  });

  it("uses /-/commit/ for gitlab", () => {
    const info: RemoteWebInfo = {
      host: "gitlab",
      hostname: "gitlab.com",
      owner: "o",
      repo: "r",
      baseUrl: "https://gitlab.com/o/r",
    };
    expect(commitWebUrl(info, sha)).toBe(
      `https://gitlab.com/o/r/-/commit/${sha}`,
    );
  });

  it("uses /commits/ for bitbucket", () => {
    const info: RemoteWebInfo = {
      host: "bitbucket",
      hostname: "bitbucket.org",
      owner: "o",
      repo: "r",
      baseUrl: "https://bitbucket.org/o/r",
    };
    expect(commitWebUrl(info, sha)).toBe(
      `https://bitbucket.org/o/r/commits/${sha}`,
    );
  });
});

describe("hostLabel", () => {
  it("returns a host-specific label", () => {
    expect(hostLabel({ host: "github" } as RemoteWebInfo)).toMatch(/GitHub/);
    expect(hostLabel({ host: "gitlab" } as RemoteWebInfo)).toMatch(/GitLab/);
    expect(hostLabel({ host: "bitbucket" } as RemoteWebInfo)).toMatch(
      /Bitbucket/,
    );
  });
});
