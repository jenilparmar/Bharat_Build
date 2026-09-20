import speech_recognition as sr
from pydub import AudioSegment
import math
import os

recognizer = sr.Recognizer()

def split_audio(file_path, chunk_length_ms=60000):
    audio = AudioSegment.from_file(file_path)

    chunks = []
    total_chunks = math.ceil(len(audio) / chunk_length_ms)

    for i in range(total_chunks):
        start = i * chunk_length_ms
        end = start + chunk_length_ms

        chunk = audio[start:end]

        chunk_path = f"chunk_{i}.wav"
        chunk.export(chunk_path, format="wav")

        chunks.append(chunk_path)

    return chunks


def transcribe_audio_chunks(file_path):

    chunks = split_audio(file_path)

    full_text = ""

    for chunk_path in chunks:

        with sr.AudioFile(chunk_path) as source:
            audio_data = recognizer.record(source)

        try:
            text = recognizer.recognize_google(audio_data)
            full_text += text + " "
        except sr.UnknownValueError:
            full_text += ""
        except sr.RequestError:
            full_text += ""

        os.remove(chunk_path)

    return full_text