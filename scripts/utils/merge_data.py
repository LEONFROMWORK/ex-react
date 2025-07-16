import json
import os

def merge_jsonl_files(file_list, output_file):
    """
    Merges multiple JSONL files into a single file.
    Skips files that do not exist.
    """
    total_lines_written = 0
    
    print(f"Starting merge process. Output file: {output_file}")
    
    # Ensure the output directory exists
    output_dir = os.path.dirname(output_file)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
        
    with open(output_file, 'w', encoding='utf-8') as outfile:
        for file_path in file_list:
            if not os.path.exists(file_path):
                print(f"--- Warning: File not found, skipping: {file_path}")
                continue

            try:
                with open(file_path, 'r', encoding='utf-8') as infile:
                    lines_count = 0
                    for line in infile:
                        # Ensure the line is a valid JSON object before writing
                        try:
                            json.loads(line)
                            outfile.write(line)
                            lines_count += 1
                        except json.JSONDecodeError:
                            print(f"--- Warning: Skipping invalid JSON line in {file_path}: {line.strip()}")
                    
                    if lines_count > 0:
                        print(f"--- Merged {lines_count} lines from {file_path}")
                        total_lines_written += lines_count
                    else:
                        print(f"--- Info: File is empty, skipping: {file_path}")

            except Exception as e:
                print(f"--- Error processing file {file_path}: {e}")

    print(f"\nMerge completed. Total lines written: {total_lines_written}")
    print(f"Merged file created at: {output_file}")


if __name__ == '__main__':
    # Define file paths relative to the project root
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
    
    files_to_merge = [
        'data/oppadu_community_qa_20250717_0438.jsonl',
        'data/oppadu_enhanced_qa.jsonl',
        'data/oppadu_final_qa_112items_20250716_2316.jsonl',
        'data/oppadu_test_improved.jsonl',
        'data/oppadu_final_qa.jsonl',
        'data/oppadu_improved_qa.jsonl'
    ]
    
    # Make file paths absolute from project root
    absolute_file_paths = [os.path.join(project_root, f) for f in files_to_merge]
    
    output_filename = os.path.join(project_root, 'data/merged_oppadu_qa_all.jsonl')
    
    merge_jsonl_files(absolute_file_paths, output_filename) 