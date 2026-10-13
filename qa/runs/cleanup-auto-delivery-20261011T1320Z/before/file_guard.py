"""Conservative, single-file filesystem guard; it does not assess task completion.

Use only on a quiescent filesystem. No-follow opens, repeated identity checks,
and durable recovery reduce accidents; they do not eliminate malicious races.
Directory fsync and copy2-style metadata preservation are best effort where the
platform does not support them. No shell commands are executed.
"""

import argparse
import datetime
import errno
import fnmatch
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import sys
import uuid


FIELDS = {"sha256", "size", "mtime_ns", "ctime_ns", "device", "inode", "mode"}
SOURCE_SUFFIXES = set("""
.py .pyw .pyi .pyc .pyo .ipynb .js .jsx .mjs .cjs .ts .tsx .coffee
.vue .svelte .astro .c .h .cc .cpp .cxx .hh .hpp .hxx .m .mm .cs .fs
.fsx .fsi .vb .vbs .go .rs .swift .dart .java .kt .kts .scala .sc
.groovy .clj .cljs .cljc .php .phtml .rb .r .rmd .jl .lua .pl .pm
.sh .bash .zsh .fish .ksh .csh .ps1 .psm1 .psd1 .bat .cmd .com .exe
.dll .so .dylib .a .o .obj .lib .class .jar .war .ear .wasm .beam
.el .elc .erl .hrl .ex .exs .hs .lhs .ml .mli .asm .s .sql .html
.htm .css .scss .sass .less .styl .tex .mako .jinja .jinja2 .j2 .tpl
.twig .hbs .handlebars .proto .graphql .gql .prisma .tf .tfvars .hcl
.nix .cmake .gradle .props .targets .vbproj .csproj .sln .vcxproj
.pbxproj .resx .cfg .conf .ini
.pyd .node .dex .apk .pdb .bin .out .d .di .f .for .f90 .f95 .f03
.pas .pp .v .sv .vhd .vhdl .nim .zig .sty .cls .tcl .awk .sed .wsh .wsf
""".split())
PROTECTED_DIRS = {".git", ".hg", ".svn", ".codex", ".claude", ".github",
                  ".gitlab", ".vscode", ".idea", ".cleanup-audit", "node_modules", "__pycache__"}
PROTECTED_NAMES = set("""
agents.md skill.md claude.md gemini.md instructions.md codeowners
package.json package-lock.json npm-shrinkwrap.json yarn.lock pnpm-lock.yaml
bun.lock bun.lockb deno.json deno.jsonc composer.json composer.lock
pyproject.toml poetry.lock pdm.lock uv.lock pipfile pipfile.lock setup.cfg
go.mod go.sum cargo.toml cargo.lock gemfile gemfile.lock rakefile gnumakefile
cmakelists.txt justfile procfile environment.yml environment.yaml
conda-lock.yml conda-lock.yaml renv.lock description mix.exs mix.lock
pubspec.yaml pubspec.lock gradle.properties pom.xml packages.config
global.json manifest.json manifest.yml manifest.yaml settings.json
config.json config.yml config.yaml compose.yml compose.yaml
docker-compose.yml docker-compose.yaml
""".split())
PROTECTED_PATTERNS = ("readme*", "changelog*", "license*", "licence*",
                      "contributing*", "requirements*.txt", "requirements*.in", "dockerfile*",
                      "makefile*", "tsconfig*.json", "jsconfig*.json",
                      ".env*", ".*rc", ".*rc.*", ".git*", "*.config.*")
OPEN_FLAGS = os.O_RDONLY | getattr(os, "O_BINARY", 0) | getattr(os, "O_NOFOLLOW", 0)
OPEN_FLAGS |= getattr(os, "O_CLOEXEC", 0) | getattr(os, "O_NONBLOCK", 0)


class GuardError(Exception):
    pass


class Missing(GuardError):
    pass


def absolute(value, required=False):
    if not isinstance(value, str) or not value or "\x00" in value:
        raise GuardError("invalid_absolute_path")
    path = Path(value)
    if ".." in path.parts or (required and not path.is_absolute()):
        raise GuardError("absolute_path_required_without_parent_traversal")
    return Path(os.path.abspath(path))


