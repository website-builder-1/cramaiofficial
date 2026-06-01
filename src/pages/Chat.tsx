import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MessageCircle, 
  Send, 
  Sparkles,
  Lightbulb,
  Calculator,
  HelpCircle,
  User,
  Bot,
  Loader2,
  Paperclip,
  X,
} from 'lucide-react';
import { useStudyStore } from '@/lib/store';
import { type ChatMessage, sendChatMessage, explainConcept, getHint, solveStepByStep } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RichText } from '@/components/RichText';

const quickActions = [
  { icon: Lightbulb, label: 'Explain this concept', action: 'explain' },
  { icon: HelpCircle, label: 'Get a hint', action: 'hint' },
  { icon: Calculator, label: 'Solve step-by-step', action: 'solve' },
];

const suggestedQuestions = [
  "What's the difference between mitosis and meiosis?",
  "Explain photosynthesis in simple terms",
  "How does DNA replication work?",
  "What are the stages of cellular respiration?",
];

export default function Chat() {
  const { chatHistory, addChatMessage, clearChatHistory, getStudyMaterial, subject, examLevel, examBoard } = useStudyStore();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<{ dataUrl: string; name: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const addImage = (dataUrl: string, name: string) => {
    setImages((prev) => {
      if (prev.length >= 4) {
        toast.error('You can attach up to 4 images per message.');
        return prev;
      }
      return [...prev, { dataUrl, name }];
    });
  };

  const removeImage = (idx: number) =>
    setImages((prev) => prev.filter((_, i) => i !== idx));

  const handleFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files are supported here.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB).`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => addImage(reader.result as string, file.name);
      reader.readAsDataURL(file);
    });
  };

  // Global paste handler for images
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isLoading) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (!file) continue;
          const reader = new FileReader();
          reader.onload = () => {
            addImage(reader.result as string, file.name || `pasted-${Date.now()}.png`);
            toast.success('Image pasted!');
          };
          reader.readAsDataURL(file);
          e.preventDefault();
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [isLoading]);

  const handleSend = async (content?: string, actionType?: string) => {
    const messageToSend = content || message.trim();
    if (!messageToSend && images.length === 0) return;

    // Require min length only if there's no image attached
    if (messageToSend.length < 10 && images.length === 0) {
      toast.error('Please enter a longer message (at least 10 characters)');
      return;
    }

    const attachedImages = images.map((i) => i.dataUrl);
    const displayContent = messageToSend || '[Image attached]';
    const userMessage: ChatMessage = {
      role: 'user',
      content:
        attachedImages.length > 0
          ? `${displayContent}\n\n_(${attachedImages.length} image${attachedImages.length > 1 ? 's' : ''} attached)_`
          : displayContent,
      timestamp: new Date(),
    };
    addChatMessage(userMessage);
    setMessage('');
    setImages([]);
    setIsLoading(true);

    let response;
    const material = getStudyMaterial();
    const ctxHeader = [
      subject ? `Subject: ${subject}` : '',
      examLevel ? `Exam level: ${examLevel}` : '',
      examBoard ? `Exam board: ${examBoard}` : '',
    ].filter(Boolean).join('\n');
    const context = [ctxHeader, material].filter(Boolean).join('\n\n');
    const promptText = messageToSend || 'Please read the attached image(s) and help me understand them in the context of my study material.';

    // Use the appropriate API based on action type
    if (actionType === 'explain') {
      response = await explainConcept(promptText, context, attachedImages);
    } else if (actionType === 'hint') {
      response = await getHint(promptText, context, attachedImages);
    } else if (actionType === 'solve') {
      response = await solveStepByStep(promptText, context, attachedImages);
    } else {
      response = await sendChatMessage(promptText, context, chatHistory, attachedImages);
    }

    if (response.error) {
      toast.error(response.error);
      setIsLoading(false);
      return;
    }

    if (response.data) {
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date(),
      };
      addChatMessage(assistantMessage);
    }
    
    setIsLoading(false);
  };

  const handleQuickAction = (action: string) => {
    let prompt = '';
    switch (action) {
      case 'explain':
        prompt = 'Can you explain this concept to me: ';
        break;
      case 'hint':
        prompt = "I'm stuck on this problem. Can you give me a hint? ";
        break;
      case 'solve':
        prompt = 'Can you solve this step-by-step? ';
        break;
    }
    setMessage(prompt);
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container px-4 max-w-3xl h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent border border-border mb-4">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">AI Tutor</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Your Personal <span className="gradient-text">AI Tutor</span>
          </h1>
          <p className="text-muted-foreground">
            Ask any question about your study material and get instant help.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.action}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(action.action)}
                className="gap-2"
              >
                <Icon className="w-4 h-4" />
                {action.label}
              </Button>
            );
          })}
        </div>

        {/* Chat Area */}
        <div className="flex-1 glass-card rounded-xl flex flex-col overflow-hidden">
          {/* Material context indicator */}
          {getStudyMaterial() && (
            <div className="px-4 py-2 border-b border-border bg-accent/30 text-xs text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Tutor has access to your Analyzer material{subject ? ` (${subject}${examLevel ? `, ${examLevel}` : ''}${examBoard ? `, ${examBoard}` : ''})` : ''}.
            </div>
          )}
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center mb-4 shadow-glow">
                  <Bot className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Ask me anything about your study material!
                </p>
                <div className="space-y-2 w-full max-w-md">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Try asking:</p>
                  {suggestedQuestions.map((question, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(question)}
                      className="w-full text-left p-3 rounded-lg bg-accent hover:bg-accent/80 transition-colors text-sm"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {chatHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex gap-3 animate-slide-up',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[80%] rounded-2xl px-4 py-3',
                        msg.role === 'user'
                          ? 'gradient-bg text-primary-foreground rounded-br-md'
                          : 'bg-muted rounded-bl-md'
                      )}
                    >
                      {msg.role === 'assistant' ? (
                        <RichText html={msg.content} className="text-sm" />
                      ) : (
                        <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-accent-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            {images.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted">
                    <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      disabled={isLoading}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                      aria-label="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={isLoading}
                onClick={() => fileInputRef.current?.click()}
                title="Attach image (or paste with ⌘/Ctrl+V)"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask your AI tutor anything... (paste images with ⌘/Ctrl+V)"
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                variant="hero"
                size="icon"
                disabled={(!message.trim() && images.length === 0) || isLoading}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
            {chatHistory.length > 0 && (
              <button
                onClick={clearChatHistory}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear conversation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
