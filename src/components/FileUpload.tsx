import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import mammoth from 'mammoth/mammoth.browser';

interface FileUploadProps {
  onFileContent: (content: string, fileName: string) => void;
  onImageContent?: (dataUrl: string, fileName: string) => void;
  isLoading?: boolean;
  acceptedTypes?: string[];
  maxSize?: number;
  acceptImages?: boolean;
}

export function FileUpload({
  onFileContent,
  onImageContent,
  isLoading = false,
  acceptedTypes = ['.pdf', '.docx', '.txt'],
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptImages = false,
}: FileUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const readFileContent = async (file: File): Promise<string> => {
    const name = file.name.toLowerCase();
    const isDocx =
      name.endsWith('.docx') ||
      file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (isDocx) {
      const arrayBuffer = await file.arrayBuffer();
      setUploadProgress(50);
      const result = await mammoth.extractRawText({ arrayBuffer });
      setUploadProgress(100);
      const text = (result.value || '').trim();
      if (!text) {
        throw new Error('Could not extract any text from this Word document.');
      }
      return text;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      reader.onload = () => {
        const content = reader.result as string;
        resolve(content);
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
    });
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (file.size > maxSize) {
        toast.error(`File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`);
        return;
      }

      setUploadProgress(0);

      try {
        if (acceptImages && file.type.startsWith('image/')) {
          const dataUrl = await readFileAsDataURL(file);
          onImageContent?.(dataUrl, file.name);
          toast.success(`${file.name} added!`);
          // Don't store as uploadedFile so the user can keep adding images/text
        } else {
          setUploadedFile(file);
          const content = await readFileContent(file);
          onFileContent(content, file.name);
          toast.success(`${file.name} uploaded successfully!`);
        }
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : 'Failed to read file. Please try again.';
        toast.error(msg);
        setUploadedFile(null);
      }
    },
    [maxSize, onFileContent, onImageContent, acceptImages]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      ...(acceptImages
        ? {
            'image/png': ['.png'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/webp': ['.webp'],
            'image/gif': ['.gif'],
          }
        : {}),
    },
    maxFiles: 1,
    disabled: isLoading,
  });

  const removeFile = () => {
    setUploadedFile(null);
    setUploadProgress(0);
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer',
          isDragActive
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-border hover:border-primary/50 hover:bg-accent/50',
          isLoading && 'opacity-50 pointer-events-none',
          uploadedFile && 'border-success bg-success/5'
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-4">
          {isLoading ? (
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          ) : uploadedFile ? (
            <FileText className="w-12 h-12 text-success" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
          )}

          {uploadedFile ? (
            <div className="space-y-2">
              <p className="font-semibold text-foreground">{uploadedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(uploadedFile.size / 1024).toFixed(1)} KB
              </p>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full gradient-bg transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <>
              <div>
                <p className="font-semibold text-foreground">
                  {isDragActive ? 'Drop your file here' : 'Drag & drop your study material'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse{acceptImages ? ' — you can also paste images (⌘/Ctrl+V)' : ''}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Supports: PDF, DOCX, TXT{acceptImages ? ', PNG, JPG, WEBP' : ''} (Max {maxSize / (1024 * 1024)}MB)
              </p>
            </>
          )}
        </div>
      </div>

      {uploadedFile && (
        <Button
          variant="outline"
          size="sm"
          onClick={removeFile}
          className="gap-2"
          disabled={isLoading}
        >
          <X className="w-4 h-4" />
          Remove file
        </Button>
      )}
    </div>
  );
}
