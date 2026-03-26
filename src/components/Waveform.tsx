import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface WaveformProps {
  audioUrl: string | null;
  speed: number;
}

const Waveform: React.FC<WaveformProps> = ({ audioUrl, speed }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#94a3b8',
      progressColor: '#38bdf8',
      cursorColor: '#38bdf8',
      barWidth: 2,
      barRadius: 3,
      responsive: true,
      height: 60,
      normalize: true,
      partialRender: true
    });

    ws.load(audioUrl);
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('ready', () => {
      setDuration(ws.getDuration());
      ws.setPlaybackRate(speed);
    });
    ws.on('audioprocess', () => setCurrentTime(ws.getCurrentTime()));
    ws.on('click', () => setCurrentTime(ws.getCurrentTime()));

    waveSurferRef.current = ws;

    return () => {
      ws.destroy();
    };
  }, [audioUrl]);

  useEffect(() => {
    if (waveSurferRef.current) {
      waveSurferRef.current.setPlaybackRate(speed);
    }
  }, [speed]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (waveSurferRef.current) {
      waveSurferRef.current.playPause();
    }
  };

  const resetAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (waveSurferRef.current) {
      waveSurferRef.current.seekTo(0);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
  };

  if (!audioUrl) return <div className="waveform-empty">No audio generated yet.</div>;

  return (
    <div className="waveform-container" onClick={(e) => e.stopPropagation()}>
      <div ref={containerRef} />
      <div className="waveform-controls">
        <button className="wave-btn" onClick={togglePlay}>
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button className="wave-btn" onClick={resetAction}>
          <RotateCcw size={16} />
        </button>
        <div className="playback-time">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
};

export default Waveform;
