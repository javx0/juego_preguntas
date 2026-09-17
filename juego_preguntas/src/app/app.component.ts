import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';

type QuestionType = 'debate' | 'silencio';

interface Question {
  id?: number;
  text: string;
  type: QuestionType;
}

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly storageKey = 'juego-preguntas-restantes';
  readonly questions: Question[] = [];

  currentQuestionData: Question | undefined;
  hasStarted = false;
  isRulesModalOpen = true;
  isOptionsModalOpen = false;
  canContinue = false;
  isQuestionListCopied = false;
  importedIdsText = '';
  importError = '';

  get questionBackground(): string {
    return this.currentQuestionData?.type === 'silencio'
      ? "url('img/silencio.png')"
      : "url('img/hablando.png')";
  }

  ngOnInit(): void {
    const storedQuestions = this.loadStoredQuestions();
    this.canContinue = storedQuestions !== null && storedQuestions.length > 0;
  }

  startNewGame(): void {
    localStorage.removeItem(this.storageKey);
    this.questions.length = 0;
    this.currentQuestionData = undefined;
    this.hasStarted = true;
    this.isRulesModalOpen = false;
    this.loadQuestionsFromFile();
  }

  continueGame(): void {
    const storedQuestions = this.loadStoredQuestions();

    if (!storedQuestions || storedQuestions.length === 0) {
      this.canContinue = false;
      return;
    }

    this.questions.length = 0;
    this.questions.push(...storedQuestions);
    this.currentQuestionData = undefined;
    this.hasStarted = true;
    this.isRulesModalOpen = false;
    this.showRandomQuestion();
  }

  openOptions(): void {
    this.isOptionsModalOpen = true;
  }

  closeOptions(): void {
    this.isOptionsModalOpen = false;
    this.importedIdsText = '';
    this.importError = '';
  }

  async copyActiveQuestionIds(): Promise<void> {
    const activeQuestions = this.questions.map((question) => question.id ?? {
      text: question.text,
      type: question.type
    });
    await navigator.clipboard.writeText(JSON.stringify(activeQuestions, null, 2));
    this.isQuestionListCopied = true;
  }

  importGame(): void {
    let importedItems: unknown;

    try {
      importedItems = JSON.parse(this.importedIdsText);
    } catch {
      this.importError = 'Introduce una lista JSON válida.';
      return;
    }

    if (!this.isValidImportList(importedItems)) {
      this.importError = 'La lista debe contener IDs numéricos o preguntas personalizadas válidas.';
      return;
    }

    this.http.get<Question[]>('questions.json').subscribe((allQuestions) => {
      const questionsById = new Map(
        allQuestions
          .filter((question) => question.id !== undefined)
          .map((question) => [question.id as number, question])
      );
      const importedQuestions = importedItems.map((item) =>
        typeof item === 'number' ? questionsById.get(item) : item
      );

      if (importedQuestions.some((question) => !question)) {
        this.importError = 'Uno o más IDs no existen en questions.json.';
        return;
      }

      this.questions.length = 0;
      this.questions.push(...importedQuestions as Question[]);
      this.currentQuestionData = undefined;
      this.hasStarted = true;
      this.canContinue = this.questions.length > 0;
      this.isRulesModalOpen = false;
      this.isOptionsModalOpen = false;
      this.importedIdsText = '';
      this.importError = '';
      this.showRandomQuestion();
    });
  }

  nextQuestion(): void {
    this.showRandomQuestion();
  }

  private showRandomQuestion(): void {
    if (this.questions.length === 0) {
      this.currentQuestionData = undefined;
      return;
    }

    const randomIndex = Math.floor(Math.random() * this.questions.length);
    [this.currentQuestionData] = this.questions.splice(randomIndex, 1);
    this.saveRemainingQuestions();
  }

  private loadQuestionsFromFile(): void {
    this.http.get<Question[]>('questions.json').subscribe((questions) => {
      this.questions.push(...questions);
      this.showRandomQuestion();
    });
  }

  private loadStoredQuestions(): Question[] | null {
    const storedQuestions = localStorage.getItem(this.storageKey);

    if (storedQuestions === null) {
      return null;
    }

    try {
      const parsedQuestions: unknown = JSON.parse(storedQuestions);

      if (!Array.isArray(parsedQuestions) || !parsedQuestions.every((question) => this.isQuestion(question))) {
        localStorage.removeItem(this.storageKey);
        return null;
      }

      return parsedQuestions;
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  private isQuestion(value: unknown): value is Question {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const question = value as Partial<Question>;
    return (question.id === undefined
      || (typeof question.id === 'number'
        && Number.isInteger(question.id)
        && question.id > 0))
      && typeof question.text === 'string'
      && (question.type === 'debate' || question.type === 'silencio');
  }

  private isValidImportList(value: unknown): value is Array<number | Question> {
    return Array.isArray(value)
      && value.length > 0
      && value.every((item) => {
        if (typeof item === 'number') {
          return Number.isInteger(item) && item > 0;
        }

        return this.isQuestion(item) && item.id === undefined;
      });
  }

  private saveRemainingQuestions(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.questions));
  }
}
