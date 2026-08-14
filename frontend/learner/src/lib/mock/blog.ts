/** Published articles shown on the public blog. */

const IMG = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const cx = 110 + (h % 6) * 26;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#241f1a"/><g transform="rotate(${8 + (h % 5) * 7} 320 180)"><circle cx="${cx}" cy="150" r="120" fill="none" stroke="#a56d2d" stroke-width="14"/><circle cx="${cx}" cy="150" r="82" fill="none" stroke="#cf9350" stroke-width="8" opacity="0.7"/></g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " "))}`;
};

export const BLOG_CATEGORIES = [
  { id: "bcat-1", name: "Exam strategy", slug: "exam-strategy", isActive: true },
  { id: "bcat-2", name: "Career", slug: "career", isActive: true },
  { id: "bcat-3", name: "Product updates", slug: "product-updates", isActive: true },
];

export const BLOG_POSTS = [
  {
    id: "post-1",
    title: "How to build a revision cycle you will actually finish",
    slug: "revision-cycle",
    categoryId: "bcat-1",
    categoryName: "Exam strategy",
    excerpt:
      "Most plans fail because they are built around motivation. Here is a schedule built around forgetting curves instead.",
    content:
      "Most revision plans fail in week three. Not because the plan was wrong, but because it assumed you would feel like following it.\n\nA schedule built on forgetting curves does not need you to feel anything. You revisit a topic on day one, day three, day seven and day twenty-one, and the interval widens as recall gets easier. The work shrinks as you get better, which is the opposite of how most plans behave.\n\nStart with one subject. Put four dates in a calendar for every chapter you finish. When a date arrives, spend fifteen minutes recalling the chapter without opening the book, then check what you missed. That is the whole method.",
    coverImage: IMG("post-1"),
    authorName: "Anand Krishnan",
    readMinutes: 6,
    status: "PUBLISHED",
    publishedAt: "2026-07-22T09:00:00.000Z",
  },
  {
    id: "post-2",
    title: "Reading the question before you read the options",
    slug: "reading-the-question",
    categoryId: "bcat-1",
    categoryName: "Exam strategy",
    excerpt:
      "A habit that adds four or five marks in prelims without any extra study.",
    content:
      "In a negative-marking paper, the options are designed to look plausible. Read them first and you anchor on whichever one feels familiar.\n\nCover the options. Read the question. Answer it in your head. Then uncover.\n\nIt costs about two seconds a question and it removes the single most common source of avoidable error.",
    coverImage: IMG("post-2"),
    authorName: "Anand Krishnan",
    readMinutes: 4,
    status: "PUBLISHED",
    publishedAt: "2026-06-14T09:00:00.000Z",
  },
  {
    id: "post-3",
    title: "What a hiring manager looks for in an analytics portfolio",
    slug: "analytics-portfolio",
    categoryId: "bcat-2",
    categoryName: "Career",
    excerpt:
      "Three dashboards done properly beat twelve half-finished notebooks.",
    content:
      "Every portfolio review starts the same way: the reviewer opens one project and asks what decision it would change.\n\nIf the answer is nothing, the technical work does not matter. Pick a dataset where a real decision exists, state the decision at the top, and show the number that moves it.\n\nThree projects like that will outperform a repository of tutorials every time.",
    coverImage: IMG("post-3"),
    authorName: "Rahul Deshpande",
    readMinutes: 7,
    status: "PUBLISHED",
    publishedAt: "2026-05-30T09:00:00.000Z",
  },
  {
    id: "post-5",
    title: "Switching careers at thirty-two",
    slug: "switching-at-32",
    categoryId: "bcat-2",
    categoryName: "Career",
    excerpt:
      "A learner's account of moving from operations into data, part-time, over eleven months.",
    content:
      "I kept my job the whole way through. That constraint turned out to be the useful part: it forced the plan into evenings and two hours on Sunday, which is a pace you can hold.\n\nMonths one to four were SQL only. Months five to eight added pandas and one real project. The last three months were interviews.\n\nThe thing nobody tells you is that the first six weeks feel like no progress at all, and then it compounds.",
    coverImage: IMG("post-5"),
    authorName: "Fatima Sheikh",
    readMinutes: 9,
    status: "PUBLISHED",
    publishedAt: "2026-04-18T09:00:00.000Z",
  },
  {
    id: "post-6",
    title: "Certificates now issue automatically",
    slug: "auto-certificates",
    categoryId: "bcat-3",
    categoryName: "Product updates",
    excerpt:
      "Finish the final assessment and the certificate lands in your dashboard within a minute.",
    content:
      "Previously certificates were issued in a weekly batch, which meant finishing a course on a Monday and waiting until Friday.\n\nThey are now generated the moment the final assessment is passed, with a verification QR code that anyone can check against a public page.\n\nCertificates already earned have been reissued in the new format. Nothing needs doing on your side.",
    coverImage: IMG("post-6"),
    authorName: "grotutor",
    readMinutes: 2,
    status: "PUBLISHED",
    publishedAt: "2026-08-01T09:00:00.000Z",
  },
];
