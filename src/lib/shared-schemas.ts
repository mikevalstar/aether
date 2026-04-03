import { z } from "zod";

export const threadIdInputSchema = z
  .object({
    threadId: z.string().trim().min(1, "Thread ID is required"),
  })
  .strict();

export const filenameInputSchema = z
  .object({
    filename: z.string().trim().min(1, "Filename is required"),
  })
  .strict();

export const queryInputSchema = z
  .object({
    query: z.string(),
  })
  .strict();
