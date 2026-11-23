"""``GET /v1/models`` — OpenAI-compatible model list.

SDKs and tools (LangChain, IDE plugins, ``client.models.list()``) call this to
discover what they can send as ``model``. It lists, for configured providers
only:

* the catalog aliases (``smart`` / ``balanced`` / ``fast``), ``owned_by: "infermesh"``
* each provider's configured default model
* every concrete model the catalog maps for that provider

Each entry carries an ``infermesh`` extension object (provider, per-1k pricing,
what an alias resolves to). Static: built from config + ``models.yaml`` +
``pricing.yaml``, no upstream calls.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from app.api.deps import CallerDep
from app.config import Settings
from app.model_catalog import ModelCatalog
from app.pricing import PricingTable

router = APIRouter(tags=["gateway"])


def _default_model(settings: Settings, provider: str) -> str:
    if provider == "openai":
        if settings.openai_mode == "azure":
            return settings.azure_openai_deployment or settings.openai_default_model
        return settings.openai_default_model
    return {
        "anthropic": settings.anthropic_default_model,
        "gemini": settings.gemini_default_model,
        "azure_foundry": settings.azure_foundry_model,
    }.get(provider, "")


def _price(pricing: PricingTable, provider: str, model: str) -> dict[str, Any] | None:
    cost = pricing.cost(provider, model, 1000, 1000)
    if cost is None:
        return None
    return {
        "input_per_1k_usd": float(cost.input_cost_usd),
        "output_per_1k_usd": float(cost.output_cost_usd),
        "matched": cost.matched_model,
        "estimated": cost.estimated,
        "pricing_version": cost.pricing_version,
    }


def build_model_list(
    settings: Settings, catalog: ModelCatalog, pricing: PricingTable
) -> list[dict[str, Any]]:
    available = settings.available_providers()
    chain = [p for p in settings.fallback_chain if p in available]
    chain += [p for p in available if p not in chain]
    defaults = {p: _default_model(settings, p) for p in available}
    data: list[dict[str, Any]] = []

    for alias in catalog.aliases.values():
        resolves = {}
        for p in chain:
            mapped = catalog.resolve_alias(alias.name, p)
            if mapped is not None:
                resolves[p] = mapped or defaults[p]
        if not resolves:
            continue
        data.append(
            {
                "id": alias.name,
                "object": "model",
                "created": 0,
                "owned_by": "infermesh",
                "infermesh": {
                    "type": "alias",
                    "description": alias.description,
                    "resolves_to": resolves,
                },
            }
        )

    seen: set[tuple[str, str]] = set()
    for p in chain:
        for model in [defaults[p], *catalog.listed_models(p)]:
            if not model or (p, model) in seen:
                continue
            seen.add((p, model))
            data.append(
                {
                    "id": model,
                    "object": "model",
                    "created": 0,
                    "owned_by": p,
                    "infermesh": {
                        "type": "model",
                        "provider": p,
                        "default": model == defaults[p],
                        "pricing": _price(pricing, p, model),
                    },
                }
            )
    return data


@router.get("/v1/models")
async def list_models(request: Request, caller: CallerDep) -> dict[str, Any]:
    state = request.app.state
    return {
        "object": "list",
        "data": build_model_list(state.settings, state.model_catalog, state.pricing),
    }
