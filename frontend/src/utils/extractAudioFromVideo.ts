/**
 * 从视频Blob中提取音频并转换为WAV格式的Blob
 * 参考: https://blog.csdn.net/u012663281/article/details/112919404
 */

/**
 * 将ArrayBuffer转换为AudioBuffer
 */
const decodeAudioData = async (
  audioContext: AudioContext,
  arrayBuffer: ArrayBuffer,
): Promise<AudioBuffer> => {
  return new Promise((resolve, reject) => {
    audioContext.decodeAudioData(
      arrayBuffer,
      (buffer) => {
        resolve(buffer);
      },
      (err) => {
        reject(err);
      },
    );
  });
};

/**
 * 将AudioBuffer转换为WAV格式
 */
const audioBufferToWav = (
  buffer: AudioBuffer,
  options?: { float32?: boolean },
): Blob => {
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = options?.float32 ? 3 : 1;
  const bitDepth = format === 3 ? 32 : 16;

  let result;
  if (numberOfChannels === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }

  return encodeWAV(result, format, sampleRate, numberOfChannels, bitDepth);
};

/**
 * 交错左右声道数据
 */
const interleave = (
  leftChannel: Float32Array,
  rightChannel: Float32Array,
): Float32Array => {
  const length = leftChannel.length + rightChannel.length;
  const result = new Float32Array(length);

  let inputIndex = 0;
  for (let i = 0; i < length; ) {
    result[i++] = leftChannel[inputIndex];
    result[i++] = rightChannel[inputIndex];
    inputIndex++;
  }
  return result;
};

/**
 * 编码为WAV格式
 */
const encodeWAV = (
  samples: Float32Array,
  format: number,
  sampleRate: number,
  numChannels: number,
  bitDepth: number,
): Blob => {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, "RIFF");
  // file length
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  // RIFF type
  writeString(view, 8, "WAVE");
  // format chunk identifier
  writeString(view, 12, "fmt ");
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, format, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * blockAlign, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, blockAlign, true);
  // bits per sample
  view.setUint16(34, bitDepth, true);
  // data chunk identifier
  writeString(view, 36, "data");
  // data chunk length
  view.setUint32(40, samples.length * bytesPerSample, true);

  // 写入采样数据
  if (format === 1) {
    // PCM
    floatTo16BitPCM(view, 44, samples);
  } else {
    writeFloat32(view, 44, samples);
  }

  return new Blob([buffer], { type: "audio/wav" });
};

/**
 * 将字符串写入DataView
 */
const writeString = (view: DataView, offset: number, string: string): void => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

/**
 * 将Float32Array转换为16位PCM
 */
const floatTo16BitPCM = (
  output: DataView,
  offset: number,
  input: Float32Array,
): void => {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
};

/**
 * 将Float32Array写入DataView
 */
const writeFloat32 = (
  output: DataView,
  offset: number,
  input: Float32Array,
): void => {
  for (let i = 0; i < input.length; i++, offset += 4) {
    output.setFloat32(offset, input[i], true);
  }
};

/**
 * 从视频Blob中提取音频
 */
export const extractAudioFromVideo = async (videoBlob: Blob): Promise<Blob> => {
  try {
    // 创建FileReader读取视频Blob
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(videoBlob);
    });

    // 创建AudioContext
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    // 解码音频数据
    const audioBuffer = await decodeAudioData(audioContext, arrayBuffer);

    // 转换为WAV格式
    const wavBlob = audioBufferToWav(audioBuffer);

    return wavBlob;
  } catch (error) {
    console.error("从视频提取音频失败:", error);
    throw error;
  }
};

/**
 * 从视频Blob中提取音频 (备用方法，使用MediaRecorder API)
 */
export const extractAudioUsingMediaRecorder = async (
  videoBlob: Blob,
): Promise<Blob> => {
  try {
    // 创建视频元素并设置源
    const videoElement = document.createElement("video");
    videoElement.src = URL.createObjectURL(videoBlob);
    await new Promise((resolve) => {
      videoElement.onloadedmetadata = resolve;
    });

    // 创建媒体元素源和音频上下文
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const mediaSource = audioContext.createMediaElementSource(videoElement);

    // 创建录制目标
    const destination = audioContext.createMediaStreamDestination();
    mediaSource.connect(destination);

    // 创建MediaRecorder
    const mediaRecorder = new MediaRecorder(destination.stream);
    const audioChunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunks.push(e.data);
      }
    };

    // 开始播放和录制
    videoElement.play();
    mediaRecorder.start();

    // 录制完成后返回音频Blob
    return new Promise((resolve) => {
      videoElement.onended = () => {
        mediaRecorder.stop();
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        resolve(audioBlob);
      };

      // 确保录制结束
      setTimeout(
        () => {
          if (mediaRecorder.state !== "inactive") {
            videoElement.pause();
            mediaRecorder.stop();
          }
        },
        videoElement.duration * 1000 + 500,
      ); // 视频时长 + 缓冲
    });
  } catch (error) {
    console.error("使用MediaRecorder提取音频失败:", error);
    throw error;
  }
};
