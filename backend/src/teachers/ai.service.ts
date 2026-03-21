import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    /**
     * Recebe um buffer de áudio (preferencialmente MP3 baixo bitrate)
     * e retorna a transcrição textual usando Whisper-1.
     */



    async generateTranscription(buffer: Buffer): Promise<string> {
        try {
            this.logger.log('Enviando áudio para transcrição via OpenAI Whisper...');

            // 1. Converte o buffer em um objeto de arquivo que a SDK da OpenAI aceita
            // O nome 'audio.mp3' é necessário para a API identificar o formato
            const file = await OpenAI.toFile(buffer, 'audio.mp3', {
                type: 'audio/mpeg'
            });

            // 2. Chama o endpoint oficial de transcrição
            const response = await this.openai.audio.transcriptions.create({
                file: file,
                model: "whisper-1",
                language: "pt", // Opcional: Força o português para maior precisão e rapidez
                response_format: "json",
            });

            if (!response.text) {
                throw new Error('A API da OpenAI retornou uma transcrição vazia.');
            }

            this.logger.log(`Transcrição concluída com sucesso (${response.text.length} caracteres).`);

            return response.text;
        } catch (error) {
            this.logger.error(`Erro na transcrição OpenAI: ${error?.message}`);

            // Lança o erro para ser tratado pelo worker que chamou (transcribeVideo)
            throw new Error(`Falha ao transcrever áudio: ${error.message}`);
        }
    }
}