#!/usr/bin/env python3
"""
Generate:
1) Idempotent SQL migration (ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...) to align DB with CSV schemas.
2) A TS schema registry for frontend/backend to avoid hardcoded field lists.

Source of truth:
- CSV files in images/schema/*.csv

Notes:
- CSVs look ShotGrid-like: Field Name, Data Type, Field Type.
- We map those "Data Type" values to conservative Postgres types:
  - TEXT / JSONB unless clearly inferable
  - multi_entity -> text[] (matches existing Kong UI patterns)
"""

from __future__ import annotations

import csv
import dataclasses
import datetime as dt
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


REPO_ROOT = Path(__file__).resolve().parents[2]
CSV_DIR = REPO_ROOT / "images" / "schema"

OUT_SQL = (
    REPO_ROOT
    / "echo"
    / "migrations&fixes"
    / "generated"
    / "migration_align_schema_from_csv.sql"
)
OUT_TS = REPO_ROOT / "echo" / "src" / "lib" / "schema" / "schema.generated.ts"


ENTITIES: Dict[str, Dict[str, str]] = {
    "asset": {"csv": "asset.csv", "table": "assets"},
    "sequence": {"csv": "sequence.csv", "table": "sequences"},
    "shot": {"csv": "shots.csv", "table": "shots"},
    "task": {"csv": "task.csv", "table": "tasks"},
    "version": {"csv": "version.csv", "table": "versions"},
    "note": {"csv": "note.csv", "table": "notes"},
    "published_file": {"csv": "publishfile.csv", "table": "published_files"},
}


def _slugify_field(name: str) -> str:
    # Split on anything non-alphanumeric, lower, join with underscores.
    parts = re.findall(r"[A-Za-z0-9]+", name)
    slug = "_".join(p.lower() for p in parts if p)
    slug = re.sub(r"_+", "_", slug).strip("_")
    if not slug:
        slug = "field"

    # Avoid leading digits.
    if re.match(r"^[0-9]", slug):
        slug = f"f_{slug}"

    # Avoid a small set of reserved-ish keywords.
    if slug in {"user", "order", "group", "limit", "offset", "select", "where", "from", "to"}:
        slug = f"f_{slug}"

    # Postgres identifier limit is 63 bytes; truncate conservatively.
    if len(slug) > 55:
        slug = slug[:55].rstrip("_")

    return slug


def _infer_pg_type(
    field_name: str,
    data_type: str,
    *,
    mapped_column: Optional[str],
) -> Tuple[str, Optional[str]]:
    """
    Returns (pg_type, default_sql).
    default_sql is the RHS of DEFAULT (already SQL literal), or None.
    """

    # Column-based overrides for known core fields.
    if mapped_column in {"id"}:
        return "integer", None
    if mapped_column in {"project_id", "sequence_id", "shot_id", "task_id", "version_id", "entity_id", "step_id"}:
        return "integer", None
    if mapped_column in {"created_at", "updated_at", "published_at", "date_viewed", "client_approved_at"}:
        return "timestamptz", None
    if mapped_column in {"created_by", "updated_by", "author_id", "artist_id", "published_by", "assigned_to"}:
        return "uuid", None
    if mapped_column in {"content", "subject", "description", "name", "code", "status"}:
        return "text", None

    dt_lower = data_type.strip().lower()
    name_lower = field_name.strip().lower()

    if dt_lower in {"text", "url", "status_list", "list", "color"}:
        return "text", None

    if dt_lower == "image":
        # Store image as URL/path string for now.
        return "text", None

    if dt_lower == "checkbox":
        return "boolean", "false"

    if dt_lower == "date":
        return "date", None

    if dt_lower == "date_time":
        return "timestamptz", None

    if dt_lower == "number":
        # Most "number" fields here are IDs, frame counts, or integers.
        return "integer", None

    if dt_lower == "float":
        return "double precision", None

    if dt_lower in {"duration", "percent"}:
        return "numeric", None

    if dt_lower == "summary":
        if "count" in name_lower or "number" in name_lower:
            return "integer", "0"
        return "text", None

    if dt_lower == "serializable":
        return "jsonb", None

    if dt_lower == "multi_entity":
        return "text[]", "'{}'::text[]"

    if dt_lower == "entity":
        # Polymorphic/external entity: keep as TEXT for now.
        # This avoids breaking existing server actions/UI that treat many SG "entity" fields as strings.
        return "text", None

    # Safe default
    return "text", None


