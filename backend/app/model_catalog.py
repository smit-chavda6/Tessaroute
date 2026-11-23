"""Model catalog: aliases ("smart" / "balanced" / "fast"), quality tiers for
cross-provider fallback, and model-name -> provider inference.

Loaded once at startup from ``models.yaml`` (path configurable via
``MODEL_CATALOG_PATH``). The router asks the catalog three questions:

* ``resolve_alias(model)`` — is the requested model an alias? Which concrete
  model does it mean on each provider?
* ``infer_provider(model)`` — with no explicit ``provider``, which provider does
  this model id belong to (``claude-*`` -> anthropic, ...)?
* ``equivalent(model, source, target)`` — on a fallback hop from ``source`` to
  ``target``, which model on ``target`` is in the same tier as ``model``?

A mapped value of ``default`` (or a missing entry) resolves to ``""``, which every
adapter already treats as "use my configured default model".
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

from app.logging_config import get_logger

log = get_logger(__name__)

_DATE_SUFFIX = re.compile(r"-(?:\d{4}-\d{2}-\d{2}|\d{8})$")
DEFAULT_MARKER = "default"
KNOWN_PROVIDERS = ("openai", "anthropic", "gemini", "azure_foundry")
# Catalog key used for the ``openai`` provider when OPENAI_MODE=azure.
AZURE_OPENAI_KEY = "azure_openai"


@dataclass(frozen=True, slots=True)
class Alias:
    name: str
    description: str
    models: dict[str, str]  # catalog key (provider / "azure_openai") -> model id or "default"


@dataclass(slots=True)
class ModelCatalog:
    version: str
    aliases: dict[str, Alias] = field(default_factory=dict)
    prefixes: dict[str, list[str]] = field(default_factory=dict)
    openai_mode: str = "native"

    # -- construction ------------------------------------------------------

    @classmethod
    def from_dict(cls, raw: Any, *, openai_mode: str = "native") -> ModelCatalog:
        if not isinstance(raw, dict):
            raise ValueError("model catalog must be a mapping")
        aliases: dict[str, Alias] = {}
        for name, body in (raw.get("aliases") or {}).items():
            if not isinstance(body, dict) or not isinstance(body.get("models"), dict):
                raise ValueError(f"alias {name!r} needs a 'models' mapping")
            models = {str(k): str(v) for k, v in body["models"].items()}
            unknown = set(models) - {*KNOWN_PROVIDERS, AZURE_OPENAI_KEY}
            if unknown:
                raise ValueError(f"alias {name!r} names unknown provider(s) {sorted(unknown)}")
            aliases[str(name)] = Alias(str(name), str(body.get("description", "")), models)
        prefixes: dict[str, list[str]] = {}
        for provider, items in (raw.get("prefixes") or {}).items():
            if provider not in KNOWN_PROVIDERS:
                raise ValueError(f"prefixes names unknown provider {provider!r}")
            prefixes[str(provider)] = [str(p) for p in items or []]
        return cls(
            version=str(raw.get("version", "unversioned")),
            aliases=aliases,
            prefixes=prefixes,
            openai_mode=openai_mode,
        )

    @classmethod
    def from_file(cls, path: str | Path, *, openai_mode: str = "native") -> ModelCatalog:
        raw = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
        return cls.from_dict(raw, openai_mode=openai_mode)

    # -- queries -----------------------------------------------------------

    def _key(self, provider: str) -> str:
        if provider == "openai" and self.openai_mode == "azure":
            return AZURE_OPENAI_KEY
        return provider

    def _mapped(self, alias: Alias, provider: str) -> str | None:
        """Model for ``provider`` under ``alias``; ``""`` = provider default,
        ``None`` = this alias has no entry for the provider."""
        value = alias.models.get(self._key(provider))
        if value is None:
            return None
        return "" if value == DEFAULT_MARKER else value

    def is_alias(self, model: str | None) -> bool:
        return bool(model) and model in self.aliases

    def resolve_alias(self, model: str, provider: str) -> str | None:
        alias = self.aliases.get(model)
        return None if alias is None else self._mapped(alias, provider)

    def infer_provider(self, model: str | None) -> str | None:
        if not model:
            return None
        best: tuple[int, str] | None = None
        for provider, prefixes in self.prefixes.items():
            for prefix in prefixes:
                if model.startswith(prefix) and (best is None or len(prefix) > best[0]):
                    best = (len(prefix), provider)
        return best[1] if best else None

    def tier_of(self, model: str, provider: str) -> str | None:
        """Name of the first alias whose entry for ``provider`` is ``model``."""
        if not model:
            return None
        candidates = {model, _DATE_SUFFIX.sub("", model)}
        for alias in self.aliases.values():
            mapped = alias.models.get(self._key(provider))
            if mapped and mapped != DEFAULT_MARKER and mapped in candidates:
                return alias.name
        return None

    def equivalent(self, model: str, source: str, target: str) -> str:
        """Same-tier model on ``target`` for ``model`` (served by ``source``);
        ``""`` (target's default) when the model isn't in any tier."""
        tier = self.tier_of(model, source)
        if tier is None:
            return ""
        mapped = self._mapped(self.aliases[tier], target)
        return mapped or ""

    def listed_models(self, provider: str) -> list[str]:
        """Concrete model ids the catalog mentions for ``provider`` (deduped, ordered)."""
        seen: dict[str, None] = {}
        for alias in self.aliases.values():
            mapped = self._mapped(alias, provider)
            if mapped:
                seen.setdefault(mapped, None)
        return list(seen)


def _default_path() -> Path:
    # backend/app/model_catalog.py -> backend/models.yaml
    return Path(__file__).resolve().parent.parent / "models.yaml"


@lru_cache
def get_model_catalog(path: str | None = None, openai_mode: str = "native") -> ModelCatalog:
    resolved = Path(path) if path else _default_path()
    catalog = ModelCatalog.from_file(resolved, openai_mode=openai_mode)
    log.info(
        "model_catalog.loaded",
        version=catalog.version,
        aliases=sorted(catalog.aliases),
        path=str(resolved),
    )
    return catalog
