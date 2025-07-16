import asyncio
import json
import os
from datetime import datetime
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError

def is_excel_related(text):
    """
    Check if the text is related to Excel.
    A simple keyword-based check.
    """
    keywords = ['엑셀', 'excel', 'vba', '스프레드시트', 'spreadsheet', '수식', '함수', '차트', '피벗']
    return any(keyword in text.lower() for keyword in keywords)

async def get_post_details(page, post_url):
    """
    Extracts question and answers from a post's detail page.
    """
    try:
        await page.goto(post_url, wait_until='networkidle', timeout=30000)
        
        # Extract question
        question_element = await page.query_selector('.post-content')
        question = await question_element.inner_text() if question_element else ""

        # Extract answers
        answers = []
        answer_elements = await page.query_selector_all('.comment-content')
        for ans_element in answer_elements:
            answer_text = await ans_element.inner_text()
            if answer_text:
                answers.append(answer_text.strip())
        
        return question.strip(), answers
    except PlaywrightTimeoutError:
        print(f"  - Timeout while loading post details from {post_url}")
        return None, None
    except Exception as e:
        print(f"  - Error getting post details from {post_url}: {e}")
        return None, None

async def main():
    """
    Main crawling function using Playwright.
    """
    base_url = "https://www.oppadu.com/community/question/"
    output_file = f"../../data/oppadu_community_qa_playwright_{datetime.now().strftime('%Y%m%d_%H%M')}.jsonl"
    
    print("--- Starting Playwright Crawler ---")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False) # Start in headed mode for debugging
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        with open(output_file, 'w', encoding='utf-8') as f:
            for page_num in range(1, 4): # Crawl first 3 pages
                target_url = f"{base_url}?board_id=1&page={page_num}"
                print(f"Crawling Page: {page_num} -> {target_url}")

                try:
                    await page.goto(target_url, wait_until='domcontentloaded', timeout=30000)
                    
                    # Wait for network activity to be idle, which is a good sign of dynamic content loading
                    await page.wait_for_load_state('networkidle', timeout=20000)
                    
                    # Wait for the post items to appear
                    await page.wait_for_selector('.post-item', timeout=15000)

                    posts = await page.query_selector_all('.post-item')
                    print(f"  -> Found {len(posts)} posts on page {page_num}")

                    for post in posts:
                        title_element = await post.query_selector('h3.post-title a')
                        if not title_element:
                            continue

                        post_url = await title_element.get_attribute('href')
                        if not post_url.startswith('http'):
                            post_url = "https://www.oppadu.com" + post_url
                        
                        post_title = await title_element.inner_text()
                        
                        # Create a new page for details to avoid navigation issues
                        detail_page = await context.new_page()
                        question, answers = await get_post_details(detail_page, post_url)
                        await detail_page.close()
                        
                        if question and is_excel_related(post_title + question):
                            qa_pair = {
                                "question_title": post_title.strip(),
                                "question_content": question,
                                "answers": answers,
                                "source_url": post_url
                            }
                            f.write(json.dumps(qa_pair, ensure_ascii=False) + '\\n')
                            print(f"    -> Saved QA from: {post_url}")

                except PlaywrightTimeoutError:
                    print(f"  - Timeout waiting for '.post-item' on page {page_num}. The site might be blocking or has no content.")
                    # Optionally, save screenshot for debugging
                    await page.screenshot(path=f"../../logs/playwright_error_page_{page_num}.png")
                except Exception as e:
                    print(f"  - An unexpected error occurred on page {page_num}: {e}")

        await browser.close()
        print("--- Crawler Finished ---")

if __name__ == "__main__":
    asyncio.run(main()) 