# CSV Field Name -> db column overrides (single-column only).
# For polymorphic "Link" fields, we keep them virtual (existing entity_type/entity_id columns already represent them).
COMMON_FIELD_MAP: Dict[str, str] = {
    "Id": "id",
    "Project": "project_id",
    "Date Created": "created_at",
    "Date Updated": "updated_at",
    "Created by": "created_by",
    "Updated by": "updated_by",
    "Description": "description",
    "Status": "status",
    "Cached Display Name": "cached_display_name",
    "Thumbnail": "thumbnail_url",
    "Filmstrip Thumbnail": "filmstrip_thumbnail_url",
    "Thumbnail Blur Hash": "thumbnail_blur_hash",
    "Ayon ID": "ayon_id",
    "Ayon Sync Status": "ayon_sync_status",
}


ENTITY_FIELD_MAP: Dict[str, Dict[str, str]] = {
    "asset": {
        "Asset Name": "name",
        "Type": "asset_type",
        "Sequence": "sequence_id",
        "Shot": "shot_id",
        "Client Name": "client_name",
        "DD Client Name": "dd_client_name",
        "Keep": "keep",
        "Outsource": "outsource",
        "Tags": "tags",
        "Vendor Groups": "vendor_groups",
        "Sub Assets": "sub_assets",
        "Parent Assets": "parent_assets",
        "Sequences": "sequences",
        "Shots": "shots",
        "Task Template": "task_template",
        "Published File <-> Link": "published_file_links",
    },
    "sequence": {
        "Sequence Name": "name",
        "Type": "sequence_type",
        "Client Name": "client_name",
        "DD Client Name": "dd_client_name",
        "Cc": "cc",
        "Tags": "tags",
        "Shots": "shots",
        "Assets": "assets",
        "Plates": "plates",
        "Cuts": "cuts",
        "Open Notes Count": "open_notes_count",
        "Task Template": "task_template",
        "Published File <-> Link": "published_file_links",
    },
    "shot": {
        "Shot Name": "name",
        "Shot Code": "code",
        "Sequence": "sequence_id",
        "Type": "shot_type",
        "Client Name": "client_name",
        "DD Client Name": "dd_client_name",
        "Cc": "cc",
        "Comp Note": "comp_note",
        "Cut In": "cut_in",
        "Cut Out": "cut_out",
        "Cut Duration": "cut_duration",
        "Cut Order": "cut_order",
        "Cut Summary": "cut_summary",
        "Duration Summary": "duration_summary",
        "DD Location": "dd_location",
        "Delivery Date": "delivery_date",
        "Head Duration": "head_duration",
        "Head In": "head_in",
        "Head Out": "head_out",
        "Tail In": "tail_in",
        "Tail Out": "tail_out",
        "Working Duration": "working_duration",
        "Next Review": "next_review",
        "Open Notes": "open_notes",
        "Open Notes Count": "open_notes_count",
        "Parent Shots": "parent_shots",
        "Plates": "plates",
        "Seq Shot": "seq_shot",
        "Shot Notes": "shot_notes",
        "Sub Shots": "sub_shots",
        "Target Date": "target_date",
        "Task Template": "task_template",
        "Vendor Groups": "vendor_groups",
        "Assets": "assets",
        "Tags": "tags",
        "Published File <-> Link": "published_file_links",
    },
    "task": {
        "Task Name": "name",
        "Assigned To": "assigned_to",
        "Pipeline Step": "step_id",
        "Priority": "priority",
        "Due Date": "due_date",
        "Start Date": "start_date",
        "End Date": "end_date",
        "Duration": "duration",
        "Bid": "bid",
        "Bid Breakdown": "bid_breakdown",
        "Buffer Days": "buffer_days",
        "Buffer Days2": "buffer_days2",
        "Casting": "casting",
        "Cc": "cc",
        "DDNA Bid": "ddna_bid",
        "DDNA ID#": "ddna_id",
        "DDNA TO#": "ddna_to",
        "Dependency Violation": "dependency_violation",
        "Downstream Dependency": "downstream_dependency",
        "Gantt Bar Color": "gantt_bar_color",
        "Inventory Date": "inventory_date",
        "Milestone": "milestone",
        "Prod Comments": "prod_comments",
        "Proposed Start Date": "proposed_start_date",
        "Publish Version Number": "publish_version_number",
        "Reviewer": "reviewer",
        "Tags": "tags",
        "Task Complexity": "task_complexity",
        "Task Template": "task_template",
        "Thumbnail": "thumbnail_url",
        "Versions": "versions",
        "Workload Assignee Count": "workload_assignee_count",
    },
    "version": {
        "Version Name": "code",
        "Version Number": "version_number",
        "Client Approved": "client_approved",
        "Client Approved At": "client_approved_at",
        "Client Approved by": "client_approved_by",
        "Client Version Name": "client_version_name",
        "Date Viewed": "date_viewed",
        "Department": "department",
        "Editorial QC": "editorial_qc",
        "Flagged": "flagged",
        "Movie Aspect Ratio": "movie_aspect_ratio",
        "Movie Has Slate": "movie_has_slate",
        "Nuke script": "nuke_script",
        "Playlists": "playlists",
        "Published Files": "published_files",
        "Send EXRs": "send_exrs",
        "Source Clip": "source_clip",
        "Tags": "tags",
        "Task Template": "task_template",
        "Type": "version_type",
        "Uploaded Movie": "uploaded_movie",
        "Viewed/Unviewed": "viewed_status",
        "Cuts": "cuts",
        "Path to Frames": "frames_path",
        "Path to Movie": "movie_url",
        "First Frame": "first_frame",
        "Last Frame": "last_frame",
        "Frame Count": "frame_count",
        "Frame Range": "frame_range",
        "Artist": "artist_id",
        "Task": "task_id",
    },
    "note": {
        "Subject": "subject",
        "Body": "content",
        "Author": "author_id",
        "Status": "status",
        "Type": "note_type",
        "Client Approved": "client_approved",
        "Client Note": "client_note",
        "Suppress Email Notification": "suppress_email_notification",
    },
    "published_file": {
        "Published File Name": "code",
        "Name": "name",
        "Path": "file_path",
        "Published File Type": "file_type",
        "Version Number": "version_number",
        "Task": "task_id",
        "Version": "version_id",
        "Client Version": "client_version",
        "Downstream Published Files": "downstream_published_files",
        "Upstream Published Files": "upstream_published_files",
        "Tags": "tags",
        "Element": "element",
        "Output": "output",
        "Path Cache": "path_cache",
        "Path Cache Storage": "path_cache_storage",
        "Path to Source": "path_to_source",
        "Submission Notes": "submission_notes",
        "Snapshot ID": "snapshot_id",
        "Snapshot Type": "snapshot_type",
        "Target Name": "target_name",
        # "Created by" on published_files is 'published_by' in the DB schema.
        "Created by": "published_by",
    },
}


