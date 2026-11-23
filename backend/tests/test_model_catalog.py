"""Model catalog: aliases, model -> provider inference, same-tier fallback, /v1/models."""

from __future__ import annotations

from pathlib import Path

import pytest
from httpx import AsyncClient

from app.errors import ProviderError, ProviderNotConfiguredError
from app.model_catalog import ModelCatalog, get_model_catalog
from app.pricing import get_pricing_table
from app.providers.base import NormalizedCompletion
from app.schemas.chat import ChatCompletionRequest

from .test_routing import ScriptedAdapter, _req, build_router

_RAW = {
    "version": "t1",
    "aliases": {
        "smart": {
            "models": {
                "openai": "gpt-top",
                "azure_openai": "default",
                "anthropic": "claude-top",
                "gemini": "gemini-top",
            }
        },
        "fast": {
            "models": {
                "openai": "gpt-small",
                "azure_openai": "my-small-deployment",
                "anthropic": "claude-small",
            }
        },
    },
    "prefixes": {"anthropic": ["claude-"], "gemini": ["gemini-"], "openai": ["gpt-", "o3"]},
}


def _cat(mode: str = "native") -> ModelCatalog:
    return ModelCatalog.from_dict(_RAW, openai_mode=mode)


# --- catalog unit tests -------------------------------------------------------


def test_infer_provider_by_prefix() -> None:
    cat = _cat()
    assert cat.infer_provider("claude-top") == "anthropic"
    assert cat.infer_provider("gemini-anything") == "gemini"
    assert cat.infer_provider("o3-mini") == "openai"
    assert cat.infer_provider("my-azure-deployment") is None
    assert cat.infer_provider("") is None


def test_alias_resolution_and_azure_override() -> None:
    assert _cat().resolve_alias("smart", "openai") == "gpt-top"
    assert _cat().resolve_alias("fast", "gemini") is None  # no entry
    azure = _cat("azure")
    assert azure.resolve_alias("smart", "openai") == ""  # "default" -> deployment default
    assert azure.resolve_alias("fast", "openai") == "my-small-deployment"


def test_tier_equivalent_handles_date_suffix_and_unknowns() -> None:
    cat = _cat()
    assert cat.tier_of("claude-small-20261001", "anthropic") == "fast"
    assert cat.equivalent("claude-top", "anthropic", "gemini") == "gemini-top"
    assert cat.equivalent("claude-small", "anthropic", "gemini") == ""  # tier lacks gemini
    assert cat.equivalent("claude-legacy", "anthropic", "openai") == ""  # not in any tier


@pytest.mark.parametrize(
    "raw",
    [
        "not a mapping",
        {"aliases": {"x": {"description": "no models"}}},
        {"aliases": {"x": {"models": {"bedrock": "m"}}}},
        {"prefixes": {"bedrock": ["b-"]}},
    ],
)
def test_invalid_catalog_rejected(raw: object) -> None:
    with pytest.raises(ValueError):
        ModelCatalog.from_dict(raw)


def test_shipped_catalog_models_all_have_confirmed_prices() -> None:
    """Every concrete model in models.yaml must have a real (non-default,
    non-estimated) pricing.yaml entry — guards against typos on refresh."""
    cat = get_model_catalog()
    pricing = get_pricing_table()
    assert set(cat.aliases) >= {"smart", "balanced", "fast"}
    for provider in ("openai", "anthropic", "gemini"):
        for model in cat.listed_models(provider):
            cost = pricing.cost(provider, model, 1000, 1000)
            assert cost is not None, (provider, model)
            assert cost.matched_model == model, (provider, model, cost.matched_model)
            assert cost.estimated is False, (provider, model)


def test_shipped_default_models_are_priced() -> None:
    from .conftest import make_settings

    s = make_settings()
    pricing = get_pricing_table()
    for provider, model in [
        ("openai", s.openai_default_model),
        ("anthropic", s.anthropic_default_model),
        ("gemini", s.gemini_default_model),
    ]:
        cost = pricing.cost(provider, model, 1000, 1000)
        assert cost is not None and cost.matched_model == model, (provider, model)


# --- router planning ------------------------------------------------------------


class RecordingAdapter(ScriptedAdapter):
    """Scripted adapter that also records the model each call was sent."""

    def __init__(self, name: str, script: list[object] | None = None) -> None:
        super().__init__(name, list(script or []))  # type: ignore[arg-type]
        self.models: list[str] = []

    async def complete(self, request: ChatCompletionRequest) -> NormalizedCompletion:
        self.models.append(request.model)
        return await super().complete(request)


def _adapters(**scripts: list[object]) -> dict[str, RecordingAdapter]:
    return {p: RecordingAdapter(p, scripts.get(p)) for p in ("openai", "anthropic", "gemini")}


def _router(adapters: dict[str, RecordingAdapter], mode: str = "native", **overrides: object):  # type: ignore[no-untyped-def]
    router, _ = build_router(adapters, retry_max_attempts=1, openai_mode=mode, **overrides)  # type: ignore[arg-type]
    router._catalog = _cat(mode)
    return router


