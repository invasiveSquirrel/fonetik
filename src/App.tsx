import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Info, ChevronRight, ChevronLeft, Layers } from 'lucide-react';
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
}

const LANGUAGES = ["English", "German", "Dutch", "Spanish", "Portuguese", "Finnish", "Swedish"];

export default function App() {
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFront, setShowFront] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<{ transcription: string, feedback: string } | null>(null);

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
    // @ts-ignore
    const audioBuffer = await window.electronAPI.playIpa(text, language);
    const blob = new Blob([audioBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    new Audio(url).play();
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

  const currentCard = cards[currentIndex];

  return (
    <div className="app-container">
      <header>
        <div className="logo">
          <h1>fonetik</h1>
          <Layers size={24} className="logo-icon" />
        </div>
        <select value={language} onChange={(e) => setLanguage(e.target.value)} className="lang-select">
          {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </header>

      <main>
        {currentCard ? (
          <div className="card-scene">
            <div className={`card ${showFront ? '' : 'is-flipped'}`} onClick={() => setShowFront(!showFront)}>
              
              {/* Front of Card */}
              <div className="card-face card-front">
                <div className="symbol-display">
                  <span className="ipa-symbol">{currentCard.symbol}</span>
                  <button className="audio-btn" onClick={(e) => { e.stopPropagation(); playIPA(currentCard.symbol); }}>
                    <Volume2 size={32} />
                  </button>
                </div>
                <div className="classification-tags">
                  {currentCard.type === 'consonant' ? (
                    <>
                      <span className="tag voicing">{currentCard.voicing}</span>
                      <span className="tag place">{currentCard.place}</span>
                      <span className="tag manner">{currentCard.manner}</span>
                    </>
                  ) : (
                    <>
                      <span className="tag height">{currentCard.height}</span>
                      <span className="tag backness">{currentCard.backness}</span>
                      <span className="tag roundedness">{currentCard.roundedness}</span>
                    </>
                  )}
                </div>
                <div className="hint-text">Click to flip for details</div>
              </div>

              {/* Back of Card */}
              <div className="card-face card-back">
                <div className="back-content">
                  <h3>Phonology</h3>
                  <p className="description">{currentCard.description}</p>
                  
                  <div className="example-box">
                    <div className="example-header">
                      <strong>Example</strong>
                      <button className="audio-btn-mini" onClick={(e) => { e.stopPropagation(); playIPA(currentCard.example_word); }}>
                        <Volume2 size={16} />
                      </button>
                    </div>
                    <div className="example-main">
                      <span className="word">{currentCard.example_word}</span>
                      <span className="ipa">{currentCard.example_ipa}</span>
                    </div>
                    <p className="translation">"{currentCard.example_translation}"</p>
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
              <button onClick={prevCard} className="nav-btn"><ChevronLeft size={32} /></button>
              <span className="counter">{currentIndex + 1} / {cards.length}</span>
              <button onClick={nextCard} className="nav-btn"><ChevronRight size={32} /></button>
            </div>
          </div>
        ) : (
          <div className="loading">Loading IPA data...</div>
        )}
      </main>
    </div>
  );
}
