import json
import os
import random
import re
from typing import Any

from datasets import load_dataset


SYSTEM_PROMPT = (
    "You are MediCompanion, a medical education assistant. "
    "Keep answers short, clear, and safe. "
    "Do not provide diagnosis certainty or prescription dosage. "
    "If danger signs appear, advise urgent doctor/ER care. "
    "End with: "
    '"This information is for educational purposes only and is not a substitute for professional medical advice."'
)

KEYWORDS = (
    "diabetes",
    "type 2",
    "type ii",
    "blood sugar",
    "glucose",
    "insulin resistance",
    "hba1c",
    "hyperglycemia",
    "hypoglycemia",
)


def pick_value(row: dict[str, Any], candidates: list[str]) -> str:
    for key in candidates:
        value = row.get(key)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return ""


def row_text_for_filter(row: dict[str, Any]) -> str:
    parts = []
    for key in ("question", "answer", "qtext", "atext", "Question", "Answer", "context"):
        if key in row and row[key] is not None:
            parts.append(str(row[key]))
    return " ".join(parts).lower()


def is_diabetes_related(row: dict[str, Any]) -> bool:
    text = row_text_for_filter(row)
    return any(k in text for k in KEYWORDS)


def to_chat_example(row: dict[str, Any]) -> dict[str, Any] | None:
    question = pick_value(row, ["question", "qtext", "Question", "instruction", "input"])
    answer = pick_value(row, ["answer", "atext", "Answer", "output", "response"])

    if not question or not answer:
        return None

    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question},
            {"role": "assistant", "content": answer},
        ]
    }


def write_jsonl(path: str, rows: list[dict[str, Any]]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def main() -> None:
    random.seed(42)

    dataset = load_dataset("lavita/MedQuAD", split="train")
    rows = [dict(x) for x in dataset]

    diabetes_rows = [r for r in rows if is_diabetes_related(r)]
    examples = []
    for row in diabetes_rows:
        ex = to_chat_example(row)
        if ex:
            examples.append(ex)

    random.shuffle(examples)

    total = len(examples)
    train_n = int(total * 0.70)
    val_n = int(total * 0.15)

    train_rows = examples[:train_n]
    val_rows = examples[train_n : train_n + val_n]
    test_rows = examples[train_n + val_n :]

    out_dir = os.path.join("data", "processed")
    os.makedirs(out_dir, exist_ok=True)

    train_path = os.path.join(out_dir, "diabetes_train.jsonl")
    val_path = os.path.join(out_dir, "diabetes_val.jsonl")
    test_path = os.path.join(out_dir, "diabetes_test.jsonl")

    write_jsonl(train_path, train_rows)
    write_jsonl(val_path, val_rows)
    write_jsonl(test_path, test_rows)

    print(f"Total diabetes candidates: {len(diabetes_rows)}")
    print(f"Usable examples: {total}")
    print(f"Train: {len(train_rows)} -> {train_path}")
    print(f"Val: {len(val_rows)} -> {val_path}")
    print(f"Test: {len(test_rows)} -> {test_path}")


if __name__ == "__main__":
    main()
