import { BaseIntegration } from '../core/base-integration';
import type {
  IFormsIntegration,
  Form,
  FormField,
  FormFieldType,
  FormFieldOption,
  FormSubmission,
  FormsFilters,
} from './forms.interface';

// JotForm API response wrapper
interface JFResponse<T> {
  responseCode: number;
  message: string;
  content: T;
  'limit-left'?: number;
}

// Subset of the fields returned by GET /user/forms and GET /form/{id}
interface JFForm {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  url: string;
  count: string;
}

// Single question returned inside GET /form/{id}/questions
interface JFQuestion {
  qid: string;
  name: string;
  text: string;
  type: string;
  order: string;
  required: string;
  options?: string; // pipe-delimited
  special?: string;
  subLabel?: string;
  labelAlign?: string;
  readonly?: string;
  hidden?: string;
  validation?: string;
  maxsize?: string;
  minsize?: string;
  minstep?: string;
  maxstep?: string;
  defaultValue?: string;
  placeholder?: string;
  description?: string;
  sublabels?: Record<string, string>;
}

// Submission returned by GET /form/{id}/submissions
interface JFSubmission {
  id: string;
  form_id: string;
  created_at: string;
  status: string;
  answers: Record<
    string,
    { name: string; text: string; type: string; answer: unknown }
  >;
}

const CACHE_TTL_MS = 60_000;

const QUESTION_TYPE_MAP: Record<string, FormFieldType> = {
  control_textbox: 'text',
  control_fullname: 'text',
  control_address: 'text',
  control_email: 'email',
  control_phone: 'phone',
  control_textarea: 'textarea',
  control_dropdown: 'select',
  control_checkbox: 'multiselect',
  control_radio: 'radio',
  control_number: 'number',
  control_spinner: 'number',
  control_datetime: 'date',
  control_hidden: 'hidden',
  control_scale: 'radio',
  control_rating: 'radio',
};

const SKIP_TYPES = new Set([
  'control_head',
  'control_button',
  'control_pagebreak',
  'control_collapse',
  'control_text',
  'control_image',
  'control_divider',
  'control_captcha',
  'control_widget',
  'control_signature',
]);

