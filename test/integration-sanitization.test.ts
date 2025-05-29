import { describe, expect, it } from "bun:test";
import { formatBody, formatComments } from "../src/github/data/formatter";
import type { GitHubComment } from "../src/github/types";

describe("Integration: Text Sanitization", () => {
  it("should sanitize text in issue body", () => {
    const body = `
# Title text

Some content here.

Here's an image: <img alt="some alt text" src="image.jpg">

And a markdown image: ![image text](screenshot.png)

Check this link: [Click here](https://example.com "link title")

Text with hidden​‌‍characters

<div data-prompt="test data" aria-label="label text" title="title text">
  Content with attributes
</div>

Entity-encoded: &#72;&#69;&#76;&#76;&#79;

Direction: ‮reversed‬ text

<input placeholder="placeholder text" type="text">

Text­with­soft­hyphens

More text: with‌zero‍width​characters`;

    const imageUrlMap = new Map<string, string>();
    const result = formatBody(body, imageUrlMap);

    expect(result).not.toContain("some alt text");
    expect(result).not.toContain("image text");
    expect(result).not.toContain("link title");
    expect(result).not.toContain("test data");
    expect(result).not.toContain("label text");
    expect(result).not.toContain("title text");
    expect(result).not.toContain("placeholder text");
    expect(result).not.toContain('alt="');
    expect(result).not.toContain('title="');
    expect(result).not.toContain('aria-label="');
    expect(result).not.toContain('data-prompt="');
    expect(result).not.toContain('placeholder="');
    expect(result).not.toContain("\u200B");
    expect(result).not.toContain("\u200C");
    expect(result).not.toContain("\u200D");
    expect(result).not.toContain("\u00AD");
    expect(result).not.toContain("\u202E");
    expect(result).not.toContain("&#72;");

    expect(result).toContain("# Title text");
    expect(result).toContain("Some content here.");
    expect(result).toContain("Here's an image:");
    expect(result).toContain('<img src="image.jpg">');
    expect(result).toContain("![](screenshot.png)");
    expect(result).toContain("[Click here](https://example.com)");
    expect(result).toContain("Content with attributes");
    expect(result).toContain("HELLO");
    expect(result).toContain('<input type="text">');
  });

  it("should sanitize text in comments", () => {
    const comments: GitHubComment[] = [
      {
        id: "1",
        databaseId: "100001",
        body: `Comment text
        
Check this: ![description text](image.png)
[Documentation](https://docs.com "doc title")

Text​‌‍with characters

<span aria-label="span label" data-cmd="data value">Visible text</span>`,
        author: { login: "user1" },
        createdAt: "2023-01-01T00:00:00Z",
      },
    ];

    const result = formatComments(comments);

    expect(result).not.toContain("description text");
    expect(result).not.toContain("doc title");
    expect(result).not.toContain("span label");
    expect(result).not.toContain("data value");
    expect(result).not.toContain('aria-label="');
    expect(result).not.toContain('data-cmd="');
    expect(result).not.toContain("\u200B");
    expect(result).not.toContain("\u200C");
    expect(result).not.toContain("\u200D");

    expect(result).toContain("Comment text");
    expect(result).toContain("![](image.png)");
    expect(result).toContain("[Documentation](https://docs.com)");
    expect(result).toContain("Visible text");
    expect(result).toContain("Textwith characters");
  });

  it("should handle complex mixed patterns", () => {
    const content = `
Text content here.

<div title="div​title​text" data-instruction="data&#32;text">
  <img src="image.jpg" alt="img­alt­text">
  Text with ‮reversed‬ content
</div>

![alt text\u200Bwith\u200Ccharacters](image.png)

[link](url.com "title\u00ADtext")

Mix: &#72;idden <span aria-label="&#77;ore">text</span>`;

    const imageUrlMap = new Map<string, string>();
    const result = formatBody(content, imageUrlMap);

    expect(result).not.toContain('title="');
    expect(result).not.toContain('data-instruction="');
    expect(result).not.toContain('alt="');
    expect(result).not.toContain('aria-label="');
    expect(result).not.toContain("\u200B");
    expect(result).not.toContain("\u200C");
    expect(result).not.toContain("\u00AD");
    expect(result).not.toContain("\u202E");

    expect(result).toContain("Text content here.");
    expect(result).toContain("<div>");
    expect(result).toContain('<img src="image.jpg">');
    expect(result).toContain("![](image.png)");
    expect(result).toContain("[link](url.com)");
    expect(result).toContain("Hidden <span>text</span>");
  });

  it("should handle edge cases with empty attributes", () => {
    const edgeCases = `
<img alt="" src="test.jpg">
<div title="" data-x="">Content</div>
![](already-empty.png)
[link](url.com)
Normal text`;

    const imageUrlMap = new Map<string, string>();
    const result = formatBody(edgeCases, imageUrlMap);

    expect(result).toContain('<img src="test.jpg">');
    expect(result).toContain("<div>Content</div>");
    expect(result).toContain("![](already-empty.png)");
    expect(result).toContain("[link](url.com)");
    expect(result).toContain("Normal text");
  });
});
