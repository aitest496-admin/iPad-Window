import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { X, Maximize2, GripHorizontal, Calendar, Copy, CheckSquare, Database, Send, ChevronLeft, ChevronRight, CalendarDays, Pencil, Eraser, Type, MousePointer2 } from 'lucide-react';
import { Stage, Layer, Line, Text, Group, Rect } from 'react-konva';

type SoapItem = { id: string; prefix: string; text: string; };
type TextObject = { id: string; text: string; x: number; y: number; };
type DrawingLine = { points: number[]; color: string; strokeWidth: number; };

const getPrefixColorClass = (prefix: string) => {
  switch (prefix) {
    case 'S': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'O': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'A': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'P': return 'bg-rose-100 text-rose-700 border-rose-200';
    case '既往歴': return 'bg-purple-100 text-purple-700 border-purple-200';
    case '現病歴': return 'bg-teal-100 text-teal-700 border-teal-200';
    case '生活歴': return 'bg-orange-100 text-orange-700 border-orange-200';
    case '家族歴': return 'bg-pink-100 text-pink-700 border-pink-200';
    case 'N': return 'bg-slate-200 text-slate-700 border-slate-300';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

const parseSoapText = (rawText: string): SoapItem[] => {
  if (!rawText.trim()) return [];
  const lines = rawText.split('\n');
  const items: SoapItem[] = [];
  let currentItem: SoapItem | null = null;
  const prefixRegex = /^(S|O|A|P|既往歴|現病歴|生活歴|家族歴|N)@(.*)$/;

  for (const line of lines) {
    const match = line.match(prefixRegex);
    if (match) {
      if (currentItem) items.push(currentItem);
      currentItem = {
        id: crypto.randomUUID(),
        prefix: match[1],
        text: match[2]
      };
    } else {
      if (currentItem) {
        currentItem.text += '\n' + line;
      } else {
        currentItem = {
          id: crypto.randomUUID(),
          prefix: 'N',
          text: line
        };
      }
    }
  }
  if (currentItem) items.push(currentItem);
  return items;
};

// POC用のモックデータベース
const MOCK_DB: Record<string, { summary: string; soap: string }> = {
  "2026-04-09": {
    summary: "【来院理由と主訴】\n佐藤さんは数日前に食事中に奥歯の詰め物が取れたため来院した。現在痛みはないが、穴に食べ物が詰まることを気にしていた。以前から前歯の端が少し欠けていることも気になっており、今回一緒に治したいと希望した。奥歯の詰め物を作り直し、前歯は樹脂で修復する方針を伝えた。\n\n【口腔内所見と治療計画】\n奥歯の土台は良好で、新しい詰め物で対応可能と判断した。口腔内全体的に歯肉に腫れが見られたため、ブラッシング時の出血の有無を確認したところ、たまに出血があると佐藤さんは答えた。詰め物の処置後、お口全体のクリーニングを受けることを推奨した。クリーニングにより歯石除去と歯肉の引き締め効果があり、新しい詰め物の長持ちに繋がることを説明した。佐藤さんはクリーニングを含め、全てまとめて綺麗にしたいと承諾した。まず奥歯の処置を進め、その後前歯の修復と全体のクリーニングを計画的に行うことを伝えた。",
    soap: "S@奥歯の詰め物が取れた\nS@現在痛みはない\nS@穴に食べ物が詰まることを気にしていた\nS@以前から前歯の端が少し欠けていることも気になっており\nS@今回一緒に治したいと希望した\nS@たまに出血がある\nS@クリーニングを含め、全てまとめて綺麗にしたいと承諾した\nO@奥歯の土台は良好\nO@口腔内全体的に歯肉に腫れが見られた\nA@新しい詰め物で対応可能と判断した\nP@奥歯の詰め物を作り直し、前歯は樹脂で修復する方針を伝えた\nP@お口全体のクリーニングを受けることを推奨した\nP@まず奥歯の処置を進め、その後前歯の修復と全体のクリーニングを計画的に行うことを伝えた\n現病歴@数日前に食事中に奥歯の詰め物が取れた\nN@クリーニングにより歯石除去と歯肉の引き締め効果があり、新しい詰め物の長持ちに繋がることを説明した"
  },
  "2026-04-06": {
    summary: "【来院目的の確認】\n佐藤氏の来院目的は口腔全体のクリーニングであったことを確認した。\n\n【患者の主訴】\n佐藤氏より、数日前から右下の奥歯に痛みがあり、冷たいものがキーンとしみる症状があるとの訴えがあった。\n\n【歯科スタッフの診断と治療方針】\n冷たいものがしみる症状から知覚過敏またはレジン充填下のう蝕を疑い、過去の治療記録から当該奥歯にレジン充填があることを確認した。クリーニングに先立ち、痛む部位の診査とレントゲン撮影による歯髄の状態確認を行い、う蝕が原因であれば早期に処置する方針を説明した。診断後、無理のない範囲で歯石除去を進めることを伝えた。",
    soap: "S@口腔全体のクリーニング\nS@数日前から右下の奥歯に痛みがあり、冷たいものがキーンとしみる症状がある\nO@当該奥歯にレジン充填があることを確認した\nA@知覚過敏またはレジン充填下のう蝕を疑い\nP@痛む部位の診査とレントゲン撮影による歯髄の状態確認を行い\nP@う蝕が原因であれば早期に処置する方針を説明した\nP@無理のない範囲で歯石除去を進めることを伝えた\n現病歴@数日前から右下の奥歯に痛みがあり、冷たいものがキーンとしみる症状がある"
  }
};

export default function App() {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  
  // Canvas States
  const [lines, setLines] = useState<DrawingLine[]>([]);
  const [textObjects, setTextObjects] = useState<TextObject[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'select'>('pen');
  const [stageSize, setStageSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  const [summaryText, setSummaryText] = useState("");
  const [soapItems, setSoapItems] = useState<SoapItem[]>([]);
  
  const [testSummaryText, setTestSummaryText] = useState("");
  const [testSoapText, setTestSoapText] = useState("");

  const dragControls = useDragControls();
  const upperTextRef = useRef<HTMLTextAreaElement>(null);
  const soapContainerRef = useRef<HTMLDivElement>(null);

  // Handle window resize for canvas
  useEffect(() => {
    const handleResize = () => {
      setStageSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 日付が変更されたときにデータベースからデータを読み込む処理
  useEffect(() => {
    const data = MOCK_DB[selectedDate];
    if (data) {
      setSummaryText(data.summary);
      setSoapItems(parseSoapText(data.soap));
      setTestSummaryText(data.summary);
      setTestSoapText(data.soap);
    } else {
      setSummaryText("");
      setSoapItems([]);
      setTestSummaryText("");
      setTestSoapText("");
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!soapContainerRef.current) return;
    if (soapItems.length === 0) {
      soapContainerRef.current.innerHTML = '<div contenteditable="false" class="text-slate-400 text-sm p-2 select-none">SOAPデータがありません。</div>';
      return;
    }
    
    const html = soapItems.map(item => `
      <div class="soap-row flex items-start gap-2 mb-1">
        <div contenteditable="false" class="soap-prefix w-14 flex-shrink-0 ${getPrefixColorClass(item.prefix)} font-bold text-xs py-0.5 text-center rounded border select-none mt-0.5">
          ${item.prefix}
        </div>
        <div class="soap-text flex-1 whitespace-pre-wrap outline-none text-sm leading-relaxed min-h-[1.25rem]">${item.text}</div>
      </div>
    `).join('');
    
    soapContainerRef.current.innerHTML = html;
  }, [soapItems]);

  const handleInsertSelected = () => {
    let selectedText = '';
    const activeEl = document.activeElement;
    
    // Check if the currently active element is a text input/textarea
    if (activeEl && (activeEl instanceof HTMLTextAreaElement || activeEl instanceof HTMLInputElement)) {
      selectedText = activeEl.value.substring(activeEl.selectionStart || 0, activeEl.selectionEnd || 0);
    }
    
    // Fallback: Check window.getSelection() for contentEditable or other selected text
    if (!selectedText) {
      selectedText = window.getSelection()?.toString() || '';
    }
    
    if (!selectedText.trim()) {
      alert('テキストが選択されていません。挿入したい文字を選択してください。');
      return;
    }
    
    // Add as text object to canvas
    const newTextObj: TextObject = {
      id: crypto.randomUUID(),
      text: selectedText,
      x: 100 + Math.random() * 100,
      y: 100 + Math.random() * 100
    };
    setTextObjects(prev => [...prev, newTextObj]);
  };

  const handleInsertAll = (type: 'summary' | 'soap') => {
    let textToInsert = '';
    if (type === 'summary') {
      textToInsert = summaryText;
    } else {
      if (!soapContainerRef.current) return;
      const rows = soapContainerRef.current.querySelectorAll('.soap-row');
      const items: string[] = [];
      rows.forEach(row => {
        const prefix = (row.querySelector('.soap-prefix') as HTMLElement)?.innerText.trim() || '';
        let text = (row.querySelector('.soap-text') as HTMLElement)?.innerText || '';
        text = text.replace(/\n$/, ''); // Remove trailing newline
        items.push(`${prefix}@${text}`);
      });
      textToInsert = items.join('\n');
    }
    if (!textToInsert) return;
    
    // Add as text object to canvas
    const newTextObj: TextObject = {
      id: crypto.randomUUID(),
      text: textToInsert,
      x: 150 + Math.random() * 100,
      y: 150 + Math.random() * 100
    };
    setTextObjects(prev => [...prev, newTextObj]);
  };

  // Canvas Drawing Handlers
  const handleMouseDown = (e: any) => {
    if (tool === 'select') return;
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    setLines([...lines, { points: [pos.x, pos.y], color: tool === 'eraser' ? '#f8fafc' : '#334155', strokeWidth: tool === 'eraser' ? 20 : 2 }]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || tool === 'select') return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    let lastLine = lines[lines.length - 1];
    lastLine.points = lastLine.points.concat([point.x, point.y]);
    lines.splice(lines.length - 1, 1, lastLine);
    setLines(lines.concat());
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-100 font-sans overflow-hidden">
      {/* iPad-like Canvas Background */}
      <div className="absolute inset-0 z-0">
        <Stage
          width={stageSize.width}
          height={stageSize.height}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        >
          <Layer>
            {/* Grid Background */}
            <Rect width={stageSize.width} height={stageSize.height} fill="#f8fafc" />
            
            {/* Handwriting Lines */}
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke={line.color}
                strokeWidth={line.strokeWidth}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={line.color === '#f8fafc' ? 'destination-out' : 'source-over'}
              />
            ))}

            {/* Inserted Text Objects */}
            {textObjects.map((obj) => (
              <Group
                key={obj.id}
                x={obj.x}
                y={obj.y}
                draggable={tool === 'select'}
                onDragEnd={(e) => {
                  const newObjects = textObjects.map(o => 
                    o.id === obj.id ? { ...o, x: e.target.x(), y: e.target.y() } : o
                  );
                  setTextObjects(newObjects);
                }}
              >
                <Rect
                  width={300}
                  height={120}
                  fill="white"
                  shadowBlur={10}
                  shadowOpacity={0.1}
                  cornerRadius={8}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
                <Text
                  text={obj.text}
                  fontSize={14}
                  padding={15}
                  width={300}
                  fill="#1e293b"
                  lineHeight={1.4}
                />
              </Group>
            ))}
          </Layer>
        </Stage>
      </div>

      {/* Canvas Toolbar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-slate-200 z-50 flex items-center gap-4">
        <button
          onClick={() => setTool('pen')}
          className={`p-2 rounded-xl transition-all ${tool === 'pen' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
          title="ペン"
        >
          <Pencil size={20} />
        </button>
        <button
          onClick={() => setTool('eraser')}
          className={`p-2 rounded-xl transition-all ${tool === 'eraser' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
          title="消しゴム"
        >
          <Eraser size={20} />
        </button>
        <button
          onClick={() => setTool('select')}
          className={`p-2 rounded-xl transition-all ${tool === 'select' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
          title="選択・移動"
        >
          <MousePointer2 size={20} />
        </button>
        <div className="w-px h-6 bg-slate-200 mx-2" />
        <button
          onClick={() => {
            setLines([]);
            setTextObjects([]);
          }}
          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
          title="全消去"
        >
          <X size={20} />
        </button>
      </div>

      {/* Re-open button when closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="absolute bottom-10 right-10 z-50 px-6 py-4 bg-blue-600 text-white rounded-2xl shadow-2xl hover:bg-blue-700 transition-all flex items-center gap-3 font-bold scale-110 active:scale-95"
        >
          <Maximize2 size={24} />
          SOAP入力ウィンドウを開く
        </button>
      )}

      {/* Floating Window Container */}
      <div className="absolute inset-0 pointer-events-none z-40">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              drag
              dragControls={dragControls}
              dragMomentum={false}
              dragListener={false}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute top-20 left-20 w-[480px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-200 flex flex-col pointer-events-auto overflow-hidden"
            >
            {/* Header / Drag Handle */}
            <div 
              className="bg-slate-800/90 backdrop-blur text-white px-4 py-3 flex justify-between items-center cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="flex items-center gap-2">
                <GripHorizontal size={18} className="text-slate-400" />
                <span className="font-medium text-sm select-none tracking-wide">Notes Window</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-300 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-700/50"
                aria-label="Close window"
              >
                <X size={20} />
              </button>
            </div>

            {/* Date Picker Toolbar (Below Title) */}
            <div className="px-6 pt-4 pb-2 flex flex-col gap-2 border-b border-slate-100 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${MOCK_DB[selectedDate] ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-slate-100 border border-transparent text-slate-700'} hover:bg-opacity-80 shadow-sm`}
                  >
                    <Calendar size={16} className={MOCK_DB[selectedDate] ? 'text-emerald-600' : 'text-slate-500'} />
                    <span className="text-sm font-bold">
                      {selectedDate.replace(/-/g, '/')}
                    </span>
                    {MOCK_DB[selectedDate] && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                        データあり
                      </span>
                    )}
                  </button>
                </div>

                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  日付を選択してデータを読み込み
                </div>
              </div>

              {/* Custom Calendar Popover */}
              <AnimatePresence>
                {isCalendarOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-6 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 z-[60] p-4 w-72"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <button 
                        onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                        className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                      >
                        <ChevronLeft size={18} className="text-slate-600" />
                      </button>
                      <div className="text-sm font-bold text-slate-800">
                        {viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月
                      </div>
                      <button 
                        onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                        className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                      >
                        <ChevronRight size={18} className="text-slate-600" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['日', '月', '火', '水', '木', '金', '土'].map(d => (
                        <div key={d} className="text-[10px] font-bold text-slate-400 text-center py-1">{d}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const days = [];
                        const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
                        const lastDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
                        
                        // Empty cells for previous month
                        for (let i = 0; i < firstDay; i++) {
                          days.push(<div key={`empty-${i}`} />);
                        }
                        
                        // Days of current month
                        for (let d = 1; d <= lastDate; d++) {
                          const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                          const hasData = !!MOCK_DB[dateStr];
                          const isSelected = selectedDate === dateStr;
                          
                          days.push(
                            <button
                              key={d}
                              onClick={() => {
                                setSelectedDate(dateStr);
                                setIsCalendarOpen(false);
                              }}
                              className={`
                                relative h-8 w-8 text-xs rounded-lg flex items-center justify-center transition-all
                                ${isSelected ? 'bg-blue-500 text-white font-bold shadow-md' : 'hover:bg-slate-100 text-slate-700'}
                                ${hasData && !isSelected ? 'bg-emerald-50 text-emerald-700 font-bold' : ''}
                              `}
                            >
                              {d}
                              {hasData && (
                                <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                              )}
                            </button>
                          );
                        }
                        return days;
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Content */}
            <div className="p-6 pt-4 flex flex-col gap-6">
              {/* Top Text Area */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                  要約文
                </label>
                <textarea
                  className="w-full h-[240px] resize-none rounded-xl border border-slate-200 p-4 text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 shadow-inner transition-shadow overflow-y-auto"
                  placeholder="要約文を入力してください..."
                  value={summaryText}
                  onChange={(e) => setSummaryText(e.target.value)}
                />
                <div className="flex gap-2 mt-1">
                  <button 
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleInsertSelected}
                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1 border border-blue-200"
                  >
                    <Copy size={16} />
                    選択範囲挿入
                  </button>
                  <button 
                    onClick={() => handleInsertAll('summary')}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1 border border-slate-200"
                  >
                    <CheckSquare size={16} />
                    全文挿入
                  </button>
                </div>
              </div>
              
              {/* Bottom Text Area */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                  ＳＯＡＰ
                </label>
                <div
                  ref={soapContainerRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="w-full h-[240px] rounded-xl border border-slate-200 p-3 bg-white/80 shadow-inner overflow-y-auto outline-none focus:ring-2 focus:ring-blue-500 cursor-text"
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData('text/plain');
                    document.execCommand('insertText', false, text);
                  }}
                />
                <div className="flex gap-2 mt-1">
                  <button 
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleInsertSelected}
                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1 border border-blue-200"
                  >
                    <Copy size={16} />
                    選択範囲挿入
                  </button>
                  <button 
                    onClick={() => handleInsertAll('soap')}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1 border border-slate-200"
                  >
                    <CheckSquare size={16} />
                    全文挿入
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
