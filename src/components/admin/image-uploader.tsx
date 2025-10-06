'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useFirebaseApp } from '@/firebase/provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { X, CheckCircle, UploadCloud } from 'lucide-react';
import Image from 'next/image';

interface ImageUploaderProps {
  onUploadComplete: (url: string) => void;
  initialImageUrl?: string;
}

export function ImageUploader({ onUploadComplete, initialImageUrl }: ImageUploaderProps) {
  const app = useFirebaseApp();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(initialImageUrl || null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadedUrl(null); // Clear previous image
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
    const storageRef = ref(storage, `menu_items/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (uploadError) => {
        console.error('Error al subir:', uploadError);
        setError('Error al subir la imagen. Por favor, inténtalo de nuevo.');
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
  
   const removeImage = () => {
    setUploadedUrl(null);
    setFile(null);
    onUploadComplete('');
  };

  return (
    <div className="space-y-4">
      {uploadedUrl ? (
        <div className="relative group w-full h-32">
          <Image src={uploadedUrl} alt="Imagen subida" layout="fill" className="object-contain rounded-md border" />
           <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={removeImage}
            >
              <X className="h-4 w-4" />
            </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="picture">Imagen del Producto</Label>
            <Input id="picture" type="file" onChange={handleFileChange} accept="image/*" className="text-sm"/>
          </div>
          <Button onClick={handleUpload} disabled={isUploading || !file} size="sm" className="self-end">
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
