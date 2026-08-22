import json
import os
import re
from typing import Any

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage

from app.schemas import ReviewComment, ReviewRequest, ReviewResponse

load_dotenv()

REVIEW_SYSTEM_PROMPT = """
You are CodeLens, an AI code reviewer.

Review the submitted code for: 
- correctness bugs
- security risks
- bad error handling
- performance problems
- readability and maintainability issues
- missing edge cases

Return only valid JSON with this exact shape:
{
  "summary": "short overall review summary",
  "comments": [
    {
      "severity": "info | low | medium | high",
      "line": 12,
      "issue": "what is wrong",
      "suggestion": "how to improve it"
    }
  ]
}

Rules:
- Do not wrap the JSON in markdown.
- If no issues are found, return an empty comments array.
- Use null for line when a specific line number is not clear.
- Keep comments concise and actionable.
""".strip()


def review_code(request: ReviewRequest) -> ReviewResponse:
    api_key = os.getenv("MISTRAL_API_KEY")
    if not api_key:
        return ReviewResponse(
            summary="Mistral API key is not configured.",
            comments=[
                ReviewComment(
                    severity="high",
                    line=None,
                    issue="Missing MISTRAL_API_KEY environment variable.",
                    suggestion="Add MISTRAL_API_KEY=your_key_here to your .env file.",
                )
            ],
        )

    try:
        from langchain_mistralai import ChatMistralAI
    except ImportError:
        return ReviewResponse(
            summary="Mistral LangChain integration is not installed.",
            comments=[
                ReviewComment(
                    severity="high",
                    line=None,
                    issue="Missing Python package: langchain-mistralai.",
                    suggestion="Run: uv add langchain-mistralai",
                )
            ],
        )

    llm = ChatMistralAI(
        model=os.getenv("MISTRAL_MODEL", "mistral-small-latest"),
        api_key=api_key,
        temperature=0.1,
    )

    user_prompt = f"""
Language: {request.language}

Code:
```{request.language}
{request.code}
```
""".strip()

    try:
        response = llm.invoke(
            [
                SystemMessage(content=REVIEW_SYSTEM_PROMPT),
                HumanMessage(content=user_prompt),
            ]
        )
        raw_content = _message_content_to_text(response.content)
        parsed = _parse_review_json(raw_content)
        return _build_review_response(parsed)
    except Exception as exc:
        return ReviewResponse(
            summary="Code review failed.",
            comments=[
                ReviewComment(
                    severity="high",
                    line=None,
                    issue=f"{type(exc).__name__}: {exc}",
                    suggestion="Check your Mistral API key, model name, network connection, and request body.",
                )
            ],
        )


def _message_content_to_text(content: Any) -> str:
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"])
        return "\n".join(parts)

    return str(content)


def _parse_review_json(raw_content: str) -> dict[str, Any]:
    cleaned = raw_content.strip()

    fenced_match = re.search(r"```(?:json)?\s*(.*?)\s*```", cleaned, re.DOTALL)
    if fenced_match:
        cleaned = fenced_match.group(1).strip()

    return json.loads(cleaned)


def _build_review_response(parsed: dict[str, Any]) -> ReviewResponse:
    comments = []
    for item in parsed.get("comments", []):
        comments.append(
            ReviewComment(
                severity=str(item.get("severity", "info")),
                line=item.get("line"),
                issue=str(item.get("issue", "")),
                suggestion=str(item.get("suggestion", "")),
            )
        )

    return ReviewResponse(
        summary=str(parsed.get("summary", "Review completed.")),
        comments=comments,
    )
