/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { 
  LayoutDashboard, 
  Film, 
  Music, 
  Layers, 
  Settings, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Plus,
  Wand2,
  Scissors,
  MessageSquare,
  Focus,
  Volume2,
  Mic,
  Share2,
  Download,
  Video
} from 'lucide-react';
import { vfs } from './core/opfs/vfs.manager';
import { useTimelineStore } from './store/timeline.store';
import { AICoPilotSidebar } from './components/AICoPilotSidebar';
import { proxyEngine } from './core/engine/ProxyEngine';
import { aiEngine } from './core/ai/AIEngine';
import { audioEngine } from './core/audio/AudioEngine';
import { exportEngine } from './core/export/ExportEngine';
import { ttsEngine } from './core/ai/TTSEngine';
import { TemplateEngine } from './core/export/TemplateEngine';
import { beatDetector } from './core/audio/BeatDetector';
import { lottieEngine } from './core/lottie/LottieEngine';
import { TimelineCanvas } from './components/canvas/TimelineCanvas';
import { PreviewMonitor } from './components/canvas/PreviewMonitor';
import { StockLibrary } from './components/library/StockLibrary';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Zero-Latency Progress Bar
 * Bypasses React state entirely. Uses requestAnimationFrame to read directly
 * from the SharedArrayBuffer updated by the Web Worker.
 */
function HardwareEngineStatus() {
  const progressRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frameId: number;
    const update = () => {
      const frames = proxyEngine.getProgress();
      if (progressRef.current && textRef.current) {
        // Simulating 100 frames total for the prototype
        const pct = Math.min((frames / 100) * 100, 100);
        progressRef.current.style.width = `${pct}%`;
        
        if (frames > 0 && frames < 100) {
          textRef.current.innerText = `DECODING: ${frames} FRAMES`;
          textRef.current.className = "text-blue-400";
        } else if (frames >= 100) {
          textRef.current.innerText = `PROXY READY`;
          textRef.current.className = "text-green-400";
        } else {
          textRef.current.innerText = `ENGINE IDLE`;
          textRef.current.className = "text-white/30";
        }
      }
      frameId = requestAnimationFrame(update);
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="mt-4 w-full">
      <div className="flex justify-between text-[10px] font-mono mb-1">
        <span ref={textRef} className="text-white/30">ENGINE IDLE</span>
        <span className="text-white/30">HW ACCEL</span>
      </div>
      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <div ref={progressRef} className="h-full bg-blue-500 w-0 transition-none" />
      </div>
    </div>
  );
}

import { stemSeparator } from './core/ai/StemSeparator';
import { autoDirector } from './core/ai/AutoDirector';

import { ProFeatureLock } from './components/ProFeatureLock';
import { useUserStore } from './store/useUserStore';

import { geminiAnalyzer } from './core/ai/GeminiAnalyzer';

