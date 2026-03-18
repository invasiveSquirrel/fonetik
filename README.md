# Fonetik: Master the Building Blocks of Language

Fonetik is a specialized tool for mastering the most difficult sounds in a new language. It uses the International Phonetic Alphabet (IPA) and high-fidelity audio to show you exactly how to pronounce tricky phonemes.

## 🌟 What this app does
- **Phonetic Mastery:** Learn the specific mouth movements for each sound.
- **Visual & Auditory:** See the IPA symbol and hear it pronounced by a high-quality neural voice.
- **Gaelic Specialty:** Includes 26 specialized cards for Scottish Gaelic, teaching you "broad vs. slender" sounds and pre-aspiration.

---

## 🚀 How to Download and Install
*You do NOT need to have GitHub installed to use this.*

### Step 1: Download the Files
1. Scroll to the top of this GitHub page.
2. Look for the green button that says **"<> Code"** and click it.
3. Click **"Download ZIP"** at the bottom of the little menu that appears.

### Step 2: Extract (Unzip) the Folder
Once the download is finished, you need to "unzip" the files before they will work:
- **On Windows:** Right-click the downloaded file and select **"Extract All..."**.
- **On Mac:** Simply double-click the downloaded file.
- **On Linux:** Right-click the file and select **"Extract Here"**.

### Step 3: Final Installation
**For Windows:**
1. Install [Node.js](https://nodejs.org) (LTS version).
2. Open your new "extracted" folder.
3. Type `cmd` in the top address bar and press Enter.
4. Type `npm install` and press Enter. When finished, type `npm start` to run.

---

## 🔑 Setup: Your API Key & Voice
This app uses AI to generate sounds and high-quality voices to read them.

### 1. The "Brains" Key (For generating new sound cards)
1. Go to [Google AI Studio](https://aistudio.google.com/) (it's free).
2. Click **"Get API Key"**.
3. **Where to put it:** Create a folder named `wordhord` in your main main User directory (Home).
4. Create a text file inside that folder called `wordhord_api.txt` and paste your key inside.

### 2. The "Voice" Credentials (For high-quality speech)
To hear the neural voices, the app looks for a file named `google-credentials.json` in the `panglossia` folder (if you use both apps) or your system path. If you do not have this, the app will automatically fall back to your computer's built-in voices.
