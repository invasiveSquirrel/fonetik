# Fonetik: Master the Building Blocks of Language

Fonetik is a specialized tool for mastering the most difficult sounds in a new language. It uses the International Phonetic Alphabet (IPA) and high-fidelity audio to show you exactly how to pronounce tricky phonemes.

## 🌍 Supported Languages & Dialects
Fonetik includes specialized sound sets for:
- **English:** North American, Received Pronunciation (UK), Australian, Scottish, and Cockney.
- **Dutch:** Netherlands and Flemish.
- **German:** Northern, Austrian, and Swiss.
- **Spanish:** Spain, Mexican, Argentinian, Colombian, Chilean, and Cuban.
- **Portuguese:** Brazilian and European.
- **Swedish:** Stockholm, Skåne, and Finland-Swedish.
- **Finnish**
- **Scottish Gaelic** (Master tricky broad/slender and pre-aspiration sounds!)

## 🌟 What this app does
- **Phonetic Mastery:** Learn the specific mouth movements for each sound.
- **Visual & Auditory:** See the IPA symbol and hear it pronounced by a high-quality neural voice.
- **Expert Data:** Includes 26 specialized cards for Scottish Gaelic phonetics.

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
- **On Mac:** Simply double-click the downloaded file. A new, regular folder will appear automatically.
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
