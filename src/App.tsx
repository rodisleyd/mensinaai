import React, { useState, useEffect, useRef } from 'react';
import { 
  FileUp, 
  BookOpen, 
  CheckCircle2, 
  Lock, 
  ChevronRight, 
  Menu, 
  LogOut, 
  Loader2,
  AlertCircle,
  GraduationCap,
  Moon,
  Sun,
  Home,
  Trash2,
  Download,
  Search,
  X,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { auth, signInWithGoogle } from './lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { cn } from './lib/utils';
import { generateCourseFromText, getQuickExplanation } from './services/aiService';
import { saveCourse, getUserCourses, getCourse, getModules, getProgress, updateProgress, deleteCourse } from './services/dbService';
import { exportCourseToPDF } from './lib/pdfExport';
import { Course, Module, Progress, Question } from './types';

// Components
const Navbar = ({ user, theme, onToggleTheme }: { user: User | null, theme: 'light' | 'dark', onToggleTheme: () => void }) => (
  <nav className="border-b border-ink/10 bg-paper/80 backdrop-blur-md px-8 py-6 flex justify-between items-center sticky top-0 z-50">
    <div className="flex items-center gap-3 font-serif italic text-2xl tracking-tighter">
      <span className="w-8 h-8 bg-ink text-paper rounded-full flex items-center justify-center font-sans not-italic text-sm font-bold">M</span>
      <span>Me Ensina Aí</span>
    </div>
    <div className="flex items-center gap-8">
      <button 
        onClick={onToggleTheme}
        className="text-ink/60 hover:text-ink transition-colors p-2 rounded-full border border-ink/10"
        aria-label="Alternar tema"
      >
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </button>
      {user ? (
        <div className="flex items-center gap-6">
          <span className="text-[10px] uppercase font-bold tracking-widest text-ink/40 hidden sm:inline">{user.displayName || user.email}</span>
          <button 
            onClick={() => signOut(auth)}
            className="text-ink/60 hover:text-err transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      ) : (
        <button 
          onClick={signInWithGoogle}
          className="badge-editorial hover:bg-ink hover:text-paper transition-all cursor-pointer"
        >
          Acessar Conta
        </button>
      )}
    </div>
  </nav>
);

const Dropzone = ({ onFileProcessed }: { onFileProcessed: (text: string, base64?: string) => void }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messages = [
    "Lendo o documento...",
    "Extraindo conhecimento...",
    "Fazendo OCR (se necessário)...",
    "Criando analogias...",
    "Preparando simulados..."
  ];

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Por favor, envie apenas arquivos PDF.');
      return;
    }

    let msgIndex = 0;
    setStatus(messages[0]);
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setStatus(messages[msgIndex]);
    }, 2000);

    let base64 = "";
    try {
      // Ler base64 do arquivo
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      base64 = await base64Promise;

      // Tentativa de extração de texto no servidor (rápido para PDFs com texto)
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      const extractedText = (response.ok && data.text) ? data.text : "";
      
      onFileProcessed(extractedText, base64);
      
    } catch (error: any) {
      console.error("Erro no parse local/servidor:", error);
      if (base64) {
        onFileProcessed("", base64);
      } else {
        alert('Houve um erro ao ler o arquivo. Verifique sua conexão.');
      }
    } finally {
      clearInterval(interval);
      setStatus(null);
    }
  };

  return (
    <div 
      className={cn(
        "border border-ink/10 rounded-sm p-16 flex flex-col items-center justify-center transition-all cursor-pointer bg-surface h-[450px] relative overflow-hidden",
        isDragging ? "bg-ink/5 border-ink/20" : "hover:border-ink/30"
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
      }}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".pdf" 
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      
      <AnimatePresence mode="wait">
        {status ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="w-12 h-12 border-2 border-ink/10 border-t-ink rounded-full animate-spin" />
            <p className="font-serif italic text-2xl lowercase">{status}</p>
          </motion.div>
        ) : (
          <motion.div 
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4 text-center"
          >
            <span className="section-label mb-2">Editoria de Conhecimento</span>
            <h2 className="text-5xl font-serif leading-none mb-4">Solte o seu arquivo aqui.</h2>
            <p className="text-ink/50 font-serif italic text-lg max-w-xs">Arraste seu PDF ou clique para iniciar a transmutação didática imediata.</p>
            <div className="mt-8 badge-editorial">Processar Documento</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Quiz = ({ questions, onComplete }: { questions: Question[], onComplete: (score: number) => void }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const currentQuestion = questions[currentStep];

  const handleAnswer = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);
    if (option === currentQuestion.resposta_correta) {
      setCorrectCount(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      onComplete(correctCount);
    }
  };

  return (
    <div className="bg-surface rounded-sm p-12 border border-ink/10">
      <div className="flex justify-between items-end mb-12">
        <div className="flex flex-col">
          <span className="section-label">Simulado de Avaliação</span>
          <span className="font-serif italic text-4xl leading-none">Questão {currentStep + 1} de {questions.length}</span>
        </div>
        <span className="font-mono text-xs opacity-30">SCORE: {correctCount} / {questions.length}</span>
      </div>

      <h3 className="text-2xl font-serif mb-12 leading-tight">{currentQuestion.pergunta}</h3>

      <div className="space-y-4">
        {Object.entries(currentQuestion.opcoes).map(([key, value]) => {
          const isCorrect = key === currentQuestion.resposta_correta;
          const isSelected = key === selectedOption;
          
          let variant = "default";
          if (isAnswered) {
            if (isCorrect) variant = "correct";
            else if (isSelected) variant = "wrong";
          }

          return (
            <button
              key={key}
              onClick={() => handleAnswer(key)}
              className={cn(
                "w-full text-left p-6 transition-all border border-ink/5 group relative",
                variant === "default" && "hover:bg-paper hover:border-ink/20",
                variant === "correct" && "bg-accent/5 border-accent",
                variant === "wrong" && "bg-err/5 border-err"
              )}
              disabled={isAnswered}
            >
              <div className="flex items-center gap-6">
                <span className={cn(
                  "font-mono text-xs opacity-30",
                  variant === "correct" && "text-accent opacity-100",
                  variant === "wrong" && "text-err opacity-100"
                )}>
                  0{Object.keys(currentQuestion.opcoes).indexOf(key) + 1}
                </span>
                <span className="flex-1 font-sans text-lg">{value}</span>
                {isAnswered && isCorrect && <span className="badge-editorial border-accent text-accent">Correta</span>}
                {isAnswered && !isCorrect && isSelected && <span className="badge-editorial border-err text-err">Incorreta</span>}
              </div>
            </button>
          );
        })}
      </div>

      {isAnswered && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 pt-12 border-t border-ink/10"
        >
          <span className="section-label">Fundamentação Didática</span>
          <p className="font-serif italic text-xl leading-relaxed text-ink/70">
            {currentQuestion.explicacao_resposta}
          </p>
          <button
            onClick={handleNext}
            className="mt-12 w-full bg-ink text-paper py-5 font-bold uppercase tracking-widest text-xs hover:opacity-90 transition-opacity"
          >
            {currentStep < questions.length - 1 ? 'Próxima Questão' : 'Ver Resultado Final'}
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  const [modules, setModules] = useState<Module[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [view, setView] = useState<'home' | 'course' | 'quiz' | 'result'>('home');
  const [isLoading, setIsLoading] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Quick Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setView('home');
        setCurrentCourse(null);
      }
    });
  }, []);

  const handleQuickSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || !activeModule) return;

    setIsSearching(true);
    setSearchResult(null);
    try {
      const explanation = await getQuickExplanation(searchQuery, activeModule.conteudo_aula);
      setSearchResult(explanation);
    } catch (error) {
      console.error(error);
      setSearchResult("Erro ao buscar explicação. Tente novamente.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleUpload = async (text: string, base64?: string) => {
    if (!user) {
      alert("Por favor, faça login para salvar seu progresso.");
      return;
    }
    setIsLoading(true);
    try {
      console.log("Iniciando geração de curso...");
      const courseData = await generateCourseFromText(text, base64);
      console.log("Curso gerado pela IA:", courseData);
      
      const courseId = await saveCourse(courseData, user.uid);
      if (courseId) {
        await loadCourse(courseId);
      } else {
        alert("Erro: Não foi possível salvar o curso no banco de dados.");
      }
    } catch (error: any) {
      console.error("FALHA NA GERAÇÃO:", error);
      alert(`Erro na IA: ${error.message || 'Verifique se o PDF contém texto legível e tente novamente.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourse = async (id: string) => {
    setIsLoading(true);
    try {
      const c = await getCourse(id);
      const m = await getModules(id);
      const p = await getProgress(user!.uid, id);
      setCurrentCourse(c);
      setModules(m);
      setProgress(p);
      setActiveModule(m[0]);
      setView('course');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const isModuleLocked = (index: number) => {
    if (index === 0) return false;
    const prevModule = modules[index - 1];
    const prevProgress = progress.find(p => p.moduleId === prevModule.id);
    return !prevProgress?.completed;
  };

  const handleQuizComplete = async (score: number) => {
    const minPass = Math.ceil(activeModule!.simulado.length * 0.6);
    const passed = score >= minPass;
    
    setQuizScore(score);
    setView('result');

    if (user && currentCourse && activeModule) {
      await updateProgress(user.uid, currentCourse.id, activeModule.id, score, passed);
      const p = await getProgress(user.uid, currentCourse.id);
      setProgress(p);
    }
  };

  const renderHome = () => (
    <div className="max-w-6xl mx-auto py-24 px-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-end mb-32">
        <div>
          <span className="badge-editorial mb-8 inline-block select-none">Edição Limitada AI No. 01</span>
          <h1 className="text-8xl sm:text-[140px] leading-[0.85] font-serif tracking-tighter mb-8">
            Me <br /> Ensina Aí.
          </h1>
          <p className="font-serif italic text-2xl text-ink/60 border-l border-ink/10 pl-8 ml-2">
            A transmutação didática de documentos estáticos em trilhas de inteligência ativa.
          </p>
        </div>
        <div className="pb-4">
          <p className="text-xl text-ink/80 leading-relaxed mb-8 max-w-md">
            Utilizamos engenharia instrucional avançada e IA para quebrar a complexidade de qualquer PDF em módulos lógicos, analogias mundanas e simulados de alta retenção.
          </p>
          <div className="flex gap-4">
            {!user && (
               <button 
                onClick={signInWithGoogle}
                className="bg-ink text-paper px-8 py-4 font-bold uppercase tracking-widest text-[10px] hover:opacity-90 transition-opacity"
              >
                Iniciar Experiência
              </button>
            )}
            <div className="font-mono text-[10px] uppercase tracking-widest text-ink/40 py-4">
              [ 2026 EDITION ]
            </div>
          </div>
        </div>
      </div>
      
      {user ? (
        <Dropzone onFileProcessed={handleUpload} />
      ) : (
        <div className="border border-ink/10 p-16 text-center rounded-sm bg-surface/50">
          <span className="section-label">Acesso Restrito</span>
          <h2 className="text-4xl font-serif mb-8">Identifique-se para prosseguir.</h2>
          <button 
            onClick={signInWithGoogle}
            className="badge-editorial px-12 py-3 hover:bg-ink hover:text-paper"
          >
            Entrar com Google
          </button>
        </div>
      )}

      {user && (
        <div className="mt-32 pt-16 border-t border-ink/10">
          <div className="flex justify-between items-end mb-12">
            <div>
              <span className="section-label">Arquivo Pessoal</span>
              <h2 className="text-5xl font-serif leading-none italic">Sua Biblioteca.</h2>
            </div>
          </div>
          <CourseList userId={user.uid} onLoadCourse={loadCourse} />
        </div>
      )}
    </div>
  );

  const renderCourse = () => (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)]">
      {/* Sidebar - Rail */}
      <aside className="w-full lg:w-24 border-b lg:border-b-0 lg:border-r border-ink/5 bg-surface flex flex-row lg:flex-col items-center py-4 lg:py-12 px-4 lg:px-0 gap-6 lg:gap-12 lg:sticky lg:top-20 lg:h-[calc(100vh-80px)] overflow-x-auto lg:overflow-y-auto scrollbar-hide shrink-0 z-40">
        <button 
          onClick={() => setView('home')}
          className="p-3 hover:bg-ink hover:text-paper rounded-full transition-colors border border-ink/10 shrink-0"
          title="Voltar ao início"
        >
          <Home size={18} />
        </button>
        <div className="lg:w-12 h-[1px] lg:h-auto lg:border-t border-ink/10 hidden lg:block opacity-20" />
        <div className="flex flex-row lg:flex-col items-center gap-4 lg:gap-10 lg:w-full">
          {modules.map((m, idx) => {
            const locked = isModuleLocked(idx);
            const p = progress.find(item => item.moduleId === m.id);
            const isActive = activeModule?.id === m.id;

            return (
              <button
                key={m.id}
                onClick={() => !locked && setActiveModule(m)}
                className={cn(
                  "relative flex flex-col items-center justify-center transition-all px-2 lg:w-full group shrink-0",
                  locked ? "opacity-60 cursor-not-allowed" : "hover:opacity-80"
                )}
              >
                <div className={cn(
                  "flex flex-col items-center gap-3",
                  isActive ? "text-ink" : locked ? "text-ink/40" : "text-ink/60"
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-full border flex items-center justify-center text-[10px] font-bold transition-all",
                    isActive ? "bg-ink text-paper border-ink" : "bg-transparent border-ink/20 group-hover:border-ink/40"
                  )}>
                    {m.ordem}
                  </div>
                  <span className="text-[8px] uppercase font-bold tracking-[0.2em] lg:writing-mode-vertical-rl whitespace-nowrap">
                    Módulo
                  </span>
                </div>
                {p?.completed && (
                  <div className="absolute -top-1 -right-1 lg:top-0 lg:right-5 w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 bg-surface grid grid-cols-1 xl:grid-cols-[1fr_360px]">
        <main className="p-8 sm:p-16 lg:p-24 max-w-5xl border-r border-ink/5 relative mx-auto w-full">
          <AnimatePresence mode="wait">
            {activeModule && (
              <motion.div 
                key={activeModule.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="relative"
              >
                <div className="mb-20">
                  <span className="section-label">Conteúdo de Aula</span>
                  <h1 className="text-5xl md:text-7xl font-serif leading-[1.1] mb-8 italic">{activeModule.titulo}</h1>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest font-bold text-ink/30">
                      <span>CAPÍTULO 0{activeModule.ordem}</span>
                      <span className="w-12 h-[1px] bg-ink/10" />
                      <span className="truncate max-w-[200px]">{currentCourse?.titulo}</span>
                    </div>

                    {/* Quick Search Field */}
                    <div className="relative group/search max-w-sm w-full">
                      <form onSubmit={handleQuickSearch} className="relative">
                        <input 
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Dúvida sobre o texto?"
                          className="w-full bg-surface border border-ink/20 rounded-full py-3.5 pl-6 pr-12 text-base font-serif italic focus:outline-none focus:border-ink/40 transition-all placeholder:text-ink/60 text-ink"
                        />
                        <button 
                          type="submit"
                          disabled={isSearching}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/60 hover:text-ink transition-colors"
                        >
                          {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                        </button>
                      </form>

                      <AnimatePresence>
                        {searchResult && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full mt-6 right-0 w-[400px] bg-paper border border-ink/20 shadow-2xl p-8 z-[100] rounded-sm"
                          >
                            <button 
                              onClick={() => { setSearchResult(null); setSearchQuery(''); }}
                              className="absolute top-4 right-4 text-ink/20 hover:text-ink transition-colors"
                            >
                              <X size={18} />
                            </button>
                            <div className="flex gap-4 items-start mb-6">
                              <HelpCircle size={20} className="text-ink/70 mt-1 shrink-0" />
                              <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-ink/70 block">Explicação Rápida</span>
                            </div>
                            <p className="text-lg font-serif italic leading-relaxed text-ink">
                              {searchResult}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className="markdown-body selection:bg-ink selection:text-paper">
                  <Markdown>{activeModule.conteudo_aula}</Markdown>
                </div>

                <div className="mt-24 pt-12 border-t border-ink/10 xl:hidden">
                   <button
                    onClick={() => setView('quiz')}
                    className="w-full bg-ink text-paper py-5 font-bold uppercase tracking-widest text-xs"
                  >
                    Validar Conhecimento (Simulado)
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Side Panel - Desktop */}
        <aside className="p-12 bg-paper hidden xl:flex flex-col gap-12 sticky top-20 h-[calc(100vh-80px)]">
          <div className="relative pt-8">
            <span className="section-label mb-6">Nota de Rodapé Educativa</span>
            <div className="relative">
               <span className="absolute -top-4 -left-2 text-6xl font-serif text-ink/5 select-none">“</span>
               <p className="font-serif italic text-xl leading-relaxed text-ink/70 relative z-10">
                 {activeModule?.exemplo_pratico}
               </p>
               <div className="mt-4 w-12 h-[2px] bg-ink/20" />
            </div>
          </div>

          <div className="mt-auto space-y-4">
            <span className="section-label">Ações Editoriais</span>
            <button
                onClick={() => setView('quiz')}
                className="w-full bg-ink text-paper py-6 font-bold uppercase tracking-widest text-[11px] hover:scale-[1.02] transition-transform active:scale-[0.98]"
              >
                Iniciar Avaliação Final
            </button>
            <button 
              onClick={() => setView('home')}
              className="w-full border border-ink/10 py-4 font-bold uppercase tracking-widest text-[9px] text-ink/40 hover:text-ink hover:border-ink/30 transition-all"
            >
              Arquivar Documento
            </button>
          </div>
        </aside>
      </div>
    </div>
  );

  const renderQuiz = () => (
    <div className="max-w-3xl mx-auto py-24 px-8">
      <button 
        onClick={() => setView('course')}
        className="mb-12 flex items-center gap-3 text-ink/40 hover:text-ink font-bold transition-all text-xs uppercase tracking-widest"
      >
        <span className="text-lg">←</span> Voltar para Texto Base
      </button>
      <Quiz questions={activeModule!.simulado} onComplete={handleQuizComplete} />
    </div>
  );

  const renderResult = () => {
    const minPass = Math.ceil(activeModule!.simulado.length * 0.6);
    const passed = quizScore >= minPass;

    return (
      <div className="max-w-xl mx-auto py-32 px-8 text-center bg-surface border border-ink/10 my-12 rounded-sm">
        <span className="section-label">Relatório de Performance</span>
        
        <h2 className="text-7xl font-serif mb-6 italic leading-none">
          {passed ? 'Aprovado.' : 'Rever.'}
        </h2>
        
        <div className="flex justify-center items-center gap-12 my-12">
          <div className="text-left">
             <span className="text-[10px] uppercase opacity-40 font-bold block mb-1">Acertos</span>
             <span className="text-4xl font-serif">{quizScore}</span>
             <span className="text-xl font-serif text-ink/30"> / {activeModule!.simulado.length}</span>
          </div>
          <div className="w-[1px] h-12 bg-ink/10" />
          <div className="text-left">
             <span className="text-[10px] uppercase opacity-40 font-bold block mb-1">Status</span>
             <span className={cn("text-lg font-bold uppercase tracking-widest", passed ? "text-accent" : "text-err")}>
               {passed ? 'Liberado' : 'Retido'}
             </span>
          </div>
        </div>

        <p className="font-serif italic text-xl text-ink/60 mb-12 max-w-sm mx-auto leading-relaxed">
          {passed 
            ? "Seus fundamentos estão sólidos. A transmutação da próxima etapa foi autorizada pelo sistema." 
            : "A complexidade superou a retenção. Recomendamos uma releitura focada antes da nova submissão."}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button 
            onClick={() => setView('course')}
            className="bg-ink text-paper py-4 font-bold uppercase tracking-widest text-[10px]"
          >
            Relayer Aula
          </button>
          {!passed && (
            <button 
              onClick={() => setView('quiz')}
              className="border border-ink py-4 font-bold uppercase tracking-widest text-[10px]"
            >
              Tentativa 02
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-ink selection:text-paper">
      <Navbar user={user} theme={theme} onToggleTheme={toggleTheme} />
      
      <main className="flex-1">
        {isLoading && (
          <div className="fixed inset-0 bg-paper/95 backdrop-blur-xl z-[100] flex items-center justify-center">
            <div className="flex flex-col items-center gap-8">
              <div className="w-16 h-16 border-4 border-ink/5 border-t-ink rounded-full animate-spin" />
              <div className="text-center">
                <span className="section-label mb-2">IA Processing</span>
                <p className="font-serif italic text-3xl">Redigindo capítulos...</p>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {view === 'home' && renderHome()}
            {view === 'course' && renderCourse()}
            {view === 'quiz' && renderQuiz()}
            {view === 'result' && renderResult()}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="py-24 border-t border-ink/10 bg-surface">
        <div className="max-w-6xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
          <div className="col-span-2">
          <div className="flex items-center justify-center lg:justify-start gap-3 font-serif italic text-2xl tracking-tighter mb-4">
              <span className="w-8 h-8 bg-ink text-paper rounded-full flex items-center justify-center font-sans not-italic text-sm font-bold">M</span>
              <span>Me Ensina Aí</span>
            </div>
            <p className="text-ink/40 text-sm max-w-sm">
              Um sistema distribuído para democratização do conhecimento através de curadoria sintética e design instrucional algorítmico.
            </p>
          </div>
          <div className="text-left md:text-right">
            <span className="section-label">Copyright</span>
            <p className="text-sm font-serif italic">© 2026. Todos os direitos reservados à inteligência coletiva.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const CourseList = ({ userId, onLoadCourse }: { userId: string, onLoadCourse: (id: string) => void }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = () => {
    setLoading(true);
    getUserCourses(userId).then(res => {
      setCourses(res);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchCourses();
  }, [userId]);

  const handleDelete = async (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja deletar este curso? Esta ação não pode ser desfeita.')) {
      const ok = await deleteCourse(courseId);
      if (ok) fetchCourses();
    }
  };

  const handleDownload = async (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    try {
      const modules = await getModules(course.id);
      await exportCourseToPDF(course, modules);
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar PDF.');
    }
  };

  if (loading) return <div className="flex justify-center p-24"><div className="w-8 h-8 border-2 border-ink animate-spin rounded-full border-t-transparent" /></div>;
  
  if (courses.length === 0) return (
    <div className="border border-ink/10 rounded-sm p-32 text-center bg-surface/50 border-dashed">
      <span className="section-label opacity-30">Status: Vazio</span>
      <p className="font-serif italic text-2xl text-ink/20">Nenhum registro encontrado no seu arquivo.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {courses.map(course => (
        <div
          key={course.id}
          className="bg-surface border border-ink/5 hover:border-ink/20 transition-all flex flex-col justify-between group min-h-[320px] relative overflow-hidden"
        >
          <div 
            onClick={() => onLoadCourse(course.id)}
            className="absolute inset-0 cursor-pointer z-0"
          />
          
          <div className="absolute top-0 right-0 w-20 h-20 bg-ink/2 translate-x-10 -translate-y-10 rounded-full group-hover:scale-150 transition-transform pointer-events-none" />
          
          <div className="p-8 pb-4 relative z-10 pointer-events-none">
            <span className="section-label mb-2 opacity-30">Course ID: {course.id.slice(0, 8).toUpperCase()}</span>
            <h3 className="font-serif text-3xl leading-tight group-hover:italic transition-all">{course.titulo}</h3>
          </div>
          
          <div className="p-8 pt-0 relative z-20 flex flex-col gap-4">
             <div className="flex justify-between items-end pt-4 border-t border-ink/10 pointer-events-none">
              <span className="font-mono text-[9px] uppercase tracking-wider text-ink/30">
                {new Date(course.createdAt).toLocaleDateString()}
              </span>
              <button 
                onClick={() => onLoadCourse(course.id)}
                className="badge-editorial border-ink/20 text-ink/40 group-hover:border-ink group-hover:text-ink transition-colors pointer-events-auto"
              >
                Abrir
              </button>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={(e) => handleDownload(e, course)}
                className="flex-1 border border-ink/5 hover:border-ink/20 p-2.5 flex items-center justify-center gap-2 text-ink/40 hover:text-ink transition-all text-[9px] uppercase font-bold tracking-widest bg-paper font-sans"
              >
                <Download size={12} />
                PDF
              </button>
              <button 
                onClick={(e) => handleDelete(e, course.id)}
                className="border border-ink/5 hover:border-err hover:text-err p-2.5 transition-all bg-paper flex items-center justify-center"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
