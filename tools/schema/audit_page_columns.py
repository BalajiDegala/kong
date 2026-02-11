#!/usr/bin/env python3
"""
Audit Apex page table columns against CSV-derived schema columns.

What this script checks:
- Hardcoded page column ids (`const columns = [...]`) must map to schema columns
  for the inferred entity, except for a small allowlist of computed UI-only columns.

What this script does not check:
- Runtime auto-appended schema columns from EntityTable.
"""

from __future__ import annotations

import argparse
import importlib.util
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Set


REPO_ROOT = Path(__file__).resolve().parents[2]
PAGES_ROOT = REPO_ROOT / "echo" / "src" / "app" / "(dashboard)" / "apex" / "[projectId]"
GENERATOR = REPO_ROOT / "tools" / "schema" / "generate_from_csv.py"


ENTITY_BY_ROUTE_TOKEN: Dict[str, str] = {
    "assets": "asset",
    "shots": "shot",
    "sequences": "sequence",
    "tasks": "task",
    "versions": "version",
    "publishes": "published_file",
    "published-files": "published_file",
    "notes": "note",
}


ALLOWED_COMPUTED: Dict[str, Set[str]] = {
    "asset": {"project_label", "sequence_label", "shot_label"},
    "shot": {"project_label", "sequence_name", "sequence_code"},
    "sequence": {"project_label"},
    "task": {"step_name", "assignee_name", "project_label"},
    "version": {"task_label", "artist_label", "project_label"},
    "note": {"author_label", "link_label", "link_url", "attachments_count"},
    "published_file": {
        "task_label",
        "version_label",
        "created_by_label",
        "project_label",
        "link",
    },
}


@dataclass
class FileAudit:
    path: Path
    entity: str
    unknown_columns: List[str]
    missing_schema_columns: List[str]


def load_generator_module():
    spec = importlib.util.spec_from_file_location("schema_generator", str(GENERATOR))
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load schema generator at {GENERATOR}")
    module = importlib.util.module_from_spec(spec)
    # Required for dataclasses to resolve module namespace correctly.
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def infer_entity_from_path(path: Path) -> str | None:
    for part in reversed(path.parts[:-1]):
        if part.startswith("["):
            continue
        if part in ENTITY_BY_ROUTE_TOKEN:
            return ENTITY_BY_ROUTE_TOKEN[part]
    return None


def extract_hardcoded_column_ids(tsx: str) -> List[str]:
    match = re.search(r"const columns\s*=\s*\[(.*?)\n\s*\]", tsx, re.S)
    if not match:
        return []
    return re.findall(r"id:\s*'([^']+)'", match.group(1))


def audit_pages() -> List[FileAudit]:
    generator = load_generator_module()

    schema_columns: Dict[str, Set[str]] = {}
    for entity in generator.ENTITIES.keys():
        fields = generator._build_entity_fields(entity)
        schema_columns[entity] = {f.column for f in fields if f.column}

    audits: List[FileAudit] = []
    for path in sorted(PAGES_ROOT.rglob("page.tsx")):
        text = path.read_text(encoding="utf-8")
        if "const columns = [" not in text:
            continue

        entity = infer_entity_from_path(path.relative_to(PAGES_ROOT))
        if not entity:
            continue

        ids = extract_hardcoded_column_ids(text)
        if not ids:
            continue

        schema = schema_columns[entity]
        computed = ALLOWED_COMPUTED.get(entity, set())

        column_set = set(ids)
        unknown = sorted(c for c in column_set if c not in schema and c not in computed)
        missing = sorted(c for c in schema if c not in column_set)

        audits.append(
            FileAudit(
                path=path.relative_to(REPO_ROOT),
                entity=entity,
                unknown_columns=unknown,
                missing_schema_columns=missing,
            )
        )

    return audits


def print_summary(audits: Iterable[FileAudit], verbose: bool) -> int:
    audits = list(audits)
    with_unknown = [a for a in audits if a.unknown_columns]

    if with_unknown:
        print("Unknown/non-schema hardcoded columns found:")
        for audit in with_unknown:
            print(f"- {audit.path} [{audit.entity}]")
            print(f"  unknown: {', '.join(audit.unknown_columns)}")
    else:
        print("Unknown/non-schema hardcoded columns: none")

    if verbose:
        print("\nHardcoded-column coverage snapshot (missing schema columns):")
        by_missing = sorted(
            audits,
            key=lambda a: len(a.missing_schema_columns),
            reverse=True,
        )
        for audit in by_missing[:20]:
            sample = ", ".join(audit.missing_schema_columns[:12])
            print(f"- {audit.path} [{audit.entity}] missing={len(audit.missing_schema_columns)}")
            if sample:
                print(f"  sample: {sample}")

    return len(with_unknown)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit non-zero if unknown/non-schema hardcoded columns are found.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print per-page hardcoded coverage snapshot.",
    )
    args = parser.parse_args()

    audits = audit_pages()
    unknown_count = print_summary(audits, verbose=args.verbose)

    if args.check and unknown_count > 0:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

