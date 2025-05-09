import wave

import numpy as np


def pcm2wav(pcm_file, wav_file, channels=1, bits=16, sample_rate=16000):
    # 打开PCM文件
    pcmf = open(pcm_file, 'rb')
    pcmdata = pcmf.read()
    pcmf.close()

    # 检查位深是否为8的倍数
    if bits % 8 != 0:
        raise ValueError("bits % 8 must == 0. now bits:" + str(bits))

    # 创建WAV文件并设置参数
    wavfile = wave.open(wav_file, 'wb')
    wavfile.setnchannels(channels)
    wavfile.setsampwidth(bits // 8)
    wavfile.setframerate(sample_rate)
    wavfile.writeframes(pcmdata)
    wavfile.close()


def wav2pcm(wavfile, pcmfile, data_type=np.int16):
    f = open(wavfile, "rb")
    f.seek(0)
    f.read(44)
    data = np.fromfile(f, dtype=data_type)
    data.tofile(pcmfile)


if __name__ == "__main__":
    pcm2wav('iat_pcm_16k.pcm', 'output.wav')
    # wav2pcm('output.wav', 'iat_pcm_16k.pcm')
