import clsx from "clsx";

import { truncateText } from "../../utils/format";

interface TruncatedTextProps {
  className?: string;
  limit?: number;
  title?: string;
  value: boolean | number | string | null | undefined;
}

export function TruncatedText({
  className,
  limit = 20,
  title,
  value,
}: TruncatedTextProps) {
  const resolvedValue =
    value === null || value === undefined || value === "" ? "-" : String(value);
  const resolvedTitle = title ?? (resolvedValue === "-" ? undefined : resolvedValue);

  return (
    <span
      className={clsx(
        "block max-w-full overflow-hidden text-ellipsis whitespace-nowrap",
        className,
      )}
      title={resolvedTitle}
    >
      {resolvedValue === "-" ? resolvedValue : truncateText(resolvedValue, limit)}
    </span>
  );
}
