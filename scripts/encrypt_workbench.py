#!/usr/bin/env python3
"""Render and encrypt the local Workbench source for the static site."""

import base64
import getpass
import json
import os
from pathlib import Path

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from markdown_it import MarkdownIt


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / ".private" / "workbench.md"
OUTPUT = ROOT / "assets" / "workbench-vault.json"
ITERATIONS = 600_000


def encode(value: bytes) -> str:
    return base64.b64encode(value).decode("ascii")


def main() -> None:
    if not SOURCE.is_file():
        raise SystemExit(f"Missing local source: {SOURCE}")

    password = getpass.getpass("Workbench password: ")
    if not password:
        raise SystemExit("Password cannot be empty.")
    confirmation = getpass.getpass("Confirm password: ")
    if password != confirmation:
        raise SystemExit("Passwords do not match.")

    markdown = SOURCE.read_text(encoding="utf-8")
    rendered = MarkdownIt("commonmark").render(markdown)
    plaintext = f'<article class="workbench-document">\n{rendered}\n</article>'.encode("utf-8")
    salt = os.urandom(16)
    iv = os.urandom(12)
    key = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=ITERATIONS,
    ).derive(password.encode("utf-8"))
    ciphertext = AESGCM(key).encrypt(iv, plaintext, None)
    if AESGCM(key).decrypt(iv, ciphertext, None) != plaintext:
        raise RuntimeError("Encrypted content failed its round-trip check.")

    vault = {
        "version": 1,
        "kdf": "PBKDF2-SHA-256",
        "iterations": ITERATIONS,
        "cipher": "AES-256-GCM",
        "salt": encode(salt),
        "iv": encode(iv),
        "ciphertext": encode(ciphertext),
    }
    OUTPUT.write_text(json.dumps(vault, indent=2) + "\n", encoding="utf-8")
    print(f"Encrypted Workbench written to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