# Fields represented by existing polymorphic columns rather than a single DB column.
VIRTUAL_FIELDS: Dict[str, List[str]] = {
    "task": ["Link"],  # maps to tasks.entity_type + tasks.entity_id (already present)
    "published_file": ["Link"],  # maps to published_files.entity_type + published_files.entity_id (already present)
}


@dataclasses.dataclass(frozen=True)
class FieldDef:
    name: str
    data_type: str
    field_type: str
    code: str
    column: Optional[str]  # None if virtual
    pg_type: Optional[str]
    default_sql: Optional[str]


def _read_csv_fields(csv_path: Path) -> List[Tuple[str, str, str]]:
    with csv_path.open(newline="") as f:
        rows = list(csv.reader(f))
    if not rows:
        return []

    data = [r for r in rows[1:] if any(c.strip() for c in r)]

    out: List[Tuple[str, str, str]] = []
    for r in data:
        name = (r[0] if len(r) > 0 else "").strip().strip('"')
        data_type = (r[1] if len(r) > 1 else "").strip().strip('"')
        field_type = (r[2] if len(r) > 2 else "").strip().strip('"')
        if name:
            out.append((name, data_type, field_type))

    # Deduplicate by (name, data_type) keeping first occurrence.
    seen = set()
    deduped: List[Tuple[str, str, str]] = []
    for name, data_type, field_type in out:
        key = (name, data_type)
        if key in seen:
            continue
        seen.add(key)
        deduped.append((name, data_type, field_type))

    return deduped


