import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  Upload, 
  BookOpen, 
  Calendar, 
  MessageCircle,
  CheckCircle2,
  Users,
  TrendingUp,
  ArrowRight,
  Zap,
  Brain,
  Clock,
  Layers,
  ScrollText

} from 'lucide-react';
import heroBg from '@/assets/hero-bg.jpg';

const features = [
  {
    icon: Upload,
    title: 'Smart Document Analysis',
    description: 'Upload any study material and get instant insights, key topics, and study recommendations.',
  },
  {
    icon: BookOpen,
    title: 'AI Practice Questions',
    description: 'Generate unlimited practice questions tailored to your material and difficulty level.',
  },
  {
    icon: Calendar,
    title: 'Personalized Study Plans',
    description: 'Get hour-by-hour schedules optimized for your exam date and learning style.',
  },
  {
    icon: MessageCircle,
    title: 'AI Tutor Chat',
    description: 'Ask questions, get explanations, and receive step-by-step solutions instantly.',
  },
  {
    icon: Layers,
    title: 'Smart Flashcards',
    description: 'AI-generated flashcards with flip-to-reveal answers and quick spaced review.',
  },
  {
    icon: ScrollText,
    title: 'Summary & Cheat Sheet',
    description: 'One-click TL;DR, bullet summary, and exam-ready cheat sheet from your notes.',
  },
];

const stats = [
  { icon: Users, value: '10,000+', label: 'Students Helped' },
  { icon: TrendingUp, value: '95%', label: 'Pass Rate Boost' },
  { icon: Clock, value: '50%', label: 'Study Time Saved' },
];

const testimonials = [
  {
    quote: "CramAI helped me pass my biology final with an A when I had only 2 days to study!",
    author: "Sarah M.",
    role: "Biology Major",
  },
  {
    quote: "The AI tutor explained calculus concepts better than my textbook ever did.",
    author: "James K.",
    role: "Engineering Student",
  },
  {
    quote: "The practice questions were exactly like my actual exam. Game changer!",
    author: "Emily R.",
    role: "Pre-Med Student",
  },
];

const quotes = [
  "Success is no accident. It is hard work, perseverance, learning, studying, and sacrifice.",
  "The beautiful thing about learning is that no one can take it away from you.",
  "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.",
];

export default function Home() {
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src={heroBg} 
            alt="" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        </div>

        {/* Glow effects */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-secondary/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />

        <div className="container relative z-10 px-4 py-24 md:py-32 lg:py-40">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent border border-border animate-fade-in">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-accent-foreground">AI-Powered Exam Prep</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight animate-slide-up">
              Ace Your Exam in{' '}
              <span className="gradient-text">24 Hours</span>
              {' '}with AI
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Upload your study materials and let our AI create personalized practice questions, 
              study plans, and explanations. Study smarter, not harder.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Link to="/analyzer">
                <Button variant="hero" size="xl" className="gap-2 w-full sm:w-auto">
                  Start Studying Now
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/diagnostic">
                <Button variant="outline" size="xl" className="gap-2 w-full sm:w-auto">
                  <Zap className="w-5 h-5" />
                  Take Diagnostic Test
                </Button>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 pt-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-28">
        <div className="container px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to <span className="gradient-text">Succeed</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Our AI-powered tools work together to give you the ultimate study experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="glass-card rounded-xl p-6 card-hover animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4 shadow-md">
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-accent/30">
        <div className="container px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Start Studying in <span className="gradient-text">3 Steps</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: 1, title: 'Upload Material', desc: 'Upload your notes, textbook pages, or paste text directly.' },
              { step: 2, title: 'AI Analyzes', desc: 'Our AI identifies key topics, concepts, and creates a study roadmap.' },
              { step: 3, title: 'Study Smart', desc: 'Practice with AI questions, get tutoring help, and track progress.' },
            ].map((item, index) => (
              <div key={index} className="relative text-center animate-slide-up" style={{ animationDelay: `${index * 0.15}s` }}>
                <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center mx-auto mb-4 shadow-glow text-2xl font-bold text-primary-foreground">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-28">
        <div className="container px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Loved by <span className="gradient-text">Students</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="glass-card rounded-xl p-6 card-hover animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Sparkles key={i} className="w-4 h-4 text-warning fill-warning" />
                  ))}
                </div>
                <p className="text-foreground mb-4 italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold">
                    {testimonial.author[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{testimonial.author}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Motivational Quote */}
      <section className="py-16 bg-accent/30">
        <div className="container px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Brain className="w-10 h-10 text-primary mx-auto mb-4" />
            <blockquote className="text-xl md:text-2xl font-medium text-foreground italic">
              "{randomQuote}"
            </blockquote>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 lg:py-28">
        <div className="container px-4">
          <div className="glass-card rounded-2xl p-8 md:p-12 max-w-4xl mx-auto text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-glow" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to <span className="gradient-text">Ace Your Exam</span>?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
                Join thousands of students who've transformed their study habits with CramAI.
              </p>
              <Link to="/analyzer">
                <Button variant="hero" size="xl" className="gap-2">
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  No credit card required
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Free to start
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
