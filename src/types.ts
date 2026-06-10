export interface Course {
  id: string;
  userId: string;
  titulo: string;
  pdfUrl?: string;
  createdAt: number;
  archived?: boolean;
}

export interface Module {
  id: string;
  courseId: string;
  ordem: number;
  titulo: string;
  conteudo_aula: string;
  exemplo_pratico: string;
  simulado: Question[];
}

export interface Question {
  pergunta: string;
  opcoes: {
    [key: string]: string;
  };
  resposta_correta: string;
  explicacao_resposta: string;
}

export interface Progress {
  id: string;
  userId: string;
  courseId: string;
  moduleId: string;
  score: number;
  completed: boolean;
  updatedAt: number;
}
