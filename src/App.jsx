import { useState, useRef, useEffect } from 'react';
import { FileText, UploadCloud, CheckCircle, FileCheck, BrainCircuit, Type, AlertCircle, Copy, Key, Send } from 'lucide-react';
import { initAI, analyzeResume, generateCoverLetter } from './services/aiService';
import { extractTextFromPdf } from './services/pdfService';
import ReactMarkdown from 'react-markdown';

function App() {
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [error, setError] = useState('');
  const [isHovering, setIsHovering] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey && initAI(envKey)) {
      setIsApiKeySet(true);
    }
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);
  
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  
  const [activeTab, setActiveTab] = useState('ats');
  const [isLoading, setIsLoading] = useState(false);

  const [analysisResult, setAnalysisResult] = useState(null);
  const [coverLetterResult, setCoverLetterResult] = useState(null);
  
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      try {
        const text = await extractTextFromPdf(file);
        setResumeText(text);
        setAnalysisResult(null);
        setCoverLetterResult(null);
      } catch (err) {
        setError('An error occurred, please try after sometime');
      }
    } else if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => {
        setResumeText(event.target.result);
        setAnalysisResult(null);
        setCoverLetterResult(null);
      };
      reader.readAsText(file);
    } else {
      setError('An error occurred, please try after sometime');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsHovering(true);
  };
  
  const handleDragLeave = () => {
    setIsHovering(false);
  };
  
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsHovering(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.type === 'application/pdf') {
        try {
          const text = await extractTextFromPdf(file);
          setResumeText(text);
          setAnalysisResult(null);
          setCoverLetterResult(null);
        } catch (err) {
          setError('An error occurred, please try after sometime');
        }
      } else {
        const reader = new FileReader();
        reader.onload = (evt) => {
          setResumeText(evt.target.result);
          setAnalysisResult(null);
          setCoverLetterResult(null);
        };
        reader.readAsText(file);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      setError('Please provide both a Resume and a Job Description.');
      return;
    }
    setIsLoading(true);
    setError('');
    setActiveTab('ats');

    try {
      const analysis = await analyzeResume(resumeText, jobDescription);
      setAnalysisResult(analysis);
    } catch (err) {
      setError('An error occurred, please try after sometime');
      setCooldown(60);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetterResult);
    alert('Cover letter copied to clipboard!');
  };

  const handleGenerateCoverLetter = async () => {
    setIsLoading(true);
    try {
      const coverLetter = await generateCoverLetter(resumeText, jobDescription);
      setCoverLetterResult(coverLetter);
    } catch (err) {
      setError('An error occurred, please try after sometime');
      setCooldown(60);
    } finally {
      setIsLoading(false);
    }
  };

  const renderTabs = () => (
    <div className="flex border-b border-glass-border mb-6">
      <button 
        className={`px-4 py-3 border-b-2 flex items-center gap-2 ${activeTab === 'ats' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-slate-400 hover:text-slate-200'} transition-colors`}
        onClick={() => setActiveTab('ats')}
      >
        <FileCheck size={18} /> ATS Score
      </button>
      <button 
        className={`px-4 py-3 border-b-2 flex items-center gap-2 ${activeTab === 'improvements' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-slate-400 hover:text-slate-200'} transition-colors`}
        onClick={() => setActiveTab('improvements')}
      >
        <AlertCircle size={18} /> Improvements
      </button>
      <button 
        className={`px-4 py-3 border-b-2 flex items-center gap-2 ${activeTab === 'coverLetter' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-slate-400 hover:text-slate-200'} transition-colors`}
        onClick={() => setActiveTab('coverLetter')}
      >
        <Type size={18} /> Cover Letter
      </button>
    </div>
  );

  const renderTabContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-slate-300">
          <div className="w-10 h-10 border-4 border-slate-600 border-t-brand-accent rounded-full animate-spin mb-4"></div>
          <p>Our AI is processing your request...</p>
        </div>
      );
    }

    if (!analysisResult) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 h-full">
          <BrainCircuit size={48} className="opacity-50 mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-slate-200">Ready to Optimize</h3>
          <p className="text-center max-w-sm">Upload your resume, paste a job description, and hit Analyze to see your ATS score.</p>
        </div>
      );
    }

    if (activeTab === 'ats') {
      return (
        <div className="animate-fade-in px-6">
          <div className="glass-panel flex items-center gap-6 p-6 mb-8">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold border-4 ${analysisResult.atsScore > 80 ? 'border-green-500 text-green-400' : analysisResult.atsScore > 50 ? 'border-yellow-500 text-yellow-400' : 'border-red-500 text-red-400'}`}>
              {analysisResult.atsScore}
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-1">ATS Match Score</h3>
              <p className="text-slate-400 text-sm">Based on keyword overlap and semantic relevance.</p>
            </div>
          </div>
          
          <div className="mb-8">
            <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">Keywords Found <span className="text-green-400">✅</span></h4>
            <div className="flex flex-wrap gap-2">
              {analysisResult.foundKeywords?.map(kw => (
                <span key={kw} className="px-3 py-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-md text-sm">{kw}</span>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">Missing Keywords <span className="text-red-400">❌</span></h4>
            <div className="flex flex-wrap gap-2">
              {analysisResult.missingKeywords?.map(kw => (
                <span key={kw} className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md text-sm">{kw}</span>
              ))}
              {(!analysisResult.missingKeywords || analysisResult.missingKeywords.length === 0) && (
                <span className="text-slate-400 text-sm italic py-2">You hit all the key terms!</span>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'improvements') {
      return (
        <div className="animate-fade-in px-6">
          <h3 className="text-xl font-semibold mb-6">Actionable Improvements</h3>
          <ul className="list-decimal pl-5 space-y-4 text-slate-300">
            {analysisResult.improvements?.map((imp, idx) => (
              <li key={idx} className="pl-2 leading-relaxed">{imp}</li>
            ))}
          </ul>
        </div>
      );
    }

    if (activeTab === 'coverLetter') {
      if (!coverLetterResult) {
        return (
          <div className="flex flex-col items-center justify-center p-12 text-slate-300 h-full">
            <Type size={48} className="opacity-50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Generate a Cover Letter</h3>
            <p className="mb-8 text-center text-slate-400 max-w-sm">We generate this on-demand to save your AI tokens.</p>
            <button className="bg-brand-accent hover:bg-brand-hover text-white px-8 py-3 rounded-lg font-medium transition-all shadow-lg flex items-center justify-center gap-2" onClick={handleGenerateCoverLetter}>
              Draft Cover Letter Now
            </button>
          </div>
        );
      }

      return (
        <div className="animate-fade-in px-6 pb-6 relative">
          <div className="flex justify-end mb-4">
            <button className="text-slate-400 hover:text-white flex items-center gap-2 text-sm transition-colors bg-white/5 py-1.5 px-3 rounded-md border border-white/10 hover:bg-white/10" onClick={handleCopy}>
              <Copy size={14} /> Copy Document
            </button>
          </div>
          <div className="glass-panel p-8 prose prose-invert prose-slate max-w-none">
            <ReactMarkdown>{coverLetterResult}</ReactMarkdown>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 min-h-screen flex flex-col font-sans">
      <header className="mb-8 text-center mt-6">
        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-brand-accent bg-clip-text text-transparent mb-3 animate-fade-in">Elevate.AI</h1>
        <p className="text-slate-400 text-lg animate-fade-in" style={{ animationDelay: '0.1s' }}>Premium Resume Optimizer & Cover Letter Generator</p>
      </header>

      {!isApiKeySet && (
        <div className="glass-panel bg-yellow-500/10 border-yellow-500/50 p-4 mb-8 flex items-center gap-4 text-yellow-100 max-w-3xl mx-auto w-full animate-fade-in">
          <AlertCircle size={24} className="text-yellow-400 flex-shrink-0" />
          <p>
            <strong>Configuration Required:</strong> Ensure your Express backend is running or set <code>VITE_GEMINI_API_KEY</code> locally.
          </p>
        </div>
      )}

      {error && (
        <div className="glass-panel bg-red-500/10 border-red-500/50 p-4 mb-8 flex items-center gap-4 text-red-100 max-w-3xl mx-auto w-full animate-fade-in">
          <AlertCircle size={24} className="text-red-400 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <main className="grid md:grid-cols-12 gap-8 flex-1">
        <section className="md:col-span-5 flex flex-col gap-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="glass-panel p-6 h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><FileText size={20} className="text-brand-accent" /> Configuration</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">1. Your Resume</label>
              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer mb-4 flex flex-col items-center justify-center ${isHovering ? 'border-brand-accent bg-brand-accent/5' : 'border-slate-600 hover:border-slate-400 bg-black/20'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud size={36} className="text-slate-400 mb-3" />
                <p className="text-sm text-slate-300 font-medium">Drag & drop your PDF here</p>
                <p className="text-xs text-slate-500 mt-1">or click to browse local files</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".pdf,.txt" 
                  onChange={handleFileUpload}
                />
              </div>
              <textarea 
                placeholder="Or paste your resume text here..."
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="w-full h-32 bg-black/20 border border-glass-border rounded-lg p-4 text-slate-200 focus:outline-none focus:border-brand-accent resize-none transition-colors"
              ></textarea>
            </div>

            <div className="mb-8 flex-1 flex flex-col">
              <label className="block text-sm font-medium text-slate-300 mb-2">2. Target Job Description</label>
              <textarea 
                placeholder="Paste the job description you are aiming for..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full flex-1 min-h-[150px] bg-black/20 border border-glass-border rounded-lg p-4 text-slate-200 focus:outline-none focus:border-brand-accent resize-none transition-colors leading-relaxed"
              ></textarea>
            </div>

            <button 
              className="w-full bg-brand-accent hover:bg-brand-hover disabled:bg-slate-800 disabled:text-slate-500 disabled:border disabled:border-slate-700 text-white font-medium py-3.5 px-4 rounded-lg flex justify-center items-center gap-2 transition-all shadow-lg text-lg"
              onClick={handleAnalyze} 
              disabled={isLoading || !isApiKeySet || cooldown > 0}
            >
              <Send size={18} /> {isLoading ? 'Analyzing...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Analyze & Generate'}
            </button>
          </div>
        </section>

        <section className="md:col-span-7 h-full animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="glass-panel h-full flex flex-col min-h-[650px] overflow-hidden">
            {renderTabs()}
            <div className="flex-1 overflow-y-auto pt-2">
              {renderTabContent()}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
