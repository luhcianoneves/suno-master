import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Music, Disc, Copy, Check, Sparkles, Mic2, Sliders, Zap, FileText, Activity } from 'lucide-react';

/* ==================================================================================
   SISTEMA DE INSTRUÇÃO (CÉREBRO DO AGENTE)
   ==================================================================================
*/
const SYSTEM_INSTRUCTION = `
Você é um assistente de produção musical profissional para usuários do Suno AI.
Sua tarefa é gerar EXATAMENTE 10 faixas baseadas no pedido do usuário.

Para cada faixa, você DEVE seguir estritamente este formato de bloco para facilitar o parsing:

[[START_TRACK]]
TITLE: [Insira um Título Criativo Aqui]
LYRICS:
[Verse 1]
(Escreva a letra aqui...)

[Chorus]
(Escreva o refrão aqui...)

[Verse 2]
(...)

[Outro]
(...)
STYLE_PROMPT: [Gênero, Instrumentos, Vibe, BPM - Ex: Dark Synthwave, Male Vocals, 140bpm]
[[END_TRACK]]

REGRAS:
1. O campo 'STYLE_PROMPT' deve vir SEMPRE APÓS a letra.
2. A letra deve estar formatada com metatags como [Verse], [Chorus], etc.
3. Gere estilos variados dentro do tema se o usuário não for específico.
4. Não adicione texto conversacional entre os blocos. Apenas os 10 blocos.
`;

