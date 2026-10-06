// This worker runs on the visitor's device. It downloads models, not user videos.
let libraryPromise;
let visionPromise;
let textPromise;
const progress = (download) => {
  if (download.status === 'progress') {
    postMessage({
      type: 'progress',
      text: `下载开源模型：${download.file || ''} ${Math.round(download.progress || 0)}%`,
    });
  }
};
// Reuse the library within this run and use one WebAssembly thread.
async function library() {
  if (!libraryPromise) {
    libraryPromise = import(
      'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm'
    ).then((libraryModule) => {
      libraryModule.env.allowLocalModels = false;
      libraryModule.env.backends.onnx.wasm.numThreads = 1;
      libraryModule.env.backends.onnx.wasm.proxy = false;
      libraryModule.env.backends.onnx.wasm.wasmPaths =
        'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0-dev.20250409-89f8206ba4/dist/';
      return libraryModule;
    });
  }
  return libraryPromise;
}

// CLIP turns each sampled image into a numeric feature vector.
async function vision() {
  if (!visionPromise) {
    visionPromise = library().then(({ pipeline }) =>
      pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32', {
        device: 'wasm',
        dtype: 'q8',
        progress_callback: progress,
      }),
    );
  }
  return visionPromise;
}

// MiniLM turns each description into a numeric feature vector.
async function text() {
  if (!textPromise) {
    textPromise = library().then(({ pipeline }) =>
      pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', {
        device: 'wasm',
        dtype: 'q8',
        progress_callback: progress,
      }),
    );
  }
  return textPromise;
}

// The page sends inputs here; the worker sends progress and vectors back.
onmessage = async ({ data }) => {
  try {
    const result = { images: [], texts: [] };
    if (data.texts?.length) {
      const model = await text();
      postMessage({ type: 'progress', text: '正在比较创意描述…' });
      for (const description of data.texts) {
        const features = await model(description.slice(0, 800), {
          pooling: 'mean',
          normalize: true,
        });
        result.texts.push(Array.from(features.data));
        // Release the temporary model output after copying its numbers.
        features.dispose?.();
      }
    }
    if (data.images?.length) {
      const model = await vision();
      for (let i = 0; i < data.images.length; i++) {
        postMessage({ type: 'progress', text: `分析视频画面 ${i + 1} / ${data.images.length}` });
        const features = await model(data.images[i], { normalize: true });
        result.images.push(Array.from(features.data));
        features.dispose?.();
      }
    }
    postMessage({ type: 'result', result });
  } catch (error) {
    visionPromise = undefined;
    textPromise = undefined;
    libraryPromise = undefined;
    postMessage({
      type: 'error',
      error: `开源模型加载或分析失败：${error.message || error}。请检查网络和浏览器内存后重试。`,
    });
  }
};