def relative(value):
    if not isinstance(value, str) or not value or "\\" in value or ":" in value:
        raise GuardError("invalid_relative_path")
    parts = value.split("/")
    if any(p in ("", ".", "..") or p.endswith((" ", ".")) for p in parts):
        raise GuardError("ambiguous_or_traversing_relative_path")
    if any(ord(c) < 32 or ord(c) == 127 for c in value):
        raise GuardError("control_character_in_path")
    if os.name == "nt" and any(p.split(".")[0].upper() in
            {"CON", "PRN", "AUX", "NUL", *[f"COM{i}" for i in range(1, 10)],
             *[f"LPT{i}" for i in range(1, 10)]} for p in parts):
        raise GuardError("reserved_windows_path")
    return parts


def is_link(info):
    return stat.S_ISLNK(info.st_mode) or bool(
        getattr(info, "st_file_attributes", 0) &
        getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400))


def inspect(path, directory=False):
    """lstat every component, including ancestors outside the cleanup root."""
    for item in [*reversed(path.parents), path]:
        try:
            info = item.lstat()
        except FileNotFoundError as exc:
            raise Missing("already_absent") from exc
        if is_link(info):
            raise GuardError("symlink_or_reparse_point")
        if (item != path or directory) and not stat.S_ISDIR(info.st_mode):
            raise GuardError("ancestor_or_root_is_not_a_directory")
    return info


def canonical_root(value):
    root = absolute(value, required=True)
    inspect(root, directory=True)
    canonical = Path(os.path.realpath(root))
    if root != canonical:
        raise GuardError("root_is_not_canonical")
    return canonical


def regular(info, content_guard=True):
    if is_link(info) or not stat.S_ISREG(info.st_mode):
        raise GuardError("not_an_exact_regular_file")
    if info.st_nlink != 1:
        raise GuardError("hardlinked_file")
    if content_guard and info.st_mode & 0o111:
        raise GuardError("protected_executable_mode")
    if os.name != "nt" and not info.st_mode & 0o444:
        raise GuardError("unreadable_file_mode")


def identity(info):
    return (info.st_dev, info.st_ino, info.st_mode, info.st_nlink, info.st_size,
            info.st_mtime_ns, info.st_ctime_ns)


def fingerprint(path, sink=None, content_guard=True):
    before = inspect(path)
    regular(before, content_guard)
    try:
        fd = os.open(path, OPEN_FLAGS)
    except FileNotFoundError as exc:
        raise Missing("already_absent") from exc
    except PermissionError as exc:
        raise GuardError("unreadable_file") from exc
    with os.fdopen(fd, "rb") as source:
        opened = os.fstat(source.fileno())
        regular(opened, content_guard)
        if identity(before) != identity(opened):
            raise GuardError("file_changed_while_opening")
        digest = hashlib.sha256()
        first = True
        while True:
            try:
                block = source.read(1024 * 1024)
            except OSError as exc:
                raise GuardError("unreadable_file") from exc
            if not block:
                break
            if first and content_guard:
                header = block.removeprefix(b"\xef\xbb\xbf")
                if header.startswith(b"#!"):
                    raise GuardError("protected_shebang")
                if header.startswith((b"\x7fELF", b"MZ", b"\x00asm", b"\xca\xfe\xba\xbe",
                                      b"\xfe\xed\xfa\xce", b"\xce\xfa\xed\xfe",
                                      b"\xfe\xed\xfa\xcf", b"\xcf\xfa\xed\xfe")):
                    raise GuardError("protected_compiled_binary")
            first = False
            digest.update(block)
            if sink is not None:
                sink.write(block)
        after = os.fstat(source.fileno())
    final = inspect(path)
    regular(final, content_guard)
    if identity(opened) != identity(after) or identity(after) != identity(final):
        raise GuardError("file_changed_while_reading")
    return {"sha256": digest.hexdigest(), "size": after.st_size,
            "mtime_ns": after.st_mtime_ns, "ctime_ns": after.st_ctime_ns,
            "device": after.st_dev, "inode": after.st_ino, "mode": after.st_mode}


