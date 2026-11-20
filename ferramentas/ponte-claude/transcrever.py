# Transcreve um áudio do WhatsApp (pedido 20/11/2026). Uso: python transcrever.py <arquivo>
# Roda na VPS com o Whisper local (faster-whisper, modelo small, CPU); nada sai da máquina.
import sys
from faster_whisper import WhisperModel

modelo = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=1)
partes, _ = modelo.transcribe(sys.argv[1], language="pt", vad_filter=True, beam_size=1)
print(" ".join(p.text.strip() for p in partes).strip())