function App() {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(SYSTEM_INSTRUCTION);
  const [copyStatus, setCopyStatus] = useState(null);

  // Pega a chave do Vercel ou usa vazia localmente
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY || "";

  // INJEÇÃO DE ESTILOS (CSS)
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://cdn.jsdelivr.net/npm/tailwindcss@3.4.0/base.min.css');
      @import url('https://cdn.jsdelivr.net/npm/tailwindcss@3.4.0/components.min.css');
      @import url('https://cdn.jsdelivr.net/npm/tailwindcss@3.4.0/utilities.min.css');
      
      body { background-color: #0f172a; color: #f1f5f9; font-family: sans-serif; }
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: #0f172a; }
      ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: #475569; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleGenerate = async () => {
    if (!apiKey) {
       if (inputText.trim()) {
         setError("⚠️ API Key não detectada. Verifique as variáveis de ambiente no Vercel (VITE_GEMINI_API_KEY).");
       }
       return;
    }
    
    if (!inputText.trim()) return;
    
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: systemPrompt 
      });

      const generationConfig = {
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      };

      const chatSession = model.startChat({
        generationConfig,
        history: [],
      });

      const response = await chatSession.sendMessage(`Tema: ${inputText}`);
      const text = response.response.text();
      
      const parsedSongs = parseResponse(text);
      setResult(parsedSongs);
      
    } catch (err) {
      console.error(err);
      setError("Erro ao conectar com a IA. Verifique sua API Key.");
    } finally {
      setIsLoading(false);
    }
  };

  const parseResponse = (text) => {
    const tracks = [];
    const trackBlocks = text.split('[[START_TRACK]]').slice(1);

    trackBlocks.forEach(block => {
      const cleanBlock = block.split('[[END_TRACK]]')[0];
      const titleMatch = cleanBlock.match(/TITLE:\s*(.+)/);
      const styleMatch = cleanBlock.match(/STYLE_PROMPT:\s*(.+)/);
      let lyrics = "";
      const lyricsStart = cleanBlock.indexOf('LYRICS:');
      const styleStart = cleanBlock.indexOf('STYLE_PROMPT:');
      
      if (lyricsStart !== -1 && styleStart !== -1) {
        lyrics = cleanBlock.substring(lyricsStart + 7, styleStart).trim();
      }

      if (titleMatch && styleMatch) {
        tracks.push({
          title: titleMatch[1].trim(),
          lyrics: lyrics,
          style: styleMatch[1].trim()
        });
      }
    });
    return tracks;
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyStatus(id);
      setTimeout(() => setCopyStatus(null), 1500);
    });
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 pb-20">
      <header className="bg-[#1e293b]/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg shadow-lg shadow-purple-500/20">
              <Disc size={22} className="text-white animate-spin-slow" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Suno<span className="font-light">Master</span> <span className="text-xs align-top bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded ml-1">PRO</span>
            </h1>
          </div>
          
          <button 
            onClick={() => setShowSystemPrompt(!showSystemPrompt)}
            className="text-xs font-medium text-slate-400 hover:text-purple-400 flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-md hover:bg-slate-800"
          >
            <Sliders size={14} />
            {showSystemPrompt ? 'Ocultar Config' : 'Configurar Agente'}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {showSystemPrompt && (
          <div className="mb-8 bg-[#1e293b] rounded-xl border border-purple-500/30 overflow-hidden animate-in slide-in-from-top-2">
            <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex items-center gap-2">
              <Zap size={16} className="text-yellow-500" />
              <h3 className="text-sm font-bold text-slate-200">Instruções do Sistema (Cérebro)</h3>
            </div>
            <div className="p-4">
              <p className="text-xs text-slate-400 mb-2">Edite aqui se quiser mudar o comportamento padrão do seu agente.</p>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full h-48 bg-slate-950 text-slate-300 text-xs p-4 rounded-lg border border-slate-700 focus:border-purple-500 outline-none font-mono leading-relaxed"
              />
            </div>
          </div>
        )}

        <div className="bg-[#1e293b] rounded-2xl border border-slate-700/50 shadow-2xl mb-12 overflow-hidden">
          <div className="p-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20 h-1"></div>
          <div className="p-6 md:p-8">
            <label className="text-lg font-medium text-slate-200 mb-4 flex items-center gap-2">
              <Sparkles className="text-amber-400" size={20} />
              Briefing da Produção
            </label>
            
            <div className="relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Descreva o álbum ou as faixas: '10 faixas de Power Metal melódico sobre batalhas medievais épicas, vocais masculinos poderosos...'"
                className="w-full h-32 bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-lg text-white placeholder:text-slate-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all resize-none"
              />
              
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                 <span className="text-xs text-slate-500 font-mono hidden md:inline-block">Modelo: Gemini 1.5 Flash</span>
                 <button
                  onClick={handleGenerate}
                  disabled={isLoading || !inputText.trim()}
                  className={`px-6 py-2.5 rounded-lg font-bold text-white shadow-lg flex items-center gap-2 transition-all transform active:scale-95 ${
                    isLoading || !inputText.trim()
                      ? 'bg-slate-700 cursor-not-allowed opacity-50'
                      : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/25'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Mic2 size={18} />
                      Gerar 10 Faixas
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/50 text-red-200 rounded-lg text-center animate-in fade-in">
            {error}
          </div>
        )}

        {isLoading && (
           <div className="py-16 text-center animate-pulse">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/10 mb-4">
                <Music size={32} className="text-indigo-400" />
              </div>
              <h3 className="text-xl font-medium text-slate-200">Compondo suas músicas...</h3>
              <p className="text-slate-500 mt-2">Escrevendo letras e definindo estilos</p>
           </div>
        )}

        {result && !isLoading && (
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
               <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                 <FileText size={24} className="text-purple-400"/> 
                 Resultados
               </h2>
               <span className="text-sm bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
                 {result.length} Faixas Geradas
               </span>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {result.map((track, index) => (
                <div key={index} className="bg-[#1e293b] border border-slate-700 rounded-xl overflow-hidden shadow-xl flex flex-col md:flex-row">
                  
                  <div className="flex-1 p-0 flex flex-col border-b md:border-b-0 md:border-r border-slate-700">
                    <div className="bg-slate-900/50 p-4 border-b border-slate-700 flex justify-between items-center sticky top-0">
                       <div>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Faixa {index + 1}</span>
                          <h3 className="font-bold text-lg text-white leading-tight">{track.title}</h3>
                       </div>
                       <button 
                          onClick={() => copyToClipboard(track.lyrics, `lyrics-${index}`)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            copyStatus === `lyrics-${index}` 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-600'
                          }`}
                        >
                          {copyStatus === `lyrics-${index}` ? <Check size={16} /> : <Copy size={16} />}
                          {copyStatus === `lyrics-${index}` ? "Copiado!" : "Copiar Letra"}
                        </button>
                    </div>
                    
                    <div className="p-6 bg-[#161e2e] flex-grow">
                      <pre className="whitespace-pre-wrap font-sans text-slate-300 leading-relaxed text-[15px]">
                        {track.lyrics || "Erro ao processar letra."}
                      </pre>
                    </div>
                  </div>

                  <div className="w-full md:w-72 bg-slate-900/30 flex flex-col shrink-0">
                     <div className="p-4 border-b border-slate-700 bg-slate-900/50">
                        <h4 className="text-sm font-bold text-slate-400 flex items-center gap-2">
                          <Activity size={16} className="text-indigo-400"/>
                          Suno Style Prompt
                        </h4>
                     </div>
                     
                     <div className="p-5 flex flex-col justify-between h-full gap-4">
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                           <code className="text-sm text-indigo-300 font-mono block break-words">
                             {track.style}
                           </code>
                        </div>

                        <div className="mt-auto">
                          <button 
                            onClick={() => copyToClipboard(track.style, `style-${index}`)}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-sm transition-all shadow-lg ${
                              copyStatus === `style-${index}`
                                ? 'bg-green-600 text-white shadow-green-500/20'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/20'
                            }`}
                          >
                            {copyStatus === `style-${index}` ? <Check size={18} /> : <Zap size={18} />}
                            {copyStatus === `style-${index}` ? "Ritmo Copiado!" : "Copiar Ritmo"}
                          </button>
                          <p className="text-[10px] text-slate-500 text-center mt-3">
                            Cole este prompt na caixa "Style" do Suno.
                          </p>
                        </div>
                     </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}

        {!result && !isLoading && !error && (
            <div className="text-center text-slate-600 mt-20">
               <Music size={48} className="mx-auto mb-4 opacity-20" />
               <p>Seu estúdio de composição com IA está pronto.</p>
            </div>
        )}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)