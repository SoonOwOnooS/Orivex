import { localize as t } from './messages';
// A sampled frame stays in browser memory as a JPEG data URL.
export type Frame = { time: number; image: string };
export type VideoSample = { frames: Frame[]; duration: number; hash: string; discarded: number };
// Compare vector direction. A larger score means closer model features.
export function cosine(firstVector: number[], secondVector: number[]) {
  if (firstVector.length !== secondVector.length || !firstVector.length) {
    throw Error(t('模型向量格式不一致。'));
  }
  let dotProduct = 0;
  let firstLengthSquared = 0;
  let secondLengthSquared = 0;
  for (let featureIndex = 0; featureIndex < firstVector.length; featureIndex++) {
    dotProduct += firstVector[featureIndex] * secondVector[featureIndex];
    firstLengthSquared += firstVector[featureIndex] * firstVector[featureIndex];
    secondLengthSquared += secondVector[featureIndex] * secondVector[featureIndex];
  }
  if (!firstLengthSquared || !secondLengthSquared) {
    throw Error(t('模型返回了空向量。'));
  }
  return Math.max(
    -1,
    Math.min(1, dotProduct / Math.sqrt(firstLengthSquared * secondLengthSquared)),
  );
}

// Wait for a video event and remove listeners on success, error, or timeout.
function waitForVideoEvent(video: HTMLVideoElement, eventName: string, action: () => void) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => finish(Error(t('视频解码超时，请使用浏览器支持的 MP4 或 WebM 文件。'))),
      15000,
    );
    function finish(error?: Error) {
      clearTimeout(timer);
      video.removeEventListener(eventName, ok);
      video.removeEventListener('error', bad);
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    }
    function ok() {
      finish();
    }
    function bad() {
      finish(Error(t('浏览器无法解码这段视频，请转换为 MP4 或 WebM。')));
    }
    video.addEventListener(eventName, ok, { once: true });
    video.addEventListener('error', bad, { once: true });
    action();
  });
}

// Read a local file, calculate its fingerprint, and take evenly spaced frames.
export async function sampleVideo(
  file: File,
  sampleCount: number,
  onProgress: (message: string) => void,
): Promise<VideoSample> {
  if (file.size > 100 * 1024 * 1024) {
    throw Error(t('每段视频上限 100 MB。'));
  }
  if (!file.type.startsWith('video/')) {
    throw Error(t('请选择视频文件。'));
  }
  const videoUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.preload = 'auto';
  try {
    await waitForVideoEvent(video, 'loadedmetadata', () => {
      video.src = videoUrl;
      video.load();
    });
    let duration = video.duration;
    if (!Number.isFinite(duration)) {
      await waitForVideoEvent(video, 'durationchange', () => {
        video.currentTime = 1e10;
      });
      duration = video.duration;
    }
    if (!Number.isFinite(duration) || duration <= 0 || duration > 600) {
      throw Error(t('每段视频最长 10 分钟，且必须具有可读取的时长。'));
    }
    onProgress(t('计算视频文件指纹…'));
    // The hash identifies the file bytes; it does not prove who created the video.
    const hash = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())),
    )
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    // Resize frames to keep browser memory and model input size manageable.
    const canvas = document.createElement('canvas');
    canvas.width = 448;
    canvas.height = Math.max(1, Math.round((448 * video.videoHeight) / video.videoWidth));
    if (canvas.height > 800) {
      canvas.width = Math.round((canvas.width * 800) / canvas.height);
      canvas.height = 800;
    }
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw Error(t('浏览器不支持画面抽取。'));
    }
    const frames: Frame[] = [];
    let discarded = 0;
    for (let frameIndex = 0; frameIndex < sampleCount; frameIndex++) {
      // Sample near the middle of each interval, rather than at the start or end.
      const time = ((frameIndex + 0.5) * duration) / sampleCount;
      onProgress(t('抽取 {0}：{1} / {2} 帧', file.name, frameIndex + 1, sampleCount));
      await waitForVideoEvent(video, 'seeked', () => {
        video.currentTime = time;
      });
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let sum = 0;
      let sumOfSquares = 0;
      let pixelCount = 0;
      for (let pixelIndex = 0; pixelIndex < pixels.length; pixelIndex += 64) {
        const value = (pixels[pixelIndex] + pixels[pixelIndex + 1] + pixels[pixelIndex + 2]) / 3;
        sum += value;
        sumOfSquares += value * value;
        pixelCount++;
      }
      // Skip nearly flat frames, such as black screens.
      if (Math.sqrt(Math.max(0, sumOfSquares / pixelCount - (sum / pixelCount) ** 2)) < 8) {
        discarded++;
        continue;
      }
      frames.push({
        time: Math.round(time * 100) / 100,
        image: canvas.toDataURL('image/jpeg', 0.72),
      });
    }
    return { frames, duration, hash, discarded };
    // Always release the temporary video URL, even after an error.
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(videoUrl);
  }
}

// Use a worker so model work does not block the page controls.
export function runModels(
  texts: string[],
  images: string[],
  onProgress: (message: string) => void,
) {
  return new Promise<{ texts: number[][]; images: number[][] }>((resolve, reject) => {
    const worker = new Worker('/ai-worker.js', { type: 'module' });
    const timer = setTimeout(() => {
      worker.terminate();
      reject(Error(t('模型分析超过 10 分钟，请减少采样或检查模型下载连接。')));
    }, 600000);
    worker.onerror = (error) => {
      clearTimeout(timer);
      worker.terminate();
      reject(Error(t('模型启动失败：{0}', error.message)));
    };
    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') {
        onProgress(t(data.text));
      } else {
        clearTimeout(timer);
        worker.terminate();
        if (data.type === 'error') {
          reject(Error(t(data.error)));
        } else {
          resolve(data.result);
        }
      }
    };
    worker.postMessage({ texts, images });
  });
}
