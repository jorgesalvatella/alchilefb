import { useState, useEffect } from 'react';

const useSignedUrl = (filePath: string | null | undefined) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!filePath) {
      setSignedUrl(null);
      return;
    }

    const fetchSignedUrl = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/generate-signed-url?filePath=${encodeURIComponent(filePath)}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch signed URL: ${response.statusText}`);
        }
        const data = await response.json();
        setSignedUrl(data.signedUrl);
      } catch (e: any) {
        setError(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignedUrl();
  }, [filePath]);

  return { signedUrl, isLoading, error };
};

export default useSignedUrl;
