import { renderHook, waitFor } from '@testing-library/react';
import useSignedUrl from './use-signed-url';

// Mock global de fetch
global.fetch = jest.fn();

describe('useSignedUrl', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('should return null URL if filePath is null or undefined', () => {
    const { result } = renderHook(() => useSignedUrl(null));
    expect(result.current.signedUrl).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should return a signed URL on successful fetch', async () => {
    const mockUrl = 'https://fake-signed-url.com';
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ signedUrl: mockUrl }),
    });

    const { result } = renderHook(() => useSignedUrl('path/to/image.jpg'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.signedUrl).toBe(mockUrl);
    expect(result.current.error).toBeNull();
    expect(fetch).toHaveBeenCalledWith('/api/generate-signed-url?filePath=path%2Fto%2Fimage.jpg');
  });

  it('should return an error if fetch fails', async () => {
    const errorMessage = 'Failed to fetch';
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: errorMessage,
    });

    const { result } = renderHook(() => useSignedUrl('path/to/image.jpg'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.signedUrl).toBeNull();
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toContain('Failed to fetch signed URL');
  });

  it('should handle network errors', async () => {
    const networkError = new Error('Network error');
    (fetch as jest.Mock).mockRejectedValueOnce(networkError);

    const { result } = renderHook(() => useSignedUrl('path/to/image.jpg'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.signedUrl).toBeNull();
    expect(result.current.error).toBe(networkError);
  });

  it('should re-fetch when filePath changes', async () => {
    const mockUrl1 = 'https://fake-signed-url-1.com';
    const mockUrl2 = 'https://fake-signed-url-2.com';

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ signedUrl: mockUrl1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ signedUrl: mockUrl2 }),
      });

    const { result, rerender } = renderHook(
      ({ filePath }) => useSignedUrl(filePath),
      { initialProps: { filePath: 'path/one.jpg' } }
    );

    await waitFor(() => expect(result.current.signedUrl).toBe(mockUrl1));
    expect(fetch).toHaveBeenCalledTimes(1);

    rerender({ filePath: 'path/two.jpg' });

    await waitFor(() => expect(result.current.signedUrl).toBe(mockUrl2));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenLastCalledWith('/api/generate-signed-url?filePath=path%2Ftwo.jpg');
  });
});
