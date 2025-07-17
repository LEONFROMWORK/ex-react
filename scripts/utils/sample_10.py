import itertools
import os

MERGED_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data/merged_oppadu_qa_all.jsonl'))
SAMPLE_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data/sample_oppadu_qa_10.jsonl'))

if not os.path.exists(MERGED_FILE):
    raise FileNotFoundError(f"Merged file not found: {MERGED_FILE}")

with open(MERGED_FILE, 'r', encoding='utf-8') as src, open(SAMPLE_FILE, 'w', encoding='utf-8') as dst:
    for line in itertools.islice(src, 10):
        dst.write(line)

print(f"Sample of 10 QA pairs written to {SAMPLE_FILE}") 