def target_path(root, name, forbidden=(), recovery=None):
    parts = relative(name)
    folded = [part.casefold() for part in parts]
    skill_tree = any(folded[i] in {".agent", ".agents"} and folded[i + 1] == "skills"
                     for i in range(len(folded) - 1))
    if skill_tree or any(part in PROTECTED_DIRS for part in folded):
        raise GuardError("protected_repository_or_configuration_tree")
    leaf = folded[-1]
    if leaf in PROTECTED_NAMES or any(fnmatch.fnmatchcase(leaf, p) for p in PROTECTED_PATTERNS):
        raise GuardError("protected_instruction_configuration_or_manifest")
    if any(suffix in SOURCE_SUFFIXES for suffix in Path(leaf).suffixes):
        raise GuardError("protected_source_script_or_compiled_suffix")
    path = root.joinpath(*parts)
    if root not in path.parents:
        raise GuardError("outside_cleanup_root")
    if path in forbidden or (recovery is not None and (path == recovery or recovery in path.parents)):
        raise GuardError("protected_manifest_receipt_or_recovery")
    inspect(root, directory=True)
    return path


def no_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise GuardError("duplicate_json_key")
        result[key] = value
    return result


def read_json(path):
    before = inspect(path)
    regular(before, content_guard=False)
    with os.fdopen(os.open(path, OPEN_FLAGS), "r", encoding="utf-8") as source:
        opened = os.fstat(source.fileno())
        regular(opened, content_guard=False)
        if identity(before) != identity(opened):
            raise GuardError("input_changed_while_opening")
        data = json.load(source, object_pairs_hook=no_duplicate_keys,
                         parse_constant=lambda value: (_ for _ in ()).throw(GuardError("nonfinite_json")))
        after = os.fstat(source.fileno())
    if identity(opened) != identity(after) or identity(after) != identity(inspect(path)):
        raise GuardError("input_changed_while_reading")
    return data


def valid_snapshot(value):
    if not isinstance(value, dict) or set(value) != FIELDS:
        raise GuardError("malformed_snapshot")
    digest = value["sha256"]
    if not isinstance(digest, str) or len(digest) != 64 or any(c not in "0123456789abcdef" for c in digest):
        raise GuardError("malformed_snapshot_hash")
    if any(type(value[key]) is not int for key in FIELDS - {"sha256"}):
        raise GuardError("malformed_snapshot_integer")
    if any(value[key] < 0 for key in ("size", "device", "inode", "mode")) or not stat.S_ISREG(value["mode"]):
        raise GuardError("malformed_snapshot_metadata")
    if value["mode"] & 0o111:
        raise GuardError("protected_executable_snapshot")


def candidate_from(root, manifest_path, candidate_id):
    manifest = read_json(manifest_path)
    if not isinstance(manifest, dict) or type(manifest.get("schema_version")) is not int or manifest["schema_version"] != 1:
        raise GuardError("invalid_manifest_schema")
    if manifest.get("root") != str(root):
        raise GuardError("manifest_root_mismatch")
    candidates = manifest.get("candidates")
    if not isinstance(candidates, list):
        raise GuardError("invalid_candidates_array")
    seen = set()
    seen_paths = set()
    selected = None
    for candidate in candidates:
        if (not isinstance(candidate, dict) or not isinstance(candidate.get("id"), str)
                or re.fullmatch(r"[A-Za-z0-9_-]+", candidate["id"]) is None):
            raise GuardError("invalid_candidate_id")
        if candidate["id"] in seen:
            raise GuardError("duplicate_candidate_id")
        seen.add(candidate["id"])
        parts = relative(candidate.get("path"))
        normalized = os.path.normcase(str(Path(*parts)))
        if normalized in seen_paths:
            raise GuardError("duplicate_candidate_path")
        seen_paths.add(normalized)
        if candidate["id"] == candidate_id:
            selected = candidate
    if selected is None:
        raise GuardError("candidate_id_not_found")
    if selected.get("snapshot") is None:
        raise GuardError("missing_snapshot")
    valid_snapshot(selected["snapshot"])
    return selected


def verify_candidate(root, candidate, forbidden=(), recovery=None):
    path = target_path(root, candidate["path"], forbidden, recovery)
    current = fingerprint(path)
    if current != candidate["snapshot"]:
        raise GuardError("changed_since_discovery_snapshot")
    return path


