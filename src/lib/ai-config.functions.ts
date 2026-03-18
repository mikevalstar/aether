import { createServerFn } from "@tanstack/react-start";
import { parseAndValidateAiConfig } from "#/lib/ai-config.shared";
import { getValidatorForFile } from "#/lib/ai-config-validators";
import { ensureSession } from "#/lib/auth.functions";

type ValidateAiConfigInput = {
  filename: string;
  rawContent: string;
};

export type AiConfigValidationResponse = {
  isValid: boolean;
  errors: string[];
  description: string | null;
  label: string | null;
};

export const validateAiConfigContent = createServerFn({ method: "POST" })
  .inputValidator((data: ValidateAiConfigInput) => data)
  .handler(async ({ data }): Promise<AiConfigValidationResponse> => {
    await ensureSession();

    const validator = getValidatorForFile(data.filename);
    if (!validator) {
      return {
        isValid: true,
        errors: [],
        description: null,
        label: null,
      };
    }

    const result = parseAndValidateAiConfig(data.filename, data.rawContent);

    return {
      isValid: result.validation.isValid,
      errors: result.validation.errors,
      description: validator.description,
      label: validator.label,
    };
  });

export const getAiConfigValidatorInfo = createServerFn({ method: "GET" })
  .inputValidator((data: { filename: string }) => data)
  .handler(async ({ data }): Promise<{ description: string; label: string } | null> => {
    await ensureSession();

    const validator = getValidatorForFile(data.filename);
    if (!validator) return null;

    return { description: validator.description, label: validator.label };
  });
