import type { Form } from "@/lib/integrations/forms/forms.interface";

export interface FormSelectorFieldValue {
  version: 1;
  selectedForm?: Form;
}

export interface FormsAppConfig {
  provider: string;
  useMock: boolean;
  simulateLatency?: boolean;
}
