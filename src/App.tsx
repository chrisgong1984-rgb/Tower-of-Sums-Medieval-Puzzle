import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Timer, Play, RotateCcw, Home, Info, AlertCircle, BookOpen, X, ChevronRight, ChevronLeft, Shield } from 'lucide-react';
import confetti from 'canvas-confetti';

// --- Constants ---
const GRID_WIDTH = 6;
const GRID_HEIGHT = 10;
const INITIAL_ROWS = 4;
const TARGET_MIN = 10;
const TARGET_MAX = 25;
const BLOCK_MIN = 1;
const BLOCK_MAX = 9;
const TIME_MODE_LIMIT = 10; // seconds

type GameMode = 'classic' | 'time';
type GameStatus = 'idle' | 'playing' | 'gameover' | 'tutorial';

interface Block {
  id: string;
  value: number;
  row: number;
  col: number;
}

const TUTORIAL_STEPS = [
  {
    title: "Welcome to Tower of Sums",
    content: "在这里，你需要运用古老的算术力量来保卫你的塔楼。不要让石块堆叠到顶部！",
    icon: <Shield className="text-amber-600" size={48} />
  },
  {
    title: "达成神谕",
    content: "屏幕上方会显示一个“神谕之数”。点击网格中的石块，使它们的总和恰好等于这个数字。",
    icon: <Trophy className="text-amber-600" size={48} />
  },
  {
    title: "消除威胁",
    content: "一旦总和匹配，选中的石块就会碎裂消失。如果总和超过目标，选择将被重置。",
    icon: <RotateCcw className="text-amber-600" size={48} />
  },
  {
    title: "两种模式",
    content: "【经典模式】每次成功匹配后底部会升起新行。【计时挑战】每10秒强制升起新行，考验你的反应速度！",
    icon: <Timer className="text-amber-600" size={48} />
  }
];

