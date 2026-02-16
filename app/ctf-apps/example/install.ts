// Installation and uninstall helpers for the Newsletter Preview app.
// Responsible for creating or updating the configurable Newsletter content type
// in an idempotent way.

export type InstallStep = "creating-content-type" | "done";

type Notifier = {
  info?: (message: string) => void;
  success?: (message: string) => void;
  error?: (message: string) => void;
};

interface RunInstallationOptions {
  cma: unknown;
  notifier?: Notifier;
  environmentId: string;
  locale?: string;
  newsletterContentTypeId?: string;
  onProgress?: (step: InstallStep) => void;
}

export async function runInstallation(options: RunInstallationOptions) {
  const {
    cma,
    notifier,
    environmentId,
    locale = "en-US",
    newsletterContentTypeId = "newsletter",
    onProgress,
  } = options;

  const client = cma as any;

  const report = (step: InstallStep) => {
    onProgress?.(step);
    notifier?.info?.(`Newsletter Preview install: ${step.replace(/-/g, " ")}`);
  };

  const createOrUpdateNewsletterContentType = async () => {
    const fields = [
      {
        id: "subject",
        name: "Subject",
        type: "Symbol",
        localized: true,
        required: true,
      },
      {
        id: "senderName",
        name: "Sender name",
        type: "Symbol",
        localized: true,
        required: true,
      },
      {
        id: "senderEmail",
        name: "Sender email",
        type: "Symbol",
        localized: true,
        required: true,
      },
      {
        id: "replyToEmail",
        name: "Reply-to email",
        type: "Symbol",
        localized: true,
        required: false,
      },
      {
        id: "preheader",
        name: "Preheader",
        type: "Symbol",
        localized: true,
        required: false,
      },
      {
        id: "content",
        name: "Content",
        type: "RichText",
        localized: true,
        required: true,
        validations: [],
      },
    ];

    try {
      const existing = await client.contentType.get({
        contentTypeId: newsletterContentTypeId,
        environmentId,
      });
      const existingFields: any[] = Array.isArray(existing.fields)
        ? existing.fields
        : [];
      const missingFields = fields.filter(
        (fieldToEnsure: any) =>
          !existingFields.some(
            (field: any) =>
              field.id === fieldToEnsure.id ||
              field.apiName === fieldToEnsure.id
          )
      );

      if (!missingFields.length) {
        return existing;
      }

      const updated = {
        ...existing,
        fields: [...existingFields, ...missingFields],
      };
      const updatedCt = await client.contentType.update(
        { contentTypeId: newsletterContentTypeId, environmentId },
        updated
      );
      const published = await client.contentType.publish(
        { contentTypeId: newsletterContentTypeId, environmentId },
        updatedCt
      );
      return published;
    } catch (err: unknown) {
      const error: any = err;
      const message = (error && error.message) || "";
      const isNotFound =
        error?.status === 404 ||
        error?.sys?.id === "NotFound" ||
        /could not be found/i.test(message);

      if (!isNotFound) {
        throw err;
      }

      const payload: any = {
        name: "Newsletter",
        description:
          "Newsletter content type created by the Newsletter Preview app.",
        fields,
        displayField: "subject",
      };

      const ct = await client.contentType.createWithId(
        { contentTypeId: newsletterContentTypeId, environmentId },
        payload
      );
      await client.contentType.publish(
        { contentTypeId: newsletterContentTypeId, environmentId },
        ct
      );
      return ct;
    }
  };

  report("creating-content-type");
  await createOrUpdateNewsletterContentType();
  report("done");
  notifier?.success?.(
    `Newsletter content type \"${newsletterContentTypeId}\" is ready in environment ${environmentId}.`
  );
}

interface RunUninstallOptions {
  cma: unknown;
  notifier?: Notifier;
  environmentId: string;
  onProgress?: (step: "uninstalling" | "uninstall-done") => void;
}

export async function runUninstall(options: RunUninstallOptions) {
  const { onProgress, notifier } = options;
  // For now, we do not remove the Newsletter content type automatically.
  onProgress?.("uninstall-done");
  notifier?.info?.("Newsletter Preview uninstall completed (no-op).");
}
