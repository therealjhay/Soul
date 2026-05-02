import { metadata } from "./layout";

describe("layout metadata", () => {
  it("uses SOUL branding", () => {
    expect(metadata.title).toContain("SOUL");
  });
});
