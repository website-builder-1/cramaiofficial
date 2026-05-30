import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import Home from "./pages/Home";
import Analyzer from "./pages/Analyzer";
import Questions from "./pages/Questions";
import StudyPlan from "./pages/StudyPlan";
import Chat from "./pages/Chat";
import Diagnostic from "./pages/Diagnostic";
import Flashcards from "./pages/Flashcards";
import Summary from "./pages/Summary";
import Notes from "./pages/Notes";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/analyzer" element={<Analyzer />} />
              <Route path="/questions" element={<Questions />} />
              <Route path="/study-plan" element={<StudyPlan />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/diagnostic" element={<Diagnostic />} />
              <Route path="/flashcards" element={<Flashcards />} />
              <Route path="/summary" element={<Summary />} />
              <Route path="/notes" element={<Notes />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
