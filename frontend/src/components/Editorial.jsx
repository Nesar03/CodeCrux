import { useState, useRef, useEffect } from 'react';
import { Pause, Play, Maximize, Minimize } from 'lucide-react';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// Cloudinary builds these versions on the fly by inserting a transformation into the URL
const QUALITIES = [
  { label: 'Original', transform: null },
  { label: '1080p', transform: 'c_limit,h_1080,q_auto' },
  { label: '720p', transform: 'c_limit,h_720,q_auto' },
  { label: '480p', transform: 'c_limit,h_480,q_auto' },
  { label: '360p', transform: 'c_limit,h_360,q_auto' },
];

const buildVideoUrl = (url, transform) => {
  if (!transform || !url || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/${transform}/`);
};

const Editorial = ({ secureUrl, thumbnailUrl, duration }) => {
  

  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const resumeRef = useRef(null); // remembers position/play state while quality changes

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState('Original');
  const [openMenu, setOpenMenu] = useState(null); // 'speed' | 'quality' | null
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const showControls = isHovering || !isPlaying || openMenu !== null;

  if (!secureUrl) {
    return (
      <div className="alert alert-info">
        <span>No video editorial is available for this problem yet.</span>
      </div>
    );
  }

  const currentQuality = QUALITIES.find((q) => q.label === quality) || QUALITIES[0];
  const videoSrc = buildVideoUrl(secureUrl, currentQuality.transform);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  // ---- Speed ----
  const changeSpeed = (value) => {
    setSpeed(value);
    if (videoRef.current) videoRef.current.playbackRate = value;
    setOpenMenu(null);
  };

  // ---- Quality ----
  const changeQuality = (label) => {
    setOpenMenu(null);
    if (label === quality) return;
    const video = videoRef.current;
    if (video) {
      // keep the same position and play/pause state after the new source loads
      resumeRef.current = { time: video.currentTime, wasPlaying: !video.paused };
    }
    setSwitching(true);
    setQuality(label);
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed; // a new source can reset the speed
    if (resumeRef.current) {
      video.currentTime = resumeRef.current.time;
      if (resumeRef.current.wasPlaying) video.play().catch(() => {});
      resumeRef.current = null;
    }
    setSwitching(false);
  };

  // ---- Fullscreen ----
  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (videoRef.current?.webkitEnterFullscreen) {
        videoRef.current.webkitEnterFullscreen(); // iPhone Safari
      }
    } else {
      document.exitFullscreen();
    }
  };

  const handleVideoError = () => {
  if (quality !== 'Original') {
    resumeRef.current = null;
    setSwitching(false);
    setQuality('Original');
  }
};

  

  return (
    <div
      ref={containerRef}
      className={`relative w-full mx-auto overflow-hidden bg-black ${
        isFullscreen ? 'max-w-none h-screen rounded-none' : 'max-w-2xl rounded-xl shadow-lg'
      }`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <video
        onError={handleVideoError}
        ref={videoRef}
        src={videoSrc}
        poster={thumbnailUrl}
        onClick={togglePlayPause}
        onDoubleClick={toggleFullscreen}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={handleLoadedMetadata}
        className={`w-full bg-black cursor-pointer ${isFullscreen ? 'h-full object-contain' : 'aspect-video'}`}
      />

      {switching && (
        <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
          Switching quality...
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 transition-opacity ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlayPause}
            className="btn btn-circle btn-primary"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause /> : <Play />}
          </button>

          <div className="flex-1" />

          {/* Speed */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'speed' ? null : 'speed')}
              className="btn btn-sm btn-ghost text-white"
              aria-label="Playback speed"
            >
              {speed}x
            </button>
            {openMenu === 'speed' && (
              <ul className="absolute bottom-full right-0 mb-2 bg-base-100 text-base-content rounded-lg shadow-lg py-1 z-10 min-w-20">
                {SPEEDS.map((s) => (
                  <li key={s}>
                    <button
                      onClick={() => changeSpeed(s)}
                      className={`w-full text-left text-sm px-3 py-1 hover:bg-base-200 ${s === speed ? 'font-bold text-primary' : ''}`}
                    >
                      {s === 1 ? 'Normal' : `${s}x`}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quality */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'quality' ? null : 'quality')}
              className="btn btn-sm btn-ghost text-white"
              aria-label="Video quality"
            >
              {quality}
            </button>
            {openMenu === 'quality' && (
              <ul className="absolute bottom-full right-0 mb-2 bg-base-100 text-base-content rounded-lg shadow-lg py-1 z-10 min-w-24">
                {QUALITIES.map((q) => (
                  <li key={q.label}>
                    <button
                      onClick={() => changeQuality(q.label)}
                      className={`w-full text-left text-sm px-3 py-1 hover:bg-base-200 ${q.label === quality ? 'font-bold text-primary' : ''}`}
                    >
                      {q.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="btn btn-sm btn-ghost btn-square text-white"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center w-full mt-2">
          <span className="text-white text-sm mr-2">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={(e) => {
              if (videoRef.current) videoRef.current.currentTime = Number(e.target.value);
            }}
            className="range range-primary range-xs flex-1"
          />
          <span className="text-white text-sm ml-2">{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

export default Editorial;
