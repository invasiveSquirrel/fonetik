import { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, MicOff, Volume2, AudioLines, ChevronRight, ChevronLeft, Layers, RefreshCw, Type, Maximize2 } from 'lucide-react';
import Waveform from './components/Waveform';
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
  example_sentence_ipa?: string;
  example_sentence_ipa2?: string;
  example_sentence_ipa3?: string;
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
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFront, setShowFront] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<{ transcription: string, feedback: string, details?: any } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speakingRate, setSpeakingRate] = useState(1.0);
  const [practiceText, setPracticeText] = useState<string | null>(null);
  const [practiceFeedback, setPracticeFeedback] = useState<{ transcription: string, feedback: string, details?: any } | null>(null);
  const [isAudioError, setIsAudioError] = useState(false);
  const [fontSettings, setFontSettings] = useState<Record<string, { family: string, size: number }>>(() => {
    // @ts-ignore
    const saved = globalThis.localStorage?.getItem('fonetik_fonts');
    return saved ? JSON.parse(saved) : {};
  });
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

  const currentCard = useMemo(() => cards[currentIndex], [cards, currentIndex]);
  const currentFont = useMemo(() => fontSettings[language] || { family: 'serif', size: 10 }, [fontSettings, language]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(globalThis.location?.search);
    const theme = params.get('theme');
    if (theme) {
      document.documentElement.className = `theme-${theme}`;
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [language]);

  useEffect(() => {
    // @ts-ignore
    globalThis.localStorage?.setItem('fonetik_fonts', JSON.stringify(fontSettings));
  }, [fontSettings]);

  const updateFontFamily = (family: string) => {
    setFontSettings(prev => ({ ...prev, [language]: { ...currentFont, family } }));
  };

  const updateFontSize = (size: number) => {
    setFontSettings(prev => ({ ...prev, [language]: { ...currentFont, size: Math.max(1, Math.min(20, size)) } }));
  };

  const loadCards = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let data;
      // @ts-ignore
      if (globalThis.electronAPI) {
        // @ts-ignore
        data = await globalThis.electronAPI.getCards(language);
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
      if (globalThis.electronAPI) {
        // @ts-ignore
        audioBuffer = await globalThis.electronAPI.playIpa(text, language, speakingRate, isIpa);
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
      if (activeAudioUrl) URL.revokeObjectURL(activeAudioUrl);
      setActiveAudioUrl(url);
      
      const audio = new Audio(url);
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
          const recUrl = URL.createObjectURL(blob);
          if (recordingUrl) URL.revokeObjectURL(recordingUrl);
          setRecordingUrl(recUrl);

          const textToEvaluate = practiceText || (currentCard ? currentCard.symbol : '');
          const isRequestingIpa = !!(practiceText ? false : (currentCard ? true : false));

          let result;
          // @ts-ignore
          if (globalThis.electronAPI) {
            // @ts-ignore
            result = await globalThis.electronAPI.evaluateAudio(blob, language, textToEvaluate, isRequestingIpa);
          } else {
            // Web fallback logic
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            await new Promise((resolve) => { reader.onloadend = resolve; });
            const base64data = (reader.result as string).split(',')[1];
            
            const resp = await fetch('http://localhost:8004/evaluate-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBlob: base64data, language, expectedText: textToEvaluate, isIpa: isRequestingIpa })
            });
            result = await resp.json();
          }

          if (practiceText) {
            setPracticeFeedback(result);
          } else {
            setFeedback(result);
          }
        } catch (err: any) {
          console.error("Evaluation failed", err);
          const errorMsg = { transcription: 'Error', feedback: err?.message || 'Failed' };
          if (practiceText) setPracticeFeedback(errorMsg); else setFeedback(errorMsg);
        } finally {
          setIsRecording(false);
          setIsLoading(false);
          setPracticeText(null);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mr.start();
      setIsRecording(true);
      setTimeout(() => { if (mr.state === 'recording') mr.stop(); }, 4000);
    } catch (err: any) {
      console.error("Recording failed", err);
      setFeedback({ transcription: 'Error', feedback: err?.message || 'Mic denied' });
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) mediaRecorderRef.current.stop();
  };

  const handlePracticeSentence = (text: string) => {
    setPracticeText(text);
    setPracticeFeedback(null);
    startRecording();
  };

  const EvaluationDetails = ({ details }: { details: any }) => {
    if (!details) return null;
    const { score, phonemes, prosody } = details;
    const scoreClass = score > 80 ? 'high' : score > 50 ? 'mid' : 'low';

    return (
      <div className="evaluation-details">
        <div className="score-header">
          <span className="tag manner">Phonetic Score</span>
          <div className={`score-badge ${scoreClass}`}>{score}%</div>
        </div>
        <div className="phonemes-grid">
          {phonemes?.map((p: any, i: number) => (
            <div key={i} className="phoneme-score-card" title={p.f}>
              <span className="phoneme-symbol">{p.p}</span>
              <span className="phoneme-percent" style={{ color: p.s > 80 ? '#10b981' : p.s > 50 ? '#f59e0b' : '#ef4444' }}>
                {p.s}%
              </span>
            </div>
          ))}
        </div>
        <div className="prosody-section">
          <span className="tag manner">Prosody Analysis</span>
          {[
            { label: 'Stress', val: prosody?.stress },
            { label: 'Intonation', val: prosody?.intonation },
            { label: 'Rhythm', val: prosody?.rhythm }
          ].map((row, i) => (
            <div key={i} className="prosody-row">
              <span className="prosody-label">{row.label}</span>
              <div className="prosody-bar-bg">
                <div className="prosody-bar-fill" style={{ width: `${row.val}%` }} />
              </div>
              <span className="mini-score">{row.val}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const shuffleCards = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setShowFront(true);
    setFeedback(null);
  };

  return (
    <div className="app-container">
      <header className="drag-region">
        <div className="logo">
          <h1 className="ipa-name">[fəˈnɛtɪk]</h1>
          <Layers size={28} className="logo-icon" />
        </div>
        <div className="header-actions">
          <button className="shuffle-btn" title="Shuffle" onClick={shuffleCards}><RefreshCw size={20} /></button>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="lang-select">
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <div className="settings-panel">
            <div className="setting-group" title="Font">
              <Type size={16} />
              <select value={currentFont.family} onChange={(e) => updateFontFamily(e.target.value)} className="font-select">
                <option value="serif">Serif (IPA)</option>
                <option value="'Inter', sans-serif">Inter</option>
                <option value="'Outfit', sans-serif">Outfit</option>
                <option value="'Roboto', sans-serif">Roboto</option>
              </select>
            </div>
            <div className="setting-group" title="Size">
              <Maximize2 size={16} />
              <input type="number" value={currentFont.size} onChange={(e) => updateFontSize(Number.parseFloat(e.target.value))} className="size-input" min="1" max="20" step="0.5" />
            </div>
          </div>
          <div className="speed-control">
            <span className="speed-label">Speed: {speakingRate}x</span>
            <input type="range" min="0.5" max="1.0" step="0.1" value={speakingRate} onChange={(e) => setSpeakingRate(Number.parseFloat(e.target.value))} className="speed-slider" />
          </div>
          <button className="close-btn" onClick={() => globalThis.close()}>×</button>
        </div>
      </header>
      <main>
        {isLoading ? (
          <div className="loading"><RefreshCw size={48} className="animate-spin" /><p>Loading...</p></div>
        ) : error ? (
          <div className="error-state"><p className="error-msg">{error}</p><button className="retry-btn" onClick={loadCards}><RefreshCw size={20} /> Retry</button></div>
        ) : currentCard ? (
          <div className="card-scene">
            {isAudioError && <div className="audio-error-banner">⚠️ Audio failed. Falling back...</div>}
            <div className={`card ${showFront ? '' : 'is-flipped'}`} onClick={() => setShowFront(!showFront)}>
              <div className="card-face card-front">
                <div className="symbol-display">
                  <span className="ipa-symbol" style={{ fontFamily: currentFont.family, fontSize: `${currentFont.size}rem` }}>{currentCard.symbol}</span>
                  <div className="speaker-and-tags">
                    <button className="audio-btn" onClick={(e) => { e.stopPropagation(); playIPA(currentCard.symbol, true); }}><Volume2 size={40} /></button>
                    <div className="classification-tags-vertical">
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
                  </div>
                </div>
                <div className="hint-text">Click to flip</div>
              </div>
              <div className="card-face card-back">
                <div className="back-content">
                  <div className="examples-container">
                    {[
                      { word: currentCard.example_word, trans: currentCard.example_translation, ipa: currentCard.example_ipa, sentence: currentCard.example_sentence, s_ipa: currentCard.example_sentence_ipa },
                      { word: currentCard.example_word2, trans: currentCard.example_translation2, ipa: currentCard.example_ipa2, sentence: currentCard.example_sentence2, s_ipa: currentCard.example_sentence_ipa2 },
                      { word: currentCard.example_word3, trans: currentCard.example_translation3, ipa: currentCard.example_ipa3, sentence: currentCard.example_sentence3, s_ipa: currentCard.example_sentence_ipa3 }
                    ].filter(ex => ex.word).map((ex, i) => (
                      <div key={i} className="example-row-container">
                        <div className="example-row">
                          <button className="audio-btn-mini" onClick={(e) => { e.stopPropagation(); playIPA(ex.word!, false); }}><Volume2 size={12} /></button>
                          {ex.ipa && <button className="audio-btn-mini ipa-audio" onClick={(e) => { e.stopPropagation(); playIPA(ex.ipa!, true); }}><AudioLines size={12} /></button>}
                          <button className={`audio-btn-mini practice-btn ${isRecording && practiceText === ex.word ? 'recording' : ''}`} onClick={(e) => { e.stopPropagation(); isRecording ? stopRecording() : handlePracticeSentence(ex.word!); }}><Mic size={14} /></button>
                          <div className="example-text-group"><span className="word">{ex.word}</span><span className="ipa">{ex.ipa}</span></div>
                          <span className="translation">"{ex.trans}"</span>
                        </div>
                        {practiceFeedback && practiceText === ex.word && (
                          <div className="practice-mini-feedback">
                            <span className="feedback-score">{practiceFeedback.details?.score ? `${practiceFeedback.details.score}%` : practiceFeedback.feedback}</span>
                            <span className="feedback-text">Heard: {practiceFeedback.transcription}</span>
                            <EvaluationDetails details={practiceFeedback.details} />
                          </div>
                        )}
                        {ex.sentence && (
                          <div className="sentence-row-container">
                            <div className="sentence-row">
                              <button className="audio-btn-mini sentence-audio" onClick={(e) => { e.stopPropagation(); playIPA(ex.sentence!, false); }}><Volume2 size={12} /></button>
                              <button className={`audio-btn-mini practice-btn ${isRecording && practiceText === ex.sentence ? 'recording' : ''}`} onClick={(e) => { e.stopPropagation(); isRecording ? stopRecording() : handlePracticeSentence(ex.sentence!); }}><Mic size={12} /></button>
                              <span className="sentence">{ex.sentence}</span>
                              {ex.s_ipa && <span className="sentence-ipa">{ex.s_ipa}</span>}
                            </div>
                            {activeAudioUrl && practiceText === ex.sentence && <Waveform audioUrl={activeAudioUrl} speed={speakingRate} />}
                            {practiceFeedback && practiceText === ex.sentence && (
                              <div className="practice-mini-feedback">
                                <span className="feedback-score">{practiceFeedback.details?.score ? `${practiceFeedback.details.score}%` : practiceFeedback.feedback}</span>
                                <span className="feedback-text">Heard: {practiceFeedback.transcription}</span>
                                <EvaluationDetails details={practiceFeedback.details} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="voice-evaluation">
                    <button className={`mic-btn ${isRecording && !practiceText ? 'recording' : ''}`} onClick={(e) => { e.stopPropagation(); startRecording(); }}>
                      {isRecording && !practiceText ? <MicOff /> : <Mic />}
                      <span>{isRecording && !practiceText ? 'Listening...' : 'Practice Sound'}</span>
                    </button>
                    {feedback && (
                      <div className="feedback-layer">
                         <div className="heard">Heard: "{feedback.transcription}"</div>
                         <div className="coach-advice">{feedback.feedback}</div>
                         <EvaluationDetails details={feedback.details} />
                         {recordingUrl && <div className="user-recording"><Waveform audioUrl={recordingUrl} speed={speakingRate} /></div>}
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
        ) : <div className="empty-state">No cards available.</div>}
      </main>
    </div>
  );
}