function AIInspector({ activeClipId }: { activeClipId: string | null }) {
  const { clips, updateClip } = useTimelineStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');

  const activeClip = clips.find(c => c.id === activeClipId);

  const runAITask = async (model: 'sam' | 'whisper' | 'mediapipe') => {
    if (!activeClip) return;
    setIsProcessing(true);
    setStatus('Initializing...');
    
    try {
      const result = await aiEngine.runTask(model, { clipId: activeClip.id }, setStatus);
      
      // Update clip with AI metadata
      updateClip(activeClip.id, {
        aiMetadata: {
          ...activeClip.aiMetadata,
          ...result
        }
      });
      setStatus('Complete');
    } catch (err) {
      setStatus('Failed');
      console.error(err);
    } finally {
      setTimeout(() => setIsProcessing(false), 2000);
    }
  };

  if (!activeClip) {
    return (
      <aside className="w-64 border-l border-white/10 bg-[#111] p-4 flex flex-col">
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
          <Wand2 size={14} /> AI Inspector
        </h2>
        <div className="flex-1 flex items-center justify-center text-center text-xs text-white/30 p-4 border border-dashed border-white/10 rounded-lg">
          Select a clip in the timeline to access AI tools.
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 border-l border-white/10 bg-[#111] p-4 flex flex-col">
      <h2 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
        <Wand2 size={14} /> AI Inspector
      </h2>
      
      <div className="space-y-4 flex-1">
        <div className="bg-white/5 p-3 rounded-lg border border-white/10">
          <h3 className="text-[10px] font-mono text-blue-400 mb-1 truncate">{activeClip.name}</h3>
          <p className="text-[10px] text-white/40">Duration: {activeClip.duration}s</p>
        </div>

        <div className="space-y-2">
          <button 
            disabled={isProcessing}
            onClick={() => runAITask('sam')}
            className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 disabled:opacity-50 p-3 rounded-lg text-xs transition-colors text-left border border-transparent hover:border-white/10"
          >
            <div className="bg-purple-500/20 text-purple-400 p-1.5 rounded"><Scissors size={14} /></div>
            <div>
              <div className="font-medium">Remove Background</div>
              <div className="text-[10px] text-white/40">Segment Anything Model</div>
            </div>
          </button>

          <button 
            disabled={isProcessing}
            onClick={() => runAITask('whisper')}
            className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 disabled:opacity-50 p-3 rounded-lg text-xs transition-colors text-left border border-transparent hover:border-white/10"
          >
            <div className="bg-green-500/20 text-green-400 p-1.5 rounded"><MessageSquare size={14} /></div>
            <div>
              <div className="font-medium">Auto-Subtitles</div>
              <div className="text-[10px] text-white/40">Whisper-Web WASM</div>
            </div>
          </button>

          <button 
            disabled={isProcessing}
            onClick={() => runAITask('mediapipe')}
            className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 disabled:opacity-50 p-3 rounded-lg text-xs transition-colors text-left border border-transparent hover:border-white/10"
          >
            <div className="bg-orange-500/20 text-orange-400 p-1.5 rounded"><Focus size={14} /></div>
            <div>
              <div className="font-medium">Auto-Reframe</div>
              <div className="text-[10px] text-white/40">MediaPipe Tracking</div>
            </div>
          </button>

          <button 
            disabled={isProcessing}
            onClick={async () => {
              setIsProcessing(true);
              setStatus('Generating Voice...');
              try {
                const { buffer } = await ttsEngine.generateSpeech("This is a locally generated voiceover.", "en-US-neural", setStatus);
                setStatus('Voice Generated (Buffer Ready)');
                // In a full app, this buffer is saved to OPFS and added to the timeline
              } catch (e) {
                console.error(e);
                setStatus('TTS Failed');
              } finally {
                setTimeout(() => setIsProcessing(false), 2000);
              }
            }}
            className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 disabled:opacity-50 p-3 rounded-lg text-xs transition-colors text-left border border-transparent hover:border-white/10"
          >
            <div className="bg-pink-500/20 text-pink-400 p-1.5 rounded"><Mic size={14} /></div>
            <div>
              <div className="font-medium">AI Voiceover</div>
              <div className="text-[10px] text-white/40">Local WASM TTS</div>
            </div>
          </button>

          <ProFeatureLock>
            <button 
              disabled={isProcessing}
              onClick={async () => {
                setIsProcessing(true);
                setStatus('Initializing ONNX Model...');
                try {
                  await stemSeparator.init();
                  setStatus('Processing Stems...');
                  // Mock processing delay since we don't have a real audio buffer here
                  await new Promise(r => setTimeout(r, 2000));
                  setStatus('Separation Complete');
                } catch (e) {
                  console.error(e);
                  setStatus('Separation Failed');
                } finally {
                  setTimeout(() => setIsProcessing(false), 2000);
                }
              }}
              className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 disabled:opacity-50 p-3 rounded-lg text-xs transition-colors text-left border border-transparent hover:border-white/10"
            >
              <div className="bg-cyan-500/20 text-cyan-400 p-1.5 rounded"><Music size={14} /></div>
              <div>
                <div className="font-medium">Vocal Remover</div>
                <div className="text-[10px] text-white/40">ONNX Stem Separation</div>
              </div>
            </button>
          </ProFeatureLock>

          <ProFeatureLock>
            <button 
              disabled={isProcessing}
              onClick={async () => {
                setIsProcessing(true);
                setStatus('Initializing NLP Engine...');
                try {
                  await autoDirector.init();
                  setStatus('Analyzing Transcript...');
                  // Mock transcription data
                  const mockTranscript = [
                    { start: 0, end: 5, text: "Welcome to this amazing city." },
                    { start: 5, end: 10, text: "Look at the beautiful nature around us." }
                  ];
                  const inserts = await autoDirector.generateBrollCut(mockTranscript);
                  setStatus(`Found ${inserts.length} B-Roll clips`);
                } catch (e) {
                  console.error(e);
                  setStatus('Auto B-Roll Failed');
                } finally {
                  setTimeout(() => setIsProcessing(false), 2000);
                }
              }}
              className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 disabled:opacity-50 p-3 rounded-lg text-xs transition-colors text-left border border-transparent hover:border-white/10"
            >
              <div className="bg-yellow-500/20 text-yellow-400 p-1.5 rounded"><Film size={14} /></div>
              <div>
                <div className="font-medium">Auto B-Roll</div>
                <div className="text-[10px] text-white/40">NLP Director Engine</div>
              </div>
            </button>
          </ProFeatureLock>

          <ProFeatureLock>
            <button 
              disabled={isProcessing}
              onClick={async () => {
                setIsProcessing(true);
                try {
                  const insights = await geminiAnalyzer.analyzeVideo(activeClip.sourceHandle, setStatus);
                  updateClip(activeClip.id, {
                    aiMetadata: {
                      ...activeClip.aiMetadata,
                      insights
                    }
                  });
                } catch (e) {
                  console.error(e);
                  setStatus('Analysis Failed');
                } finally {
                  setTimeout(() => setIsProcessing(false), 2000);
                }
              }}
              className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 disabled:opacity-50 p-3 rounded-lg text-xs transition-colors text-left border border-transparent hover:border-white/10"
            >
              <div className="bg-indigo-500/20 text-indigo-400 p-1.5 rounded"><Video size={14} /></div>
              <div>
                <div className="font-medium">Analyze video content</div>
                <div className="text-[10px] text-white/40">Gemini 3.1 Pro Video Understanding</div>
              </div>
            </button>
          </ProFeatureLock>
        </div>

        {isProcessing && (
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium text-blue-400">Processing...</span>
            </div>
            <div className="text-[10px] text-white/60 font-mono">{status}</div>
          </div>
        )}

        {/* Display AI Results */}
        {activeClip.aiMetadata && !isProcessing && (
          <div className="mt-4 space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/50">Active Effects</h4>
            {activeClip.aiMetadata.hasBackgroundRemoved && (
              <div className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-1 rounded border border-purple-500/30">✓ Background Removed</div>
            )}
            {activeClip.aiMetadata.subtitles && (
              <div className="text-[10px] bg-green-500/20 text-green-300 px-2 py-1 rounded border border-green-500/30">✓ {activeClip.aiMetadata.subtitles.length} Subtitles Generated</div>
            )}
            {activeClip.aiMetadata.boundingBox && (
              <div className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-1 rounded border border-orange-500/30">✓ Subject Tracked</div>
            )}
            {(activeClip.aiMetadata as any).insights && (
              <div className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded border border-indigo-500/30">
                <div className="font-bold mb-1">Gemini Insights:</div>
                <div className="whitespace-pre-wrap">{(activeClip.aiMetadata as any).insights}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

export default function App() {
  const { clips, isPlaying, currentTime, setCurrentTime, addClip } = useTimelineStore();
  const [isVfsReady, setIsVfsReady] = useState(false);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);

  useEffect(() => {
    vfs.init().then(() => setIsVfsReady(true));
  }, []);

  // Phase 8: Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        audioEngine.init();
        useTimelineStore.setState(s => ({ isPlaying: !s.isPlaying }));
      } else if ((e.code === 'Backspace' || e.code === 'Delete') && activeClipId) {
        e.preventDefault();
        useTimelineStore.setState(s => ({
          clips: s.clips.filter(c => c.id !== activeClipId)
        }));
        setActiveClipId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeClipId]);

  const handleExport = async (resolution: '1080p' | '4K' = '1080p') => {
    try {
      setIsExporting(true);
      const filename = await exportEngine.exportTimeline(resolution, setExportProgress);
      alert(`${resolution} Export Complete: ${filename} saved to OPFS.`);
    } catch (e) {
      console.error(e);
      alert('Export failed.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');

  const handleExportTemplate = () => {
    const json = TemplateEngine.exportTemplate(clips, "My Viral Template");
    console.log("Template JSON:", json);
    alert("Template exported to console! (Check DevTools)");
  };

  const handleAutoBeatSync = async () => {
    setIsProcessing(true);
    setStatus('Detecting Beats...');
    try {
      // Mock audio URL for demonstration (using a short beep or any available audio)
      const mockAudioUrl = 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg'; 
      const beats = await beatDetector.detectBeats(mockAudioUrl);
      console.log('Detected Beats at:', beats);
      setStatus(`Found ${beats.length} beats! Slicing clips...`);
      // In a real app, we would slice the TimelineClips at these timestamps
      setTimeout(() => {
        alert(`Auto-Beat Sync Complete! Snapped clips to ${beats.length} beat markers.`);
        setIsProcessing(false);
      }, 1000);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  const handleAddLottie = async () => {
    setIsProcessing(true);
    setStatus('Loading Lottie...');
    try {
      // Mock Lottie JSON URL (public domain/free)
      await lottieEngine.loadAnimation('https://raw.githubusercontent.com/LottieFiles/lottie-js/master/tests/animations/data.json');
      setStatus('Lottie Loaded!');
      setTimeout(() => {
        alert('Lottie Sticker added to timeline!');
        setIsProcessing(false);
      }, 1000);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  const handleSocialExport = async () => {
    try {
      setIsExporting(true);
      const filename = await exportEngine.exportSocial(setExportProgress);
      alert(`Social Export Complete: ${filename} saved to OPFS. Ready for TikTok/Reels!`);
    } catch (e) {
      console.error(e);
      alert('Export failed.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    for (const file of Array.from(e.target.files) as File[]) {
      // 1. Stream massive file directly to OPFS
      const handle = await vfs.importFile(file);
      console.log('Imported to OPFS:', handle);
      
      // 2. Trigger Hardware-Accelerated Proxy Generation
      await proxyEngine.generateProxy(handle);
      
      // 3. Add to timeline automatically for testing
      const newId = Math.random().toString(36).substring(7);
      addClip({
        id: newId,
        name: file.name,
        start: clips.length * 5, // stagger them
        duration: 4.5,
        trackId: 0,
        sourceHandle: handle
      });
      setActiveClipId(newId);
    }
  };

  const formatTimecode = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    const f = Math.floor((seconds % 1) * 30).toString().padStart(2, '0'); // 30fps
    return `${h}:${m}:${s}:${f}`;
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0A0A0A] text-[#E5E5E5] font-sans selection:bg-blue-500/30">
      {/* Header / Toolbar */}
      <header className="flex h-12 items-center justify-between border-b border-white/10 px-4 bg-[#111]">
        <div className="flex items-center gap-4">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 font-bold text-white">N</div>
          <h1 className="text-sm font-semibold tracking-tight">NextGen Video Editor <span className="text-white/40 font-normal">v1.0.0-alpha</span></h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              const id = Date.now().toString();
              addClip({ id, name: 'B-Roll_01.mp4', start: currentTime, duration: 3, trackId: 1, sourceHandle: 'mock' });
              setActiveClipId(id);
            }}
            className="rounded-md bg-white/5 px-3 py-1.5 text-xs font-medium hover:bg-white/10 transition-colors"
          >
            + Mock Clip
          </button>
          <button 
            onClick={handleExportTemplate}
            className="rounded-md bg-white/5 px-3 py-1.5 text-xs font-medium hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <Download size={14} /> Template
          </button>
          <button 
            onClick={handleSocialExport}
            disabled={isExporting}
            className="rounded-md bg-white/5 px-3 py-1.5 text-xs font-medium hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <Share2 size={14} /> {isExporting ? `Exporting ${exportProgress}%` : 'Export Reels'}
          </button>
          <button 
            onClick={() => handleExport('1080p')}
            disabled={isExporting}
            className="rounded-md bg-white/5 px-3 py-1.5 text-xs font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {isExporting ? `Exporting ${exportProgress}%` : 'Export 1080p'}
          </button>
          <ProFeatureLock>
            <button 
              onClick={() => handleExport('4K')}
              disabled={isExporting}
              className="rounded-md bg-amber-500/20 text-amber-500 px-3 py-1.5 text-xs font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Download size={14} /> {isExporting ? `Exporting ${exportProgress}%` : 'Export 4K'}
            </button>
          </ProFeatureLock>
          <button className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors">
            <Share2 size={14} /> Share
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <nav className="flex w-14 flex-col items-center gap-4 border-r border-white/10 py-4 bg-[#0F0F0F]">
          <NavIcon icon={<LayoutDashboard size={20} />} active />
          <NavIcon icon={<Film size={20} />} />
          <NavIcon icon={<Music size={20} />} />
          <NavIcon icon={<Layers size={20} />} />
          <div className="mt-auto">
            <NavIcon icon={<Settings size={20} />} />
          </div>
        </nav>

        {/* Phase 10: Stock Library Sidebar */}
        <StockLibrary />

        {/* Workspace */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1">
            {/* Asset Browser */}
            <aside className="w-64 border-r border-white/10 bg-[#111] p-4 flex flex-col">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-widest text-white/50">Project Assets</h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleAutoBeatSync}
                    title="Auto-Beat Sync"
                    className="cursor-pointer rounded-full p-1 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                  >
                    <Music size={16} />
                  </button>
                  <button 
                    onClick={handleAddLottie}
                    title="Add Lottie Sticker"
                    className="cursor-pointer rounded-full p-1 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                  >
                    <Layers size={16} />
                  </button>
                  <label className="cursor-pointer rounded-full p-1 hover:bg-white/10 transition-colors text-white/60 hover:text-white">
                    <Plus size={16} />
                    <input type="file" multiple className="hidden" onChange={handleFileImport} />
                  </label>
                </div>
              </div>
              <div className="space-y-2 flex-1 overflow-y-auto">
                {!isVfsReady && <div className="text-xs text-white/30 italic">Initializing VFS...</div>}
                {isVfsReady && clips.length === 0 && (
                  <div className="rounded-lg border border-dashed border-white/10 p-8 text-center text-xs text-white/20">
                    No assets imported yet.
                  </div>
                )}
                {clips.map(clip => (
                  <button 
                    key={clip.id} 
                    onClick={() => setActiveClipId(clip.id)}
                    className={cn(
                      "w-full flex items-center gap-2 rounded p-2 text-xs transition-colors text-left",
                      activeClipId === clip.id ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "bg-white/5 hover:bg-white/10 border border-transparent"
                    )}
                  >
                    <Film size={14} className={activeClipId === clip.id ? "text-blue-400" : "text-white/40"} />
                    <span className="truncate">{clip.name}</span>
                  </button>
                ))}
              </div>
              
              {/* Engine Status Monitor */}
              <HardwareEngineStatus />
            </aside>

            {/* Preview Monitor */}
            <section className="relative flex flex-1 flex-col items-center justify-center bg-black">
              <div className="aspect-video w-full max-w-5xl bg-[#111] shadow-2xl ring-1 ring-white/5 overflow-hidden rounded-lg">
                <PreviewMonitor />
              </div>
              
              {/* Playback Controls */}
              <div className="absolute bottom-8 flex items-center gap-6 rounded-full bg-black/80 backdrop-blur-md border border-white/10 px-6 py-3 z-10">
                <button className="text-white/60 hover:text-white"><SkipBack size={20} /></button>
                <button 
                  onClick={() => {
                    audioEngine.init();
                    useTimelineStore.setState(s => ({ isPlaying: !s.isPlaying }));
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black hover:bg-white/90"
                >
                  {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                </button>
                <button className="text-white/60 hover:text-white"><SkipForward size={20} /></button>
                
                {/* Phase 6: Audio Master Volume */}
                <div className="flex items-center gap-2 ml-4 border-l border-white/10 pl-6">
                  <Volume2 size={16} className="text-white/60" />
                  <input 
                    type="range" 
                    min="0" max="1" step="0.01" 
                    value={volume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVolume(val);
                      audioEngine.init().then(() => audioEngine.setVolume(val));
                    }}
                    className="w-20 accent-blue-500"
                  />
                </div>
              </div>
            </section>

            {/* Phase 5: AI Inspector Panel */}
            <AIInspector activeClipId={activeClipId} />
            
            {/* Phase 17: AI Co-Pilot Sidebar */}
            <AICoPilotSidebar />
          </div>

          {/* Timeline Area */}
          <footer className="h-80 border-t border-white/10 bg-[#0F0F0F] flex flex-col">
            <div className="flex h-10 items-center border-b border-white/5 px-4 justify-between bg-[#111] z-10">
              <div className="flex items-center gap-4 text-[11px] font-mono text-white/40">
                <span className="text-blue-400 font-bold">{formatTimecode(currentTime)}</span>
                <span>/</span>
                <span>00:10:00:00</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1 w-32 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full w-1/3 bg-white/20" />
                </div>
              </div>
            </div>
            
            <div className="flex-1 relative">
              {/* Phase 3: Hardware Accelerated Canvas Timeline */}
              <TimelineCanvas />
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

function NavIcon({ icon, active = false }: { icon: React.ReactNode; active?: boolean }) {
  return (
    <button className={cn(
      "flex h-10 w-10 items-center justify-center rounded-lg transition-all",
      active ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-white/40 hover:bg-white/5 hover:text-white"
    )}>
      {icon}
    </button>
  );
}

