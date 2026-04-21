import { Metadata } from "next";
import { paragraphs } from "./content";

export const metadata: Metadata = {
  title: "내부정보관리규정 | 셀로맥스사이언스",
  description: "셀로맥스사이언스 내부정보관리규정",
};

const EFFECTIVE_DATE = "2023년 10월 11일";
const AMENDED_DATE = "2024년 3월 28일";

type Article = {
  title: string;
  body: string[];
};

type Chapter = {
  title: string;
  articles: Article[];
};

function isChapterTitle(text: string) {
  return /^제\d+장\s/.test(text) || text === "부 칙";
}

function isArticleTitle(text: string) {
  return /^제\d+조[【(].*[】)]$/.test(text);
}

function parseContent(lines: readonly string[]) {
  const title = lines[0];
  const chapters: Chapter[] = [];
  let currentChapter: Chapter | null = null;
  let currentArticle: Article | null = null;

  for (const line of lines.slice(1)) {
    if (isChapterTitle(line)) {
      currentChapter = { title: line, articles: [] };
      chapters.push(currentChapter);
      currentArticle = null;
      continue;
    }

    if (isArticleTitle(line)) {
      if (!currentChapter) {
        currentChapter = { title: "기타", articles: [] };
        chapters.push(currentChapter);
      }
      currentArticle = { title: line, body: [] };
      currentChapter.articles.push(currentArticle);
      continue;
    }

    if (!currentArticle) {
      continue;
    }

    currentArticle.body.push(line);
  }

  return { title, chapters };
}

function ArticleBlock({ article }: { article: Article }) {
  const isNumberedItem = (line: string) => /^\d+\)\s/.test(line);

  return (
    <article className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900">{article.title}</h3>

      {article.body.map((line, index) => (
        <p
          key={`${article.title}-content-${index}`}
          className={
            isNumberedItem(line)
                ? "mb-2 pl-4 text-sm leading-6 text-gray-700 whitespace-pre-line"
              : "text-sm leading-7 text-gray-700 whitespace-pre-line"
          }
        >
          {line}
        </p>
      ))}
    </article>
  );
}

export default function InternalInfoRegulationPage() {
  const { title, chapters } = parseContent(paragraphs);

  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <header className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{title}</h1>
          <p className="text-sm text-gray-500">시행일 {EFFECTIVE_DATE}</p>
        </header>

        <div className="space-y-10">
          {chapters.map((chapter, chapterIndex) => (
            <section key={`${chapter.title}-${chapterIndex}`} className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">{chapter.title}</h2>
              <div className="space-y-8">
                {chapter.articles.map((article, articleIndex) => (
                  <ArticleBlock
                    key={`${chapter.title}-${articleIndex}-${article.title}`}
                    article={article}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-12 pt-8 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            이 규정은 {EFFECTIVE_DATE}부터 시행한다.
            <br />
            이 규정은 {AMENDED_DATE}부터 시행한다.
          </p>
        </footer>
      </div>
    </div>
  );
}