export default function App() {
  const [mode, setMode] = useState<GameMode>('classic');
  const [status, setStatus] = useState<GameStatus>('idle');
  const [grid, setGrid] = useState<Block[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [target, setTarget] = useState<number>(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_MODE_LIMIT);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [shake, setShake] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('sumstack-highscore');
    return saved ? parseInt(saved, 10) : 0;
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Initialization ---
  const generateTarget = useCallback(() => {
    return Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1)) + TARGET_MIN;
  }, []);

  const initGame = useCallback(() => {
    const initialBlocks: Block[] = [];
    for (let r = 0; r < INITIAL_ROWS; r++) {
      for (let c = 0; c < GRID_WIDTH; c++) {
        initialBlocks.push({
          id: `${Date.now()}-${r}-${c}-${Math.random()}`,
          value: Math.floor(Math.random() * BLOCK_MAX) + BLOCK_MIN,
          row: GRID_HEIGHT - 1 - r,
          col: c,
        });
      }
    }
    setGrid(initialBlocks);
    setTarget(generateTarget());
    setScore(0);
    setStatus('playing');
    setSelectedIds([]);
    setTimeLeft(TIME_MODE_LIMIT);
  }, [generateTarget]);

  // --- Game Logic ---
  const addRow = useCallback(() => {
    setGrid((prev) => {
      const isGameOver = prev.some((b) => b.row === 0);
      if (isGameOver) {
        setStatus('gameover');
        return prev;
      }

      const shifted = prev.map((b) => ({ ...b, row: b.row - 1 }));
      const newRow: Block[] = Array.from({ length: GRID_WIDTH }).map((_, c) => ({
        id: `${Date.now()}-new-${c}-${Math.random()}`,
        value: Math.floor(Math.random() * BLOCK_MAX) + BLOCK_MIN,
        row: GRID_HEIGHT - 1,
        col: c,
      }));

      return [...shifted, ...newRow];
    });
  }, []);

  const handleBlockClick = (block: Block) => {
    if (status !== 'playing') return;
    setSelectedIds((prev) => {
      if (prev.includes(block.id)) {
        return prev.filter((id) => id !== block.id);
      }
      return [...prev, block.id];
    });
  };

  useEffect(() => {
    const currentSum = grid
      .filter((b) => selectedIds.includes(b.id))
      .reduce((sum, b) => sum + b.value, 0);

    if (currentSum === target) {
      setScore((s) => s + selectedIds.length * 10);
      
      // Trigger screen shake
      setShake(true);
      setTimeout(() => setShake(false), 300);

      // Find positions of selected blocks for targeted confetti
      const selectedBlocks = grid.filter(b => selectedIds.includes(b.id));
      selectedBlocks.forEach(block => {
        const x = (block.col + 0.5) / GRID_WIDTH;
        const y = (block.row + 0.5) / GRID_HEIGHT;
        
        confetti({
          particleCount: 15,
          startVelocity: 20,
          spread: 360,
          origin: { x, y: y * 0.6 + 0.2 },
          colors: ['#4a3f35', '#3d3128', '#d4af37', '#f4e4bc'],
          shapes: ['square'],
          scalar: 0.7
        });
      });

      setGrid((prev) => prev.filter((b) => !selectedIds.includes(b.id)));
      setSelectedIds([]);
      setTarget(generateTarget());
      
      if (mode === 'classic') {
        addRow();
      } else {
        setTimeLeft(TIME_MODE_LIMIT);
      }
    } else if (currentSum > target) {
      setSelectedIds([]);
    }
  }, [selectedIds, target, grid, generateTarget, mode, addRow]);

  useEffect(() => {
    if (status === 'playing' && mode === 'time') {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            addRow();
            return TIME_MODE_LIMIT;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, mode, addRow]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('sumstack-highscore', score.toString());
    }
  }, [score, highScore]);

  return (
    <div className="min-h-screen bg-[#2d241e] text-[#f4e4bc] font-sans selection:bg-[#d4af37] selection:text-[#2d241e]">
      {/* Header */}
      <header className="max-w-md mx-auto pt-8 px-4 flex flex-col gap-6">
        <div className="flex justify-between items-end border-b-2 border-[#d4af37]/30 pb-3">
          <div>
            <h1 className="text-3xl font-bold tracking-widest font-serif text-[#d4af37] drop-shadow-md">Tower of Sums</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-50 font-mono">Ancient Arithmetic Sanctum</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest opacity-50 font-mono">最高声望</div>
            <div className="text-xl font-mono text-[#d4af37]">{highScore.toString().padStart(6, '0')}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="parchment stone-border p-3 flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase font-mono font-bold opacity-70">神谕之数</span>
            <span className="text-3xl font-bold font-mono">{target}</span>
          </div>
          <div className="parchment stone-border p-3 flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase font-mono font-bold opacity-70">当前声望</span>
            <span className="text-3xl font-bold font-mono">{score}</span>
          </div>
          <div className={`parchment stone-border p-3 flex flex-col items-center justify-center ${mode === 'time' && timeLeft <= 3 ? 'text-red-700 animate-pulse' : ''}`}>
            <span className="text-[10px] uppercase font-mono font-bold opacity-70">{mode === 'time' ? '沙漏余时' : '挑战模式'}</span>
            {mode === 'time' ? (
              <span className="text-3xl font-bold font-mono">{timeLeft}s</span>
            ) : (
              <span className="text-sm font-bold uppercase font-mono">经典</span>
            )}
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="max-w-md mx-auto mt-8 px-4 pb-12 relative">
        <motion.div 
          animate={shake ? { x: [-2, 2, -2, 2, 0], y: [-1, 1, -1, 1, 0] } : {}}
          transition={{ duration: 0.2 }}
          className="aspect-[6/10] bg-[#1a1410] stone-border relative overflow-hidden"
          style={{ display: 'grid', gridTemplateColumns: `repeat(${GRID_WIDTH}, 1fr)`, gridTemplateRows: `repeat(${GRID_HEIGHT}, 1fr)` }}
        >
          {/* Grid Background Lines */}
          {Array.from({ length: GRID_WIDTH * GRID_HEIGHT }).map((_, i) => (
            <div key={i} className="border-[0.5px] border-[#d4af37]/5" />
          ))}

          {/* Blocks */}
          <AnimatePresence mode="popLayout">
            {grid.map((block) => (
              <motion.button
                key={block.id}
                layout
                initial={{ 
                  scale: 0.8, 
                  opacity: 0, 
                  y: 20,
                  rotateX: 45
                }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  y: 0,
                  rotateX: 0,
                  gridRowStart: block.row + 1,
                  gridColumnStart: block.col + 1,
                }}
                exit={{ 
                  scale: 0.5, 
                  opacity: 0, 
                  rotate: [0, 15, -15, 0],
                  filter: 'brightness(4) blur(8px)',
                  transition: { duration: 0.3, ease: "easeOut" }
                }}
                whileHover={{ 
                  scale: 1.05,
                  filter: 'brightness(1.2)',
                  zIndex: 5
                }}
                whileTap={{ scale: 0.92 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 25,
                  layout: { duration: 0.3, type: "spring", stiffness: 300, damping: 30 }
                }}
                onClick={() => handleBlockClick(block)}
                className={`
                  relative flex items-center justify-center text-2xl font-bold font-mono border border-[#4a3f35] transition-colors
                  ${selectedIds.includes(block.id) 
                    ? 'parchment text-[#2d241e] shadow-[0_0_20px_rgba(212,175,55,0.4)] z-10' 
                    : 'bg-[#3d3128] text-[#f4e4bc]'}
                `}
                style={{
                  gridRow: block.row + 1,
                  gridColumn: block.col + 1,
                  transformStyle: 'preserve-3d',
                  perspective: '1000px'
                }}
              >
                <span className="relative z-10">{block.value}</span>
                
                {/* Background Texture Overlay */}
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/rock.png')]" />

                {selectedIds.includes(block.id) && (
                  <motion.div 
                    layoutId={`glow-${block.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 border-2 border-[#d4af37] animate-pulse-gold"
                  />
                )}
              </motion.button>
            ))}
          </AnimatePresence>

          {/* Overlays */}
          {status === 'idle' && (
            <div className="absolute inset-0 bg-[#1a1410]/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center z-20">
              <div className="w-20 h-20 bg-[#d4af37] text-[#2d241e] rounded-full flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(212,175,55,0.3)] stone-border border-none">
                <Play size={40} fill="currentColor" className="ml-1" />
              </div>
              <h2 className="text-4xl font-serif font-bold mb-3 text-[#d4af37]">Tower of Sums</h2>
              <p className="text-sm opacity-70 mb-10 max-w-[240px] leading-relaxed">运用古老的算术力量，在石块堆满塔楼之前达成神谕。</p>
              
              <div className="flex flex-col gap-4 w-full max-w-[220px]">
                <button 
                  onClick={() => { setMode('classic'); initGame(); }}
                  className="w-full py-4 parchment text-[#2d241e] font-mono font-bold uppercase tracking-widest text-sm hover:brightness-110 transition-all stone-border border-none"
                >
                  开启经典征程
                </button>
                <button 
                  onClick={() => { setMode('time'); initGame(); }}
                  className="w-full py-4 bg-transparent border-2 border-[#d4af37] text-[#d4af37] font-mono font-bold uppercase tracking-widest text-sm hover:bg-[#d4af37] hover:text-[#2d241e] transition-all"
                >
                  计时沙漏挑战
                </button>
                <button 
                  onClick={() => { setStatus('tutorial'); setTutorialStep(0); }}
                  className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity mt-2"
                >
                  <BookOpen size={14} />
                  阅读古老卷轴 (教程)
                </button>
              </div>
            </div>
          )}

          {status === 'tutorial' && (
            <div className="absolute inset-0 bg-[#f4e4bc] text-[#2d241e] flex flex-col items-center justify-center p-10 text-center z-40 parchment">
              <button 
                onClick={() => setStatus('idle')}
                className="absolute top-6 right-6 p-2 hover:bg-black/5 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
              
              <motion.div 
                key={tutorialStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center"
              >
                <div className="mb-8 p-6 bg-white/50 rounded-2xl shadow-inner">
                  {TUTORIAL_STEPS[tutorialStep].icon}
                </div>
                <h2 className="text-3xl font-serif font-bold mb-4">{TUTORIAL_STEPS[tutorialStep].title}</h2>
                <p className="text-lg leading-relaxed mb-12 opacity-80">{TUTORIAL_STEPS[tutorialStep].content}</p>
              </motion.div>

              <div className="flex items-center gap-8 mt-auto">
                <button 
                  disabled={tutorialStep === 0}
                  onClick={() => setTutorialStep(s => s - 1)}
                  className={`p-3 rounded-full border-2 border-[#2d241e] transition-all ${tutorialStep === 0 ? 'opacity-20' : 'hover:bg-[#2d241e] hover:text-[#f4e4bc]'}`}
                >
                  <ChevronLeft size={24} />
                </button>
                
                <div className="flex gap-2">
                  {TUTORIAL_STEPS.map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === tutorialStep ? 'bg-[#2d241e] w-6' : 'bg-[#2d241e]/20'}`} />
                  ))}
                </div>

                {tutorialStep < TUTORIAL_STEPS.length - 1 ? (
                  <button 
                    onClick={() => setTutorialStep(s => s + 1)}
                    className="p-3 rounded-full border-2 border-[#2d241e] hover:bg-[#2d241e] hover:text-[#f4e4bc] transition-all"
                  >
                    <ChevronRight size={24} />
                  </button>
                ) : (
                  <button 
                    onClick={() => setStatus('idle')}
                    className="px-6 py-3 bg-[#2d241e] text-[#f4e4bc] font-bold rounded-full hover:scale-105 transition-transform"
                  >
                    准备出发
                  </button>
                )}
              </div>
            </div>
          )}

          {status === 'gameover' && (
            <div className="absolute inset-0 bg-[#1a1410]/95 text-[#f4e4bc] flex flex-col items-center justify-center p-8 text-center z-30">
              <AlertCircle size={64} className="text-[#990000] mb-6 drop-shadow-[0_0_15px_rgba(153,0,0,0.5)]" />
              <h2 className="text-5xl font-serif font-bold mb-4 text-[#990000]">王国陷落</h2>
              <p className="text-lg opacity-70 mb-10 uppercase tracking-[0.2em]">你在获得 {score} 声望后力竭而亡</p>
              
              <button 
                onClick={initGame}
                className="flex items-center gap-3 px-10 py-5 parchment text-[#2d241e] font-mono font-bold uppercase tracking-widest text-sm hover:scale-105 transition-all stone-border border-none"
              >
                <RotateCcw size={20} />
                重塑命运
              </button>
              
              <button 
                onClick={() => setStatus('idle')}
                className="mt-6 text-xs uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
              >
                撤回主城
              </button>
            </div>
          )}
        </motion.div>

        {/* Controls / Info */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-mono font-bold opacity-50">当前圣数总和</span>
            <div className="h-14 parchment stone-border border-none flex items-center px-5 font-mono text-2xl font-bold">
              {grid.filter(b => selectedIds.includes(b.id)).reduce((s, b) => s + b.value, 0)}
              <span className="mx-3 opacity-30">/</span>
              <span className="opacity-50">{target}</span>
            </div>
          </div>
          <div className="flex items-end justify-end gap-3">
             <button 
              onClick={() => setStatus('idle')}
              className="p-4 parchment stone-border border-none hover:brightness-110 transition-all"
              title="主城"
            >
              <Home size={24} />
            </button>
            <button 
              onClick={initGame}
              className="p-4 parchment stone-border border-none hover:brightness-110 transition-all"
              title="重塑"
            >
              <RotateCcw size={24} />
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-12 border-t-2 border-[#d4af37]/10 pt-8">
          <div className="flex items-start gap-4 opacity-60 italic">
            <Info size={20} className="shrink-0 mt-1 text-[#d4af37]" />
            <p className="text-sm leading-relaxed">
              选择任意石块组合以达成神谕之数。
              <span className="text-[#d4af37] font-bold">经典征程</span>中，每次消除后塔基会升起新石。
              <span className="text-[#d4af37] font-bold">沙漏挑战</span>中，时间流逝将强制升起新石。
            </p>
          </div>
        </div>
      </main>

      {/* Footer Decoration */}
      <footer className="max-w-md mx-auto px-4 pb-10 text-center">
        <div className="inline-flex items-center gap-6 py-3 px-6 border-2 border-[#d4af37]/20 rounded-full bg-[#1a1410]/50">
          <Shield size={14} className="text-[#d4af37]/40" />
          <span className="text-[10px] uppercase tracking-[0.4em] font-mono opacity-30">圣数大厅 编年史 v1.0.4</span>
          <Shield size={14} className="text-[#d4af37]/40" />
        </div>
      </footer>
    </div>
  );
}
