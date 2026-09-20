import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import { Zap, Brain, Clock, BookOpen as BookOpenIcon } from "lucide-react";
import studyMinutesLogo from "../assets/studyminutes_logo.png";

const AuthPage = () => {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
  // const API_BASE_URL = "http://127.0.0.1:8000";

  const handleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/google`, {
        token: credentialResponse.credential,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const features = [
    {
      icon: <Brain size={28} />,
      title: "AI-Powered Learning",
      description: "Get intelligent summaries and insights from your notes",
    },
    {
      icon: <Zap size={28} />,
      title: "Quick Conversions",
      description: "Convert audio, PDFs, and text into organized study notes",
    },
    {
      icon: <Clock size={28} />,
      title: "Study Efficiently",
      description: "Save time by letting AI organize your notes smartly",
    },
    {
      icon: <BookOpenIcon size={28} />,
      title: "Learn Smarter",
      description: "Chat with your notes and understand concepts better",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-slate-900/50 backdrop-blur-md border-b border-slate-700 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={studyMinutesLogo}
              alt="StudyMinutes"
              className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
            />
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              StudyMinutes
            </span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {!showLogin ? (
            <>
              {/* Hero Content */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
                <div className="space-y-6">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                    Welcome to{" "}
                    <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                      StudyMinutes
                    </span>
                  </h1>
                  <p className="text-lg text-slate-300 leading-relaxed">
                    Transform the way you study with AI-powered note organization, 
                    intelligent summaries, and interactive learning. Convert your audio 
                    recordings, PDFs, and handwritten notes into structured, searchable study materials.
                  </p>
                  <p className="text-base text-slate-400">
                    Save hours every week by letting AI handle your note-taking, while you focus on understanding concepts deeply.
                  </p>
                  <button
                    onClick={() => setShowLogin(true)}
                    className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg"
                  >
                    Get Started →
                  </button>
                </div>

                {/* Illustration/Visual */}
                <div className="hidden lg:block">
                  <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl p-8 border border-slate-700">
                    <div className="aspect-square bg-gradient-to-br from-blue-600/30 to-purple-600/30 rounded-2xl flex items-center justify-center">
                      <img
                        src={studyMinutesLogo}
                        alt="StudyMinutes"
                        className="h-32 w-32 sm:h-40 sm:w-40 object-contain opacity-70"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Features Section */}
              <div className="space-y-8">
                <div className="text-center space-y-3">
                  <h2 className="text-3xl sm:text-4xl font-bold">Why Choose StudyMinutes?</h2>
                  <p className="text-slate-400 max-w-2xl mx-auto">
                    Everything you need to study smarter, not harder.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {features.map((feature, index) => (
                    <div
                      key={index}
                      className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-all hover:bg-slate-800/80"
                    >
                      <div className="text-blue-400 mb-3">{feature.icon}</div>
                      <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                      <p className="text-slate-400 text-sm">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Section */}
              <div className="mt-16 text-center space-y-4">
                <p className="text-slate-400">Ready to revolutionize your study habits?</p>
                <button
                  onClick={() => setShowLogin(true)}
                  className="inline-block px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
                >
                  Start Learning Today
                </button>
              </div>
            </>
          ) : (
            /* Login Modal */
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold">Get Started</h2>
                  <p className="text-slate-400">Sign in with your Google account</p>
                </div>

                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleSuccess}
                    onError={() => console.log("Login Failed")}
                  />
                </div>

                <button
                  onClick={() => setShowLogin(false)}
                  className="w-full py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700/50 transition-colors"
                >
                  Back
                </button>

                <p className="text-xs text-slate-500 text-center">
                  By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center text-slate-500 text-sm">
          <p>© 2026 StudyMinutes. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default AuthPage;
