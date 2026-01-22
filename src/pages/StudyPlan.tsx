import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingCard } from '@/components/LoadingSpinner';
import { 
  Calendar, 
  Clock, 
  Coffee,
  BookOpen,
  Sparkles,
  FileText,
  ChevronRight,
  CheckCircle2,
  Zap
} from 'lucide-react';
import { useStudyStore } from '@/lib/store';
import { type StudyPlan, type LastMinuteReview } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function StudyPlanPage() {
  const { studyPlan, setStudyPlan, toggleHourComplete, documentContent } = useStudyStore();
  
  const [hoursUntilExam, setHoursUntilExam] = useState(8);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);
  const [lastMinuteReview, setLastMinuteReview] = useState<LastMinuteReview | null>(null);
  const [localPlan, setLocalPlan] = useState<StudyPlan | null>(studyPlan);

  const handleGeneratePlan = async () => {
    setIsGenerating(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock study plan
    const mockPlan: StudyPlan = {
      id: '1',
      hoursUntilExam,
      schedule: [
        { hour: 1, topic: 'Cell Structure and Function', activity: 'Review notes and key definitions', isBreak: false, completed: false },
        { hour: 2, topic: 'Cell Structure and Function', activity: 'Practice questions on cell organelles', isBreak: false, completed: false },
        { hour: 3, topic: 'Break', activity: 'Take a 15-minute break. Stretch and hydrate!', isBreak: true, completed: false },
        { hour: 4, topic: 'Photosynthesis', activity: 'Study the photosynthesis equation and light reactions', isBreak: false, completed: false },
        { hour: 5, topic: 'Photosynthesis', activity: 'Practice drawing the process and answering questions', isBreak: false, completed: false },
        { hour: 6, topic: 'Break', activity: 'Lunch break. Eat something nutritious!', isBreak: true, completed: false },
        { hour: 7, topic: 'DNA & Genetics', activity: 'Review DNA structure, replication, and transcription', isBreak: false, completed: false },
        { hour: 8, topic: 'Final Review', activity: 'Quick review of all topics, focus on weak areas', isBreak: false, completed: false },
      ].slice(0, hoursUntilExam),
      tips: [
        'Use active recall instead of passive reading',
        'Take short breaks every 25-30 minutes',
        'Stay hydrated and avoid heavy meals',
        'Get at least 6-7 hours of sleep before the exam'
      ]
    };

    setLocalPlan(mockPlan);
    setStudyPlan(mockPlan);
    setIsGenerating(false);
    toast.success('Study plan generated!');
  };

  const handleToggleComplete = (hour: number) => {
    if (localPlan) {
      const updatedPlan = {
        ...localPlan,
        schedule: localPlan.schedule.map(item =>
          item.hour === hour ? { ...item, completed: !item.completed } : item
        )
      };
      setLocalPlan(updatedPlan);
    }
    toggleHourComplete(hour);
  };

  const handleGenerateReview = async () => {
    setIsGeneratingReview(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockReview: LastMinuteReview = {
      keyPoints: [
        'Mitochondria produces ATP through cellular respiration',
        'Chloroplasts are the site of photosynthesis in plant cells',
        'DNA replication is semi-conservative',
        'Meiosis produces 4 haploid cells, mitosis produces 2 diploid cells'
      ],
      mustKnow: [
        'Cell membrane structure (phospholipid bilayer)',
        'Stages of mitosis: Prophase → Metaphase → Anaphase → Telophase',
        'Photosynthesis equation: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂',
        'Difference between DNA and RNA'
      ],
      quickFormulas: [
        'ATP → ADP + P + Energy',
        '6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂',
        'DNA: A-T, G-C base pairing'
      ],
      commonMistakes: [
        'Confusing mitochondria with chloroplasts',
        'Mixing up mitosis and meiosis',
        'Forgetting that DNA replication happens in S phase'
      ],
      confidenceBooster: "You've studied hard and you know this material. Trust your preparation, read each question carefully, and you've got this! 💪"
    };

    setLastMinuteReview(mockReview);
    setIsGeneratingReview(false);
    toast.success('Last-minute review generated!');
  };

  const completedCount = localPlan?.schedule.filter(s => s.completed).length || 0;
  const totalCount = localPlan?.schedule.length || 0;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen py-8">
      <div className="container px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent border border-border mb-4">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Smart Study Plan</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Your Personalized <span className="gradient-text">Study Schedule</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Get an hour-by-hour study plan optimized for your exam date and learning goals.
          </p>
        </div>

        {!localPlan ? (
          /* Generate Plan Form */
          <div className="glass-card rounded-xl p-6 md:p-8 space-y-6">
            <div className="space-y-4">
              <label className="text-base font-semibold">Hours Until Your Exam</label>
              <div className="flex items-center gap-4">
                <Clock className="w-6 h-6 text-primary" />
                <Input
                  type="number"
                  value={hoursUntilExam}
                  onChange={(e) => setHoursUntilExam(Math.max(1, Math.min(24, parseInt(e.target.value) || 1)))}
                  min={1}
                  max={24}
                  className="w-24 text-center text-xl font-bold"
                />
                <span className="text-muted-foreground">hours</span>
              </div>
              <p className="text-sm text-muted-foreground">
                We'll create a detailed schedule to maximize your study efficiency.
              </p>
            </div>

            <Button
              onClick={handleGeneratePlan}
              variant="hero"
              size="xl"
              className="w-full gap-2"
              disabled={isGenerating}
            >
              <Sparkles className="w-5 h-5" />
              {isGenerating ? 'Generating...' : 'Generate Study Plan'}
            </Button>
          </div>
        ) : (
          /* Study Plan Display */
          <div className="space-y-6">
            {isGenerating ? (
              <LoadingCard message="Creating your personalized study plan..." />
            ) : (
              <>
                {/* Progress Card */}
                <div className="glass-card rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Your Progress</h3>
                      <p className="text-sm text-muted-foreground">
                        {completedCount} of {totalCount} hours completed
                      </p>
                    </div>
                    <div className="text-3xl font-bold gradient-text">{progressPercentage}%</div>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full gradient-bg transition-all duration-500 rounded-full"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-3">
                  {localPlan.schedule.map((item, index) => (
                    <div
                      key={index}
                      className={cn(
                        'glass-card rounded-xl p-4 flex items-start gap-4 transition-all cursor-pointer animate-slide-up',
                        item.completed && 'opacity-60',
                        item.isBreak && 'bg-accent/50'
                      )}
                      style={{ animationDelay: `${index * 0.05}s` }}
                      onClick={() => handleToggleComplete(item.hour)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={item.completed} 
                          onCheckedChange={() => handleToggleComplete(item.hour)}
                        />
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                          item.isBreak ? 'bg-warning/10' : 'gradient-bg'
                        )}>
                          {item.isBreak ? (
                            <Coffee className="w-5 h-5 text-warning" />
                          ) : (
                            <span className="text-sm font-bold text-primary-foreground">{item.hour}h</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={cn(
                            'font-semibold',
                            item.completed && 'line-through'
                          )}>
                            {item.topic}
                          </h4>
                          {item.completed && (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{item.activity}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </div>
                  ))}
                </div>

                {/* Tips */}
                <div className="glass-card rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-warning" />
                    Study Tips
                  </h3>
                  <div className="space-y-2">
                    {localPlan.tips.map((tip, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Last Minute Review */}
                <Button
                  onClick={handleGenerateReview}
                  variant="outline"
                  size="lg"
                  className="w-full gap-2"
                  disabled={isGeneratingReview}
                >
                  <FileText className="w-5 h-5" />
                  {isGeneratingReview ? 'Generating...' : 'Generate Last-Minute Review Sheet'}
                </Button>

                {lastMinuteReview && (
                  <div className="glass-card rounded-xl p-6 space-y-6 animate-slide-up">
                    <h3 className="text-xl font-bold gradient-text text-center">📝 Last-Minute Review Sheet</h3>
                    
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Key Points
                      </h4>
                      <ul className="space-y-1">
                        {lastMinuteReview.keyPoints.map((point, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-success" />
                        Must Know
                      </h4>
                      <ul className="space-y-1">
                        {lastMinuteReview.mustKnow.map((item, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Quick Formulas</h4>
                      <div className="space-y-2">
                        {lastMinuteReview.quickFormulas.map((formula, i) => (
                          <div key={i} className="p-2 bg-muted rounded-lg font-mono text-sm">
                            {formula}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl gradient-bg text-primary-foreground text-center">
                      <p className="font-medium">{lastMinuteReview.confidenceBooster}</p>
                    </div>
                  </div>
                )}

                {/* Reset Button */}
                <Button
                  onClick={() => {
                    setLocalPlan(null);
                    setStudyPlan(null);
                    setLastMinuteReview(null);
                  }}
                  variant="ghost"
                  size="sm"
                  className="w-full"
                >
                  Create New Plan
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