def ensure_directory(path):
    for item in [*reversed(path.parents), path]:
        created = False
        try:
            info = item.lstat()
        except FileNotFoundError:
            try:
                item.mkdir(mode=0o700)
                created = True
            except FileExistsError:
                pass
            info = item.lstat()
        if is_link(info) or not stat.S_ISDIR(info.st_mode):
            raise GuardError("unsafe_recovery_or_receipt_directory")
        if created:
            sync_directory(item.parent)


def sync_directory(path):
    if os.name == "nt":
        return  # Windows has no portable directory fsync in the standard library.
    fd = os.open(path, OPEN_FLAGS | getattr(os, "O_DIRECTORY", 0))
    try:
        try:
            os.fsync(fd)
        except OSError as exc:
            if exc.errno not in (errno.EINVAL, getattr(errno, "ENOTSUP", errno.EINVAL)):
                raise
    finally:
        os.close(fd)


def exclusive_json(path, data):
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(path, flags, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as output:
        json.dump(data, output, indent=2, ensure_ascii=True, allow_nan=False)
        output.write("\n")
        output.flush()
        os.fsync(output.fileno())


class Receipt:
    def __init__(self, path, data):
        self.path = path
        self.data = dict(data)
        ensure_directory(path.parent)
        try:
            exclusive_json(path, self.data)
        except FileExistsError as exc:
            raise GuardError("receipt_already_exists") from exc
        sync_directory(path.parent)
        self.last = identity(inspect(path))

    def update(self, **changes):
        if identity(inspect(self.path)) != self.last:
            raise GuardError("receipt_changed_externally")
        data = dict(self.data, **changes, updated_at=utc_now())
        temporary = self.path.with_name("." + self.path.name + "." + uuid.uuid4().hex + ".tmp")
        exclusive_json(temporary, data)
        if identity(inspect(self.path)) != self.last:
            raise GuardError("receipt_changed_externally")
        os.replace(temporary, self.path)
        sync_directory(self.path.parent)
        self.last = identity(inspect(self.path))
        self.data = data


def utc_now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def result(candidate=None, **values):
    candidate = candidate or {}
    return dict(schema_version=1, path=candidate.get("path"),
                sha256=(candidate.get("snapshot") or {}).get("sha256"),
                recovery_path=None, **values)


def recovery_name(candidate):
    key = "\0".join((candidate["id"], candidate["path"], candidate["snapshot"]["sha256"]))
    return hashlib.sha256(key.encode("utf-8")).hexdigest() + ".recovery"


def remove_one(root, candidate, manifest, recovery, receipt_path, before_unlink=None):
    output = result(candidate, status="failed", reason="not_started", receipt_path=str(receipt_path))
    audit = None
    stage = "prepare"
    deleted = False
    try:
        source = root.joinpath(*relative(candidate["path"]))
        if source == receipt_path:
            raise GuardError("protected_manifest_receipt_or_recovery")
        backup = recovery / recovery_name(candidate)
        if backup == receipt_path or backup == manifest:
            raise GuardError("recovery_conflicts_with_manifest_or_receipt")
        output["recovery_path"] = str(backup)
        audit = Receipt(receipt_path, dict(output, operation="remove", root=str(root),
                        candidate_id=candidate["id"], snapshot=candidate["snapshot"],
                        status="pending", reason="checking_original", phase="intent",
                        recovery_verified=False, original_deleted=False, updated_at=utc_now()))
        stage = "verify"
        verify_candidate(root, candidate, (manifest, receipt_path), recovery)
        stage = "prepare_recovery"
        ensure_directory(recovery)
        flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0)
        try:
            fd = os.open(backup, flags, 0o600)
        except FileExistsError as exc:
            raise GuardError("recovery_already_exists") from exc
        stage = "copy"
        with os.fdopen(fd, "wb") as destination:
            copied = fingerprint(source, sink=destination)
            if copied != candidate["snapshot"]:
                raise GuardError("changed_since_discovery_snapshot")
            destination.flush()
            os.fsync(destination.fileno())
            # copystat is copy2's metadata step; bytes use the exclusive descriptor.
            try:
                shutil.copystat(source, backup, follow_symlinks=False)
            except (OSError, NotImplementedError):
                pass
            os.fsync(destination.fileno())
        stage = "check_recovery"
        saved = fingerprint(backup)
        if any(saved[key] != candidate["snapshot"][key] for key in ("sha256", "size")):
            raise GuardError("recovery_content_mismatch")
        sync_directory(recovery)
        audit.update(phase="ready_to_delete", reason="recovery_verified",
                     recovery_verified=True)
        stage = "final_verify"
        # Compare with the SAME discovery snapshot immediately before exact unlink.
        source = verify_candidate(root, candidate, (manifest, receipt_path), recovery)
        if before_unlink is not None:
            before_unlink()
            source = verify_candidate(root, candidate, (manifest, receipt_path), recovery)
        stage = "unlink"
        os.unlink(source)
        deleted = True
        output.update(status="deleted", reason="deleted_after_verified_recovery")
        sync_directory(source.parent)
    except Missing as exc:
        output.update(status="already_absent" if stage in {"verify", "copy", "final_verify", "unlink"} else "failed",
                      reason=str(exc))
    except GuardError as exc:
        skipped = stage in {"prepare", "verify", "copy", "final_verify"} or str(exc) == "recovery_already_exists"
        output.update(status="skipped" if skipped else "failed", reason=str(exc))
    except OSError as exc:
        absent = isinstance(exc, FileNotFoundError) and stage == "unlink"
        unreadable = isinstance(exc, PermissionError) and stage in {"verify", "copy", "final_verify"}
        output.update(status="already_absent" if absent else "skipped" if unreadable else "failed",
                      reason="already_absent" if absent else "unreadable_file" if unreadable
                      else f"{stage}_os_error:{exc.errno}")
    if deleted:
        output["status"] = "deleted"
        if output["reason"] != "deleted_after_verified_recovery":
            output["warning"] = output["reason"]
            output["reason"] = "deleted_with_audit_or_directory_sync_warning"
    if audit is not None:
        try:
            audit.update(**output, phase="finished", original_deleted=deleted)
        except (OSError, GuardError) as exc:
            output["receipt_error"] = str(exc)
    return output


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    for command in ("snapshot", "verify", "remove"):
        sub = commands.add_parser(command)
        sub.add_argument("--root", required=True)
        if command == "snapshot":
            sub.add_argument("--paths", required=True, help="JSON file containing exact POSIX relative paths")
        else:
            sub.add_argument("--manifest", required=True)
            sub.add_argument("--id", required=True)
        if command == "remove":
            sub.add_argument("--recovery-dir", required=True)
            sub.add_argument("--receipt", required=True)
    args = parser.parse_args(argv)
    candidate = None
    try:
        root = canonical_root(args.root)
        if args.command == "snapshot":
            paths_file = absolute(args.paths)
            paths = read_json(paths_file)
            if not isinstance(paths, list):
                raise GuardError("paths_must_be_an_array")
            files = []
            for name in paths:
                item = {"path": name, "snapshot": None, "error": None}
                try:
                    item["snapshot"] = fingerprint(target_path(root, name, (paths_file,)))
                except (GuardError, OSError) as exc:
                    item["error"] = str(exc)
                files.append(item)
            output = {"schema_version": 1, "root": str(root), "files": files}
        else:
            manifest = absolute(args.manifest)
            candidate = candidate_from(root, manifest, args.id)
            if args.command == "verify":
                verify_candidate(root, candidate, (manifest,))
                output = result(candidate, status="verified", reason="matches_discovery_snapshot")
            else:
                output = remove_one(root, candidate, manifest,
                                    absolute(args.recovery_dir, required=True),
                                    absolute(args.receipt, required=True))
    except (GuardError, OSError, ValueError, TypeError, OverflowError) as exc:
        absent = isinstance(exc, Missing) and candidate is not None and args.command == "verify"
        output = result(candidate, status="already_absent" if absent else "skipped",
                        reason=str(exc))
        print(json.dumps(output, ensure_ascii=True, allow_nan=False))
        return 2
    print(json.dumps(output, ensure_ascii=True, allow_nan=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
