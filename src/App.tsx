import React, { useState, useEffect, useMemo } from 'react';
import { Search, Clapperboard, Star, Filter, Heart, Info, X, MessageSquare, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Fuse from 'fuse.js';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Movie, Review, Rating } from './types';
import { getRecommendations } from './lib/gemini';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const GENRES = ["Action", "Adventure", "Animation", "Comedy", "Crime", "Drama", "Family", "Sci-Fi", "Thriller"];

export default function App() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [viewingHistory, setViewingHistory] = useState<string[]>([]);
  const [aiRecs, setAiRecs] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState("");
  const [newRating, setNewRating] = useState(0);
  const [activeTab, setActiveTab] = useState<'discovery' | 'library'>('discovery');

  const libraryMovies = useMemo(() => {
    return movies.filter(m => viewingHistory.includes(m.id));
  }, [movies, viewingHistory]);

  const submitRating = async (rating: number) => {
    if (!selectedMovie) return;
    try {
      await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieId: selectedMovie.id,
          userId: 'user-1',
          rating
        })
      });
      setNewRating(rating);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      const res = await fetch('/api/movies');
      const data = await res.json();
      setMovies(data);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const fetchReviews = async (movieId: string) => {
    try {
      const res = await fetch(`/api/reviews/${movieId}`);
      const data = await res.json();
      setReviews(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const fuse = useMemo(() => new Fuse(movies, {
    keys: ['title', 'director', 'description', 'genre'],
    threshold: 0.4
  }), [movies]);

  const filteredMovies = useMemo(() => {
    let result = searchQuery 
      ? fuse.search(searchQuery).map(r => r.item)
      : movies;

    if (selectedGenres.length > 0) {
      result = result.filter(m => 
        selectedGenres.every(genre => m.genre.includes(genre))
      );
    }
    return result;
  }, [fuse, searchQuery, selectedGenres, movies]);

  const handleGetAiRecs = async () => {
    setIsAiLoading(true);
    const recIds = await getRecommendations(movies, selectedGenres.length ? selectedGenres : ["Good story"], viewingHistory);
    const recommended = movies.filter(m => recIds.includes(m.id));
    setAiRecs(recommended);
    setIsAiLoading(false);
  };

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie);
    fetchReviews(movie.id);
    setNewRating(0);
    if (!viewingHistory.includes(movie.id)) {
      setViewingHistory(prev => [...prev, movie.id]);
    }
  };

  const submitReview = async () => {
    if (!selectedMovie || !newReview) return;
    try {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieId: selectedMovie.id,
          userId: 'user-1',
          userName: 'Guest User',
          comment: newReview
        })
      });
      setNewReview("");
      fetchReviews(selectedMovie.id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] text-white font-sans selection:bg-rose-500/30 overflow-x-hidden">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-rose-900/10 filter blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 filter blur-[120px] rounded-full"></div>
      </div>

      {/* Top Navigation */}
      <nav className="relative z-20 flex items-center justify-between px-10 py-8 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm">
        <div className="flex items-center gap-12">
          <div className="text-3xl font-black tracking-tighter text-rose-600">
            CINE<span className="text-white">MIND</span>
          </div>
          <div className="hidden md:flex gap-8 text-sm font-medium text-gray-400">
            <button 
              onClick={() => setActiveTab('discovery')}
              className={cn(
                "transition-colors pb-1 uppercase tracking-widest text-xs font-bold",
                activeTab === 'discovery' ? "text-white border-b-2 border-rose-600" : "hover:text-white"
              )}
            >
              Discovery
            </button>
            <button 
              onClick={() => setActiveTab('library')}
              className={cn(
                "transition-colors pb-1 uppercase tracking-widest text-xs font-bold",
                activeTab === 'library' ? "text-white border-b-2 border-rose-600" : "hover:text-white"
              )}
            >
              Library ({viewingHistory.length})
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="relative group hidden sm:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-rose-500 transition-colors" size={16} />
            <input 
              id="search-input"
              type="text" 
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearch}
              className="bg-white/5 border border-white/10 rounded-full py-2.5 pl-12 pr-6 w-64 focus:outline-none focus:border-rose-600/50 transition-all text-sm"
            />
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-orange-400 border-2 border-white/20 shadow-lg shadow-rose-500/20 cursor-pointer"></div>
        </div>
      </nav>

      <main className="relative z-10 px-6 md:px-10 pb-20">
        {activeTab === 'discovery' ? (
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left: Discovery Sidebar */}
            <aside className="w-full md:w-1/4 flex flex-col gap-6">
              <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
                <h3 className="text-xs uppercase tracking-[0.2em] text-rose-500 font-black mb-6">Discovery Engine</h3>
                
                <div className="space-y-8">
                  <div>
                    <p className="text-sm font-bold mb-4 flex items-center gap-2">
                      <Filter size={14} className="text-rose-500" />
                      Primary Genres
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {GENRES.map(genre => (
                        <button
                          key={genre}
                          onClick={() => toggleGenre(genre)}
                          className={cn(
                            "py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                            selectedGenres.includes(genre) 
                              ? "bg-rose-600 text-white shadow-xl shadow-rose-600/30 border border-rose-500" 
                              : "bg-white/5 border border-white/5 text-gray-500 hover:bg-white/10 border-white/10"
                          )}
                        >
                          {genre}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-rose-900/40 via-rose-950/20 to-transparent rounded-[2.5rem] p-8 border border-rose-500/20 min-h-[200px] flex flex-col justify-end group transition-colors hover:border-rose-500/40">
                <p className="text-[10px] uppercase font-black tracking-widest text-rose-400 mb-2">Profile Synthesis</p>
                <p className="text-xl font-bold leading-tight tracking-tight">
                  {viewingHistory.length > 0 
                    ? "Your pattern suggests a lean towards cinematic grandiosity and deep narratives." 
                    : "Initialize your viewing patterns to refine our synthesis engine."}
                </p>
              </div>
            </aside>

            {/* Right: Main Content */}
            <section className="flex-1 flex flex-col gap-10">
              {/* AI Feature Hero */}
              <div className="relative rounded-[3rem] overflow-hidden group border border-white/10 min-h-[40vh] flex flex-col justify-end">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1478720334517-db3c6ed4ecca?q=80&w=1600&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-[2000ms] group-hover:scale-110"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/40 to-transparent"></div>
                
                <div className="relative z-10 p-10 md:p-12 flex flex-col md:flex-row items-end justify-between gap-8">
                  <div className="max-w-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 bg-rose-600 text-[10px] font-black rounded tracking-widest text-white ring-4 ring-rose-600/20">PREMIUM RECOMMENDATION</span>
                      <span className="text-xs font-bold text-gray-400">98% SYNCED</span>
                    </div>
                    <h2 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter uppercase leading-[0.9]">Calculated Insights</h2>
                    <p className="text-gray-400 text-lg font-medium leading-relaxed">Let our neural discovery engine process your preferences to curate a bespoke cinematic experience.</p>
                  </div>
                  <button 
                    id="generate-recs"
                    onClick={handleGetAiRecs}
                    disabled={isAiLoading}
                    className="bg-white text-black px-10 py-5 rounded-full font-black text-sm tracking-widest uppercase shadow-2xl hover:bg-rose-600 hover:text-white transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-3"
                  >
                    {isAiLoading ? "Syncing..." : <><Sparkles size={18} /> Process Discovery</>}
                  </button>
                </div>
              </div>

              {/* Recs Grid (AI Generated) */}
              {aiRecs.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {aiRecs.map(movie => (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={`ai-${movie.id}`}
                      onClick={() => handleMovieClick(movie)}
                      className="group cursor-pointer space-y-4"
                    >
                      <div className="aspect-[16/9] rounded-[2rem] overflow-hidden border border-white/10 relative">
                        <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-rose-600 rounded text-[10px] font-black">{movie.rating}</div>
                        <img src={movie.poster} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={movie.title} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent p-6 flex flex-col justify-end">
                           <h4 className="font-bold text-lg">{movie.title}</h4>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Results Grid */}
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h4 className="text-2xl font-black tracking-tight uppercase">Refined Selection</h4>
                  <span className="text-xs text-rose-500 font-black tracking-widest uppercase cursor-pointer hover:text-rose-400 transition-colors">Archive / 024</span>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {filteredMovies.map((movie, idx) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      key={movie.id}
                      onClick={() => handleMovieClick(movie)}
                      className="space-y-3 group cursor-pointer"
                    >
                      <div className="aspect-[2/3] bg-white/5 rounded-[2.5rem] overflow-hidden border border-white/10 relative shadow-2xl transition-all duration-500 group-hover:border-rose-600/50 group-hover:shadow-rose-600/10">
                        <img src={movie.poster} className="w-full h-full object-cover" alt={movie.title} />
                        <div className="absolute inset-0 bg-rose-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                          <Info className="text-white" size={32} />
                        </div>
                      </div>
                      <div className="px-2">
                        <p className="text-sm font-black truncate uppercase tracking-tight">{movie.title}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{movie.genre[0]} • {movie.year}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        ) : (
          /* Full width Library View */
          <div className="w-full">
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-3xl font-black tracking-tight uppercase">My Archive Collection ({libraryMovies.length})</h4>
              <span className="text-xs text-rose-500 font-black tracking-widest uppercase">History / Saved</span>
            </div>
            
            {libraryMovies.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                {libraryMovies.map((movie, idx) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    key={`lib-${movie.id}`}
                    onClick={() => handleMovieClick(movie)}
                    className="space-y-3 group cursor-pointer"
                  >
                    <div className="aspect-[2/3] bg-white/5 rounded-[2.5rem] overflow-hidden border border-white/10 relative shadow-2xl transition-all duration-500 group-hover:border-rose-600/50 group-hover:shadow-rose-600/10">
                      <img src={movie.poster} className="w-full h-full object-cover" alt={movie.title} />
                      <div className="absolute inset-0 bg-rose-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <Info className="text-white" size={32} />
                      </div>
                    </div>
                    <div className="px-2">
                      <p className="text-sm font-black truncate uppercase tracking-tight">{movie.title}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{movie.genre[0]} • {movie.year}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center bg-white/5 border border-white/5 rounded-[3rem] p-8 max-w-2xl mx-auto shadow-2xl">
                <Clapperboard size={64} className="text-rose-500/50 mb-6 animate-pulse" />
                <p className="text-2xl font-black tracking-tight uppercase text-gray-200">Your Archive is Empty</p>
                <p className="text-sm text-gray-500 mt-3 leading-relaxed max-w-md">Explore discovery films and view their details to automatically catalog them in your personal, premium workspace database.</p>
                <button 
                  onClick={() => setActiveTab('discovery')}
                  className="mt-8 px-8 py-3.5 bg-rose-600 text-xs font-black uppercase tracking-widest rounded-full hover:bg-rose-500 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-rose-600/30"
                >
                  Browse Discovery
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Details Side-Panel / Modal */}
      <AnimatePresence>
        {selectedMovie && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 bg-[#050507]/90 backdrop-blur-2xl"
          >
            <motion.div 
              layoutId={selectedMovie.id}
              className="bg-[#0a0a0c] border border-white/10 w-full max-w-6xl max-h-[90vh] rounded-[4rem] overflow-hidden flex flex-col md:flex-row relative shadow-[0_0_100px_rgba(0,0,0,0.8)]"
            >
              <button 
                onClick={() => setSelectedMovie(null)}
                className="absolute top-8 right-8 z-20 p-3 bg-white/5 rounded-full hover:bg-rose-600 transition-all border border-white/10"
              >
                <X size={24} />
              </button>

              <div className="w-full md:w-[45%] h-full relative">
                <img src={selectedMovie.poster} alt={selectedMovie.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0a0a0c]"></div>
              </div>

              <div className="flex-1 p-10 md:p-16 overflow-y-auto">
                <div className="flex items-center gap-3 mb-8">
                  <span className="px-3 py-1 bg-rose-600/10 text-rose-500 border border-rose-500/20 rounded-md text-[10px] font-black uppercase tracking-widest">{selectedMovie.year}</span>
                  <div className="flex items-center gap-1.5 ml-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => submitRating(star)}
                        className={cn(
                          "transition-colors",
                          (newRating || selectedMovie.rating / 2 >= star) ? "text-rose-500" : "text-white/10"
                        )}
                      >
                        <Star size={20} fill={ (newRating || selectedMovie.rating / 2 >= star) ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                </div>

                <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-2 leading-none">{selectedMovie.title}</h2>
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-10 italic">Authored by {selectedMovie.director}</p>
                
                <div className="flex flex-wrap gap-2 mb-10">
                  {selectedMovie.genre.map(g => (
                    <span key={g} className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase font-black tracking-widest text-gray-400">{g}</span>
                  ))}
                </div>

                <p className="text-xl leading-relaxed text-gray-300 font-medium mb-12 max-w-2xl">{selectedMovie.description}</p>

                <div className="pt-10 border-t border-white/5 space-y-10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black uppercase tracking-widest">Feed Analysis</h3>
                    <button className="text-rose-500 text-xs font-black uppercase tracking-widest hover:text-rose-400" onClick={() => setShowReviews(!showReviews)}>
                      {showReviews ? "Synthesize Review" : `Access Logs (${reviews.length})`}
                    </button>
                  </div>

                  {showReviews ? (
                    <div className="space-y-6">
                      {reviews.map(review => (
                        <div key={review.id} className="p-6 rounded-[2rem] bg-white/5 border border-white/5 shadow-inner">
                          <div className="flex items-center justify-between mb-4">
                            <span className="font-black text-[10px] tracking-widest uppercase text-rose-500">{review.userName}</span>
                            <span className="text-[9px] text-white/20 font-bold uppercase tracking-widest">LOG: {new Date(review.timestamp).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm font-medium text-gray-400 leading-relaxed">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="relative">
                        <textarea 
                          placeholder="Log your thoughts into the collective..."
                          value={newReview}
                          onChange={(e) => setNewReview(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-8 text-sm font-medium focus:outline-none focus:border-rose-500/50 min-h-[160px] transition-all resize-none shadow-inner"
                        ></textarea>
                        <MessageSquare className="absolute bottom-8 right-8 text-white/10" size={32} />
                      </div>
                      <button 
                        onClick={submitReview}
                        className="w-full py-5 bg-rose-600 hover:bg-rose-500 text-white rounded-full font-black text-sm tracking-[0.2em] uppercase transition-all shadow-xl shadow-rose-600/20 transform active:scale-95"
                      >
                        Transmit Logs
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle Bottom Bar */}
      <div className="fixed bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-rose-600/40 to-transparent z-50"></div>
    </div>
  );
}
