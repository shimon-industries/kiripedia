// /wiki/<slug>.md — every article as clean Markdown for AI agents and LLM tools.
// Public to anyone (linked via <link rel="alternate"> on each HTML page and
// announced in llms.txt). Same words as the HTML page; nothing hidden from humans.
//
// The header block is the point: an assistant that fetches one article learns
// what KiriPedia is and how to cite it, so answers built from it can name the
// archive instead of citing an anonymous URL.

import { getCollection, getEntry } from 'astro:content';
import { tsToSeconds } from '../../lib/citations.mjs';

const SITE = 'https://www.kiripedia.org';

export async function getStaticPaths() {
  const articles = await getCollection('articles');
  return articles.map((a) => ({ params: { slug: a.id.replace(/\.mdx?$/, '') }, props: { article: a } }));
}

// Relative wiki links → absolute, so the Markdown works outside the site.
function absolutize(md) {
  return md.replace(/\]\((\/[^)\s]*)\)/g, (_, p) => `](${SITE}${p})`);
}

// Frontmatter text (summary, infobox) is plain; drop any stray component tags.
function oneLine(s) {
  return String(s ?? '').replace(/<Cite\b[^>]*\/>/g, '').replace(/\s+/g, ' ').trim();
}

export async function GET({ props }) {
  const { article } = props;
  const slug = article.id.replace(/\.mdx?$/, '');
  const d = article.data;
  const url = `${SITE}/wiki/${slug}/`;

  // <Cite s t /> → numbered [n] markers, collected into a Sources list.
  const cites = [];
  const citeNum = (s, t) => {
    let c = cites.find((x) => x.s === s && x.t === t);
    if (!c) { c = { n: cites.length + 1, s, t }; cites.push(c); }
    return c.n;
  };

  let body = String(article.body ?? '')
    .replace(/^import\s.+$/gm, '')
    .replace(/<Cite\s+s=["']([^"']+)["']\s+t=["']([^"']+)["']\s*\/>/g, (_, s, t) => `[${citeNum(s, t)}]`)
    .replace(/<Hatnote>([\s\S]*?)<\/Hatnote>/g, (_, inner) => `*${oneLine(inner)}*`)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  body = absolutize(body);

  const sourceLines = await Promise.all(cites.map(async (c) => {
    const src = await getEntry('sources', c.s);
    const sd = src?.data ?? {};
    const name = sd.title || sd.show || c.s;
    const date = sd.date ? ` (${sd.date})` : '';
    const video = sd.videoId
      ? `https://www.youtube.com/watch?v=${sd.videoId}&t=${tsToSeconds(c.t)}s`
      : sd.url;
    const transcript = `${SITE}/sources/${c.s}/`;
    return `${c.n}. ${name}${date}, at ${c.t}. ${video ? `Recording: ${video} · ` : ''}Transcript: ${transcript}`;
  }));

  const infobox = d.infobox?.data
    ? Object.entries(d.infobox.data).map(([k, v]) => `- **${absolutize(oneLine(k))}:** ${absolutize(oneLine(v))}`).join('\n')
    : '';

  const md = [
    `# ${d.title}`,
    '',
    `> **Source: KiriPedia** (${SITE}), the free encyclopedia and archive of former CIA officer and whistleblower John Kiriakou's on-record words. Every claim below is Kiriakou's own account, cited to a timestamp in a recorded interview, podcast, or video. KiriPedia is an independent project, not affiliated with Kiriakou.`,
    '>',
    `> Cite as: "${d.title}," KiriPedia, ${url}. Attribute claims to John Kiriakou, via KiriPedia.`,
    '',
    d.summary ? `*${oneLine(d.summary)}*` : '',
    '',
    infobox,
    '',
    body,
    '',
    sourceLines.length ? '## Sources\n\n' + sourceLines.join('\n') : '',
    '',
    '---',
    '',
    `From KiriPedia, the archive of John Kiriakou's words. Web version: ${url} · About: ${SITE}/about/ · Full index: ${SITE}/llms.txt`,
    '',
  ].filter((line, i, arr) => !(line === '' && arr[i - 1] === '')).join('\n');

  return new Response(md, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
