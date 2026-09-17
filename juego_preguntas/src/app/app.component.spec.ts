import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should load the first question from JSON', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const httpTesting = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    fixture.componentInstance.startNewGame();
    httpTesting.expectOne('/questions.json').flush([
      { id: 1, text: 'Primera pregunta', type: 'debate' },
      { id: 2, text: 'Segunda pregunta', type: 'silencio' }
    ]);
    fixture.detectChanges();
    const app = fixture.componentInstance;

    expect(['Primera pregunta', 'Segunda pregunta']).toContain(app.currentQuestionData?.text);
    expect(app.questions.length).toEqual(1);
  });

  it('should show the next question after a click', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const httpTesting = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    fixture.componentInstance.startNewGame();
    httpTesting.expectOne('/questions.json').flush([
      { id: 1, text: 'Primera pregunta', type: 'debate' },
      { id: 2, text: 'Segunda pregunta', type: 'silencio' }
    ]);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const firstQuestion = compiled.querySelector('h1')?.textContent;

    compiled.querySelector('main')?.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    expect(compiled.querySelector('h1')?.textContent).not.toBe(firstQuestion);
    expect(fixture.componentInstance.questions.length).toEqual(0);
    expect(compiled.querySelector('h1')?.textContent).toContain('La caja no tiene más preguntas');
  });

  it('should restore remaining questions from localStorage', () => {
    localStorage.setItem('juego-preguntas-restantes', JSON.stringify([
      { id: 99, text: 'Pregunta guardada', type: 'silencio' }
    ]));

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    fixture.componentInstance.continueGame();

    expect(fixture.componentInstance.currentQuestionData?.text).toEqual('Pregunta guardada');
    expect(TestBed.inject(HttpTestingController).match('/questions.json').length).toEqual(0);
  });

  it('should import a saved game with IDs and custom questions', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const httpTesting = TestBed.inject(HttpTestingController);
    fixture.componentInstance.importedIdsText = JSON.stringify([
      2,
      6,
      { text: 'Nueva pregunta', type: 'debate' }
    ]);

    fixture.componentInstance.importGame();
    httpTesting.expectOne('/questions.json').flush([
      { id: 2, text: 'Pregunta dos', type: 'silencio' },
      { id: 6, text: 'Pregunta seis', type: 'debate' }
    ]);

    expect(fixture.componentInstance.questions.length).toEqual(2);
    expect(fixture.componentInstance.questions.map((question) => question.text))
      .toContain('Nueva pregunta');
    expect(fixture.componentInstance.currentQuestionData).toBeTruthy();
  });
});
