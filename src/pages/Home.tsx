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
import { JustStartButton } from '@/components/JustStartButton';

const features = [
  {
    icon: Upload,
    title: 'Drop-and-go Analyzer',
    description: 'Dump messy notes, slides, or a textbook page. We chunk it into ADHD-sized pieces you can actually start.',
  },
  {
    icon: BookOpen,
    title: 'Dopamine Practice Questions',
    description: 'Short bursts, instant feedback, zero shame. Built for brains that need the hit of getting one right.',
  },
  {
    icon: Calendar,
    title: 'Tiny-Step Study Plans',
    description: 'No 4-hour blocks. Just the next 15-minute task so executive function never has to negotiate.',
  },
  {
    icon: MessageCircle,
    title: 'Patient AI Tutor',
    description: 'Ask the dumb question. Ask it again. No sighs, no judgement — just clear, calm answers on demand.',
  },
  {
    icon: Layers,
    title: 'Flick-Through Flashcards',
    description: 'Quick flips, satisfying streaks. The kind of micro-reward loop ADHD brains actually stick with.',
  },
  {
    icon: ScrollText,
    title: 'TL;DR Cheat Sheet',
    description: 'For the day before the exam when 40 pages feels impossible. One tap, one page, done.',
  },
];

const stats = [
  { icon: Users, value: '10,000+', label: 'ADHD Students' },
  { icon: TrendingUp, value: '95%', label: 'Actually Finish a Session' },
  { icon: Clock, value: '50%', label: 'Less Time Staring at Page 1' },
];

const testimonials = [
  {
    quote: "First study app that didn't make me feel broken for having ADHD. The tiny-step plans are everything.",
    author: "Sarah M.",
    role: "Biology Major, diagnosed ADHD-C",
  },
  {
    quote: "I opened a textbook for the first time in weeks because the next task was just 'read one paragraph'.",
    author: "James K.",
    role: "Engineering Student",
  },
  {
    quote: "The dopamine-friendly questions kept me hooked. I studied for 2 hours and didn't even notice.",
    author: "Emily R.",
    role: "Pre-Med Student",
  },
];

const quotes = [
  "ADHD isn't a deficit of attention. It's attention that needs the right invitation.",
  "You don't have a discipline problem. You have a dopamine problem — and we built a tool for that.",
  "Start ugly. Start tiny. Just start. Hyperfocus does the rest.",
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
              <span className="text-sm font-medium text-accent-foreground">Study tools built for ADHD brains</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight animate-slide-up">
              Cram smarter.{' '}
              <span className="gradient-text">Built for ADHD brains.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
              The study app that meets your brain where it is. Tiny tasks, instant dopamine, zero shame —
              powered by AI that knows the hardest part is just opening the book.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Link to="/analyzer">
                <Button variant="hero" size="xl" className="gap-2 w-full sm:w-auto">
                  Start a 15-min sprint
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/notes">
                <Button variant="outline" size="xl" className="gap-2 w-full sm:w-auto">
                  <Zap className="w-5 h-5" />
                  Make my notes readable
                </Button>
              </Link>
            </div>

            {/* ADHD-friendly: Just Start */}
            <div className="pt-4 animate-slide-up" style={{ animationDelay: '0.25s' }}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Stuck staring at the page? Tap one button. We'll pick the task.</p>
              <div className="flex justify-center">
                <JustStartButton variant="outline" size="lg" />
              </div>
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
              Designed around the way <span className="gradient-text">ADHD brains actually work</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Every feature is engineered to lower the activation cost — so the gap between "I should study" and "I am studying" finally closes.
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
              From zero to in-flow in <span className="gradient-text">3 steps</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: 1, title: 'Drop the chaos in', desc: 'Photos, PDFs, screenshots, voice notes — we don\'t care how messy. We sort it.' },
              { step: 2, title: 'AI breaks it down', desc: 'Big scary topic becomes a stack of bite-sized tasks your brain will actually start.' },
              { step: 3, title: 'Ride the hyperfocus', desc: 'Streaks, timers, tiny wins. Look up and an hour has gone — in the good way.' },
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
              Loved by <span className="gradient-text">ADHD students</span> who tried everything else
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
                Your brain isn't broken. <span className="gradient-text">Your tools were.</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
                Join thousands of ADHD students who finally found a study app that works *with* their wiring instead of against it.
              </p>
              <Link to="/analyzer">
                <Button variant="hero" size="xl" className="gap-2">
                  Start free — no overwhelm
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
