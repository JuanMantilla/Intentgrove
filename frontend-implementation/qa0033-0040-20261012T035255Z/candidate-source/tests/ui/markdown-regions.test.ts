import { describe, expect, it } from 'vitest';
import { parseBounded } from '../../src/reader/bounded-parser';
const padding = '\n\n' + 'x'.repeat(70_000) + '\n\n';
const nodes = (value: unknown): any[] => {
  const all: any[] = [], pending: any[] = [value];
  while (pending.length) { const node = pending.pop(); all.push(node); if (node.children) pending.push(...[...node.children].reverse()); }
  return all;
};
describe('Markdown semantic regions under bounded parsing', () => {
  it('keeps loose nested lists as one list across blank lines', () => {
    const source = '# Before\n\n- first\n\n  continuation [guide][g]\n\n  - child\n\n- second\n\n[g]: guide.md "Guide"' + padding + '# After';
    const result = parseBounded(source);
    const lists = result.tree.children.filter(node => node.type === 'list');
    expect(lists).toHaveLength(1);
    expect(lists[0].children).toHaveLength(2);
    expect(nodes(lists[0]).some(node => node.type === 'list' && node !== lists[0])).toBe(true);
    expect(nodes(result.tree).some(node => node.type === 'heading' && node.children[0].value === 'After')).toBe(true);
  });
  it('does not resolve a reference using a definition inside fenced code', () => {
    const result = parseBounded('[guide][g]\n\n```md\n[g]: attacker.md\n```' + padding + '# After');
    expect(nodes(result.tree).filter(node => node.type === 'linkReference')).toHaveLength(0);
    expect(result.blocks.some(block => block.tree.children.some(node => node.type === 'definition' && node.url === 'attacker.md'))).toBe(false);
  });
  it('retains multiline definitions, forward references and encoded footnote targets', () => {
    const result = parseBounded('[guide][g] first[^a%20b], again[^a%20b].\n\n[g]: guide.md\n  "Multiline title"\n\n[^a%20b]: note\n\n    second paragraph' + padding + '# End');
    const all = nodes(result.tree);
    expect(result.blocks.some(block => block.tree.children.some(node => node.type === 'definition' && node.title === 'Multiline title'))).toBe(true);
    const links = all.filter(node => node.type === 'link' && node.url === '#fn-a%2520b');
    expect(links.map(node => node.data.hProperties.id)).toEqual(['fnref-a%20b-1','fnref-a%20b-2']);
    expect(all.filter(node => node.data?.hProperties?.id === 'fn-a%20b')).toHaveLength(1);
    expect(all.some(node => node.type === 'text' && node.value === 'second paragraph')).toBe(true);
  });
});

// Whole-document and region budgets are UTF-8 bytes, including surrogate pairs.
it("bounds non-ASCII documents and regions by bytes", async () => {
  const { utf8Bytes, documentOverLimit } = await import("../../src/reader/bounded-parser");
  expect(utf8Bytes("Aé☰😀")).toBe(10);
  expect(documentOverLimit("é".repeat(5 * 1024 * 1024 + 1))).toBe(true);
  const parsed = parseBounded("é".repeat(33000));
  expect(parsed.blocks.every(block => block.fallback)).toBe(true);
});
