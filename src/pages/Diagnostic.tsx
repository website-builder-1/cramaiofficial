import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { LoadingCard } from '@/components/LoadingSpinner';
import { 
  ClipboardCheck, 
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Target,
  BookOpen,
  AlertTriangle
} from 'lucide-react';
import { useStudyStore } from '@/lib/store';
import { type Question, runDiagnosticTest } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { RichText } from '@/components/RichText';

export default function Diagnostic() {
  const navigate = useNavigate();
  const { setWeakTopics, diagnosticState, setDiagnosticState } = useStudyStore();

  const [isGenerating, setIsGenerating] = useState(false);

  const questions = diagnosticState?.questions ?? [];
  const currentIndex = diagnosticState?.currentIndex ?? 0;
  const userAnswers = diagnosticState?.userAnswers ?? {};
  const isCompleted = diagnosticState?.isCompleted ?? false;
  const results = diagnosticState?.results ?? null;

  const update = (patch: Partial<NonNullable<typeof diagnosticState>>) => {
    setDiagnosticState({
      questions: patch.questions ?? questions,
      currentIndex: patch.currentIndex ?? currentIndex,
      userAnswers: patch.userAnswers ?? userAnswers,
      isCompleted: patch.isCompleted ?? isCompleted,
      results: patch.results ?? results,
    });
  };

  const handleStart = async () => {
    setIsGenerating(true);

    const { documentContent, subject } = useStudyStore.getState();
    const response = await runDiagnosticTest(documentContent || '', subject || 'General');

    if (response.error) {
      toast.error(response.error);
      setIsGenerating(false);
      return;
    }

    if (response.data) {
      setDiagnosticState({
        questions: response.data,
        currentIndex: 0,
        userAnswers: {},
        isCompleted: false,
        results: null,
      });
      toast.success('Diagnostic test ready! Good luck!');
    }
    
    setIsGenerating(false);
  };

  const handleAnswer = (answer: string) => {
    const currentQuestion = questions[currentIndex];
    update({ userAnswers: { ...userAnswers, [currentQuestion.id]: answer } });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      update({ currentIndex: currentIndex + 1 });
    } else {
      // Calculate results
      calculateResults();
    }
  };

  const calculateResults = () => {
    let correct = 0;
    const weakTopicsMap: Record<string, number> = {};

    questions.forEach(q => {
      if (userAnswers[q.id] === q.correctAnswer) {
        correct++;
      } else {
        weakTopicsMap[q.topic] = (weakTopicsMap[q.topic] || 0) + 1;
      }
    });

    const sortedWeakTopics = Object.entries(weakTopicsMap)
      .sort(([, a], [, b]) => b - a)
      .map(([topic]) => topic);

    const percentage = Math.round((correct / questions.length) * 100);

    const recommendations: string[] = [];
    if (percentage < 50) {
      recommendations.push('Focus on reviewing the fundamentals before moving to advanced topics');
      recommendations.push('Consider using the AI Tutor to get explanations for concepts you missed');
    } else if (percentage < 80) {
      recommendations.push('Good foundation! Focus on strengthening your weak areas');
      recommendations.push('Practice more questions on: ' + sortedWeakTopics.slice(0, 2).join(', '));
    } else {
      recommendations.push("Excellent! You have a strong understanding of the material");
      recommendations.push('Do a final review of edge cases and tricky concepts');
    }

    setWeakTopics(sortedWeakTopics);
    update({
      isCompleted: true,
      results: {
        score: correct,
        percentage,
        weakTopics: sortedWeakTopics,
        recommendations,
      },
    });
  };

  const handleReset = () => {
    setDiagnosticState(null);
  };

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen py-8">
      <div className="container px-4 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent border border-border mb-4">
            <ClipboardCheck className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Diagnostic Test</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Find Your <span className="gradient-text">Knowledge Gaps</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Take a quick 10-question test to identify areas that need more attention.
          </p>
        </div>

        {/* Content */}
        {questions.length === 0 && !isGenerating ? (
          /* Start Screen */
          <div className="glass-card rounded-xl p-8 text-center">
            <div className="w-20 h-20 rounded-full gradient-bg flex items-center justify-center mx-auto mb-6 shadow-glow">
              <Target className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Ready to Test Your Knowledge?</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              This quick diagnostic will help identify your strengths and areas for improvement. 
              It only takes about 5 minutes!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-success" />
                10 questions
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Auto-graded
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Personalized feedback
              </div>
            </div>
            <Button
              onClick={handleStart}
              variant="hero"
              size="xl"
              className="mt-8 gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Start Diagnostic Test
            </Button>
          </div>
        ) : isGenerating ? (
          <LoadingCard message="Preparing your diagnostic test..." />
        ) : isCompleted && results ? (
          /* Results Screen */
          <div className="space-y-6 animate-slide-up">
            <div className="glass-card rounded-xl p-8 text-center">
              <div className={cn(
                'w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4',
                results.percentage >= 80 ? 'bg-success/10' : results.percentage >= 50 ? 'bg-warning/10' : 'bg-destructive/10'
              )}>
                {results.percentage >= 80 ? (
                  <CheckCircle2 className="w-12 h-12 text-success" />
                ) : results.percentage >= 50 ? (
                  <AlertTriangle className="w-12 h-12 text-warning" />
                ) : (
                  <XCircle className="w-12 h-12 text-destructive" />
                )}
              </div>
              <h2 className="text-2xl font-bold mb-2">Diagnostic Complete!</h2>
              <p className="text-4xl font-bold gradient-text mb-2">{results.percentage}%</p>
              <p className="text-muted-foreground">
                You got {results.score} out of {questions.length} questions correct
              </p>
            </div>

            {/* Weak Topics */}
            {results.weakTopics.length > 0 && (
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Areas to Improve
                </h3>
                <div className="flex flex-wrap gap-2">
                  {results.weakTopics.map((topic, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full bg-warning/10 text-warning text-sm font-medium"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Recommendations
              </h3>
              <div className="space-y-3">
                {results.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    <p className="text-muted-foreground">{rec}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Results */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Question Review
              </h3>
              <div className="space-y-4">
                {questions.map((q, i) => {
                  const isCorrect = userAnswers[q.id] === q.correctAnswer;
                  return (
                    <div key={i} className={cn(
                      'p-4 rounded-lg border',
                      isCorrect ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'
                    )}>
                      <div className="flex items-start gap-3">
                        {isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-sm mb-1">{q.question}</p>
                          {!isCorrect && (
                            <p className="text-xs text-muted-foreground">
                              <span className="text-destructive">Your answer:</span> {userAnswers[q.id]} | 
                              <span className="text-success"> Correct:</span> {q.correctAnswer}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => navigate('/study-plan')}
                variant="hero"
                size="lg"
                className="flex-1 gap-2"
              >
                Create Study Plan
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                size="lg"
                className="flex-1"
              >
                Retake Test
              </Button>
            </div>
          </div>
        ) : (
          /* Question Display */
          <div className="space-y-6">
            {/* Progress */}
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span className="text-sm text-muted-foreground">
                  {currentQuestion.topic}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full gradient-bg transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="glass-card rounded-xl p-6 animate-scale-in" key={currentQuestion.id}>
              <div className={cn(
                'inline-block px-2 py-0.5 rounded text-xs font-medium mb-4',
                currentQuestion.difficulty === 'easy' && 'bg-success/10 text-success',
                currentQuestion.difficulty === 'medium' && 'bg-warning/10 text-warning',
                currentQuestion.difficulty === 'hard' && 'bg-destructive/10 text-destructive'
              )}>
                {currentQuestion.difficulty}
              </div>
              
              <RichText html={currentQuestion.question} className="text-lg font-semibold mb-6" />

              <RadioGroup
                value={userAnswers[currentQuestion.id] || ''}
                onValueChange={handleAnswer}
                className="space-y-3"
              >
                {currentQuestion.options?.map((option, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer',
                      userAnswers[currentQuestion.id] === option
                        ? 'border-primary bg-accent'
                        : 'border-border hover:border-primary/50'
                    )}
                    onClick={() => handleAnswer(option)}
                  >
                    <RadioGroupItem value={option} id={`option-${i}`} />
                    <Label htmlFor={`option-${i}`} className="flex-1 cursor-pointer font-normal">
                      <RichText html={option} as="span" />
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Navigation */}
            <Button
              onClick={handleNext}
              variant="hero"
              size="lg"
              className="w-full gap-2"
              disabled={!userAnswers[currentQuestion.id]}
            >
              {currentIndex < questions.length - 1 ? (
                <>
                  Next Question
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <Target className="w-4 h-4" />
                  See Results
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
