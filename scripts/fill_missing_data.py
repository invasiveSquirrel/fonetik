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

async def fill_missing():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Process in smaller batches of cards to avoid huge prompts
    batch_size = 10
    
    while True:
        cursor.execute("""
            SELECT id, language, symbol, 
                   example_word, example_translation, example_ipa,
                   example_word2, example_translation2, example_ipa2,
                   example_word3, example_translation3, example_ipa3
            FROM cards 
            WHERE (example_word IS NOT NULL AND (example_translation IS NULL OR example_ipa IS NULL))
               OR (example_word2 IS NOT NULL AND (example_translation2 IS NULL OR example_ipa2 IS NULL))
               OR (example_word3 IS NOT NULL AND (example_translation3 IS NULL OR example_ipa3 IS NULL))
            LIMIT ?
        """, (batch_size,))
        
        rows = cursor.fetchall()
        if not rows:
            print("All caught up!")
            break
            
        print(f"Processing batch of {len(rows)} cards...")
        
        for row in rows:
            card_id, lang, symbol, w1, t1, i1, w2, t2, i2, w3, t3, i3 = row
            
            words_to_fix = []
            if w1 and (not t1 or not i1):
                words_to_fix.append(w1)
            if w2 and (not t2 or not i2):
                words_to_fix.append(w2)
            if w3 and (not t3 or not i3):
                words_to_fix.append(w3)
                
            if not words_to_fix:
                continue
                
            prompt = f"""
For the language "{lang}", provide the English translation and IPA phonetic transcription for the following words.
The words demonstrate the sound {symbol}.

Words: {", ".join(words_to_fix)}

Return ONLY a JSON list of objects, each with "word", "translation", and "ipa" fields.
Example: [{{"word": "apple", "translation": "a fruit", "ipa": "[ˈæpəl]"}}]
"""
            try:
                response = model.generate_content(prompt)
                content = response.text.strip()
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0]
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0]
                
                data = json.loads(content)
                updates = {}
                for item in data:
                    target_word = item.get('word', '').lower()
                    if w1 and w1.lower() == target_word:
                        updates['example_translation'] = item['translation']
                        updates['example_ipa'] = item['ipa']
                    if w2 and w2.lower() == target_word:
                        updates['example_translation2'] = item['translation']
                        updates['example_ipa2'] = item['ipa']
                    if w3 and w3.lower() == target_word:
                        updates['example_translation3'] = item['translation']
                        updates['example_ipa3'] = item['ipa']
                
                if updates:
                    cols = ", ".join([f"{k} = ?" for k in updates.keys()])
                    vals = list(updates.values()) + [card_id]
                    cursor.execute(f"UPDATE cards SET {cols} WHERE id = ?", vals)
                    conn.commit()
                    print(f"  [v] Updated card {card_id} ({lang})")
                else:
                    print(f"  [?] No matching words returned for card {card_id}")
                    # Mark as "checked" by setting to empty string if LLM failed to return them
                    # to avoid infinite loops
                    cursor.execute("UPDATE cards SET example_translation = COALESCE(example_translation, ''), example_ipa = COALESCE(example_ipa, '') WHERE id = ?", (card_id,))
                    conn.commit()
                
            except Exception as e:
                print(f"  [!] Error card {card_id}: {e}")
                # Backoff or skip
                await asyncio.sleep(2)
                
        await asyncio.sleep(1) # Rate limit protection

    conn.close()

if __name__ == "__main__":
    asyncio.run(fill_missing())
