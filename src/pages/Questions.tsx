import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { LoadingCard } from '@/components/LoadingSpinner';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  BookOpen, 
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Target,
  Trophy
} from 'lucide-react';
import { useStudyStore } from '@/lib/store';
import { type Question, generateQuestions, gradeAnswers } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const questionTypes = [
  { id: 'multiple-choice', label: 'Multiple Choice' },
  { id: 'true-false', label: 'True/False' },
  { id: 'short-answer', label: 'Short Answer' },
  { id: 'essay', label: 'Essay' },
];

export default function Questions() {
  const {
    getStudyMaterial,
    subject,
    examLevel,
    examBoard,
    setWeakTopics,
    questionsState,
    setQuestionsState,
  } = useStudyStore();
  const material = getStudyMaterial();

  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['multiple-choice', 'true-false']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGrading, setIsGrading] = useState(false);

  const questions = questionsState?.questions ?? [];
  const userAnswers = questionsState?.userAnswers ?? {};
  const isGraded = questionsState?.isGraded ?? false;
  const gradeResult = questionsState?.gradeResult ?? null;
  const showResults = questions.length > 0;

  const gradedById = (() => {
    const map: Record<string, { isCorrect: boolean; correctAnswer: string; explanation?: string }> = {};
    gradeResult?.answers?.forEach((a) => {
      map[a.questionId] = { isCorrect: a.isCorrect, correctAnswer: a.correctAnswer, explanation: a.explanation };
    });
    return map;
  })();

  const toggleQuestionType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleGenerate = async () => {
    if (selectedTypes.length === 0) {
      toast.error('Please select at least one question type');
      return;
    }
    if (!material || material.length < 10) {
      toast.error('Add study material in the Analyzer first so questions stay on topic.');
      return;
    }

    setIsGenerating(true);
    setQuestionsState(null);

    const response = await generateQuestions({
      content: material,
      count: questionCount,
      difficulty,
      types: selectedTypes,
      subject,
      examLevel,
      examBoard,
    });

    if (response.error) {
      toast.error(response.error);
      setIsGenerating(false);
      return;
    }

    if (response.data) {
      setQuestionsState({
        questions: response.data,
        userAnswers: {},
        isGraded: false,
        gradeResult: null,
      });
      toast.success(`Generated ${response.data.length} practice questions!`);
    }
    
    setIsGenerating(false);
  };

  const handleAnswer = (questionId: string, answer: string) => {
    if (isGraded) return;
    setQuestionsState({
      questions,
      userAnswers: { ...userAnswers, [questionId]: answer },
      isGraded: false,
      gradeResult: null,
    });
  };

  const handleGrade = async () => {
    setIsGrading(true);
    const response = await gradeAnswers(questions, userAnswers);
    setIsGrading(false);

    if (response.error) {
      // Fallback to local grading if API fails
      let correct = 0;
      const weakTopicsSet = new Set<string>();
      const answers = questions.map((q) => {
        const ua = userAnswers[q.id] || '';
        const ok = ua.trim().toLowerCase() === (q.correctAnswer || '').trim().toLowerCase();
        if (ok) correct++;
        else weakTopicsSet.add(q.topic);
        return {
          questionId: q.id,
          isCorrect: ok,
          userAnswer: ua,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
        };
      });
      const percentage = Math.round((correct / questions.length) * 100);
      setWeakTopics(Array.from(weakTopicsSet));
      setQuestionsState({
        questions,
        userAnswers,
        isGraded: true,
        gradeResult: {
          score: correct,
          totalQuestions: questions.length,
          percentage,
          answers,
          weakTopics: Array.from(weakTopicsSet),
          recommendations: [],
        },
      });

      if (percentage >= 80) {
        toast.success(`Great job! You scored ${percentage}%!`);
      } else if (percentage >= 60) {
        toast.info(`You scored ${percentage}%. Keep practicing!`);
      } else {
        toast.warning(`You scored ${percentage}%. Review the weak topics and try again.`);
      }
      return;
    }

    if (response.data) {
      setWeakTopics(response.data.weakTopics);
      setQuestionsState({
        questions,
        userAnswers,
        isGraded: true,
        gradeResult: response.data,
      });
      
      const percentage = response.data.percentage;
      if (percentage >= 80) {
        toast.success(`Great job! You scored ${percentage}%!`);
      } else if (percentage >= 60) {
        toast.info(`You scored ${percentage}%. Keep practicing!`);
      } else {
        toast.warning(`You scored ${percentage}%. Review the weak topics and try again.`);
      }
    }
  };

  const handleReset = () => {
    setQuestionsState(null);
  };

  const score = gradeResult?.score ?? 0;
  const percentage = gradeResult?.percentage ?? 0;

  return (
    <div className="min-h-screen py-8">
      <div className="container px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent border border-border mb-4">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Practice Questions</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            AI-Generated <span className="gradient-text">Practice Questions</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Generate unlimited practice questions tailored to your study material and difficulty level.
          </p>
        </div>

        {!showResults ? (
          /* Settings Panel */
          <div className="glass-card rounded-xl p-6 md:p-8 space-y-8">
            {/* Number of Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Number of Questions</Label>
                <span className="text-2xl font-bold gradient-text">{questionCount}</span>
              </div>
              <Slider
                value={[questionCount]}
                onValueChange={([value]) => setQuestionCount(value)}
                min={1}
                max={50}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>1</span>
                <span>25</span>
                <span>50</span>
              </div>
            </div>

            {/* Difficulty */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Difficulty Level</Label>
              <Select value={difficulty} onValueChange={(v: typeof difficulty) => setDifficulty(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Question Types */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Question Types</Label>
              <div className="grid grid-cols-2 gap-3">
                {questionTypes.map((type) => (
                  <div
                    key={type.id}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                      selectedTypes.includes(type.id)
                        ? 'border-primary bg-accent'
                        : 'border-border hover:border-primary/50'
                    )}
                    onClick={() => toggleQuestionType(type.id)}
                  >
                    <Checkbox 
                      checked={selectedTypes.includes(type.id)}
                      onCheckedChange={() => toggleQuestionType(type.id)}
                    />
                    <span className="text-sm font-medium">{type.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleGenerate}
              variant="hero"
              size="xl"
              className="w-full gap-2"
              disabled={isGenerating || selectedTypes.length === 0}
            >
              <Sparkles className="w-5 h-5" />
              Generate Questions
            </Button>
          </div>
        ) : (
          /* Questions Display */
          <div className="space-y-6">
            {isGenerating ? (
              <LoadingCard message="Generating practice questions..." />
            ) : (
              <>
                {/* Score Card (when graded) */}
                {isGraded && (
                  <div className="glass-card rounded-xl p-6 text-center animate-scale-in">
                    <div className={cn(
                      'w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4',
                      percentage >= 80 ? 'bg-success/10' : percentage >= 60 ? 'bg-warning/10' : 'bg-destructive/10'
                    )}>
                      <Trophy className={cn(
                        'w-12 h-12',
                        percentage >= 80 ? 'text-success' : percentage >= 60 ? 'text-warning' : 'text-destructive'
                      )} />
                    </div>
                    <h3 className="text-2xl font-bold mb-1">
                      {score} / {questions.length} Correct
                    </h3>
                    <p className="text-4xl font-bold gradient-text mb-4">{percentage}%</p>
                    <Button onClick={handleReset} variant="outline" className="gap-2">
                      <RotateCcw className="w-4 h-4" />
                      Try Again
                    </Button>
                  </div>
                )}

                {/* Questions */}
                {questions.map((question, index) => (
                  <div 
                    key={question.id} 
                    className={cn(
                      'glass-card rounded-xl p-6 animate-slide-up',
                      isGraded && gradedById[question.id]?.isCorrect && 'ring-2 ring-success',
                      isGraded && gradedById[question.id] && !gradedById[question.id].isCorrect && 'ring-2 ring-destructive'
                    )}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center shrink-0 text-sm font-bold text-primary-foreground">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium',
                            question.difficulty === 'easy' && 'bg-success/10 text-success',
                            question.difficulty === 'medium' && 'bg-warning/10 text-warning',
                            question.difficulty === 'hard' && 'bg-destructive/10 text-destructive'
                          )}>
                            {question.difficulty}
                          </span>
                          <span className="text-xs text-muted-foreground">{question.topic}</span>
                          <span className="text-xs text-muted-foreground capitalize">· {question.type.replace('-', ' ')}</span>
                        </div>
                        <p className="font-medium text-foreground">{question.question}</p>
                      </div>
                    </div>

                    {question.options && question.options.length > 0 ? (
                      <RadioGroup
                        value={userAnswers[question.id] || ''}
                        onValueChange={(value) => handleAnswer(question.id, value)}
                        className="space-y-2 ml-12"
                        disabled={isGraded}
                      >
                        {question.options.map((option, i) => (
                          <div
                            key={i}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer',
                              userAnswers[question.id] === option
                                ? 'border-primary bg-accent'
                                : 'border-border hover:border-primary/50',
                              isGraded && option === question.correctAnswer && 'border-success bg-success/10',
                              isGraded && userAnswers[question.id] === option && option !== question.correctAnswer && 'border-destructive bg-destructive/10'
                            )}
                            onClick={() => !isGraded && handleAnswer(question.id, option)}
                          >
                            <RadioGroupItem value={option} id={`${question.id}-${i}`} />
                            <Label
                              htmlFor={`${question.id}-${i}`}
                              className="flex-1 cursor-pointer font-normal"
                            >
                              {option}
                            </Label>
                            {isGraded && option === question.correctAnswer && (
                              <CheckCircle2 className="w-5 h-5 text-success" />
                            )}
                            {isGraded && userAnswers[question.id] === option && option !== question.correctAnswer && (
                              <XCircle className="w-5 h-5 text-destructive" />
                            )}
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <div className="ml-12 space-y-3">
                        <Textarea
                          placeholder={question.type === 'essay'
                            ? 'Write your essay answer here. Aim for structured paragraphs with clear arguments and evidence.'
                            : 'Write your short answer here (1-3 sentences).'}
                          value={userAnswers[question.id] || ''}
                          onChange={(e) => handleAnswer(question.id, e.target.value)}
                          disabled={isGraded}
                          className={cn(
                            'resize-y',
                            question.type === 'essay' ? 'min-h-[200px]' : 'min-h-[100px]'
                          )}
                        />
                        {isGraded && gradedById[question.id] && (
                          <div className={cn(
                            'p-3 rounded-lg border text-sm',
                            gradedById[question.id].isCorrect
                              ? 'border-success/40 bg-success/5'
                              : 'border-destructive/40 bg-destructive/5'
                          )}>
                            <div className="flex items-center gap-2 mb-2 font-medium">
                              {gradedById[question.id].isCorrect ? (
                                <><CheckCircle2 className="w-4 h-4 text-success" /> <span className="text-success">Correct</span></>
                              ) : (
                                <><XCircle className="w-4 h-4 text-destructive" /> <span className="text-destructive">Needs work</span></>
                              )}
                            </div>
                            <p className="text-foreground">
                              <strong>Reference answer:</strong> {gradedById[question.id].correctAnswer || question.correctAnswer}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {isGraded && (gradedById[question.id]?.explanation || question.explanation) && (
                      <div className="mt-4 ml-12 p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">
                          <strong className="text-foreground">Explanation:</strong> {gradedById[question.id]?.explanation || question.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {/* Action Buttons */}
                {!isGraded && (
                  <div className="flex gap-4">
                    <Button
                      onClick={handleGrade}
                      variant="hero"
                      size="lg"
                      className="flex-1 gap-2"
                      disabled={
                        isGrading ||
                        questions.some((q) => !(userAnswers[q.id] && userAnswers[q.id].trim()))
                      }
                    >
                      <Target className="w-5 h-5" />
                      {isGrading ? 'Grading...' : 'Check Answers'}
                    </Button>
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      size="lg"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
