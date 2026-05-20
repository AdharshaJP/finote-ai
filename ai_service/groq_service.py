import os
from pathlib import Path
from groq import AsyncGroq
from dotenv import load_dotenv

# Load .env from ai_service/ directory (works whether run from root or inside the folder)
load_dotenv(dotenv_path=Path(__file__).parent / ".env")
load_dotenv()  # also try cwd as fallback

_client = None


def _get_client() -> AsyncGroq:
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise EnvironmentError("GROQ_API_KEY is not set in environment variables.")
        _client = AsyncGroq(api_key=api_key)
    return _client


async def ask_ai(
    prompt: str,
    model: str = "llama-3.3-70b-versatile",
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> str:
    """Call Groq LLM with a prompt and return the text response."""
    client = _get_client()
    response = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content


async def ask_ai_fast(prompt: str, max_tokens: int = 512) -> str:
    """Fast LLM call using the instant model — ideal for chat."""
    return await ask_ai(
        prompt,
        model="llama-3.1-8b-instant",
        temperature=0.5,
        max_tokens=max_tokens,
    )


async def ask_ai_structured(prompt: str) -> str:
    """High-quality structured analysis using the best available model."""
    return await ask_ai(
        prompt,
        model="llama-3.3-70b-versatile",
        temperature=0.4,
        max_tokens=1500,
    )
