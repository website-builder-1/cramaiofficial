import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { FileUpload } from '@/components/FileUpload';
import { LoadingCard } from '@/components/LoadingSpinner';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  BookOpen, 
  Clock, 
  Lightbulb,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  X,
  ImageIcon,
} from 'lucide-react';
import { useStudyStore } from '@/lib/store';
import { analyzeDocument, type AnalysisResult } from '@/lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const subjects = [
  // Sciences
  'Biology', 'Chemistry', 'Physics', 'Combined Science', 'Environmental Science', 'Astronomy', 'Geology',
  // Maths
  'Mathematics', 'Further Mathematics', 'Statistics', 'Core Maths', 'Mechanics',
  // Computing & Tech
  'Computer Science', 'ICT', 'Design & Technology', 'Engineering', 'Electronics',
  // Humanities & Social Sciences
  'History', 'Geography', 'Religious Studies', 'Philosophy', 'Politics', 'Government & Politics',
  'Sociology', 'Psychology', 'Economics', 'Business Studies', 'Accounting', 'Law', 'Criminology',
  'Citizenship Studies', 'Classical Civilisation', 'Ancient History', 'Archaeology',
  // English & Literature
  'English Language', 'English Literature', 'English Language & Literature', 'Media Studies',
  'Film Studies', 'Drama & Theatre', 'Performing Arts',
  // Modern & Classical Languages
  'French', 'Spanish', 'German', 'Italian', 'Mandarin Chinese', 'Japanese', 'Russian', 'Arabic',
  'Polish', 'Portuguese', 'Urdu', 'Latin', 'Ancient Greek', 'Biblical Hebrew',
  // Arts & Creative
  'Art & Design', 'Fine Art', 'Photography', 'Graphic Design', 'Textiles', 'Music', 'Music Technology', 'Dance',
  // PE / Health / Food
  'Physical Education', 'Sport Science', 'Health & Social Care', 'Food Preparation & Nutrition', 'Hospitality',
  // BTEC / Vocational common
  'Travel & Tourism', 'Applied Science', 'Construction', 'Childcare',
  'Other',
];

const examLevels = [
  'GCSE',
  'IGCSE',
  'A-Level',
  'AS-Level',
  'IB (International Baccalaureate)',
  'BTEC',
  'SAT',
  'AP (Advanced Placement)',
  'University',
  'Other',
];

// Common exam boards / syllabi grouped by region
const examBoards = [
  'AQA',
  'OCR',
  'Edexcel (Pearson)',
  'WJEC / Eduqas',
  'CCEA',
  'Cambridge (CIE)',
  'Oxford AQA International',
  'IB',
  'College Board (SAT/AP)',
  'Other',
];

