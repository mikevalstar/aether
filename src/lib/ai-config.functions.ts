import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseAndValidateAiConfig } from "#/lib/ai-config.shared";
import { getValidatorForFile } from "#/lib/ai-config-validators";
import { ensureSession } from "#/lib/auth.functions";
import { filenameInputSchema } from "#/lib/shared-schemas";

const validateAiConfigInputSchema = z
  .object({
    filename: z.string().trim().min(1, "Filename is required"),
    rawContent: z.string(),
  })
  .strict();

export type AiConfigValidationResponse = {
  isValid: boolean;
  errors: string[];
  description: string | null;
  label: string | null;
};

export const validateAiConfigContent = createServerFn({ method: "POST" })
  .inputValidator((data) => validateAiConfigInputSchema.parse(data))
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
  .inputValidator((data) => filenameInputSchema.parse(data))
  .handler(async ({ data }): Promise<{ description: string; label: string } | null> => {
    await ensureSession();

    const validator = getValidatorForFile(data.filename);
    if (!validator) return null;

    return { description: validator.description, label: validator.label };
  });
