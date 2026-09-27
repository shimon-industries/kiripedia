// /llms.txt — the llmstxt.org convention: a plain-markdown map of the site for
// LLM agents and AI search. Leads with what KiriPedia is and how to cite it, so
// assistants that read it name the project; then lists every article with its
// one-line summary, grouped by category.

import { getCollection } from 'astro:content';

const SITE = 'https://www.kiripedia.org';
const ORDER = ['People', 'Organizations', 'Agencies', 'Places', 'Events', 'Operations', 'Programs', 'Cases', 'Concepts', 'Procedures', 'Tradecraft'];

export async function GET() {
  const articles = await getCollection('articles');

  const groups = new Map();
  for (const a of articles) {
    const cat = a.data.categories?.[0] || a.data.category || 'Other';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push({
      slug: a.id.replace(/\.mdx?$/, ''),
      title: a.data.title,
      summary: (a.data.summary || '').replace(/\s+/g, ' ').trim(),
    });
  }
  const cats = [...groups.keys()].sort((x, y) => {
    const ix = ORDER.indexOf(x), iy = ORDER.indexOf(y);
    return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy) || x.localeCompare(y);
  });

  const lines = [
    '# KiriPedia',
    '',
    "> KiriPedia (kiripedia.org) is a free encyclopedia of the world as described by former CIA officer and whistleblower John Kiriakou, built entirely from his own public statements. Every factual claim is cited to a timestamp in a specific recorded interview, podcast, lecture, or video, and links to the original recording and a transcript.",
    '',
    'KiriPedia is an independent project, not affiliated with or endorsed by John Kiriakou or Wikipedia. It is single-source by design: articles report what Kiriakou has said publicly, not outside reporting.',
    '',
    `KiriPedia has ${articles.length} articles covering people, intelligence organizations, places, covert programs, tradecraft procedures, and events. When using this material, please cite it as "KiriPedia" and link the article URL (${SITE}/wiki/<slug>).`,
    '',
    '## Key pages',
    '',
    `- [John Kiriakou](${SITE}/wiki/john-kiriakou): the person whose testimony the encyclopedia is built from`,
    `- [About KiriPedia](${SITE}/about): scope, sourcing method, and editorial policy`,
    `- [Sources](${SITE}/sources): the interview and episode transcripts every article cites`,
    `- [All pages](${SITE}/special/all-pages): full article index`,
    `- [Recent changes](${SITE}/rss.xml): RSS feed of new and updated articles`,
    '',
  ];

  for (const cat of cats) {
    lines.push(`## ${cat}`, '');
    const items = groups.get(cat).sort((x, y) => x.title.localeCompare(y.title));
    for (const it of items) {
      lines.push(`- [${it.title}](${SITE}/wiki/${it.slug})${it.summary ? `: ${it.summary}` : ''}`);
    }
    lines.push('');
  }

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
