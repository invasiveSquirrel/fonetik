import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, ChevronRight, ChevronLeft, Layers, RefreshCw } from 'lucide-react';
import './App.css';

interface Card {
  id: number;
  symbol: string;
  language: string;
  type: 'consonant' | 'vowel';
  voicing?: string;
  place?: string;
  manner?: string;
  height?: string;
  backness?: string;
  roundedness?: string;
  description: string;
  example_word: string;
  example_translation: string;
  example_ipa: string;
  example_word2?: string;
  example_translation2?: string;
  example_ipa2?: string;
  example_word3?: string;
  example_translation3?: string;
  example_ipa3?: string;
}

const LANGUAGES = [
  "English (North American)", "English (Received Pronunciation)", "English (Australian)", "English (Scottish)", "English (Cockney)",
  "Dutch (Netherlands)", "Dutch (Flemish)",
  "German (Northern)", "German (Austrian)", "German (Swiss)",
  "Spanish (Spain)", "Spanish (Mexican)", "Spanish (Argentinian)", "Spanish (Colombian)", "Spanish (Chilean)", "Spanish (Cuban)",
  "Portuguese (Brazilian)", "Portuguese (European)",
  "Swedish (Stockholm)", "Swedish (Skåne)", "Swedish (Finland)",
  "Finnish (Helsinki)",
  "Scottish Gaelic"
];

export default function App() {
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFront, setShowFront] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<{ transcription: string, feedback: string } | null>(null);

  useEffect(() => {
    loadCards();
  }, [language]);

  const loadCards = async () => {
    // @ts-ignore
    const data = await window.electronAPI.getCards(language);
    setCards(data);
    setCurrentIndex(0);
    setShowFront(true);
  };

  const playIPA = async (text: string) => {
    try {
      console.log(`Playing IPA: ${text} for ${language}`);
      // @ts-ignore
      const audioBuffer = await window.electronAPI.playIpa(text, language);
      if (!audioBuffer || audioBuffer.byteLength === 0) {
        console.warn("Received empty audio buffer");
        return;
      }
      console.log(`Received buffer of size: ${audioBuffer.byteLength}`);
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play().catch(e => console.error("Playback failed", e));
    } catch (err) {
      console.error("playIPA failed", err);
    }
  };

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % cards.length);
    setShowFront(true);
    setFeedback(null);
  };

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    setShowFront(true);
    setFeedback(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];
      
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        // @ts-ignore
        const result = await window.electronAPI.evaluateAudio(blob, language, currentCard.example_word);
        setFeedback(result);
        setIsRecording(false);
      };

      mr.start();
      setIsRecording(true);
      setTimeout(() => { if (mr.state === 'recording') mr.stop(); }, 4000);
    } catch (err) {
      console.error("Recording failed", err);
    }
  };

  const shuffleCards = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setShowFront(true);
    setFeedback(null);
  };

  const currentCard = cards[currentIndex];

  return (
    <div className="app-container">
      <header className="drag-region">
        <div className="logo">
          <h1 className="ipa-name">[fəˈnɛtɪk]</h1>
          <Layers size={28} className="logo-icon" />
        </div>
        <div className="header-actions">
          <button className="shuffle-btn" title="Shuffle Deck" onClick={shuffleCards}>
            <RefreshCw size={20} />
          </button>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="lang-select">
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <button className="close-btn" onClick={() => window.close()}>×</button>
        </div>
      </header>

      <main>
        {currentCard ? (
          <div className="card-scene">
            <div className={`card ${showFront ? '' : 'is-flipped'}`} onClick={() => setShowFront(!showFront)}>
              
              {/* Front of Card */}
              <div className="card-face card-front">
                <div className="symbol-display">
                  <span className="ipa-symbol">{currentCard.symbol}</span>
                  
                  <div className="speaker-and-tags">
                    <button className="audio-btn" onClick={(e) => { e.stopPropagation(); playIPA(currentCard.symbol); }}>
                      <Volume2 size={40} />
                    </button>
                    
                    <div className="classification-tags-vertical">
                      {currentCard.type === 'consonant' ? (
                        <>
                          {currentCard.voicing && <span className="tag voicing">{currentCard.voicing}</span>}
                          {currentCard.place && <span className="tag place">{currentCard.place}</span>}
                          {currentCard.manner && <span className="tag manner">{currentCard.manner}</span>}
                        </>
                      ) : (
                        <>
                          {currentCard.height && <span className="tag height">{currentCard.height}</span>}
                          {currentCard.backness && <span className="tag backness">{currentCard.backness}</span>}
                          {currentCard.roundedness && <span className="tag roundedness">{currentCard.roundedness}</span>}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="hint-text">Click to flip for examples</div>
              </div>

              {/* Back of Card */}
              <div className="card-face card-back">
                <div className="back-content">
                  <div className="examples-container">
                    {[
                      { word: currentCard.example_word, trans: currentCard.example_translation, ipa: currentCard.example_ipa },
                      { word: currentCard.example_word2, trans: currentCard.example_translation2, ipa: currentCard.example_ipa2 },
                      { word: currentCard.example_word3, trans: currentCard.example_translation3, ipa: currentCard.example_ipa3 }
                    ].filter(ex => ex.word).map((ex, i) => (
                      <div key={i} className="example-row">
                        <button className="audio-btn-mini" onClick={(e) => { e.stopPropagation(); playIPA(ex.word!); }}>
                          <Volume2 size={14} />
                        </button>
                        <div className="example-text-group">
                          <span className="word">{ex.word}</span>
                          <span className="ipa">{ex.ipa}</span>
                        </div>
                        <span className="translation">"{ex.trans}"</span>
                      </div>
                    ))}
                  </div>

                  <div className="voice-evaluation">
                    <button 
                      className={`mic-btn ${isRecording ? 'recording' : ''}`}
                      onClick={(e) => { e.stopPropagation(); startRecording(); }}
                    >
                      {isRecording ? <MicOff /> : <Mic />}
                      <span>{isRecording ? 'Listening...' : 'Practice Sound'}</span>
                    </button>
                    {feedback && (
                      <div className="feedback-layer">
                        <div className="heard">Heard: "{feedback.transcription}"</div>
                        <div className="coach-advice">{feedback.feedback}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="navigation">
              <button onClick={(e) => { e.stopPropagation(); prevCard(); }} className="nav-btn"><ChevronLeft size={40} /></button>
              <span className="counter">{currentIndex + 1} / {cards.length}</span>
              <button onClick={(e) => { e.stopPropagation(); nextCard(); }} className="nav-btn"><ChevronRight size={40} /></button>
            </div>
          </div>
        ) : (
          <div className="loading">Loading exhaustive IPA data...</div>
        )}
      </main>
    </div>
  );
}
