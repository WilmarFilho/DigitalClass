import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private openai: OpenAI;

    constructor(
        // INJETE O SERVIÇO AQUI
        private readonly supabaseService: SupabaseService,
    ) {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    /**
     * Recebe um buffer de áudio (preferencialmente MP3 baixo bitrate)
     * e retorna a transcrição textual usando Whisper-1.
     */

    // No teu AiService

    /**
     * Transforma um texto em um vetor numérico (embedding) 
     * para busca semântica no banco de dados.
     */
    async generateEmbedding(text: string): Promise<number[]> {
        try {
            // 1. Limpeza básica do texto para remover quebras de linha excessivas
            // Isso ajuda a melhorar a qualidade do vetor gerado
            const sanitizedText = text.replace(/\n/g, ' ').trim();

            if (!sanitizedText) {
                throw new Error('O texto para embedding não pode estar vazio.');
            }

            // 2. Chamada à API da OpenAI
            const response = await this.openai.embeddings.create({
                model: "text-embedding-3-small",
                input: sanitizedText,
                encoding_format: "float",
            });

            // 3. Retorna o array de números (o vetor)
            // O modelo 'text-embedding-3-small' gera um vetor de 1536 dimensões
            return response.data[0].embedding;

        } catch (error) {
            this.logger.error(`Erro ao gerar embedding: ${error.message}`);
            throw new InternalServerErrorException('Falha ao processar inteligência vetorial.');
        }
    }

    async askTutor(
        areaId: string,
        question: string,
        history: any[],
        areaData: any
    ) {
        // 1. Gerar embedding da pergunta do aluno
        const queryEmbedding = await this.generateEmbedding(question);

        // 2. Buscar no Supabase os trechos de aulas mais parecidos
        const { data: contextChunks } = await this.supabaseService.getClient().rpc(
            'match_teacher_knowledge',
            {
                query_embedding: queryEmbedding,
                match_threshold: 0.5, // Ajuste a precisão aqui (0 a 1)
                match_count: 5,       // Quantos trechos enviar para a IA
                p_area_id: areaId
            }
        );

        // 3. Montar o contexto extraído das aulas
        const contextText = contextChunks?.map((c: any) => c.content).join('\n---\n') || 'Nenhum conteúdo específico encontrado.';

        // 4. Chamada para o Chat Completion
        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini", // Ou gpt-4-turbo
            messages: [
                {
                    role: "system",
                    content: `Você é o ${areaData.ai_tutor_name || 'Tutor IA'}, um assistente especialista da área de membros "${areaData.title}".
        Use o CONTEÚDO DAS AULAS abaixo para responder ao aluno. 
        Instruções extras do professor: ${areaData.ai_tutor_instructions || 'Seja prestativo.'}
        
        CONTEÚDO DAS AULAS:
        ${contextText}`
                },
                ...history.slice(-6), // Envia as últimas 6 mensagens de histórico
                { role: "user", content: question }
            ],
        });

        return response.choices[0].message.content;
    }

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


