#!/usr/bin/env python3
import json
import os

def count_qa_data():
    data_files = [
        'data/oppadu_qa_data.jsonl',
        'data/reddit_qa_data.jsonl',
        'data/reddit_qa_data_part2.jsonl'
    ]
    
    total_count = 0
    category_counts = {}
    source_counts = {}
    
    for file_path in data_files:
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            continue
            
        count = 0
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    try:
                        data = json.loads(line)
                        count += 1
                        
                        # Count by category
                        category = data.get('category', 'Unknown')
                        category_counts[category] = category_counts.get(category, 0) + 1
                        
                        # Count by source
                        source = data.get('source', 'Unknown')
                        source_counts[source] = source_counts.get(source, 0) + 1
                        
                    except json.JSONDecodeError:
                        print(f"Error parsing line in {file_path}")
        
        total_count += count
        print(f"{file_path}: {count} Q&A pairs")
    
    print(f"\nTotal Q&A pairs: {total_count}")
    
    print("\nCategories:")
    for category, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {category}: {count}")
    
    print("\nSources:")
    for source, count in sorted(source_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {source}: {count}")

if __name__ == "__main__":
    count_qa_data()