async def test_alias_routes_to_mapped_model_on_chain_head() -> None:
    ad = _adapters()
    result = await _router(ad).execute(_req(model="smart"))
    assert result.provider_used == "openai"
    assert ad["openai"].models == ["gpt-top"]
    assert result.model_used == "gpt-top"


async def test_alias_falls_back_to_same_alias_on_next_provider() -> None:
    ad = _adapters(openai=[ProviderError("openai", "down")])
    result = await _router(ad).execute(_req(model="smart"))
    assert result.provider_used == "anthropic"
    assert ad["anthropic"].models == ["claude-top"]
    assert [a.model for a in result.attempts] == ["gpt-top", "claude-top"]


async def test_alias_skips_providers_without_an_entry() -> None:
    ad = _adapters(openai=[ProviderError("openai", "down")], anthropic=[ProviderError("a", "x")])
    with pytest.raises(Exception) as exc_info:
        await _router(ad).execute(_req(model="fast"))
    assert ad["gemini"].calls == 0  # "fast" has no gemini entry
    assert "all providers failed" in str(exc_info.value)


async def test_model_name_picks_its_own_provider_first() -> None:
    ad = _adapters()
    result = await _router(ad).execute(_req(model="claude-small"))
    assert result.provider_used == "anthropic"
    assert ad["openai"].calls == 0


async def test_fallback_keeps_the_tier() -> None:
    ad = _adapters(anthropic=[ProviderError("anthropic", "down")])
    result = await _router(ad).execute(_req(model="claude-top"))
    assert result.provider_used == "openai"
    assert ad["openai"].models == ["gpt-top"]  # same tier, not the provider default


async def test_fallback_outside_any_tier_uses_provider_default() -> None:
    ad = _adapters(anthropic=[ProviderError("anthropic", "down")])
    await _router(ad).execute(_req(model="claude-legacy"))
    assert ad["openai"].models == [""]


async def test_unconfigured_model_provider_maps_to_same_tier_elsewhere() -> None:
    ad = _adapters()
    result = await _router(ad, anthropic_api_key=None).execute(_req(model="claude-top"))
    assert result.provider_used == "openai"
    assert ad["openai"].models == ["gpt-top"]


async def test_unconfigured_model_provider_without_fallback_is_an_error() -> None:
    ad = _adapters()
    router = _router(ad, anthropic_api_key=None, fallback_enabled=False)
    with pytest.raises(ProviderNotConfiguredError):
        await router.execute(_req(model="claude-top"))


async def test_inference_can_be_disabled() -> None:
    ad = _adapters()
    await _router(ad, infer_provider_from_model=False).execute(_req(model="claude-small"))
    assert ad["openai"].models == ["claude-small"]  # chain head, as before


async def test_explicit_provider_wins_over_inference() -> None:
    ad = _adapters()
    result = await _router(ad).execute(_req(model="claude-small", provider="gemini"))
    assert result.provider_used == "gemini"
    assert ad["gemini"].models == ["claude-small"]


async def test_unknown_model_keeps_original_chain_behaviour() -> None:
    ad = _adapters(openai=[ProviderError("openai", "down")])
    await _router(ad).execute(_req(model="some-model"))
    assert ad["openai"].models == ["some-model"]
    assert ad["anthropic"].models == [""]


async def test_azure_mode_alias_uses_deployment_override() -> None:
    ad = _adapters()
    router = _router(ad, mode="azure", azure_openai_endpoint="https://x.openai.azure.com")
    await router.execute(_req(model="fast"))
    assert ad["openai"].models == ["my-small-deployment"]


# --- HTTP surface --------------------------------------------------------------


async def test_models_endpoint_lists_aliases_and_models(client: AsyncClient) -> None:
    resp = await client.get("/v1/models")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["object"] == "list"
    by_id = {m["id"]: m for m in body["data"]}
    assert {"smart", "balanced", "fast"} <= set(by_id)
    balanced = by_id["balanced"]
    assert balanced["owned_by"] == "infermesh"
    assert balanced["infermesh"]["resolves_to"]["anthropic"] == "claude-sonnet-5-5"
    sonnet = by_id["claude-sonnet-5-5"]
    assert sonnet["owned_by"] == "anthropic"
    assert sonnet["infermesh"]["pricing"]["input_per_1k_usd"] == pytest.approx(0.002)


async def test_chat_with_alias_reports_served_and_requested_model(client: AsyncClient) -> None:
    resp = await client.post(
        "/v1/chat/completions",
        json={"model": "balanced", "messages": [{"role": "user", "content": "hi"}]},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    gw = body["gateway"]
    assert gw["provider"] == "openai"
    assert gw["model"] == "gpt-6.1-terra"
    assert gw["requested_model"] == "balanced"
    assert body["model"] == "gpt-6.1-terra"
    # 11 prompt + 7 completion tokens at gpt-6.1-terra's $0.001 / $0.005 per 1k
    assert gw["cost_usd"] == pytest.approx(11 / 1000 * 0.001 + 7 / 1000 * 0.005, abs=2e-6)


def test_catalog_file_path_setting(tmp_path: Path) -> None:
    f = tmp_path / "m.yaml"
    f.write_text("version: x\naliases: {}\n", encoding="utf-8")
    assert ModelCatalog.from_file(f).version == "x"
