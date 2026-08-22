import { useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import "./App.css";

type ReviewComment = {
  severity: string;
  line: number | null;
  issue: string;
  suggestion: string;
};

type ReviewResponse = {
  summary: string;
  comments: ReviewComment[];
};

const API_URL = "http://127.0.0.1:8000/review";

const languages = [
  { label: "Python", value: "python", sample: "print('Hello world')" },
  {
    label: "JavaScript",
    value: "javascript",
    sample: "function greet(name) {\n  return `Hello, ${name}`;\n}",
  },
  {
    label: "TypeScript",
    value: "typescript",
    sample: "function add(a: number, b: number): number {\n  return a + b;\n}",
  },
  {
    label: "Java",
    value: "java",
    sample:
      'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello world");\n  }\n}',
  },
  {
    label: "C++",
    value: "cpp",
    sample: '#include <iostream>\n\nint main() {\n  std::cout << "Hello world";\n}',
  },
  {
    label: "Go",
    value: "go",
    sample: 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello world")\n}',
  },
  {
    label: "Rust",
    value: "rust",
    sample: 'fn main() {\n    println!("Hello world");\n}',
  },
];

function App() {
  const [language, setLanguage] = useState(languages[0].value);
  const [code, setCode] = useState(languages[0].sample);
  const [review, setReview] = useState<ReviewResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const selectedLanguage = useMemo(
    () => languages.find((item) => item.value === language) ?? languages[0],
    [language],
  );

  function handleLanguageChange(nextLanguage: string) {
    const next = languages.find((item) => item.value === nextLanguage);
    setLanguage(nextLanguage);
    if (next && !code.trim()) {
      setCode(next.sample);
    }
  }

  async function handleReview() {
    if (!code.trim()) {
      setError("Paste code before requesting a review.");
      setReview(null);
      return;
    }

    setIsLoading(true);
    setError("");
    setReview(null);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language,
          code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail ?? "Review request failed.");
      }

      setReview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <section className="workspace">
        <header className="topbar">
          <div className="brand-block">
            <div className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none"><path d="M8.5 7 4 12l4.5 5M15.5 7 20 12l-4.5 5M13.5 4 10.5 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div>
              <p className="eyebrow">CodeLens</p>
              <h1>Review with confidence.</h1>
              <p className="subheading">A sharper second set of eyes for every pull request.</p>
            </div>
          </div>

          <div className="controls">
            <button className="primary-action" type="button" onClick={handleReview} disabled={isLoading}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m13 3-1.1 6.4L6 11l5.9 1.6L13 19l1.1-6.4L20 11l-5.9-1.6L13 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
              <span>{isLoading ? "Reviewing" : "Review Code"}</span>
            </button>
          </div>
        </header>

        <div className="editor-panel">
          <div className="editor-toolbar">
            <label className="editor-language" htmlFor="language">
              <span>Language</span>
              <select id="language" value={language} onChange={(event) => handleLanguageChange(event.target.value)}>
                {languages.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
          </div>
          <Editor
            height="calc(100% - 47px)"
            language={selectedLanguage.value}
            theme="vs-dark"
            value={code}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              padding: { top: 16, bottom: 16 },
              scrollBeyondLastLine: false,
              wordWrap: "on",
            }}
            onChange={(value) => setCode(value ?? "")}
          />
        </div>
      </section>

      <aside className="review-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Review</p>
            <h2>Findings</h2>
          </div>
          <span className={`result-count ${review?.comments.length === 0 ? "clean" : ""}`}>
            <span className="count-indicator" />{review ? `${review.comments.length} comments` : "Ready to scan"}
          </span>
        </div>

        {error && <div className="status error">{error}</div>}

        {!error && isLoading && (
          <div className="status">Reading the code and checking for issues...</div>
        )}

        {!error && !isLoading && !review && (
          <div className="empty-state">
            Paste code, choose a language, and run a review.
          </div>
        )}

        {review && (
          <div className="review-results">
            <section className="summary">
              <div className="summary-icon">✓</div>
              <h3>Summary</h3>
              <p>{review.summary}</p>
            </section>

            <section className="comments">
              <h3>Comments</h3>
              {review.comments.length === 0 ? (
                <div className="clean-state">
                  <div className="clean-state-icon">✓</div>
                  <div>
                    <h4>No issues found</h4>
                    <p>The submitted code passed this review without comments.</p>
                  </div>
                </div>
              ) : (
                review.comments.map((comment, index) => (
                  <article className="comment" key={`${comment.line}-${index}`}>
                    <div className="comment-meta">
                      <span className={`severity ${comment.severity.toLowerCase()}`}>
                        {comment.severity}
                      </span>
                      <span>{comment.line ? `Line ${comment.line}` : "General"}</span>
                    </div>
                    <h4>{comment.issue}</h4>
                    <p>{comment.suggestion}</p>
                  </article>
                ))
              )}
            </section>
          </div>
        )}
      </aside>
    </main>
  );
}

export default App;