export class JotFormAdapter
  extends BaseIntegration
  implements IFormsIntegration
{
  private apiKey = '';
  private baseUrl = 'https://api.jotform.com';

  private formsCache: { data: Form[]; ts: number } | null = null;

  async initialize(): Promise<void> {
    await super.initialize();

    this.apiKey =
      this.resolveEnvVar(this.config.credentials?.apiKey) ||
      this.config.apiKey ||
      process.env.JOTFORM_API_KEY ||
      '';

    if (this.config.baseUrl) {
      this.baseUrl = this.config.baseUrl.replace(/\/+$/, '');
    }

    if (!this.apiKey) {
      this.log('warn', 'No JotForm API key configured — API calls will fail');
    } else {
      this.log('info', `Initialized with base URL ${this.baseUrl}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      await this.apiFetch<JFResponse<unknown>>('/user');
      return true;
    } catch {
      return false;
    }
  }

  // ── IFormsIntegration ────────────────────────────────────────

  async getForms(filters?: FormsFilters): Promise<Form[]> {
    const cached = this.formsCache;
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return this.applyFilters(cached.data, filters);
    }

    const params = new URLSearchParams();
    params.set('limit', '100');
    params.set('orderby', 'updated_at');
    params.set('filter', JSON.stringify({ status: 'ENABLED' }));

    const res = await this.apiFetch<JFResponse<JFForm[]>>(
      `/user/forms?${params}`
    );
    const jfForms = Array.isArray(res.content) ? res.content : [];

    const forms = await Promise.all(
      jfForms.map((jf) => this.mapFormWithQuestions(jf))
    );

    this.formsCache = { data: forms, ts: Date.now() };
    return this.applyFilters(forms, filters);
  }

  async getForm(id: string): Promise<Form | null> {
    try {
      const res = await this.apiFetch<JFResponse<JFForm>>(`/form/${id}`);
      if (!res.content) return null;
      return this.mapFormWithQuestions(res.content);
    } catch (err) {
      this.log('error', `Failed to fetch form ${id}`, err);
      return null;
    }
  }

  async getFormBySlug(slug: string): Promise<Form | null> {
    const form = await this.getForm(slug);
    if (form) return form;

    const all = await this.getForms();
    return (
      all.find(
        (f) =>
          f.slug === slug || f.title.toLowerCase().replace(/\s+/g, '-') === slug
      ) ?? null
    );
  }

  async createForm(_form: Omit<Form, 'id'>): Promise<Form> {
    throw new Error(
      'JotForm adapter does not support programmatic form creation. Use the JotForm dashboard instead.'
    );
  }

  async submitForm(
    formId: string,
    data: Record<string, unknown>
  ): Promise<FormSubmission> {
    const questionsRes = await this.apiFetch<
      JFResponse<Record<string, JFQuestion>>
    >(`/form/${formId}/questions`);
    const questions = questionsRes.content ?? {};

    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(data)) {
      const question = this.findQuestionByFieldId(questions, key);
      if (question) {
        body.set(`submission[${question.qid}]`, String(value ?? ''));
      } else {
        body.set(`submission[${key}]`, String(value ?? ''));
      }
    }

    const res = await this.apiFetch<JFResponse<{ submissionID: string }>>(
      `/form/${formId}/submissions`,
      { method: 'POST', body: body.toString() }
    );

    return {
      id: String(res.content?.submissionID ?? Date.now()),
      formId,
      data,
      submittedAt: new Date(),
      status: 'processed',
    };
  }

  async getSubmissions(formId: string): Promise<FormSubmission[]> {
    const res = await this.apiFetch<JFResponse<JFSubmission[]>>(
      `/form/${formId}/submissions?limit=100&orderby=created_at`
    );
    const items = Array.isArray(res.content) ? res.content : [];
    return items.map((s) => this.mapSubmission(s));
  }

  // ── Private helpers ──────────────────────────────────────────

  private async apiFetch<T>(
    path: string,
    init?: RequestInit
  ): Promise<T> {
    const separator = path.includes('?') ? '&' : '?';
    const url = `${this.baseUrl}${path}${separator}apiKey=${this.apiKey}`;

    const headers: Record<string, string> = {
      ...(init?.headers as Record<string, string>),
    };

    if (init?.method === 'POST' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    const res = await fetch(url, {
      ...init,
      headers,
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `JotForm API ${res.status}: ${res.statusText} — ${text}`
      );
    }

    return res.json() as Promise<T>;
  }

  private async mapFormWithQuestions(jf: JFForm): Promise<Form> {
    let fields: FormField[] = [];
    try {
      const qRes = await this.apiFetch<
        JFResponse<Record<string, JFQuestion>>
      >(`/form/${jf.id}/questions`);
      const questions = qRes.content ?? {};
      fields = Object.values(questions)
        .sort((a, b) => Number(a.order) - Number(b.order))
        .filter((q) => !SKIP_TYPES.has(q.type))
        .map((q) => this.mapQuestion(q));
    } catch (err) {
      this.log('warn', `Could not fetch questions for form ${jf.id}`, err);
    }

    const titleSlug = (jf.title || jf.id)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return {
      id: String(jf.id),
      slug: titleSlug,
      name: jf.title,
      title: jf.title,
      fields,
      metadata: {
        jotformUrl: jf.url,
        status: jf.status,
        submissionCount: Number(jf.count) || 0,
        createdAt: jf.created_at,
        updatedAt: jf.updated_at,
      },
    };
  }

  private mapQuestion(q: JFQuestion): FormField {
    const fieldType: FormFieldType =
      QUESTION_TYPE_MAP[q.type] ?? 'text';

    const field: FormField = {
      id: q.name || q.qid,
      type: fieldType,
      label: q.text || q.name || `Question ${q.qid}`,
      required: q.required?.toLowerCase() === 'yes',
    };

    if (q.placeholder) field.placeholder = q.placeholder;
    if (q.description) field.helpText = q.description;
    if (q.defaultValue) field.defaultValue = q.defaultValue;
    if (q.hidden === 'Yes') field.type = 'hidden';

    if (q.options && ['select', 'radio', 'multiselect'].includes(fieldType)) {
      field.options = this.parseOptions(q.options);
    }

    if (fieldType === 'number') {
      const validation: FormField['validation'] = {};
      if (q.minsize) validation.min = Number(q.minsize);
      if (q.maxsize) validation.max = Number(q.maxsize);
      if (Object.keys(validation).length > 0) field.validation = validation;
    }

    if (fieldType === 'text' || fieldType === 'textarea') {
      const validation: FormField['validation'] = {};
      if (q.maxsize) validation.maxLength = Number(q.maxsize);
      if (Object.keys(validation).length > 0) field.validation = validation;
    }

    return field;
  }

  private parseOptions(raw: string): FormFieldOption[] {
    return raw
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((label) => ({ value: label, label }));
  }

  private findQuestionByFieldId(
    questions: Record<string, JFQuestion>,
    fieldId: string
  ): JFQuestion | undefined {
    return Object.values(questions).find(
      (q) => q.name === fieldId || q.qid === fieldId
    );
  }

  private mapSubmission(s: JFSubmission): FormSubmission {
    const data: Record<string, unknown> = {};
    if (s.answers) {
      for (const answer of Object.values(s.answers)) {
        if (answer.name) {
          data[answer.name] = answer.answer;
        }
      }
    }
    return {
      id: String(s.id),
      formId: String(s.form_id),
      data,
      submittedAt: new Date(s.created_at),
      status: s.status === 'ACTIVE' ? 'processed' : 'pending',
    };
  }

  private applyFilters(forms: Form[], filters?: FormsFilters): Form[] {
    let result = [...forms];
    if (!filters) return result;

    if (filters.category) {
      result = result.filter((f) => f.category === filters.category);
    }
    if (filters.tags?.length) {
      result = result.filter((f) =>
        filters.tags!.some((tag) => f.tags?.includes(tag))
      );
    }
    if (filters.offset !== undefined) {
      result = result.slice(filters.offset);
    }
    if (filters.limit !== undefined) {
      result = result.slice(0, filters.limit);
    }
    return result;
  }

  /**
   * Resolve `${ENV_VAR}` placeholders to actual environment variable values.
   */
  private resolveEnvVar(value?: string): string {
    if (!value) return '';
    const match = value.match(/^\$\{(.+)\}$/);
    if (match) {
      return process.env[match[1]] || '';
    }
    return value;
  }
}
