"""LLM service for interacting with AI providers."""

import json
from typing import Any, TypeVar

from anthropic import Anthropic
from openai import OpenAI
from pydantic import BaseModel

from app.config import Settings, get_settings

T = TypeVar("T", bound=BaseModel)


class LLMService:
    """Service for making LLM API calls."""

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()
        self._anthropic_client: Anthropic | None = None
        self._openai_client: OpenAI | None = None

    @property
    def anthropic(self) -> Anthropic:
        """Get Anthropic client (lazy initialization)."""
        if self._anthropic_client is None:
            self._anthropic_client = Anthropic(api_key=self.settings.anthropic_api_key)
        return self._anthropic_client

    @property
    def openai(self) -> OpenAI:
        """Get OpenAI client (lazy initialization)."""
        if self._openai_client is None:
            self._openai_client = OpenAI(api_key=self.settings.openai_api_key)
        return self._openai_client

    async def complete(
        self,
        prompt: str,
        system: str | None = None,
        max_tokens: int = 2000,
        temperature: float = 0.3,
    ) -> str:
        """Generate a completion using the configured LLM provider."""
        if self.settings.llm_provider == "anthropic":
            return await self._complete_anthropic(prompt, system, max_tokens, temperature)
        else:
            return await self._complete_openai(prompt, system, max_tokens, temperature)

    async def complete_json(
        self,
        prompt: str,
        system: str | None = None,
        response_model: type[T] | None = None,
        max_tokens: int = 2000,
        temperature: float = 0.3,
    ) -> dict[str, Any] | T:
        """Generate a JSON completion and optionally parse into a Pydantic model."""
        # Add JSON instruction to system prompt
        json_system = (system or "") + "\n\nYou must respond with valid JSON only. No markdown, no explanation."

        response = await self.complete(prompt, json_system, max_tokens, temperature)

        # Clean up response (remove markdown code blocks if present)
        response = response.strip()
        if response.startswith("```json"):
            response = response[7:]
        if response.startswith("```"):
            response = response[3:]
        if response.endswith("```"):
            response = response[:-3]
        response = response.strip()

        # Parse JSON
        data = json.loads(response)

        # Optionally validate with Pydantic model
        if response_model:
            return response_model.model_validate(data)

        return data

    async def _complete_anthropic(
        self,
        prompt: str,
        system: str | None,
        max_tokens: int,
        temperature: float,
    ) -> str:
        """Generate completion using Anthropic Claude."""
        messages = [{"role": "user", "content": prompt}]

        response = self.anthropic.messages.create(
            model=self.settings.anthropic_model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system or "You are a helpful AI assistant for academic professionals.",
            messages=messages,
        )

        return response.content[0].text

    async def _complete_openai(
        self,
        prompt: str,
        system: str | None,
        max_tokens: int,
        temperature: float,
    ) -> str:
        """Generate completion using OpenAI."""
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        response = self.openai.chat.completions.create(
            model=self.settings.openai_model,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=messages,
        )

        return response.choices[0].message.content or ""


# Global instance
llm_service = LLMService()


def get_llm_service() -> LLMService:
    """Get the LLM service instance."""
    return llm_service
