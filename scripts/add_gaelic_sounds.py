import sqlite3
import os
import json
import asyncio
import google.generativeai as genai

DB_PATH = "/home/chris/fonetik/db/fonetik.db"
KEY_FILE = "/home/chris/wordhord/wordhord_api.txt"

def load_api_key():
    with open(KEY_FILE, 'r') as f:
        return f.read().strip()

genai.configure(api_key=load_api_key())
model = genai.GenerativeModel('gemini-2.0-flash')

async def populate_gaelic_sounds():
    prompt = """
    Generate 25 complex phonetic sounds (vowels, consonants, diphthongs, including broad/slender distinctions and pre-aspiration) for the Scottish Gaelic language.
    Return ONLY a JSON list of objects with the following fields:
    - language: "Scottish Gaelic"
    - symbol: The IPA symbol (e.g., "[rˠ]", "[x]", "[t̪ʰ]", "[uə]", "[xk]")
    - voicing: "voiced", "voiceless", or "N/A"
    - place: e.g., "velar", "palatal", "alveolar", "N/A"
    - manner: e.g., "fricative", "stop", "N/A"
    - height: e.g., "high", "mid", "N/A"
    - backness: e.g., "front", "back", "N/A"
    - roundedness: e.g., "rounded", "unrounded", "N/A"
    - type: "consonant" or "vowel" or "diphthong"
    - description: A brief description of the sound and how it's produced (especially relating to broad/slender or pre-aspiration).
    - example_word: A Gaelic word containing the sound
    - example_translation: English translation of the word
    - example_ipa: IPA transcription of the word
    - example_word2: A second Gaelic word containing the sound
    - example_translation2: English translation
    - example_ipa2: IPA transcription of word 2
    - example_word3: A third Gaelic word containing the sound
    - example_translation3: English translation
    - example_ipa3: IPA transcription of word 3

    Return ONLY the raw JSON array. Do not use Markdown formatting blocks (e.g. ```json).
    """
    
    print("Requesting sounds from LLM...")
    response = model.generate_content(prompt)
    content = response.text.strip()
    if content.startswith("```json"):
        content = content.split("```json")[1].split("```")[0]
    elif content.startswith("```"):
        content = content.split("```")[1].split("```")[0]
        
    try:
        cards = json.loads(content)
        print(f"Generated {len(cards)} cards.")
    except Exception as e:
        print(f"Failed to parse JSON: {e}")
        print(content)
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    added = 0
    for c in cards:
        # Check if already exists
        cursor.execute("SELECT id FROM cards WHERE language = 'Scottish Gaelic' AND symbol = ?", (c.get('symbol'),))
        if cursor.fetchone():
            continue
            
        cursor.execute("""
            INSERT INTO cards (
                language, symbol, voicing, place, manner, height, backness, roundedness, type, description,
                example_word, example_translation, example_ipa,
                example_word2, example_translation2, example_ipa2,
                example_word3, example_translation3, example_ipa3
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            c.get('language', 'Scottish Gaelic'),
            c.get('symbol', ''),
            c.get('voicing', ''),
            c.get('place', ''),
            c.get('manner', ''),
            c.get('height', ''),
            c.get('backness', ''),
            c.get('roundedness', ''),
            c.get('type', ''),
            c.get('description', ''),
            c.get('example_word', ''),
            c.get('example_translation', ''),
            c.get('example_ipa', ''),
            c.get('example_word2', ''),
            c.get('example_translation2', ''),
            c.get('example_ipa2', ''),
            c.get('example_word3', ''),
            c.get('example_translation3', ''),
            c.get('example_ipa3', '')
        ))
        added += 1
        
    conn.commit()
    conn.close()
    print(f"Successfully inserted {added} complex Gaelic sounds into fonetik.db")

if __name__ == "__main__":
    asyncio.run(populate_gaelic_sounds())
