import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
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
import { type Question } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const questionTypes = [
  { id: 'multiple-choice', label: 'Multiple Choice' },
  { id: 'true-false', label: 'True/False' },
  { id: 'short-answer', label: 'Short Answer' },
  { id: 'essay', label: 'Essay' },
];

export default function Questions() {
  const { documentContent, questions, setQuestions, setWeakTopics } = useStudyStore();
  
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['multiple-choice', 'true-false']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isGraded, setIsGraded] = useState(false);

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

    setIsGenerating(true);
    setShowResults(false);
    setUserAnswers({});
    setIsGraded(false);
    setCurrentQuestion(0);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Mock questions for demo
    const mockQuestions: Question[] = [
      {
        id: '1',
        type: 'multiple-choice',
        question: 'What is the primary function of mitochondria in a cell?',
        options: ['Protein synthesis', 'ATP production', 'DNA replication', 'Cell division'],
        correctAnswer: 'ATP production',
        explanation: 'Mitochondria are known as the powerhouse of the cell because they produce ATP through cellular respiration.',
        difficulty: 'easy',
        topic: 'Cell Biology'
      },
      {
        id: '2',
        type: 'true-false',
        question: 'Photosynthesis occurs in the mitochondria of plant cells.',
        options: ['True', 'False'],
        correctAnswer: 'False',
        explanation: 'Photosynthesis occurs in the chloroplasts, not mitochondria. Mitochondria are responsible for cellular respiration.',
        difficulty: 'easy',
        topic: 'Plant Biology'
      },
      {
        id: '3',
        type: 'multiple-choice',
        question: 'Which of the following is NOT a product of photosynthesis?',
        options: ['Oxygen', 'Glucose', 'Carbon dioxide', 'Water'],
        correctAnswer: 'Carbon dioxide',
        explanation: 'Carbon dioxide is a reactant in photosynthesis, not a product. The products are glucose and oxygen.',
        difficulty: 'medium',
        topic: 'Photosynthesis'
      },
      {
        id: '4',
        type: 'multiple-choice',
        question: 'During which phase of mitosis do chromosomes line up at the cell\'s equator?',
        options: ['Prophase', 'Metaphase', 'Anaphase', 'Telophase'],
        correctAnswer: 'Metaphase',
        explanation: 'During metaphase, chromosomes align at the metaphase plate (cell\'s equator) before being separated.',
        difficulty: 'medium',
        topic: 'Cell Division'
      },
      {
        id: '5',
        type: 'true-false',
        question: 'DNA replication is a semi-conservative process.',
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'DNA replication is semi-conservative because each new DNA molecule contains one original strand and one newly synthesized strand.',
        difficulty: 'medium',
        topic: 'DNA Replication'
      },
    ];

    setQuestions(mockQuestions.slice(0, questionCount > 5 ? 5 : questionCount));
    setShowResults(true);
    setIsGenerating(false);
    toast.success(`Generated ${mockQuestions.length} practice questions!`);
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleGrade = () => {
    let correct = 0;
    const weakTopicsSet = new Set<string>();

    questions.forEach(q => {
      if (userAnswers[q.id] === q.correctAnswer) {
        correct++;
      } else {
        weakTopicsSet.add(q.topic);
      }
    });

    setWeakTopics(Array.from(weakTopicsSet));
    setIsGraded(true);
    
    const percentage = Math.round((correct / questions.length) * 100);
    if (percentage >= 80) {
      toast.success(`Great job! You scored ${percentage}%!`);
    } else if (percentage >= 60) {
      toast.info(`You scored ${percentage}%. Keep practicing!`);
    } else {
      toast.warning(`You scored ${percentage}%. Review the weak topics and try again.`);
    }
  };

  const handleReset = () => {
    setShowResults(false);
    setUserAnswers({});
    setIsGraded(false);
    setCurrentQuestion(0);
    setQuestions([]);
  };

  const score = isGraded 
    ? questions.filter(q => userAnswers[q.id] === q.correctAnswer).length 
    : 0;
  const percentage = isGraded ? Math.round((score / questions.length) * 100) : 0;

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
                      isGraded && userAnswers[question.id] === question.correctAnswer && 'ring-2 ring-success',
                      isGraded && userAnswers[question.id] !== question.correctAnswer && 'ring-2 ring-destructive'
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
                        </div>
                        <p className="font-medium text-foreground">{question.question}</p>
                      </div>
                    </div>

                    <RadioGroup
                      value={userAnswers[question.id] || ''}
                      onValueChange={(value) => handleAnswer(question.id, value)}
                      className="space-y-2 ml-12"
                      disabled={isGraded}
                    >
                      {question.options?.map((option, i) => (
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

                    {isGraded && question.explanation && (
                      <div className="mt-4 ml-12 p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">
                          <strong className="text-foreground">Explanation:</strong> {question.explanation}
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
                      disabled={Object.keys(userAnswers).length !== questions.length}
                    >
                      <Target className="w-5 h-5" />
                      Check Answers
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
