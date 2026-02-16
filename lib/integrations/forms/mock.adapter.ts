import { BaseIntegration } from '../core/base-integration';
import type { IFormsIntegration, Form, FormSubmission, FormsFilters } from './forms.interface';
import { loadMockData } from '../core/config-loader';

export class MockFormsAdapter extends BaseIntegration implements IFormsIntegration {
  private forms: Form[] = [];
  private submissions: Map<string, FormSubmission[]> = new Map();

  async initialize(): Promise<void> {
    await super.initialize();

    // Load mock form data
    try {
      this.forms = await loadMockData<Form[]>('forms.json');
      this.log('info', `Loaded ${this.forms.length} mock forms`);
    } catch (error) {
      this.log('warn', 'No mock forms file found, using empty catalog');
      this.forms = [];
    }
  }

  async getForms(filters?: FormsFilters): Promise<Form[]> {
    await this.simulateLatency();

    let filtered = [...this.forms];

    if (filters) {
      if (filters.category) {
        filtered = filtered.filter((f) => f.category === filters.category);
      }

      if (filters.tags && filters.tags.length > 0) {
        filtered = filtered.filter((f) =>
          filters.tags!.some((tag) => f.tags?.includes(tag))
        );
      }

      if (filters.offset !== undefined) {
        filtered = filtered.slice(filters.offset);
      }
      if (filters.limit !== undefined) {
        filtered = filtered.slice(0, filters.limit);
      }
    }

    return filtered;
  }

  async getForm(id: string): Promise<Form | null> {
    await this.simulateLatency();
    return this.forms.find((f) => f.id === id) || null;
  }

  async getFormBySlug(slug: string): Promise<Form | null> {
    await this.simulateLatency();
    return this.forms.find((f) => f.slug === slug) || null;
  }

  async createForm(form: Omit<Form, 'id'>): Promise<Form> {
    await this.simulateLatency();

    const newForm: Form = {
      id: `form-${Date.now()}`,
      ...form,
    };

    this.forms.push(newForm);
    this.log('info', `Created form: ${newForm.id}`);

    return newForm;
  }

  async submitForm(formId: string, data: Record<string, unknown>): Promise<FormSubmission> {
    await this.simulateLatency();

    const form = await this.getForm(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    const submission: FormSubmission = {
      id: `submission-${Date.now()}`,
      formId,
      data,
      submittedAt: new Date(),
      status: 'pending',
    };

    if (!this.submissions.has(formId)) {
      this.submissions.set(formId, []);
    }

    this.submissions.get(formId)!.push(submission);
    this.log('info', `Form submitted: ${formId}`);

    return submission;
  }

  async getSubmissions(formId: string): Promise<FormSubmission[]> {
    await this.simulateLatency();
    return this.submissions.get(formId) || [];
  }
}