def _build_entity_fields(entity_key: str) -> List[FieldDef]:
    entity_cfg = ENTITIES[entity_key]
    csv_path = CSV_DIR / entity_cfg["csv"]
    rows = _read_csv_fields(csv_path)

    # Some snapshots of shots.csv do not include "Shot Name" explicitly even though
    # the DB column exists and the UI expects it as the primary clickable field.
    # Synthesize it so schema generation remains stable across environments.
    if entity_key == "shot" and not any(name == "Shot Name" for name, _, _ in rows):
        insert_at = next((i for i, (name, _, _) in enumerate(rows) if name == "Shot Code"), len(rows))
        rows.insert(insert_at, ("Shot Name", "text", "permanent"))

    used_codes: Dict[str, int] = defaultdict(int)
    used_columns: Dict[str, int] = defaultdict(int)

    fields: List[FieldDef] = []
    virtual_names = set(VIRTUAL_FIELDS.get(entity_key, []))
    entity_map = ENTITY_FIELD_MAP.get(entity_key, {})

    for field_name, data_type, field_type in rows:
        base_code = _slugify_field(field_name)
        used_codes[base_code] += 1
        code = base_code if used_codes[base_code] == 1 else f"{base_code}_{data_type.lower()}"

        if field_name in virtual_names:
            fields.append(
                FieldDef(
                    name=field_name,
                    data_type=data_type,
                    field_type=field_type,
                    code=code,
                    column=None,
                    pg_type=None,
                    default_sql=None,
                )
            )
            continue

        # Special-case: Task CSV has two "Notes" fields (multi_entity and text).
        if entity_key == "task" and field_name == "Notes":
            if data_type.strip().lower() == "text":
                mapped_column = "notes"
            else:
                mapped_column = "notes_links"
        else:
            mapped_column = entity_map.get(field_name) or COMMON_FIELD_MAP.get(field_name)

        column = mapped_column or _slugify_field(field_name)
        used_columns[column] += 1
        if used_columns[column] > 1:
            column = f"{column}_{data_type.lower()}"

        pg_type, default_sql = _infer_pg_type(field_name, data_type, mapped_column=mapped_column)

        fields.append(
            FieldDef(
                name=field_name,
                data_type=data_type,
                field_type=field_type,
                code=code,
                column=column,
                pg_type=pg_type,
                default_sql=default_sql,
            )
        )

    return fields


def _sql_column_def(f: FieldDef, *, entity_key: str) -> str:
    assert f.column and f.pg_type

    # FK-ish columns: keep join compatibility where the UI already expects it.
    if entity_key == "asset" and f.column == "sequence_id":
        return "sequence_id integer REFERENCES public.sequences(id) ON DELETE SET NULL"
    if entity_key == "asset" and f.column == "shot_id":
        return "shot_id integer REFERENCES public.shots(id) ON DELETE SET NULL"

    if f.column in {"created_by", "updated_by"}:
        return f"{f.column} uuid REFERENCES public.profiles(id) ON DELETE SET NULL"
    if f.column == "author_id":
        return "author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL"
    if f.column == "artist_id":
        return "artist_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL"
    if f.column == "published_by":
        return "published_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL"

    if f.default_sql is not None:
        return f"{f.column} {f.pg_type} DEFAULT {f.default_sql}"
    return f"{f.column} {f.pg_type}"


def _generate_sql(all_fields: Dict[str, List[FieldDef]]) -> str:
    now = dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    lines: List[str] = []

    lines.append("-- ============================================================================")
    lines.append("-- KONG: Align DB schema with CSV schema definitions")
    lines.append(f"-- Generated: {now}")
    lines.append(f"-- Source CSV dir: {CSV_DIR}")
    lines.append("--")
    lines.append("-- This migration is designed to be safe to re-run:")
    lines.append("-- - Uses ALTER TABLE ... ADD COLUMN IF NOT EXISTS")
    lines.append("-- - Does NOT drop tables or data")
    lines.append("-- - Uses conservative Postgres types (TEXT / JSONB unless clearly inferable)")
    lines.append("--")
    lines.append("-- Execution: Supabase SQL Editor (recommended) or psql inside Kubernetes")
    lines.append("-- ============================================================================")
    lines.append("")

    # 0) Constraint expansions (idempotent via DROP IF EXISTS + ADD).
    lines.append("-- ============================================================================")
    lines.append("-- 0) Polymorphic Entity Constraints")
    lines.append("-- ============================================================================")
    lines.append("")
    lines.append(
        "-- NOTE: Constraints are added NOT VALID to avoid failing the migration if legacy rows contain unexpected values."
    )
    lines.append(
        "--       They are still enforced for new/updated rows. Optionally validate later after cleanup:"
    )
    lines.append("--         ALTER TABLE public.tasks VALIDATE CONSTRAINT tasks_entity_type_check;")
    lines.append("--         ALTER TABLE public.versions VALIDATE CONSTRAINT versions_entity_type_check;")
    lines.append("--         ALTER TABLE public.notes VALIDATE CONSTRAINT notes_entity_type_check;")
    lines.append("--         ALTER TABLE public.published_files VALIDATE CONSTRAINT published_files_entity_type_check;")
    lines.append("")

    lines.append("ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_entity_type_check;")
    lines.append("ALTER TABLE public.tasks")
    lines.append("  ADD CONSTRAINT tasks_entity_type_check")
    lines.append("  CHECK (entity_type IN ('asset', 'shot', 'sequence', 'project')) NOT VALID;")
    lines.append("")

    lines.append("ALTER TABLE public.versions DROP CONSTRAINT IF EXISTS versions_entity_type_check;")
    lines.append("ALTER TABLE public.versions")
    lines.append("  ADD CONSTRAINT versions_entity_type_check")
    lines.append("  CHECK (entity_type IN ('asset', 'shot', 'sequence')) NOT VALID;")
    lines.append("")

    lines.append("ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS notes_entity_type_check;")
    lines.append("ALTER TABLE public.notes")
    lines.append("  ADD CONSTRAINT notes_entity_type_check")
    lines.append(
        "  CHECK (entity_type IN ('task', 'asset', 'shot', 'sequence', 'version', 'project', 'published_file')) NOT VALID;"
    )
    lines.append("")

    lines.append("ALTER TABLE public.published_files DROP CONSTRAINT IF EXISTS published_files_entity_type_check;")
    lines.append("ALTER TABLE public.published_files")
    lines.append("  ADD CONSTRAINT published_files_entity_type_check")
    lines.append("  CHECK (entity_type IN ('asset', 'shot', 'sequence', 'task', 'version', 'note', 'project')) NOT VALID;")
    lines.append("")

    # 1) Add columns per entity.
    for entity_key, cfg in ENTITIES.items():
        table = cfg["table"]
        csv_name = cfg["csv"]

        fields = [f for f in all_fields[entity_key] if f.column and f.pg_type]
        if not fields:
            continue

        lines.append("-- ============================================================================")
        lines.append(f"-- {table.upper()} (from {csv_name})")
        lines.append("-- ============================================================================")
        lines.append("")
        lines.append(f"ALTER TABLE public.{table}")

        col_defs = [
            "  ADD COLUMN IF NOT EXISTS " + _sql_column_def(f, entity_key=entity_key) for f in fields
        ]
        for i, col_def in enumerate(col_defs):
            suffix = "," if i < len(col_defs) - 1 else ";"
            lines.append(col_def + suffix)
        lines.append("")

    return "\n".join(lines)


