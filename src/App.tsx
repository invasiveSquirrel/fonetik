import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, AudioLines, Languages, ChevronRight, ChevronLeft, Layers, RefreshCw } from 'lucide-react';
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
  example_sentence?: string;
  example_sentence2?: string;
  example_sentence3?: string;
}

const LANGUAGES = [
  "English (North American)", "English (Received Pronunciation)", "English (Australian)", "English (Scottish)",
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
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const theme = params.get('theme');
    if (theme) {
      document.documentElement.className = `theme-${theme}`;
    }
  }, []);
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFront, setShowFront] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<{ transcription: string, feedback: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speakingRate, setSpeakingRate] = useState(1.0);
  const [practiceText, setPracticeText] = useState<string | null>(null);
  const [practiceFeedback, setPracticeFeedback] = useState<{ transcription: string, feedback: string } | null>(null);
  const [isAudioError, setIsAudioError] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    loadCards();
  }, [language]);

  const loadCards = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let data;
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        data = await window.electronAPI.getCards(language);
      } else {
        const resp = await fetch(`http://localhost:8004/cards/${encodeURIComponent(language)}`);
        data = await resp.json();
      }
      setCards(data || []);
      setCurrentIndex(0);
      setShowFront(true);
      if (!data || data.length === 0) {
        setError(`No cards found for ${language}.`);
      }
    } catch (err: any) {
      console.error("Failed to load cards:", err);
      setCards([]);
      setError(err?.message || "Failed to load cards.");
    } finally {
      setIsLoading(false);
    }
  };

  const playIPA = async (text: string, isIpa?: boolean) => {
    try {
      if (!text) return;
      let audioBuffer;
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        audioBuffer = await window.electronAPI.playIpa(text, language, speakingRate, isIpa);
      } else {
        const resp = await fetch('http://localhost:8004/play-ipa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, language, speed: speakingRate, isIpa })
        });
        audioBuffer = await resp.arrayBuffer();
      }
      setIsAudioError(false);

      if (!audioBuffer || audioBuffer.byteLength === 0) {
        setIsAudioError(true);
        return;
      }

      const blob = new Blob([audioBuffer], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (err: any) {
      console.error("playIPA error:", err);
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
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        try {
          setIsLoading(true);
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const textToEvaluate = practiceText || (currentCard ? currentCard.symbol : '');

          let result;
          // @ts-ignore
          if (window.electronAPI) {
            // @ts-ignore
            result = await window.electronAPI.evaluateAudio(blob, language, textToEvaluate);
          } else {
            // Web fallback using Sidecar
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            await new Promise((resolve) => { reader.onloadend = resolve; });
            const base64data = (reader.result as string).split(',')[1];
            
            const resp = await fetch('http://localhost:8004/evaluate-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBlob: base64data, language, expectedText: textToEvaluate })
            });
            result = await resp.json();
          }

          if (practiceText) {
            setPracticeFeedback(result);
          } else {
            setFeedback(result);
          }
        } catch (err: any) {
          console.error("Audio evaluation error:", err);
          const errorMsg = {
            transcription: 'Error',
            feedback: err?.message || 'Failed to evaluate pronunciation.'
          };
          if (practiceText) setPracticeFeedback(errorMsg);
          else setFeedback(errorMsg);
        } finally {
          setIsRecording(false);
          setIsLoading(false);
          setPracticeText(null);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mr.start();
      setIsRecording(true);
      setTimeout(() => {
        if (mr.state === 'recording') mr.stop();
      }, 4000);
    } catch (err: any) {
      console.error("Recording failed", err);
      setFeedback({
        transcription: 'Error',
        feedback: err?.message || 'Microphone access denied or unavailable.'
      });
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handlePracticeSentence = (sentence: string) => {
    setPracticeText(sentence);
    setPracticeFeedback(null);
    startRecording();
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
          <div className="speed-control">
            <span className="speed-label">Speed: {speakingRate}x</span>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.1"
              value={speakingRate}
              onChange={(e) => setSpeakingRate(parseFloat(e.target.value))}
              className="speed-slider"
            />
          </div>
          <button className="close-btn" onClick={() => window.close()}>×</button>
        </div>
      </header>

      <main>
        {isLoading ? (
          <div className="loading">
            <RefreshCw size={48} className="animate-spin" />
            <p>Loading exhaustive IPA data...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p className="error-msg">{error}</p>
            <button className="retry-btn" onClick={loadCards}>
              <RefreshCw size={20} /> Retry
            </button>
          </div>
        ) : currentCard ? (
          <div className="card-scene">
            {isAudioError && (
              <div className="audio-error-banner">
                ⚠️ Audio generation failed. Falling back to local synthesis...
              </div>
            )}
            <div className={`card ${showFront ? '' : 'is-flipped'}`} onClick={() => setShowFront(!showFront)}>

              {/* Front of Card */}
              <div className="card-face card-front">
                <div className="symbol-display">
                  <span className="ipa-symbol">{currentCard.symbol}</span>

                  <div className="speaker-and-tags">
                    <button className="audio-btn" onClick={(e) => { e.stopPropagation(); playIPA(currentCard.symbol, true); }}>
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
                      { word: currentCard.example_word, trans: currentCard.example_translation, ipa: currentCard.example_ipa, sentence: currentCard.example_sentence },
                      { word: currentCard.example_word2, trans: currentCard.example_translation2, ipa: currentCard.example_ipa2, sentence: currentCard.example_sentence2 },
                      { word: currentCard.example_word3, trans: currentCard.example_translation3, ipa: currentCard.example_ipa3, sentence: currentCard.example_sentence3 }
                    ].filter(ex => ex.word).map((ex, i) => (
                      <div key={i} className="example-row-container">
                        <div className="example-row">
                          <div className="example-audio-group">
                            <button className="audio-btn-mini" title="Play Word (Orthography)" onClick={(e) => { e.stopPropagation(); playIPA(ex.word!, false); }}>
                              <Volume2 size={12} />
                            </button>
                            {ex.ipa && (
                              <button className="audio-btn-mini ipa-audio" title="Play IPA" onClick={(e) => { e.stopPropagation(); playIPA(ex.ipa!, true); }}>
                                <AudioLines size={12} />
                              </button>
                            )}
                          </div>
                          <button
                            className={`audio-btn-mini practice-btn ${isRecording && practiceText === ex.word ? 'recording' : ''}`}
                            title="Practice Word"
                            onClick={(e) => { e.stopPropagation(); isRecording ? stopRecording() : handlePracticeSentence(ex.word!); }}
                          >
                            <Mic size={14} />
                          </button>
                          <div className="example-text-group">
                            <span className="word">{ex.word}</span>
                            <span className="ipa">{ex.ipa}</span>
                          </div>
                          <span className="translation">"{ex.trans}"</span>
                        </div>
                        {ex.sentence && (
                          <div className="sentence-row-container">
                            <div className="sentence-row">
                              <button className="audio-btn-mini sentence-audio" title="Play Sentence" onClick={(e) => { e.stopPropagation(); playIPA(ex.sentence!, false); }}>
                                <Volume2 size={12} />
                              </button>
                              <button
                                className={`audio-btn-mini practice-btn ${isRecording && practiceText === ex.sentence ? 'recording' : ''}`}
                                title="Practice Sentence"
                                onClick={(e) => { e.stopPropagation(); isRecording ? stopRecording() : handlePracticeSentence(ex.sentence!); }}
                              >
                                <Mic size={12} />
                              </button>
                              <span className="sentence-label">Sentence:</span>
                              <span className="sentence">{ex.sentence}</span>
                            </div>
                            {practiceFeedback && practiceText === ex.sentence && (
                              <div className="practice-mini-feedback">
                                <span className="feedback-score">{practiceFeedback.feedback}</span>
                                <span className="feedback-text">Detected: {practiceFeedback.transcription}</span>
                              </div>
                            )}
                            {practiceFeedback && practiceText === ex.word && (
                              <div className="practice-mini-feedback">
                                <span className="feedback-score">{practiceFeedback.feedback}</span>
                                <span className="feedback-text">Detected: {practiceFeedback.transcription}</span>
                              </div>
                            )}
                          </div>
                        )}
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
          <div className="empty-state">No cards available.</div>
        )}
      </main>
    </div>
  );
}
