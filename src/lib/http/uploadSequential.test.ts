import { describe, it, expect, vi } from 'vitest';
import { uploadFilesSequential } from './uploadSequential';

function file(name: string): File {
  return new File(['x'], name, { type: 'image/png' });
}

describe('uploadFilesSequential', () => {
  it('commits every item in order on the happy path', async () => {
    const committed: string[] = [];
    const upload = vi.fn(async (f: File) => `url:${f.name}`);

    await uploadFilesSequential([file('a'), file('b'), file('c')], {
      upload,
      onItem: (item) => committed.push(item),
    });

    expect(committed).toEqual(['url:a', 'url:b', 'url:c']);
    expect(upload).toHaveBeenCalledTimes(3);
  });

  it('keeps already-uploaded items committed when a later file fails (UP-01)', async () => {
    const committed: string[] = [];
    // Third file throws — the first two must already be committed so they stay
    // visible in state and remain cleanable (no stranded Cloudinary orphans).
    const upload = vi.fn(async (f: File) => {
      if (f.name === 'c') throw new Error('boom');
      return `url:${f.name}`;
    });

    await expect(
      uploadFilesSequential([file('a'), file('b'), file('c'), file('d')], {
        upload,
        onItem: (item) => committed.push(item),
      }),
    ).rejects.toThrow('boom');

    expect(committed).toEqual(['url:a', 'url:b']);
    // Stops at the failure — the file after it is never attempted.
    expect(upload).toHaveBeenCalledTimes(3);
  });

  it('reports aggregate progress across the batch (0–100)', async () => {
    const percents: number[] = [];
    const upload = async (_f: File, _i: number, onProgress: (p: number) => void) => {
      onProgress(0);
      onProgress(100);
      return 'ok';
    };

    await uploadFilesSequential([file('a'), file('b')], {
      upload,
      onItem: () => {},
      onProgress: (p) => percents.push(p),
    });

    // Two files: first spans 0→50, second spans 50→100.
    expect(percents).toEqual([0, 50, 50, 100]);
  });

  it('does nothing for an empty file list', async () => {
    const upload = vi.fn();
    const onItem = vi.fn();

    await uploadFilesSequential([], { upload, onItem });

    expect(upload).not.toHaveBeenCalled();
    expect(onItem).not.toHaveBeenCalled();
  });
});
