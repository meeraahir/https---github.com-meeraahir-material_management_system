import axios from "axios";

type ErrorPayload =
  | string
  | { detail?: string; [key: string]: ErrorPayload | string[] | undefined }
  | string[];

function flattenErrorPayload(payload: ErrorPayload): string[] {
  if (typeof payload === "string") {
    return [payload];
  }

  if (Array.isArray(payload)) {
    return payload.flatMap((item) => flattenErrorPayload(item));
  }

  return Object.entries(payload).flatMap(([key, value]) => {
    if (value === undefined) {
      return [];
    }

    if (key === "detail" && typeof value === "string") {
      return [value];
    }

    const messages = flattenErrorPayload(value);
    return messages.map((message) => `${key}: ${message}`);
  });
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ErrorPayload | undefined;

    if (data) {
      const [firstMessage] = flattenErrorPayload(data);
      if (firstMessage) {
        return firstMessage;
      }
    }

    if (error.code === "ERR_NETWORK") {
      return "Network error. Please verify that the backend server is running.";
    }

    return error.message || "Something went wrong while contacting the server.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}