def _generate_ts(all_fields: Dict[str, List[FieldDef]]) -> str:
    now = dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

    schema_obj: Dict[str, Any] = {}
    for entity_key, cfg in ENTITIES.items():
        schema_obj[entity_key] = {
            "entity": entity_key,
            "table": cfg["table"],
            "csv": cfg["csv"],
            "fields": [
                {
                    "name": f.name,
                    "dataType": f.data_type,
                    "fieldType": f.field_type,
                    "code": f.code,
                    "column": f.column,
                    "pgType": f.pg_type,
                    "defaultSql": f.default_sql,
                    "virtual": f.column is None,
                }
                for f in all_fields[entity_key]
            ],
        }

    json_text = json.dumps(schema_obj, indent=2, sort_keys=True)
    entity_keys = " | ".join([f"'{k}'" for k in schema_obj.keys()])

    return f"""/* eslint-disable */
// AUTO-GENERATED FILE. DO NOT EDIT BY HAND.
// Generated by tools/schema/generate_from_csv.py
// Generated: {now}

export type EntityKey = {entity_keys}

export interface SchemaField {{
  name: string
  dataType: string
  fieldType: string
  code: string
  // When virtual=true, column/pgType/defaultSql will be null.
  column: string | null
  pgType: string | null
  defaultSql: string | null
  virtual: boolean
}}

export interface EntitySchema {{
  entity: EntityKey
  table: string
  csv: string
  fields: SchemaField[]
}}

export const SCHEMA: Record<EntityKey, EntitySchema> = {json_text} as any
"""


def main() -> None:
    missing = [
        cfg["csv"] for cfg in ENTITIES.values() if not (CSV_DIR / cfg["csv"]).exists()
    ]
    if missing:
        raise SystemExit(f"Missing CSV files in {CSV_DIR}: {missing}")

    all_fields: Dict[str, List[FieldDef]] = {}
    for entity_key in ENTITIES.keys():
        all_fields[entity_key] = _build_entity_fields(entity_key)

    OUT_SQL.parent.mkdir(parents=True, exist_ok=True)
    OUT_TS.parent.mkdir(parents=True, exist_ok=True)

    OUT_SQL.write_text(_generate_sql(all_fields) + "\n", encoding="utf-8")
    OUT_TS.write_text(_generate_ts(all_fields) + "\n", encoding="utf-8")

    print(f"Wrote: {OUT_SQL}")
    print(f"Wrote: {OUT_TS}")


if __name__ == "__main__":
    main()
