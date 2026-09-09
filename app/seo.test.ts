import { describe, expect, it } from "vitest";
import { metadata } from "./layout";
import robots from "./robots";
import sitemap from "./sitemap";
import { siteDescription, siteTitle, siteUrl, socialTitle } from "@/lib/site";

describe("public site metadata", () => {
  it("pins canonical and social metadata to the production domain", () => {
    expect(metadata.metadataBase?.toString()).toBe(`${siteUrl}/`);
    expect(metadata.title).toBe(siteTitle);
    expect(metadata.description).toBe(siteDescription);
    expect(metadata.alternates?.canonical).toBe("/");
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      url: "/",
      siteName: "WVCM",
      title: socialTitle,
      description: siteDescription,
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: socialTitle,
      description: siteDescription,
    });
  });

  it("allows indexing and advertises the production sitemap", () => {
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/" },
      sitemap: `${siteUrl}/sitemap.xml`,
    });
  });

  it("lists only the canonical single-page URL", () => {
    expect(sitemap()).toEqual([{ url: `${siteUrl}/` }]);
  });
});