export default function Analyzer() {
  const navigate = useNavigate();
  const { 
    documentContent, 
    setDocumentContent, 
    subject, 
    setSubject,
    examLevel,
    setExamLevel,
    examBoard,
    setExamBoard,
    setAnalysisResult,
    analysisResult
  } = useStudyStore();
  
  const [textInput, setTextInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [localResult, setLocalResult] = useState<AnalysisResult | null>(analysisResult);
  const [images, setImages] = useState<{ dataUrl: string; name: string }[]>([]);
  const [customSubject, setCustomSubject] = useState('');
  const isOtherSubject = subjects.includes(subject) ? subject === 'Other' : !!subject;

  // If a persisted custom subject is loaded, surface it in the input.
  useEffect(() => {
    if (subject && !subjects.includes(subject)) {
      setCustomSubject(subject);
    }
  }, []);

  const handleSubjectChange = (value: string) => {
    if (value === 'Other') {
      setSubject(customSubject.trim() ? customSubject.trim() : 'Other');
    } else {
      setSubject(value);
      setCustomSubject('');
    }
  };

  const handleCustomSubjectChange = (value: string) => {
    setCustomSubject(value);
    setSubject(value.trim() || 'Other');
  };

  const addImage = (dataUrl: string, name: string) => {
    setImages((prev) => {
      if (prev.length >= 6) {
        toast.error('You can attach up to 6 images.');
        return prev;
      }
      return [...prev, { dataUrl, name }];
    });
  };

  const removeImage = (idx: number) =>
    setImages((prev) => prev.filter((_, i) => i !== idx));

  // Global paste handler for images
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isAnalyzing) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (!file) continue;
          const reader = new FileReader();
          reader.onload = () => {
            const url = reader.result as string;
            addImage(url, file.name || `pasted-${Date.now()}.png`);
            toast.success('Image pasted!');
          };
          reader.readAsDataURL(file);
          e.preventDefault();
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [isAnalyzing]);

  const handleFileContent = (content: string) => {
    setDocumentContent(content);
    setTextInput('');
  };

  const handleTextPaste = (value: string) => {
    setTextInput(value);
    setDocumentContent(value);
  };

  const handleAnalyze = async () => {
    const content = documentContent || textInput;
    
    if (!content.trim() && images.length === 0) {
      toast.error('Please upload a file, paste text, or add an image');
      return;
    }

    if (!subject) {
      toast.error('Please select a subject');
      return;
    }

    setIsAnalyzing(true);
    setDocumentContent(content);

    const response = await analyzeDocument(
      content,
      subject,
      examLevel,
      examBoard,
      images.map((i) => i.dataUrl),
    );
    
    if (response.error) {
      toast.error(response.error);
      setIsAnalyzing(false);
      return;
    }

    if (response.data) {
      setLocalResult(response.data);
      setAnalysisResult(response.data);
      toast.success('Analysis complete!');
    }
    
    setIsAnalyzing(false);
  };

  const handleGenerateStudyPlan = () => {
    navigate('/study-plan');
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent border border-border mb-4">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Document Analyzer</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Analyze Your <span className="gradient-text">Study Material</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Upload your notes, textbook chapters, or paste text. Our AI will extract key concepts, 
            definitions, and create a personalized study roadmap.
          </p>
        </div>

        {/* Upload Section */}
        <div className="glass-card rounded-xl p-6 md:p-8 mb-8">
          <div className="space-y-6">
            <FileUpload 
              onFileContent={handleFileContent}
              onImageContent={addImage}
              acceptImages
              isLoading={isAnalyzing}
            />

            {images.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Attached images ({images.length}/6)
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {images.map((img, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-border bg-muted aspect-square">
                      <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        disabled={isAnalyzing}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                        aria-label="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-4 text-sm text-muted-foreground">or paste text</span>
              </div>
            </div>

            <Textarea
              placeholder="Paste your study material here... (you can also paste images with ⌘/Ctrl+V)"
              value={textInput}
              onChange={(e) => handleTextPaste(e.target.value)}
              className="min-h-[150px] resize-none"
              disabled={isAnalyzing}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Subject</label>
                <Select
                  value={subjects.includes(subject) ? subject : (subject ? 'Other' : '')}
                  onValueChange={handleSubjectChange}
                  disabled={isAnalyzing}
                >
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isOtherSubject && (
                  <Input
                    placeholder="Type your subject (e.g. Marine Biology)"
                    value={customSubject}
                    onChange={(e) => handleCustomSubjectChange(e.target.value)}
                    disabled={isAnalyzing}
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Exam level</label>
                <Select value={examLevel} onValueChange={setExamLevel} disabled={isAnalyzing}>
                  <SelectTrigger><SelectValue placeholder="e.g. GCSE, A-Level" /></SelectTrigger>
                  <SelectContent>
                    {examLevels.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Exam board / syllabus</label>
                <Select value={examBoard} onValueChange={setExamBoard} disabled={isAnalyzing}>
                  <SelectTrigger><SelectValue placeholder="e.g. AQA, OCR, Edexcel" /></SelectTrigger>
                  <SelectContent>
                    {examBoards.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || (!documentContent && !textInput && images.length === 0) || !subject}
              className="w-full gap-2"
              variant="hero"
              size="lg"
            >
              {isAnalyzing ? (
                <>Analyzing...</>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze Material
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isAnalyzing && (
          <LoadingCard message="Analyzing your study material..." />
        )}

        {/* Results */}
        {localResult && !isAnalyzing && (
          <div className="space-y-6 animate-slide-up">
            {/* Summary Card */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center shrink-0">
                  <Lightbulb className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Analysis Summary</h3>
                  <p className="text-muted-foreground">{localResult.summary}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">
                  Estimated study time: <strong className="text-foreground">{localResult.estimatedStudyTime} hours</strong>
                </span>
              </div>
            </div>

            {/* Key Topics */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Key Topics ({localResult.keyTopics.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {localResult.keyTopics.map((topic, i) => (
                  <span 
                    key={i}
                    className="px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-medium"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            {/* Definitions */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">
                Important Definitions ({localResult.definitions.length})
              </h3>
              <div className="space-y-4">
                {localResult.definitions.map((def, i) => (
                  <div key={i} className="border-l-2 border-primary pl-4">
                    <p className="font-semibold text-foreground">{def.term}</p>
                    <p className="text-sm text-muted-foreground">{def.definition}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Concepts */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Key Concepts</h3>
              <div className="space-y-2">
                {localResult.concepts.map((concept, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{concept}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Formulas */}
            {localResult.formulas.length > 0 && (
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Formulas & Equations</h3>
                <div className="space-y-2">
                  {localResult.formulas.map((formula, i) => (
                    <div key={i} className="p-3 bg-muted rounded-lg font-mono text-sm">
                      {formula}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={handleGenerateStudyPlan}
                variant="hero"
                size="lg"
                className="gap-2 flex-1"
              >
                Generate Study Plan
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button 
                onClick={() => navigate('/questions')}
                variant="outline"
                size="lg"
                className="gap-2 flex-1"
              >
                <BookOpen className="w-4 h-4" />
                Practice Questions
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
