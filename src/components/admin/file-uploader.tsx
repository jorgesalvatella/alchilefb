'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useFirebaseApp } from '@/firebase/provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { X, CheckCircle, UploadCloud, File as FileIcon, Download } from 'lucide-react';
import Link from 'next/link';

interface FileUploaderProps {
  onUploadComplete: (url: string) => void;
  initialFileUrl?: string;
  uploadPath?: string;
  allowedTypes?: string[];
}

export function FileUploader({ 
    onUploadComplete, 
    initialFileUrl, 
    uploadPath = 'general_uploads',
    allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif']
}: FileUploaderProps) {
  const app = useFirebaseApp();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(initialFileUrl || null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        if (!allowedTypes.includes(selectedFile.type)) {
            setError(`Tipo de archivo no permitido. Solo se aceptan: ${allowedTypes.join(', ')}`);
            return;
        }
      setFile(selectedFile);
      setUploadedUrl(null);
      setError(null);
    }
  };

  const handleUpload = () => {
    if (!file) {
      setError('Por favor, selecciona un archivo primero.');
      return;
    }
    if (!app) {
      setError('La conexión con Firebase no está disponible.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    const storage = getStorage(app);
    const storageRef = ref(storage, `${uploadPath}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (uploadError) => {
        console.error('Error al subir:', uploadError);
        setError('Error al subir el archivo. Por favor, inténtalo de nuevo.');
        setIsUploading(false);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          setUploadedUrl(downloadURL);
          onUploadComplete(downloadURL);
          setIsUploading(false);
          setFile(null);
        });
      }
    );
  };
  
   const removeFile = () => {
    setUploadedUrl(null);
    setFile(null);
    onUploadComplete('');
  };

  return (
    <div className="space-y-4">
      {uploadedUrl ? (
        <div className="flex items-center justify-between rounded-md border p-2">
            <div className="flex items-center gap-2">
                <FileIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium truncate max-w-xs">Archivo cargado</span>
            </div>
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <Link href={uploadedUrl} target="_blank"><Download className="h-4 w-4" /></Link>
                </Button>
                <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={removeFile}
                >
                <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="grid w-full items-center gap-1.5">
            <Input id="file-upload" type="file" onChange={handleFileChange} accept={allowedTypes.join(',')} className="text-sm"/>
          </div>
          <Button onClick={handleUpload} disabled={isUploading || !file} size="sm" className="self-end">
             <UploadCloud className="mr-2 h-4 w-4" />
            {isUploading ? 'Subiendo...' : 'Subir'}
          </Button>
        </div>
      )}

      {isUploading && <Progress value={uploadProgress} />}
      
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
